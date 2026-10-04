const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assert=(v,m)=>{if(!v)throw new Error(m)};

const migration=read('src/database/migrations/20260928_background_job_runs.sql');
const leaseMigration=read('src/database/migrations/20260928_background_job_leases.sql');
const control=read('src/services/backgroundJobControlService.js');
const registry=read('src/services/backgroundJobRegistryService.js');
const adminSheets=read('src/services/adminGoogleSheetSyncScheduler.js');
const partnerSheets=read('src/services/leadPartnerSheetSyncScheduler.js');
const intervalScheduler=read('src/services/intervalSchedulerService.js');
const notifications=read('src/services/notificationScheduler.js');
const financial=read('src/services/financialReconciliationScheduler.js');
const controller=read('src/controllers/adminController.js');
const routes=read('src/routes/adminRoutes.js');
const app=read('../frontend/src/App.jsx');
const nav=read('../frontend/src/admin/components/AdminLayout.jsx');
const page=read('../frontend/src/admin/pages/AdminBackgroundJobs.jsx');

assert(migration.includes('CREATE TABLE IF NOT EXISTS background_job_runs'),'Background job run ledger is missing');
assert(migration.includes("trigger_source IN ('scheduled','manual','startup')"),'Background job trigger source constraint is missing');
assert(leaseMigration.includes('CREATE TABLE IF NOT EXISTS background_job_leases'),'Background job lease table is missing');
assert(control.includes('INSERT INTO background_job_leases')&&control.includes('locked_until<=CURRENT_TIMESTAMP'),'Background jobs must use an expiring cross-process database lease');
assert(control.includes('releaseLease(jobKey,ownerToken)'),'Background job leases must be released after execution');
assert(control.includes("SECRET_KEY=/(password|token|secret"),'Background job summaries must redact secret-like fields');
assert(control.includes("status:'failed'")&&control.includes("status:'skipped'"),'Background job recorder must preserve failed/skipped states');

for(const [name,source,key] of [
  ['Admin sheet sync',adminSheets,'admin_google_sheet_sync'],
  ['Lead Partner sheet sync',partnerSheets,'lead_partner_google_sheet_sync'],
  ['Notification delivery',notifications,'notification_email_delivery'],
  ['Financial reconciliation',financial,'financial_reconciliation']
]){
  assert(source.includes("jobControl.execute")&&source.includes(key),name+' is not wired to the shared job recorder');
}
assert(notifications.includes('membership_expiry_reminders'),'Membership reminder scheduler is not recorded');
assert(adminSheets.includes('createIntervalScheduler')&&partnerSheets.includes('createIntervalScheduler')&&intervalScheduler.includes("source:'startup'")&&notifications.includes("source:'startup'")&&financial.includes("source:'startup'"),'Immediate worker runs must be labeled startup');

assert(registry.includes("retrySupported:false")&&registry.includes('database_backup_verification'),'Backup verification must be monitored but not HTTP retryable');
assert(registry.includes("background_job.retry"),'Admin manual retry must be audited');
assert(registry.includes("ROW_NUMBER() OVER(PARTITION BY job_key"),'Job history query must be bounded per job');

assert(controller.includes('getBackgroundJobs')&&controller.includes('retryBackgroundJob'),'Admin job controller endpoints are missing');
assert(routes.includes("router.get('/jobs'")&&routes.includes("router.post('/jobs/:jobKey/retry'"),'Admin job routes are missing');
assert(app.includes('AdminBackgroundJobs')&&app.includes('path="/admin/jobs"'),'Admin background-jobs page route is missing');
assert(nav.includes("{to:'/admin/jobs',label:'Background Jobs'}"),'Admin System navigation is missing Background Jobs');
assert(page.includes('Retry now')&&page.includes('External job')&&page.includes('Recent runs'),'Background Jobs UI is incomplete');

console.log('Background job control center regression test passed.');
