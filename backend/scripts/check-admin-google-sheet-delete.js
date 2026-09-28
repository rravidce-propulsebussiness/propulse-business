const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(value,message)=>{if(!value)throw new Error(message)};

const page=read('../frontend/src/admin/pages/GoogleSheetAutoSync.jsx');
const css=read('../frontend/src/admin/pages/AdminLeadsV9.css');
const routes=read('src/routes/leadRoutes.js');
const controller=read('src/controllers/leadController.js');
const service=read('src/services/adminGoogleSheetSyncService.js');

assert(page.includes('Delete connection'),'Connected sheet UI must expose an explicit Delete connection action');
assert(page.includes("window.confirm('Delete this Google Sheet connection?"),'Deleting a sheet connection must require confirmation');
assert(page.includes('Leads already imported from it will stay in lead inventory'),'Delete confirmation must explain that imported leads are retained');
assert(page.includes("method:'DELETE'"),'Delete control must call the server-side DELETE endpoint');
assert(page.includes('removingId===record.id'),'Delete button must expose progress for the selected connection');
assert(css.includes('.v9-sheet-delete'),'Delete control must have a visible destructive-action style');
assert(routes.includes("router.delete('/google-sheet/connections/:id'"),'Google Sheet delete route is missing');
assert(controller.includes('disconnectGoogleSheet'),'Google Sheet delete controller is missing');
assert(service.includes("SET status='disabled'"),'Google Sheet deletion must remain a soft disable so history can be retained');

console.log('Admin Google Sheet delete connection regression test passed.');
