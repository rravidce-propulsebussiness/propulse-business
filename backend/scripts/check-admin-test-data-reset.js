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

console.log('Admin test data reset regression test passed.');
