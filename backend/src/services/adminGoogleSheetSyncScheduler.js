const pool=require('../config/database');
const syncService=require('./adminGoogleSheetSyncService');
const notificationService=require('./notificationService');

const AUTO_SYNC_INTERVAL_MS=5*60*1000;
let timer=null;
let running=false;

async function runAutoSync(){
  if(running){console.log('Admin Google Sheet auto-sync skipped: previous cycle is still running in this process.');return}
  running=true;
  try{
    const connections=(await pool.query(`SELECT id FROM admin_google_sheet_connections WHERE status='active' AND (next_retry_at IS NULL OR next_retry_at<=CURRENT_TIMESTAMP) ORDER BY id ASC`)).rows;
    if(!connections.length)return;
    console.log(`Admin Google Sheet auto-sync started: ${connections.length} active connection(s).`);
    for(const connection of connections){
      try{
        const result=await syncService.syncConnection({connectionId:connection.id});
        const sync=result.sync||{};
        if(result.busy||sync.busy){
          console.log(`Admin Google Sheet auto-sync skipped busy connection=${connection.id}; another replica is syncing it.`);
          continue;
        }
        console.log(`Admin Google Sheet auto-sync completed: connection=${connection.id}, created=${sync.created||0}, updated=${sync.updated||0}, failed=${sync.failed||0}, skipped=${Boolean(sync.skipped)}`);
      }catch(error){
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
  }catch(error){console.error('Admin Google Sheet auto-sync cycle failed:',error.message)}
  finally{running=false}
}
function startAdminGoogleSheetAutoSync({unref=true,runImmediately=false}={}){
  if(timer)return()=>{};
  console.log('Admin Google Sheet auto-sync enabled: every 5 minutes.');
  if(runImmediately)void runAutoSync();
  timer=setInterval(runAutoSync,AUTO_SYNC_INTERVAL_MS);
  if(unref)timer.unref?.();
  return()=>{if(timer){clearInterval(timer);timer=null}}
}

module.exports={startAdminGoogleSheetAutoSync,runAutoSync};
