const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const layoutCss=read('../frontend/src/admin/components/AdminLayout.css');
const dashboard=read('../frontend/src/admin/pages/AdminDashboard.jsx');
const dashboardCss=read('../frontend/src/admin/pages/AdminDashboard.css');
const app=read('../frontend/src/App.jsx');
const upload=read('../frontend/src/admin/pages/AdminLeadUpload.jsx');
const sheets=read('../frontend/src/admin/pages/AdminLeadSheets.jsx');

assert(layout.includes('admin-sidebar-status')&&layout.includes('admin-top-user'),'Premium Admin shell controls must remain present');
assert(layout.includes("{to:'/admin/leads/upload',label:'Upload Leads'}"),'Upload Leads must remain a dedicated navigation destination');
assert(layout.includes("{to:'/admin/leads/sheets',label:'Google Sheets'}"),'Google Sheets must remain a dedicated navigation destination');
assert(layout.indexOf("{to:'/admin/faqs',label:'FAQs'}")>layout.indexOf("{to:'/admin/contact-social',label:'Contact & Social'}"),'FAQ must remain last in Website & Content');
assert(app.includes('<Route path="/admin/leads/upload" element={<AdminLeadUpload/>}/>'),'Upload Leads route must remain dedicated');
assert(app.includes('<Route path="/admin/leads/sheets" element={<AdminLeadSheets/>}/>'),'Google Sheets route must remain dedicated');
assert(upload.includes('<AdminLeadsV9 mode="upload"/>'),'Upload Leads must reuse the shared lead import logic');
assert(sheets.includes('<GoogleSheetAutoSync/>'),'Google Sheets page must reuse the shared sheet sync logic');

assert(dashboard.includes('const revenue=stats?.revenue||{}'),'Overview must use the backend revenue summary');
assert(dashboard.includes('Our lead sales + partner commission + investor commission'),'Overview must document the Propulse revenue definition');
assert(dashboard.includes('tone="propulse"')&&dashboard.includes('tone="partner"')&&dashboard.includes('tone="investor"'),'Overview must keep Propulse, Lead Partner and Investor streams separate');
assert(dashboard.includes('Belongs to Lead Partners'),'Lead Partner earnings must remain separate from Propulse commission');
assert(dashboard.includes('Belongs to investors'),'Investor allocation must remain separate from Propulse commission');
assert(dashboard.includes('investor.investorAllocated'),'Investor stream must use recorded investor allocation');
assert(layoutCss.includes('.admin-sidebar-status')&&layoutCss.includes('backdrop-filter:blur(16px)'),'Premium Admin shell styling must remain active');
assert(dashboardCss.includes('.admin-overview-grid')&&dashboardCss.includes('.admin-stream-badge'),'Premium Admin Overview styling must remain active');

console.log('Premium Admin overview and navigation regression test passed.');
