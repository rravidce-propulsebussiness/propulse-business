require('dotenv').config();
const pool = require('./config/database');
const { runMigrations } = require('./database/runMigrations');
const { startLeadPartnerSheetAutoSync } = require('./services/leadPartnerSheetSyncScheduler');
const { startAdminGoogleSheetAutoSync } = require('./services/adminGoogleSheetSyncScheduler');
const { startFinancialReconciliationScheduler } = require('./services/financialReconciliationScheduler');
const { startNotificationScheduler } = require('./services/notificationScheduler');
const { startPrivateStorageBackupScheduler } = require('./services/privateStorageBackupScheduler');
const { envFlag } = require('./config/runtimeFlags');
const workerHeartbeat = require('./services/backgroundWorkerHeartbeatService');
const operationalMonitoringService = require('./services/operationalMonitoringService');

let stopLeadPartnerAutoSync = () => {};
let stopAdminAutoSync = () => {};
let stopHeartbeat = async () => {};
let stopFinancialReconciliation = async () => {};
let stopNotifications = async () => {};
let stopPrivateStorageBackup = async () => {};
let shuttingDown = false;

async function recordFatalWorkerError(kind,error){
  if(!envFlag('OPERATIONAL_MONITORING_ENABLED',true))return;
  const capture=operationalMonitoringService.recordEvent({
    source:'worker',
    eventType:kind,
    severity:'error',
    message:error?.message||String(error||kind),
    stack:error?.stack||null,
    metadata:{fatal:true}
  }).catch(()=>{});
  await Promise.race([capture,new Promise(resolve=>setTimeout(resolve,750))]);
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; stopping background worker.`);
  const forceTimer = setTimeout(() => {
    console.error('Background worker shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10000);
  forceTimer.unref?.();

  try {
    stopLeadPartnerAutoSync();
    stopAdminAutoSync();
    await stopFinancialReconciliation();
    await stopNotifications();
    await stopPrivateStorageBackup();
    await stopHeartbeat();
    await pool.end();
    clearTimeout(forceTimer);
    process.exit(exitCode);
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

  const heartbeatIntervalMs=Math.min(300000,Math.max(5000,Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS)||30000));
  await workerHeartbeat.beat();
  stopHeartbeat = workerHeartbeat.startHeartbeat({ intervalMs:heartbeatIntervalMs, unref:false, runImmediately:false });

  stopLeadPartnerAutoSync = startLeadPartnerSheetAutoSync({ unref: false, runImmediately: true });
  stopAdminAutoSync = startAdminGoogleSheetAutoSync({ unref: false, runImmediately: true });
  stopFinancialReconciliation = startFinancialReconciliationScheduler({ unref: false, runImmediately: true });
  stopNotifications = startNotificationScheduler({ unref:false, runImmediately:true });
  stopPrivateStorageBackup = startPrivateStorageBackupScheduler({ unref:false, runImmediately:true });
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('uncaughtException', error => { console.error('Uncaught exception:', error?.stack || error); void recordFatalWorkerError('uncaught_exception',error).finally(()=>shutdown('uncaughtException', 1)); });
  process.once('unhandledRejection', reason => { console.error('Unhandled rejection:', reason?.stack || reason); void recordFatalWorkerError('unhandled_rejection',reason).finally(()=>shutdown('unhandledRejection', 1)); });
  console.log('Background worker running.');
}

start().catch(async error => {
  console.error('Background worker startup failed:', error?.stack || error);
  await recordFatalWorkerError('startup_failure',error).catch(()=>{});
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
