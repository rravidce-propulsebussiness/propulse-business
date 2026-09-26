const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const app=read('../frontend/src/App.jsx');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const leads=read('../frontend/src/admin/pages/AdminLeads.jsx');
const leadUi=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const upload=read('../frontend/src/admin/pages/AdminLeadUpload.jsx');
const sheets=read('../frontend/src/admin/pages/AdminLeadSheets.jsx');

assert(app.includes('/admin/leads/upload')&&app.includes('/admin/leads/sheets'),'Admin must have separate Upload Leads and Google Sheets routes');
assert(layout.includes("{to:'/admin/leads',label:'Manage Leads',end:true}"),'Manage Leads navigation must not absorb nested lead routes');
assert(layout.includes("{to:'/admin/leads/upload',label:'Upload Leads'}"),'Sidebar must expose Upload Leads');
assert(layout.includes("{to:'/admin/leads/sheets',label:'Google Sheets'}"),'Sidebar must expose Google Sheets');
assert(!leads.includes('GoogleSheetAutoSync'),'Manage Leads must not render Google Sheet connection UI');
assert(leads.includes('AdminLeadsV9 mode="manage"'),'Manage Leads must reuse the canonical lead component in manage mode');
assert(upload.includes('AdminLeadsV9 mode="upload"'),'Upload Leads must reuse the canonical importer instead of duplicating import logic');
assert(sheets.includes('GoogleSheetAutoSync'),'Google Sheets page must reuse the canonical sheet sync component');
assert(leadUi.includes("mode==='upload'"),'Canonical Admin lead component must support the separated upload workspace');
assert(!leadUi.includes('<h1>Lead Inventory</h1><p>Manage Basic/Premium grade'),'Old mixed lead inventory header must be removed');

console.log('Admin lead workspace separation regression test passed.');
