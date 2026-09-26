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
const industries=read('../frontend/src/pages/Industries.jsx');
const industriesCss=read('../frontend/src/pages/Industries.css');

assert(layout.includes('admin-sidebar-signature')&&layout.includes('admin-top-user'),'Premium Admin shell controls must remain present');
assert(!layout.includes('admin-sidebar-status'),'Duplicated sidebar health copy must stay removed');
assert(!layout.includes('admin-sidebar-user'),'Duplicated sidebar user profile must stay removed');

assert(layout.includes("{to:'/admin/leads/upload',label:'Upload Leads'}"),'Upload Leads must remain a dedicated navigation destination');
assert(layout.includes("{to:'/admin/leads/sheets',label:'Google Sheets'}"),'Google Sheets must remain a dedicated navigation destination');
assert(layout.includes("{to:'/admin/leads/entitlements',label:'Lead Entitlements'}"),'Lead Entitlements must remain in Leads navigation');
assert(layout.indexOf("{to:'/admin/faqs',label:'FAQs'}")>layout.indexOf("{to:'/admin/contact-social',label:'Contact & Social'}"),'FAQ must remain last in Website & Content');

assert(app.includes('<Route path="/admin/leads/upload" element={<AdminLeadUpload/>}/>'),'Upload Leads route must remain dedicated');
assert(app.includes('<Route path="/admin/leads/sheets" element={<AdminLeadSheets/>}/>'),'Google Sheets route must remain dedicated');
assert(upload.includes('<AdminLeadsV9 mode="upload"/>'),'Upload Leads must reuse the shared lead import logic');
assert(sheets.includes('<GoogleSheetAutoSync/>'),'Google Sheets page must reuse the shared sheet sync logic');

assert(app.includes('<Route path="/admin/industries" element={<Industries/>}/>'),'Industries must remain available in Admin');
assert(industries.includes("const adminMode = location.pathname.startsWith('/admin/')"),'Industries premium redesign must stay scoped to Admin');
assert(industries.includes('CATALOG / MASTER DATA'),'Admin Industries premium hero must remain');
assert(industries.includes('admin-master-stats'),'Admin Industries KPI cards must remain');
assert(industries.includes('master-tabs master-toolbar-tabs'),'Industries and Locations switch must stay inside the Admin toolbar');
assert(!industries.includes('MASTER STRUCTURE'),'Redundant Admin master-structure label must stay removed');
assert(!industries.includes('Organize industries, services and subservices used throughout Propulse.'),'Redundant Admin hierarchy explainer must stay removed');
assert(industries.includes('↑ Upload bulk'),'Industries bulk upload action must remain');
assert(industries.includes("+ Add {tab === 'industries' ? 'Industry' : 'State'}"),'Industries create action must remain');
assert(industries.includes('renderIndustryTree()')&&industries.includes('renderLocationTree()'),'Industry and Location hierarchy trees must remain');
assert(industriesCss.includes('/* Premium Admin Industries workspace */'),'Premium Admin Industries styling must remain');
assert(industriesCss.includes('.admin-master-page .tree-card'),'Admin hierarchy tree styling must remain scoped');
assert(industriesCss.includes('.admin-master-page .modal-card'),'Admin master-data modal styling must remain');
assert(industriesCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Desktop master-data KPI layout must remain');

assert(dashboard.includes('const revenue=stats?.revenue||{}'),'Overview must use the backend revenue summary');
assert(dashboard.includes('value={show(money(revenue.total))}'),'Overview revenue KPI must use the backend Propulse revenue total');
assert(dashboard.includes('title="Our leads"')&&dashboard.includes('title="Lead Partners"'),'Overview must keep Propulse and Lead Partner businesses visually separate');
assert(dashboard.includes('Investor activity'),'Overview must keep Investor activity visually separate');
assert(dashboard.includes('leadPartner.partnerEarnings'),'Lead Partner earnings must remain separate from Propulse commission');
assert(dashboard.includes('investor.investorAllocated'),'Investor allocation must remain separate from Propulse commission');
assert(dashboard.includes("label:'Propulse commission',value:leadPartner.revenueTotal"),'Lead Partner Propulse commission must use platform revenue');
assert(dashboard.includes("label:'Propulse commission',value:investor.revenueTotal"),'Investor Propulse commission must use platform revenue');

assert(!dashboard.includes('Propulse-owned, Lead Partner and Investor activity are separated so revenue and operations stay easy to understand.'),'Long Overview explainer must stay removed');
assert(!dashboard.includes('General admin work not already summarized'),'Redundant operations explainer must stay removed');
assert(!dashboard.includes('Live data'),'Redundant live-data pill must stay removed');

assert(layoutCss.includes('linear-gradient(180deg,#0d2d55 0%,#092541 48%,#071f38 100%)'),'Admin sidebar must keep the dark premium shell');
assert(layoutCss.includes('.admin-sidebar-signature'),'Premium sidebar signature card must remain active');
assert(layoutCss.includes('position:fixed;')&&layoutCss.includes('left:264px;')&&layoutCss.includes('right:0;'),'Admin header must stay fixed beside the desktop sidebar');
assert(layoutCss.includes('padding:70px 28px 42px;'),'Desktop Admin content must reserve space for the fixed header');
assert(layoutCss.includes('.admin-topbar{left:0;right:0;height:64px;padding:0 16px}'),'Mobile Admin header must stay fixed full width');
assert(layoutCss.includes('padding:64px 16px 34px'),'Mobile Admin content must reserve space for the fixed header');

assert(dashboardCss.includes('.admin-overview-grid'),'Premium KPI grid styling must remain active');
assert(dashboardCss.includes('.admin-business-grid'),'Premium two-column business layout must remain active');
assert(dashboardCss.includes('.admin-investor-panel'),'Premium Investor panel styling must remain active');
assert(dashboardCss.includes('.admin-dashboard-hero:before')&&dashboardCss.includes('.admin-dashboard-hero:after'),'Premium analytics hero decoration must remain active');
assert(dashboardCss.includes('grid-template-columns:repeat(4,minmax(0,1fr))'),'Desktop Overview must keep four primary KPI cards');

console.log('Premium Admin overview and navigation regression test passed.');
