const pool = require('../config/database');
const inventoryService = require('./leadPartnerInventoryCompatService');

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const ADVISORY_LOCK_KEY = 73190518;

let timer = null;
let running = false;

async function runAutoSync() {
  if (running) {
    console.log('Lead Partner Google Sheet auto-sync skipped: previous cycle is still running.');
    return;
  }

  running = true;
  let client = null;
  try {
    client = await pool.connect();
    const lock = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [ADVISORY_LOCK_KEY]);
    if (!lock.rows[0]?.acquired) {
      console.log('Lead Partner Google Sheet auto-sync skipped: another backend instance is syncing.');
      return;
    }

    const connections = (await client.query(
      `SELECT id,user_id,spreadsheet_id
         FROM lead_partner_sheet_connections
        WHERE status='active'
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
          `Google Sheet auto-sync completed: connection=${connection.id}, created=${result.import.created}, duplicates=${result.import.duplicate}, failed=${result.import.failed}`
        );
      } catch (error) {
        console.error(
          `Google Sheet auto-sync failed: connection=${connection.id}: ${error.message}`
        );
      }
    }
  } catch (error) {
    console.error('Lead Partner Google Sheet auto-sync cycle failed:', error.message);
  } finally {
    if (client) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
      } catch (_) {}
      client.release();
    }
    running = false;
  }
}

function startLeadPartnerSheetAutoSync() {
  if (timer) return () => {};

  console.log('Lead Partner Google Sheet auto-sync enabled: every 5 minutes.');
  timer = setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);
  timer.unref?.();

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

module.exports = { startLeadPartnerSheetAutoSync, runAutoSync };
