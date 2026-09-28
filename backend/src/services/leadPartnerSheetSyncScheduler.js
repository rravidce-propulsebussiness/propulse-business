const pool = require('../config/database');
const inventoryService = require('./leadPartnerInventoryCompatService');

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let timer = null;
let running = false;

async function runAutoSync() {
  if (running) {
    console.log('Lead Partner Google Sheet auto-sync skipped: previous cycle is still running in this process.');
    return;
  }

  running = true;
  try {
    const connections = (await pool.query(
      `SELECT id,user_id,spreadsheet_id,sync_failure_count,next_retry_at
         FROM lead_partner_sheet_connections
        WHERE status='active'
          AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
        ORDER BY id ASC`
    )).rows;

    if (!connections.length) return;

    console.log(`Lead Partner Google Sheet auto-sync started: ${connections.length} active connection(s).`);

    for (const connection of connections) {
      try {
        const result = await inventoryService.syncGoogleSheet({
          userId: connection.user_id,
          connectionId: connection.id,
        });
        console.log(
          `Google Sheet auto-sync completed: connection=${connection.id}, created=${result.import.created}, duplicates=${result.import.duplicate}, failed=${result.import.failed}${result.import.failureSummary?.length?`, failureSummary=${result.import.failureSummary.map(x=>`${x.category}:${x.count}`).join('|')}`:''}`
        );
        if(result.import.failed>0&&result.import.failures?.length)console.warn(`Google Sheet row failures: connection=${connection.id}; ${result.import.failures.slice(0,3).join(' | ')}`);
      } catch (error) {
        if (error?.code === 'SYNC_IN_PROGRESS') {
          console.log(`Google Sheet auto-sync skipped busy connection=${connection.id}; another replica is syncing it.`);
          continue;
        }
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
        console.error(
          `Google Sheet auto-sync failed: connection=${connection.id}: ${error.message}; retry in ${retryMinutes} minute(s)`
        );
      }
    }
  } catch (error) {
    console.error('Lead Partner Google Sheet auto-sync cycle failed:', error.message);
  } finally {
    running = false;
  }
}
function startLeadPartnerSheetAutoSync({ unref = true, runImmediately = false } = {}) {
  if (timer) return () => {};

  console.log('Lead Partner Google Sheet auto-sync enabled: every 5 minutes.');
  if (runImmediately) void runAutoSync();
  timer = setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);
  if (unref) timer.unref?.();

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

module.exports = { startLeadPartnerSheetAutoSync, runAutoSync };
