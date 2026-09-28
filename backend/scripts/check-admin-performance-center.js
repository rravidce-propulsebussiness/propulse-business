const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(value,message)=>{if(!value)throw new Error(message)};

const service=read('src/services/adminPerformanceService.js');
const controller=read('src/controllers/adminController.js');
const routes=read('src/routes/adminRoutes.js');
const page=read('../frontend/src/admin/pages/AdminPerformanceCenter.jsx');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const app=read('../frontend/src/App.jsx');

assert(service.includes('pg_stat_database'),'Performance Center must read database-level statistics');
assert(service.includes('pg_stat_activity'),'Performance Center must inspect connection and transaction pressure');
assert(service.includes('pg_stat_user_tables'),'Performance Center must expose table growth and dead tuples');
assert(service.includes('pg_stat_user_indexes'),'Performance Center must expose index observations');
assert(service.includes("event_type='slow_request'"),'Performance Center must reuse the existing slow API monitor');
assert(service.includes("extname='pg_stat_statements'"),'pg_stat_statements support must be optional and detected');
assert(!service.includes('CREATE EXTENSION'),'Application runtime must never install PostgreSQL extensions automatically');
assert(service.includes('sanitizeSql'),'Displayed SQL samples must mask literal values');
assert(service.includes('Zero scans only means unused since PostgreSQL statistics were last reset'),'Zero-scan indexes must not be presented as safe-to-drop automatically');
assert(routes.includes("router.get('/performance',adminController.getPerformance)"),'Admin performance endpoint is missing');
assert(controller.includes('adminPerformanceService.getPerformanceOverview()'),'Admin controller must use the dedicated performance service');
assert(page.includes("authRequest('/admin/performance')"),'Performance Center UI must load the authenticated endpoint');
assert(page.includes('This page is read-only'),'Performance Center must stay observational rather than destructive');
assert(layout.includes("{to:'/admin/performance',label:'Performance'}"),'Performance Center must appear in System navigation');
assert(app.includes('AdminPerformanceCenter')&&app.includes('path="/admin/performance"'),'Performance Center route is missing');

console.log('Admin Database & API Performance Center regression test passed.');
