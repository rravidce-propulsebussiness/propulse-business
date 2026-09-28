const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const service=read('src/services/adminSystemHealthService.js');
const controller=read('src/controllers/adminController.js');
const routes=read('src/routes/adminRoutes.js');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const app=read('../frontend/src/App.jsx');
const page=read('../frontend/src/admin/pages/AdminSystemHealth.jsx');

assert(routes.includes("router.use(requireAuth,requireAdmin);"),'Admin routes must remain protected before system-health registration');
assert(routes.includes("router.get('/system-health',adminController.getSystemHealth)"),'Admin System Health endpoint must exist');
assert(controller.includes('adminSystemHealthService.getSystemHealth()'),'System Health controller must use the dedicated service');
assert(service.includes('pool.totalCount')&&service.includes('pool.waitingCount'),'System Health must expose database pool pressure');
assert(service.includes('checkUploadStorage()'),'System Health must check private/persistent upload storage');
assert(service.includes('workerHeartbeat.latestHeartbeat()'),'System Health must inspect the background worker heartbeat');
assert(service.includes('schema_migrations'),'System Health must report migration state');
assert(service.includes('lead_partner_sheet_connections')&&service.includes('admin_google_sheet_connections'),'System Health must report both sheet-sync systems');
assert(service.includes('leadPartnerSheets.failing>0')&&service.includes('adminSheets.failing>0'),'Row-level sheet failures must degrade overall system health');
assert(service.includes("Boolean(String(process.env.UPLOAD_STORAGE_ROOT||'').trim())"),'System Health may report whether persistent storage is configured without returning its path');
for(const secret of ['DB_PASSWORD','JWT_SECRET','RESEND_API_KEY','GOOGLE_CLIENT_SECRET'])assert(!service.includes('process.env.'+secret),'System Health must not read or expose '+secret);
assert(layout.includes("{to:'/admin/system-health',label:'System Health'}"),'Admin System navigation must include System Health');
assert(app.includes('AdminSystemHealth')&&app.includes('path="/admin/system-health"'),'Admin System Health page must be routed');
assert(page.includes("authRequest('/admin/system-health')"),'System Health UI must load the authenticated endpoint');
assert(page.includes('Auto refresh · 30s'),'System Health UI must support automatic refresh');
console.log('Admin System Health regression test passed.');
