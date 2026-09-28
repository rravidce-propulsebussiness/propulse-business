const pool=require('../config/database');
const audit=require('./criticalActionAuditService');

const DEFAULT_INTERVAL_MINUTES=5;
const MIN_INTERVAL_MINUTES=1;
const MAX_INTERVAL_MINUTES=1440;

function normalizeRow(row={}){
  return{
    autoSyncEnabled:row.auto_sync_enabled!==false,
    adminSourcesEnabled:row.admin_sources_enabled!==false,
    leadPartnerSourcesEnabled:row.lead_partner_sources_enabled!==false,
    intervalMinutes:Math.min(MAX_INTERVAL_MINUTES,Math.max(MIN_INTERVAL_MINUTES,Number(row.interval_minutes)||DEFAULT_INTERVAL_MINUTES)),
    updatedBy:row.updated_by?Number(row.updated_by):null,
    updatedAt:row.updated_at||null
  };
}

async function getConfig(db=pool){
  let row=(await db.query(
    `SELECT auto_sync_enabled,admin_sources_enabled,lead_partner_sources_enabled,interval_minutes,updated_by,updated_at
       FROM google_sheet_sync_settings
      WHERE id=1`
  )).rows[0];
  if(!row){
    row=(await db.query(
      `INSERT INTO google_sheet_sync_settings(id)
       VALUES(1)
       ON CONFLICT(id) DO UPDATE SET id=EXCLUDED.id
       RETURNING auto_sync_enabled,admin_sources_enabled,lead_partner_sources_enabled,interval_minutes,updated_by,updated_at`
    )).rows[0];
  }
  return normalizeRow(row);
}

function compactRun(row){
  if(!row)return null;
  return{
    status:row.status,
    source:row.trigger_source,
    startedAt:row.started_at||null,
    completedAt:row.completed_at||null,
    error:row.error_message||null
  };
}

async function latestRun(jobKey){
  return compactRun((await pool.query(
    `SELECT status,trigger_source,started_at,completed_at,error_message
       FROM background_job_runs
      WHERE job_key=$1
      ORDER BY started_at DESC,id DESC
      LIMIT 1`,
    [jobKey]
  )).rows[0]);
}

async function dueSummary(config){
  const interval=Number(config.intervalMinutes)||DEFAULT_INTERVAL_MINUTES;
  const [admin,partner]=await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS active,
              MIN(
                CASE
                  WHEN sync_failure_count>0 AND next_retry_at IS NOT NULL THEN next_retry_at
                  ELSE COALESCE(last_checked_at,last_synced_at,created_at)+($1*INTERVAL '1 minute')
                END
              ) AS next_due_at
         FROM admin_google_sheet_connections
        WHERE status='active'`,
      [interval]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS active,
              MIN(
                CASE
                  WHEN sync_failure_count>0 AND next_retry_at IS NOT NULL THEN next_retry_at
                  ELSE COALESCE(last_synced_at,created_at)+($1*INTERVAL '1 minute')
                END
              ) AS next_due_at
         FROM lead_partner_sheet_connections
        WHERE status='active'`,
      [interval]
    )
  ]);
  return{
    admin:{active:Number(admin.rows[0]?.active||0),nextDueAt:admin.rows[0]?.next_due_at||null},
    leadPartner:{active:Number(partner.rows[0]?.active||0),nextDueAt:partner.rows[0]?.next_due_at||null}
  };
}

async function getSettings(){
  const config=await getConfig();
  const [runs,due]=await Promise.all([
    Promise.all([latestRun('admin_google_sheet_sync'),latestRun('lead_partner_google_sheet_sync')]),
    dueSummary(config)
  ]);
  const adminEnabled=config.autoSyncEnabled&&config.adminSourcesEnabled;
  const partnerEnabled=config.autoSyncEnabled&&config.leadPartnerSourcesEnabled;
  return{
    ...config,
    schedulerTickSeconds:60,
    admin:{
      enabled:adminEnabled,
      activeConnections:due.admin.active,
      nextRunAt:adminEnabled?due.admin.nextDueAt:null,
      latestRun:runs[0]
    },
    leadPartner:{
      enabled:partnerEnabled,
      activeConnections:due.leadPartner.active,
      nextRunAt:partnerEnabled?due.leadPartner.nextDueAt:null,
      latestRun:runs[1]
    }
  };
}

function boolOr(value,fallback){return typeof value==='boolean'?value:fallback}

async function updateSettings(input={},adminId,requestContext={}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const before=await getConfig(client);
    const intervalRaw=input.intervalMinutes===undefined?before.intervalMinutes:Number(input.intervalMinutes);
    if(!Number.isInteger(intervalRaw)||intervalRaw<MIN_INTERVAL_MINUTES||intervalRaw>MAX_INTERVAL_MINUTES){
      const error=new Error('Auto-sync interval must be between 1 and 1440 minutes');
      error.code='INVALID_SHEET_SYNC_SETTINGS';
      throw error;
    }
    const next={
      autoSyncEnabled:boolOr(input.autoSyncEnabled,before.autoSyncEnabled),
      adminSourcesEnabled:boolOr(input.adminSourcesEnabled,before.adminSourcesEnabled),
      leadPartnerSourcesEnabled:boolOr(input.leadPartnerSourcesEnabled,before.leadPartnerSourcesEnabled),
      intervalMinutes:intervalRaw
    };
    await client.query(
      `UPDATE google_sheet_sync_settings
          SET auto_sync_enabled=$1,
              admin_sources_enabled=$2,
              lead_partner_sources_enabled=$3,
              interval_minutes=$4,
              updated_by=$5,
              updated_at=CURRENT_TIMESTAMP
        WHERE id=1`,
      [next.autoSyncEnabled,next.adminSourcesEnabled,next.leadPartnerSourcesEnabled,next.intervalMinutes,adminId||null]
    );

    await audit.record(client,{
      actorId:adminId,category:'system',action:'google_sheet_sync.settings_update',
      entityType:'google_sheet_sync_settings',entityId:'1',
      beforeData:before,afterData:next,source:'admin_google_sheet_sync',
      requestContext
    });
    await client.query('COMMIT');
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{client.release()}
  return getSettings();
}

module.exports={
  DEFAULT_INTERVAL_MINUTES,MIN_INTERVAL_MINUTES,MAX_INTERVAL_MINUTES,
  normalizeRow,getConfig,getSettings,updateSettings,dueSummary
};
