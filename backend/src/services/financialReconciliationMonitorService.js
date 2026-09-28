const pool=require('../config/database');
const integrityService=require('./adminFinancialIntegrityService');

const LOCK_NAME='propulse:financial-reconciliation';
const ALERT_CATEGORY='financial_reconciliation';

function buildVersion(){
  const raw=String(process.env.GIT_COMMIT_SHA||process.env.RENDER_GIT_COMMIT||process.env.VERCEL_GIT_COMMIT_SHA||process.env.COMMIT_SHA||'').trim();
  return raw?raw.slice(0,64):'local';
}
function safeInt(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0}
function compactRun(row){
  if(!row)return null;
  return{
    id:Number(row.id),
    source:row.source,
    status:row.status,
    critical:safeInt(row.critical_count),
    warnings:safeInt(row.warning_count),
    totalIssues:safeInt(row.total_issue_count),
    buildCommit:row.build_commit||null,
    startedAt:row.started_at||null,
    completedAt:row.completed_at||null,
    error:row.error_message||null
  };
}
function compactAlert(row){
  return{
    id:Number(row.id),
    key:row.alert_key,
    severity:row.severity,
    title:row.title,
    message:row.message,
    occurrenceCount:safeInt(row.occurrence_count),
    firstSeenAt:row.first_seen_at||null,
    lastSeenAt:row.last_seen_at||null
  };
}
function resultCheckCounts(result){
  return Object.fromEntries((result.checks||[]).map(check=>[
    check.type,
    {severity:check.severity,count:safeInt(check.count)}
  ]));
}
async function syncAlerts(client,result){
  const activeChecks=(result.checks||[]).filter(check=>safeInt(check.count)>0);
  const activeKeys=[];
  for(const check of activeChecks){
    const alertKey='financial:'+check.type;
    activeKeys.push(alertKey);
    const count=safeInt(check.count);
    const message=`${count} issue${count===1?'':'s'} detected. ${check.description}`;
    await client.query(
      `INSERT INTO admin_operational_alerts(alert_key,category,severity,title,message,status,details)
       VALUES($1,$2,$3,$4,$5,'active',$6::jsonb)
       ON CONFLICT(alert_key) DO UPDATE
         SET category=EXCLUDED.category,
             severity=EXCLUDED.severity,
             title=EXCLUDED.title,
             message=EXCLUDED.message,
             status='active',
             occurrence_count=admin_operational_alerts.occurrence_count+1,
             details=EXCLUDED.details,
             last_seen_at=CURRENT_TIMESTAMP,
             resolved_at=NULL,
             updated_at=CURRENT_TIMESTAMP`,
      [alertKey,ALERT_CATEGORY,check.severity,check.title,message,JSON.stringify({checkType:check.type,count})]
    );
  }
  await client.query(
    `UPDATE admin_operational_alerts
        SET status='resolved',resolved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE category=$1
        AND status='active'
        AND NOT (alert_key = ANY($2::text[]))`,
    [ALERT_CATEGORY,activeKeys]
  );
}
async function upsertFailureAlert(client){
  await client.query(
    `INSERT INTO admin_operational_alerts(alert_key,category,severity,title,message,status,details)
     VALUES('financial:scan_failed',$1,'critical','Financial reconciliation failed',
            'Automated financial reconciliation could not complete. Review System Health and worker logs before processing sensitive payouts.',
            'active','{}'::jsonb)
     ON CONFLICT(alert_key) DO UPDATE
       SET severity='critical',
           title=EXCLUDED.title,
           message=EXCLUDED.message,
           status='active',
           occurrence_count=admin_operational_alerts.occurrence_count+1,
           last_seen_at=CURRENT_TIMESTAMP,
           resolved_at=NULL,
           updated_at=CURRENT_TIMESTAMP`,
    [ALERT_CATEGORY]
  );
}
async function runReconciliation({source='scheduled',skipIfCompletedWithinMinutes=0}={}){
  const client=await pool.connect();
  let locked=false;
  let runId=null;
  let inTransaction=false;
  try{
    const lock=(await client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',[LOCK_NAME])).rows[0];
    locked=Boolean(lock?.locked);
    if(!locked)return{busy:true,skipped:false};

    const skipMinutes=Math.max(0,Math.floor(Number(skipIfCompletedWithinMinutes)||0));
    if(skipMinutes>0){
      const recent=(await client.query(
        `SELECT id,status,completed_at
           FROM financial_reconciliation_runs
          WHERE source='scheduled'
            AND status IN ('clean','warning','critical')
            AND completed_at>CURRENT_TIMESTAMP-($1 * INTERVAL '1 minute')
          ORDER BY completed_at DESC,id DESC
          LIMIT 1`,
        [skipMinutes]
      )).rows[0];
      if(recent)return{busy:false,skipped:true,lastRunId:Number(recent.id),status:recent.status,completedAt:recent.completed_at};
    }

    const run=(await client.query(
      `INSERT INTO financial_reconciliation_runs(source,status,build_commit)
       VALUES($1,'running',$2)
       RETURNING id,started_at`,
      [String(source||'scheduled').slice(0,40),buildVersion()]
    )).rows[0];
    runId=Number(run.id);

    const result=await integrityService.getFinancialIntegrity({force:true});
    await client.query('BEGIN');
    inTransaction=true;
    await client.query(
      `UPDATE financial_reconciliation_runs
          SET status=$2,
              critical_count=$3,
              warning_count=$4,
              total_issue_count=$5,
              check_counts=$6::jsonb,
              overview=$7::jsonb,
              error_message=NULL,
              completed_at=CURRENT_TIMESTAMP
        WHERE id=$1`,
      [runId,result.status,safeInt(result.critical),safeInt(result.warnings),safeInt(result.totalIssues),JSON.stringify(resultCheckCounts(result)),JSON.stringify(result.overview||{})]
    );
    await syncAlerts(client,result);
    await client.query('COMMIT');
    inTransaction=false;
    return{
      busy:false,
      skipped:false,
      runId,
      status:result.status,
      critical:safeInt(result.critical),
      warnings:safeInt(result.warnings),
      totalIssues:safeInt(result.totalIssues),
      checkedAt:result.checkedAt
    };
  }catch(error){
    if(inTransaction){
      await client.query('ROLLBACK').catch(()=>{});
      inTransaction=false;
    }
    if(runId){
      await client.query(
        `UPDATE financial_reconciliation_runs
            SET status='failed',error_message=$2,completed_at=CURRENT_TIMESTAMP
          WHERE id=$1`,
        [runId,String(error?.message||'Financial reconciliation failed').slice(0,500)]
      ).catch(()=>{});
    }
    await upsertFailureAlert(client).catch(()=>{});
    throw error;
  }finally{
    if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',[LOCK_NAME]).catch(()=>{});
    client.release();
  }
}
async function getMonitoringSummary({historyLimit=8}={}){
  const limit=Math.min(20,Math.max(1,Math.floor(Number(historyLimit)||8)));
  const [runsResult,alertsResult]=await Promise.all([
    pool.query(
      `SELECT id,source,status,critical_count,warning_count,total_issue_count,build_commit,started_at,completed_at,error_message
         FROM financial_reconciliation_runs
        ORDER BY id DESC
        LIMIT $1`,
      [limit]
    ),
    pool.query(
      `SELECT id,alert_key,severity,title,message,occurrence_count,first_seen_at,last_seen_at
         FROM admin_operational_alerts
        WHERE category=$1 AND status='active'
        ORDER BY CASE severity WHEN 'critical' THEN 0 ELSE 1 END,last_seen_at DESC,id DESC
        LIMIT 20`,
      [ALERT_CATEGORY]
    )
  ]);
  const recentRuns=runsResult.rows.map(compactRun);
  const activeAlerts=alertsResult.rows.map(compactAlert);
  return{
    latestRun:recentRuns[0]||null,
    recentRuns,
    activeAlerts,
    activeAlertCount:activeAlerts.length,
    criticalAlertCount:activeAlerts.filter(item=>item.severity==='critical').length,
    warningAlertCount:activeAlerts.filter(item=>item.severity==='warning').length
  };
}
async function getHealthSummary({maxAgeHours=30}={}){
  const safeMaxAge=Math.min(168,Math.max(2,Number(maxAgeHours)||30));
  const [latestResult,alertsResult]=await Promise.all([
    pool.query(
      `SELECT id,status,critical_count,warning_count,total_issue_count,completed_at,
              EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-COALESCE(completed_at,started_at)))/3600.0 AS age_hours
         FROM financial_reconciliation_runs
        ORDER BY id DESC
        LIMIT 1`
    ),
    pool.query(
      `SELECT
          COUNT(*) FILTER(WHERE severity='critical')::int AS critical,
          COUNT(*) FILTER(WHERE severity='warning')::int AS warnings
         FROM admin_operational_alerts
        WHERE category=$1 AND status='active'`,
      [ALERT_CATEGORY]
    )
  ]);
  const latest=latestResult.rows[0]||null;
  const active=alertsResult.rows[0]||{};
  const critical=safeInt(active.critical);
  const warnings=safeInt(active.warnings);
  const ageHours=latest==null?null:Number(latest.age_hours);
  let status='healthy';
  if(!latest)status='not_run';
  else if(latest.status==='failed')status='failed';
  else if(critical>0||latest.status==='critical')status='critical';
  else if(warnings>0||latest.status==='warning')status='warning';
  else if(Number.isFinite(ageHours)&&ageHours>safeMaxAge)status='stale';
  return{
    status,
    latestRunId:latest?Number(latest.id):null,
    lastCompletedAt:latest?.completed_at||null,
    ageHours:Number.isFinite(ageHours)?Number(ageHours.toFixed(1)):null,
    maxAgeHours:safeMaxAge,
    criticalAlerts:critical,
    warningAlerts:warnings,
    totalIssues:latest?safeInt(latest.total_issue_count):null
  };
}

module.exports={runReconciliation,getMonitoringSummary,getHealthSummary};
