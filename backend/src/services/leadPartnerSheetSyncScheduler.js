const pool = require('../config/database');
const inventoryService = require('./leadPartnerInventoryCompatService');
const notificationService = require('./notificationService');
const jobControl = require('./backgroundJobControlService');
const sheetSyncSettings = require('./sheetSyncSettingsService');

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const SCHEDULER_TICK_MS = 60 * 1000;
let timer = null;
let running = false;

async function dueConnections(config,{onlyOne=false}={}) {
  const interval=Math.max(1,Number(config?.intervalMinutes)||5);
  return (await pool.query(
    `SELECT id,user_id,spreadsheet_id,sync_failure_count,next_retry_at
       FROM lead_partner_sheet_connections
      WHERE status='active'
        AND (next_retry_at IS NULL OR next_retry_at<=CURRENT_TIMESTAMP)
        AND (
          (sync_failure_count>0 AND next_retry_at IS NOT NULL)
          OR last_synced_at IS NULL
          OR last_synced_at<=CURRENT_TIMESTAMP-($1*INTERVAL '1 minute')
        )
      ORDER BY COALESCE(next_retry_at,last_synced_at,created_at) ASC,id ASC
      ${onlyOne?'LIMIT 1':''}`,
    [interval]
  )).rows;
}

async function runAutoSyncCore({automated=false,config=null}={}) {
  if (running) {
    console.log('Lead Partner Google Sheet auto-sync skipped: previous cycle is still running in this process.');
    return {busy:true,skipped:true,reason:'process_busy'};
  }

  running = true;
  let created=0,duplicates=0,failedRows=0,connectionFailures=0,busyConnections=0,processedConnections=0;
  try {
    const connections=automated
      ?await dueConnections(config)
      :(await pool.query(
        `SELECT id,user_id,spreadsheet_id,sync_failure_count,next_retry_at
           FROM lead_partner_sheet_connections
          WHERE status='active'
          ORDER BY id ASC`
      )).rows;

    if (!connections.length) return {connections:0,processedConnections:0,created:0,duplicates:0,failedRows:0,connectionFailures:0,busyConnections:0};

    console.log(`Lead Partner Google Sheet auto-sync started: ${connections.length} active connection(s).`);

    for (const connection of connections) {
      try {
        const result = await inventoryService.syncGoogleSheet({
          userId: connection.user_id,
          connectionId: connection.id,
        });
        processedConnections+=1;created+=Number(result.import.created||0);duplicates+=Number(result.import.duplicate||0);failedRows+=Number(result.import.failed||0);
        console.log(
          `Google Sheet auto-sync completed: connection=${connection.id}, created=${result.import.created}, duplicates=${result.import.duplicate}, failed=${result.import.failed}${result.import.failureSummary?.length?`, failureSummary=${result.import.failureSummary.map(x=>`${x.category}:${x.count}`).join('|')}`:''}`
        );
        if(result.import.failed>0&&result.import.failures?.length)console.warn(`Google Sheet row failures: connection=${connection.id}; ${result.import.failures.slice(0,3).join(' | ')}`);
        if(result.import.duplicate>0&&result.import.duplicateSamples?.length)console.log(`Google Sheet duplicate samples: connection=${connection.id}; ${result.import.duplicateSamples.slice(0,3).join(' | ')}`);
      } catch (error) {
        if (error?.code === 'SYNC_IN_PROGRESS') {
          console.log(`Google Sheet auto-sync skipped busy connection=${connection.id}; another replica is syncing it.`);
          busyConnections+=1;
          continue;
        }
        connectionFailures+=1;
        const failureCount = Math.max(1, Number(connection.sync_failure_count || 0) + 1);
        const retryMinutes = failureCount <= 1 ? 5 : failureCount === 2 ? 15 : failureCount === 3 ? 60 : 360;
        try {
          await pool.query(
            `UPDATE lead_partner_sheet_connections
                SET sync_failure_count=$1,
                    last_sync_error_at=CURRENT_TIMESTAMP,
                    last_sync_error=$2,
                    next_retry_at=CURRENT_TIMESTAMP + ($3 * INTERVAL '1 minute'),
                    updated_at=CURRENT_TIMESTAMP
              WHERE id=$4`,
            [failureCount, String(error.message || 'Google Sheet sync failed').slice(0, 500), retryMinutes, connection.id]
          );
        } catch (healthError) {
          console.error(`Google Sheet sync health update failed: connection=${connection.id}: ${healthError.message}`);
        }
        await notificationService.notifyUser({
          userId:connection.user_id,type:'lead_partner_sheet_sync_failed',category:'sheet',severity:failureCount>=3?'critical':'warning',
          title:'Google Sheet sync failed',
          message:`Your connected Google Sheet could not sync. Retry is scheduled in ${retryMinutes} minute(s).`,
          actionUrl:'/lead-partner/inventory',relatedType:'lead_partner_sheet_connection',relatedId:connection.id,
          dedupeKey:`partner-sheet-failure:${connection.id}:${new Date().toISOString().slice(0,10)}`,
          metadata:{failureCount,retryMinutes}
        }).catch(notifyError=>console.error('Lead Partner sheet failure notification failed:',notifyError.message));
        console.error(
          `Google Sheet auto-sync failed: connection=${connection.id}: ${error.message}; retry in ${retryMinutes} minute(s)`
        );
      }
    }
    return{connections:connections.length,processedConnections,created,duplicates,failedRows,connectionFailures,busyConnections,failed:connectionFailures>0};
  } catch (error) {
    console.error('Lead Partner Google Sheet auto-sync cycle failed:', error.message);
    throw error;
  } finally {
    running = false;
  }
}
async function runAutoSync({source='scheduled',triggeredBy=null}={}){
  const automated=source!=='manual';
  let config=null;
  if(automated){
    config=await sheetSyncSettings.getConfig();
    if(!config.autoSyncEnabled||!config.leadPartnerSourcesEnabled)return{skipped:true,reason:'disabled',jobStatus:'skipped'};
    const due=await dueConnections(config,{onlyOne:true});
    if(!due.length)return{skipped:true,reason:'not_due',jobStatus:'skipped'};
  }
  return jobControl.execute({
    jobKey:'lead_partner_google_sheet_sync',source,triggeredBy,
    task:()=>runAutoSyncCore({automated,config})
  });
}
function startLeadPartnerSheetAutoSync({ unref = true, runImmediately = false } = {}) {
  if (timer) return () => {};

  console.log('Lead Partner Google Sheet scheduler enabled: Admin-controlled interval; worker checks once per minute.');
  if (runImmediately) void runAutoSync({source:'startup'});
  timer = setInterval(()=>{void runAutoSync({source:'scheduled'})}, SCHEDULER_TICK_MS);
  if (unref) timer.unref?.();

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

module.exports = { startLeadPartnerSheetAutoSync, runAutoSync, runAutoSyncCore, dueConnections, AUTO_SYNC_INTERVAL_MS, SCHEDULER_TICK_MS };
