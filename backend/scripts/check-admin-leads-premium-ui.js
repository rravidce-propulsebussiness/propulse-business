const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const leads=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const css=read('../frontend/src/admin/pages/AdminLeadsV9.css');
const app=read('../frontend/src/App.jsx');
const upload=read('../frontend/src/admin/pages/AdminLeadUpload.jsx');
const sheets=read('../frontend/src/admin/pages/AdminLeadSheets.jsx');

assert(leads.includes('<Stat label="Basic"'),'Basic KPI must remain');
assert(leads.includes('<Stat label="Premium"'),'Premium KPI must remain');
assert(leads.includes('<Stat label="Exclusive"'),'Exclusive KPI must use compact premium copy');
assert(leads.includes('<Stat label="Total"'),'Total KPI must remain');

assert(leads.includes("leadOrigin=l=>l.lead_partner_id?'lead_partner':l.investor_user_id?'investor':'ours'"),'Lead origin logic must remain intact');
assert(leads.includes('<option value="ours">Our leads</option>'),'Our leads source filter must remain');
assert(leads.includes('<option value="lead_partner">Lead Partner</option>'),'Lead Partner source filter must remain');
assert(leads.includes('<option value="investor">Investor</option>'),'Investor source filter must remain');
assert(leads.includes("const id=setInterval(refresh,60000)"),'Manage Leads auto-refresh must remain');
assert(!leads.includes('All Leads</'),'Duplicate All Leads heading must stay removed');
assert(!leads.includes('Newest leads appear first'),'Redundant inventory explainer must stay removed');

assert(css.includes('/* Premium Manage Leads workspace */'),'Premium Manage Leads styling must remain');
assert(css.includes('.v9-leads>.v9-stats'),'Premium KPI styling must remain scoped to Manage Leads');
assert(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'Desktop Manage Leads must keep four KPI cards');
assert(css.includes('position:sticky;')&&css.includes('top:84px;'),'Desktop lead filters must stay sticky below the fixed Admin header');
assert(css.includes('.v9-leads>.v9-leads-panel>.v9-grid'),'Premium lead grid styling must remain');
assert(css.includes('grid-template-columns:repeat(auto-fill,minmax(315px,1fr))'),'Lead cards must remain responsive and compact');
assert(css.includes('.v9-card.premium:before'),'Premium lead cards must retain their tier accent');
assert(css.includes('.v9-card.exclusive:after'),'Exclusive lead cards must retain premium visual treatment');
assert(css.includes('@media(max-width:700px)'),'Manage Leads must retain mobile layout rules');

assert(app.includes('<Route path="/admin/leads/upload" element={<AdminLeadUpload/>}/>'),'Upload Leads must stay on a dedicated route');
assert(app.includes('<Route path="/admin/leads/sheets" element={<AdminLeadSheets/>}/>'),'Google Sheets must stay on a dedicated route');
assert(upload.includes('<AdminLeadsV9 mode="upload"/>'),'Upload page must keep shared lead import logic');
assert(sheets.includes('<GoogleSheetAutoSync/>'),'Google Sheets page must keep shared sync logic');

console.log('Premium Manage Leads regression test passed.');
