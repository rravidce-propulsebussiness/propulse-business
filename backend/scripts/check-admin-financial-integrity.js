const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const service=read('src/services/adminFinancialIntegrityService.js');
const controller=read('src/controllers/adminController.js');
const routes=read('src/routes/adminRoutes.js');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const app=read('../frontend/src/App.jsx');
const page=read('../frontend/src/admin/pages/AdminFinancialIntegrity.jsx');

assert(routes.includes("router.use(requireAuth,requireAdmin);"),'Financial integrity must remain inside protected Admin routes');
assert(routes.includes("router.get('/financial-integrity',adminController.getFinancialIntegrity)"),'Financial integrity Admin endpoint must exist');
assert(controller.includes('adminFinancialIntegrityService.getFinancialIntegrity'),'Controller must delegate to the reconciliation service');
assert(service.includes('CACHE_TTL_MS=60*1000'),'Global reconciliation must be cached briefly to protect production DB load');
assert((service.match(/LIMIT 50/g)||[]).length>=8,'Mismatch detail queries must remain bounded');
assert(service.includes("referenceHint:'••••'"),'Investor transfer references must be masked in reconciliation output');
assert(service.includes("status:critical>0?'critical':warnings>0?'warning':'clean'"),'Reconciliation must expose overall severity');
assert(!/\b(INSERT INTO|UPDATE|DELETE FROM)\b/i.test(service),'Financial reconciliation service must remain read-only');
assert(layout.includes("{to:'/admin/financial-integrity',label:'Financial Integrity'}"),'Admin System navigation must expose Financial Integrity');
assert(app.includes('AdminFinancialIntegrity')&&app.includes('path="/admin/financial-integrity"'),'Financial Integrity page must be routed');
assert(page.includes("authRequest('/admin/financial-integrity'"),'Financial Integrity UI must use the authenticated Admin endpoint');
assert(page.includes('Run fresh reconciliation'),'Financial Integrity UI must support a forced fresh scan');
console.log('Admin financial integrity regression test passed.');
