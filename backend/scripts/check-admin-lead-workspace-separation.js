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
const meta=read('../frontend/src/admin/pages/AdminLeadMeta.jsx');
const bulk=read('../frontend/src/admin/leadImportBulkEnhancer.js');

assert(app.includes('/admin/leads/upload')&&app.includes('/admin/leads/meta'),'Admin must have separate Upload Leads and Meta Lead Ads routes');
assert(app.includes('path="/admin/leads/sheets" element={<Navigate'),'Old Google Sheets bookmarks must redirect instead of 404ing');
assert(layout.includes("{to:'/admin/leads',label:'Manage Leads',end:true}"),'Manage Leads navigation must not absorb nested lead routes');
assert(layout.includes("{to:'/admin/leads/upload',label:'Upload Leads'}"),'Sidebar must expose Upload Leads');
assert(layout.includes("{to:'/admin/leads/meta',label:'Meta Lead Ads'}")&&!layout.includes('Google Sheets'),'Sidebar must expose Meta Lead Ads and no removed Google Sheets page');
assert(leads.includes('AdminLeadsV9 mode="manage"'),'Manage Leads must reuse the canonical lead component in manage mode');
assert(upload.includes('AdminLeadsV9 mode="upload"'),'Upload Leads must reuse the canonical importer instead of duplicating import logic');
assert(upload.includes("../leadImportBulkEnhancer.js")&&!leads.includes('leadImportBulkEnhancer'),'CSV bulk enhancer must belong only to Upload Leads');
assert(meta.includes('MetaLeadAdsPanel'),'Meta Lead Ads page must reuse the shared Meta panel');
assert(leadUi.includes("mode==='upload'"),'Canonical Admin lead component must support the separated upload workspace');
assert(!leadUi.includes('<h1>Lead Inventory</h1><p>Manage Basic/Premium grade'),'Old mixed lead inventory header must be removed');
assert(!leadUi.includes('<span>LEAD MARKETPLACE</span><h1>Lead Inventory</h1>'),'Manage Leads must not render the old inventory hero/header');
assert(!leadUi.includes('onClick={()=>load()}>↻ Refresh'),'Manage Leads must rely on automatic refresh instead of a manual refresh CTA');
assert(leadUi.includes('setInterval(refresh,60000)'),'Manage Leads must auto-refresh every 60 seconds');
assert(leadUi.includes("const leadOrigin=l=>l.lead_partner_id?'lead_partner':l.investor_user_id?'investor':'ours'"),'Lead origin must classify Partner first, then Investor, then Propulse-owned');
assert(leadUi.includes('<option value="ours">Our leads</option>')&&leadUi.includes('<option value="lead_partner">Lead Partner</option>')&&leadUi.includes('<option value="investor">Investor</option>'),'Manage Leads must expose origin filters');
assert(bulk.includes("controlIn(row,'Buyer Strategy')")&&bulk.includes("controlIn(row,'Pro Early Access')")&&bulk.includes("controlIn(row,'Max Buyers')"),'CSV bulk editor must target current buyer-access field labels');

console.log('Admin lead workspace separation regression test passed.');
