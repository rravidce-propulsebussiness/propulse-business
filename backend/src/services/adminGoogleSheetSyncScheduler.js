const pool=require('../config/database');
const syncService=require('./adminGoogleSheetSyncService');
const notificationService=require('./notificationService');
const jobControl=require('./backgroundJobControlService');
const sheetSyncSettings=require('./sheetSyncSettingsService');
const {createIntervalScheduler}=require('./intervalSchedulerService');

const AUTO_SYNC_INTERVAL_MS=5*60*1000;
const SCHEDULER_TICK_MS=60*1000;
let running=false;

async function dueConnections(config,{onlyOne=false}={}){
  const interval=Math.max(1,Number(config?.intervalMinutes)||5);
  return(await pool.query(
    `SELECT id
       FROM admin_google_sheet_connections
      WHERE status='active'
        AND (next_retry_at IS NULL OR next_retry_at<=CURRENT_TIMESTAMP)
        AND (
          (sync_failure_count>0 AND next_retry_at IS NOT NULL)
          OR last_checked_at IS NULL
          OR last_checked_at<=CURRENT_TIMESTAMP-($1*INTERVAL '1 minute')
        )
      ORDER BY COALESCE(next_retry_at,last_checked_at,created_at) ASC,id ASC
      ${onlyOne?'LIMIT 1':''}`,
    [interval]
  )).rows;
}

async function runAutoSyncCore({automated=false,config=null}={}){
  if(running){console.log('Admin Google Sheet auto-sync skipped: previous cycle is still running in this process.');return{busy:true,skipped:true,reason:'process_busy'}}
  running=true;
  let created=0,updated=0,failedRows=0,connectionFailures=0,busyConnections=0,processedConnections=0;
  try{
    const connections=automated
      ?await dueConnections(config)
      :(await pool.query(`SELECT id FROM admin_google_sheet_connections WHERE status='active' ORDER BY id ASC`)).rows;
    if(!connections.length)return{connections:0,processedConnections:0,created:0,updated:0,failedRows:0,connectionFailures:0,busyConnections:0};
    console.log(`Admin Google Sheet auto-sync started: ${connections.length} active connection(s).`);
    for(const connection of connections){
      try{
        const result=await syncService.syncConnection({connectionId:connection.id,force:!automated});
        const sync=result.sync||{};
        if(result.busy||sync.busy){
          console.log(`Admin Google Sheet auto-sync skipped busy connection=${connection.id}; another replica is syncing it.`);
          busyConnections+=1;
          continue;
        }
        processedConnections+=1;created+=Number(sync.created||0);updated+=Number(sync.updated||0);failedRows+=Number(sync.failed||0);
        console.log(`Admin Google Sheet auto-sync completed: connection=${connection.id}, created=${sync.created||0}, updated=${sync.updated||0}, failed=${sync.failed||0}, skipped=${Boolean(sync.skipped)}`);
      }catch(error){
        connectionFailures+=1;
        const failure=await syncService.recordConnectionFailure(connection.id,error).catch(healthError=>{console.error(`Admin Google Sheet sync health update failed: connection=${connection.id}: ${healthError.message}`);return null});
        await notificationService.notifyAdmins({
          type:'admin_sheet_sync_failed',category:'sheet',severity:Number(failure?.sync_failure_count||1)>=3?'critical':'warning',
          title:'Admin Google Sheet sync failed',
          message:`Google Sheet connection #${connection.id} failed to sync. ${String(error.message||'Review the connection and retry.').slice(0,220)}`,
          actionUrl:'/admin/leads/sheets',relatedType:'admin_google_sheet_connection',relatedId:connection.id,
          dedupeKey:`admin-sheet-failure:${connection.id}:${new Date().toISOString().slice(0,10)}`,
          metadata:{failureCount:Number(failure?.sync_failure_count||1)}
        }).catch(notifyError=>console.error('Admin sheet failure notification failed:',notifyError.message));
        console.error(`Admin Google Sheet auto-sync failed: connection=${connection.id}: ${error.message}`);
      }
    }
    return{connections:connections.length,processedConnections,created,updated,failedRows,connectionFailures,busyConnections,failed:connectionFailures>0};
  }catch(error){console.error('Admin Google Sheet auto-sync cycle failed:',error.message);throw error}
  finally{running=false}
}
async function runAutoSync({source='scheduled',triggeredBy=null}={}){
  const automated=source!=='manual';
  let config=null;
  if(automated){
    config=await sheetSyncSettings.getConfig();
    if(!config.autoSyncEnabled||!config.adminSourcesEnabled)return{skipped:true,reason:'disabled',jobStatus:'skipped'};
    const due=await dueConnections(config,{onlyOne:true});
    if(!due.length)return{skipped:true,reason:'not_due',jobStatus:'skipped'};
  }
  return jobControl.execute({
    jobKey:'admin_google_sheet_sync',source,triggeredBy,
    task:()=>runAutoSyncCore({automated,config})
  });
}
const startAdminGoogleSheetAutoSync=createIntervalScheduler({
  intervalMs:SCHEDULER_TICK_MS,
  run:runAutoSync,
  startMessage:'Admin Google Sheet scheduler enabled: Admin-controlled interval; worker checks once per minute.',
});

module.exports={startAdminGoogleSheetAutoSync,runAutoSync,runAutoSyncCore,dueConnections,AUTO_SYNC_INTERVAL_MS,SCHEDULER_TICK_MS};
