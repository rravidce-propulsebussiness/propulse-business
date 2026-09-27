const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const routes=read('src/routes/leadRoutes.js');
const controller=read('src/controllers/leadController.js');
const service=read('src/services/adminGoogleSheetSyncService.js');
const ui=read('../frontend/src/admin/pages/GoogleSheetAutoSync.jsx');

assert(routes.includes("router.post('/google-sheet/sync',requireAdmin,leadController.syncGoogleSheet)"),'Admin Google Sheet sync must be protected by admin auth');
assert(controller.includes('adminGoogleSheetSyncService.syncGoogleSheet'),'Google Sheet controller must delegate sync work to the backend service');
assert(service.includes('fetchGoogleSheetCsv(url)'),'Backend sync must fetch the Google Sheet server-side');
assert(service.includes('ANY($1::text[])')&&service.includes('ANY($2::text[])'),'Backend sync must batch-match existing leads instead of downloading all leads');
assert(service.includes('crypto.createHash'),'Backend sync must fingerprint normalized sheet content');
assert(ui.includes("authRequest('/leads/google-sheet/sync'"),'Admin UI must use the single backend sync endpoint');
assert(!ui.includes("authRequest('/leads?status=all')"),'Admin Google Sheet UI must not download the full lead table');
assert(!ui.includes("authRequest('/pincodes/detect'"),'Admin Google Sheet UI must not perform per-row PIN lookups');
assert(!ui.includes("method:'PUT'"),'Admin Google Sheet UI must not issue per-row lead update requests');
assert(!ui.includes("authRequest('/leads',{method:'POST'"),'Admin Google Sheet UI must not issue per-row lead create requests');
console.log('Admin Google Sheet server-side sync regression test passed.');
