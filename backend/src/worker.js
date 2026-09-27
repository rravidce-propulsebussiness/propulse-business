require('dotenv').config();
const pool = require('./config/database');
const { runMigrations } = require('./database/runMigrations');
const { startLeadPartnerSheetAutoSync } = require('./services/leadPartnerSheetSyncScheduler');
const { envFlag } = require('./config/runtimeFlags');

let stopAutoSync = () => {};
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; stopping background worker.`);
  const forceTimer = setTimeout(() => {
    console.error('Background worker shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimer.unref?.();

  try {
    stopAutoSync();
    await pool.end();
    clearTimeout(forceTimer);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceTimer);
    console.error('Background worker shutdown failed:', error?.stack || error);
    process.exit(1);
  }
}

async function start() {
  if (envFlag('RUN_MIGRATIONS_ON_WORKER_STARTUP', false)) {
    await runMigrations();
  } else {
    console.log('Database migrations skipped on worker startup.');
  }

  stopAutoSync = startLeadPartnerSheetAutoSync({ unref: false, runImmediately: true });
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  console.log('Background worker running.');
}

start().catch(async error => {
  console.error('Background worker startup failed:', error?.stack || error);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
