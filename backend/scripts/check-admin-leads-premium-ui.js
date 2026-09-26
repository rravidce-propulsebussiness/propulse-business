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
assert(leads.includes('v9-inventory-head'),'Premium inventory command bar must remain');
assert(leads.includes('Auto-refresh every 60s'),'Inventory refresh status must remain visible');
assert(leads.includes("refreshing?'Refreshing…':'Refresh data'"),'Manual refresh control must remain');

assert(leads.includes('v9-upload-workspace'),'Premium Upload Leads workspace must remain');
assert(leads.includes('LEAD OPERATIONS / CSV IMPORT'),'Upload Leads hero must remain');
assert(leads.includes('v9-upload-flow'),'Three-step upload workflow must remain visible');
assert(leads.includes('Download Sample CSV'),'CSV template action must remain');
assert(leads.includes('Choose CSV File'),'CSV upload action must remain');
assert(leads.includes('PIN detection')&&leads.includes('Duplicate protection'),'Upload validation guidance must remain');

assert(css.includes('/* Premium Manage Leads workspace */'),'Premium Manage Leads styling must remain');
assert(css.includes('.v9-leads>.v9-stats'),'Premium KPI styling must remain scoped to Manage Leads');
assert(css.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'Desktop Manage Leads must keep four KPI cards');
assert(css.includes('position:sticky;')&&css.includes('top:64px;'),'Desktop lead filters must stay sticky below the fixed Admin header');
assert(css.includes('.v9-leads>.v9-leads-panel>.v9-grid'),'Premium lead grid styling must remain');
assert(css.includes('grid-template-columns:repeat(auto-fill,minmax(350px,1fr))'),'Lead cards must remain responsive and readable');
assert(css.includes('.v9-card.premium:before'),'Premium lead cards must retain their tier accent');
assert(css.includes('.v9-card.exclusive:after'),'Exclusive lead cards must retain premium visual treatment');
assert(css.includes('@media(max-width:700px)'),'Manage Leads must retain mobile layout rules');
assert(css.includes('/* Premium Upload Leads workspace */'),'Premium Upload Leads styling must remain');
assert(css.includes('.v9-upload-hero'),'Premium Upload Leads hero styling must remain');
assert(css.includes('.v9-upload-flow'),'Upload workflow rail styling must remain');
assert(css.includes('.v9-import-guidance'),'Upload import guidance styling must remain');
assert(css.includes('/* Premium Google Sheets workspace */'),'Premium Google Sheets styling must remain');
assert(css.includes('.v9-sheet-console'),'Google Sheets sync console styling must remain');
assert(css.includes('.v9-sheet-source-card'),'Connected sheet cards must retain premium styling');

assert(app.includes('<Route path="/admin/leads/upload" element={<AdminLeadUpload/>}/>'),'Upload Leads must stay on a dedicated route');
assert(app.includes('<Route path="/admin/leads/sheets" element={<AdminLeadSheets/>}/>'),'Google Sheets must stay on a dedicated route');
assert(upload.includes('<AdminLeadsV9 mode="upload"/>'),'Upload page must keep shared lead import logic');
assert(sheets.includes('<GoogleSheetAutoSync/>'),'Google Sheets page must keep shared sync logic');
assert(sheets.includes('v9-sheet-workspace'),'Premium Google Sheets page shell must remain');
assert(sheets.includes('LEAD OPERATIONS / AUTOMATION'),'Google Sheets premium hero must remain');

console.log('Premium Manage Leads regression test passed.');
