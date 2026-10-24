const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const service=read('src/services/adminTestResetService.js');
const controller=read('src/controllers/adminController.js');
const routes=read('src/routes/adminRoutes.js');
const app=read('../frontend/src/App.jsx');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const page=read('../frontend/src/admin/pages/AdminTestReset.jsx');
const manageLeads=read('../frontend/src/admin/pages/AdminLeads.jsx');

assert(service.includes("process.env.NODE_ENV!=='production'"),'Test reset must be enabled automatically only outside production');
assert(service.includes("ALLOW_ADMIN_DATA_RESET"),'Production reset must require an explicit environment flag');
assert(service.includes("RESET TEST DATA"),'Reset must require exact typed confirmation');
assert(service.includes("await client.query('BEGIN')")&&service.includes("await client.query('COMMIT')")&&service.includes("await client.query('ROLLBACK')"),'Reset must run transactionally');
assert(service.includes('pg_advisory_xact_lock'),'Reset must serialize concurrent reset attempts');
assert(service.includes('TRUNCATE TABLE')&&service.includes('RESTART IDENTITY CASCADE'),'Reset must clear dependent test transaction rows atomically');
assert(service.includes("UPDATE wallets SET balance=0"),'Reset must zero wallet balances when wallet history is cleared');
assert(service.includes("UPDATE coupons SET used_count=0"),'Reset must restore coupon usage counters after redemptions are cleared');
assert(service.includes("lead_partner_sheet_connections")&&service.includes("last_synced_at=NULL"),'Reset must preserve sheet connections while clearing their sync counters');

for(const forbidden of ["'users'","'industries'","'services'","'membership_plans'","'coupons'","'lead_partners'","'investor_settings'"]){
  const resetArray=service.slice(service.indexOf('const RESET_TABLES=['),service.indexOf('];',service.indexOf('const RESET_TABLES=['))+2);
  assert(!resetArray.includes(forbidden),`Reset must preserve configuration/identity table ${forbidden}`);
}

assert(routes.includes("router.get('/test-reset/preview'")&&routes.includes("router.post('/test-reset'"),'Admin reset routes must exist');
assert(controller.includes('adminTestResetService.reset'),'Admin controller must use the shared reset service');
assert(app.includes('/admin/test-reset'),'Admin reset page route must exist');
assert(layout.includes("{to:'/admin/test-reset',label:'Test Data Reset'}"),'Admin navigation must expose Test Data Reset');
assert(layout.indexOf("key:'system'")<layout.indexOf("key:'website'"),'System group must stay before Website & Content so FAQs remain last');
assert(page.includes('RESET TEST DATA')&&page.includes('/admin/test-reset'),'Reset page must use typed confirmation and protected Admin API');
assert(!manageLeads.includes('AdminLeadBulkClear'),'Manage Leads must not expose the old lead-only destructive reset');


assert(routes.includes("router.get('/launch-cleanup/preview'")&&routes.includes("router.post('/launch-cleanup'"),'Admin-only launch cleanup endpoints must exist');
assert(controller.includes('adminTestResetService.launchPreview')&&controller.includes('adminTestResetService.launchCleanup'),'Controller must use the guarded shared launch cleanup service');
assert(service.includes('const LAUNCH_CONFIRMATION=')&&service.includes('DELETE NON-ADMIN USERS AND LEADS'),'Production cleanup must require exact typed confirmation');
assert(service.includes('acknowledged!==true')&&service.includes("expected[key]"),'Production cleanup must require irreversible-action acknowledgement and fresh preview counts');
assert(service.includes("SELECT id FROM users WHERE id=$1 AND role='admin' AND is_active=TRUE"),'Only authenticated active admins may clean up');
assert(service.includes("DELETE FROM users WHERE role<>'admin'"),'Production launch must only delete non-admin accounts');
assert(service.includes('DELETE FROM leads'),'Launch cleanup must also purge lead records');
assert(service.includes("status='disabled'"),'Old admin Google Sheet sync connections must be paused to prevent repopulation');
assert(service.includes("status<>'rejected'")&&service.includes("status<>'cancelled'"),'Live financial payments and purchases must block deletion');
assert(service.includes('funded_wallets')&&service.includes('financial_dependencies'),'Funded wallets, investments and payouts must block deletion');
assert(service.includes('LAUNCH_VERIFICATION_FAILED')&&service.includes('criticalActionAudit.record'),'Cleanup must verify retained admins and audit the result');
assert(page.includes('/admin/launch-cleanup/preview')&&page.includes('/admin/launch-cleanup'),'UI must show a safe preview before launch cleanup');
assert(page.includes('launchAcknowledged')&&page.includes('launchConfirmation'),'UI must require confirmation and acknowledgement');
assert(read('../frontend/src/admin/pages/AdminUsers.jsx').includes('/admin/test-reset#launch-cleanup'),'User management must link to the existing cleanup workspace');

console.log('Admin test data reset regression test passed.');
