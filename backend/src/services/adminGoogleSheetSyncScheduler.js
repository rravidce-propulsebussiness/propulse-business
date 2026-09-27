const pool=require('../config/database');
const syncService=require('./adminGoogleSheetSyncService');

const AUTO_SYNC_INTERVAL_MS=5*60*1000;
const ADVISORY_LOCK_KEY=73190519;
let timer=null;
let running=false;

async function runAutoSync(){
  if(running){console.log('Admin Google Sheet auto-sync skipped: previous cycle is still running.');return}
  running=true;
  let client=null;
  try{
    client=await pool.connect();
    const lock=await client.query('SELECT pg_try_advisory_lock($1) AS acquired',[ADVISORY_LOCK_KEY]);
    if(!lock.rows[0]?.acquired){console.log('Admin Google Sheet auto-sync skipped: another backend instance is syncing.');return}
    const connections=(await client.query(`SELECT id FROM admin_google_sheet_connections WHERE status='active' AND (next_retry_at IS NULL OR next_retry_at<=CURRENT_TIMESTAMP) ORDER BY id ASC`)).rows;
    if(!connections.length)return;
    console.log(`Admin Google Sheet auto-sync started: ${connections.length} active connection(s).`);
    for(const connection of connections){
      try{
        const result=await syncService.syncConnection({connectionId:connection.id});
        const sync=result.sync||{};
        console.log(`Admin Google Sheet auto-sync completed: connection=${connection.id}, created=${sync.created||0}, updated=${sync.updated||0}, failed=${sync.failed||0}, skipped=${Boolean(sync.skipped)}`);
      }catch(error){
        await syncService.recordConnectionFailure(connection.id,error).catch(healthError=>console.error(`Admin Google Sheet sync health update failed: connection=${connection.id}: ${healthError.message}`));
        console.error(`Admin Google Sheet auto-sync failed: connection=${connection.id}: ${error.message}`);
      }
    }
  }catch(error){console.error('Admin Google Sheet auto-sync cycle failed:',error.message)}
  finally{
    if(client){try{await client.query('SELECT pg_advisory_unlock($1)',[ADVISORY_LOCK_KEY])}catch(_){}client.release()}
    running=false;
  }
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
