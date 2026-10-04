const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const page=read('../frontend/src/pages/LeadPartnerInventory.jsx');
const css=read('../frontend/src/pages/LeadPartnerInventory.css');
const sidebar=read('../frontend/src/components/LeadPartnerSidebar.jsx');
const app=read('../frontend/src/App.jsx');
const contact=read('../frontend/src/pages/PortalContact.jsx');

assert(page.includes("const [workspace,setWorkspace]=useState('leads')"),'Lead Partner inventory must default to the My Leads workspace');
assert(page.includes("const [view,setView]=useState('grid')"),'Lead Partner leads must default to card/grid view');
assert(page.includes('My Leads')&&page.includes('Upload Leads')&&page.includes('Google Sheets'),'Lead Partner inventory must expose three separate workspaces');
assert(page.includes("workspace==='upload'&&<section className=\"lp-inventory-workspace lp-upload-card\""),'CSV upload must have its own workspace');
assert(page.includes("workspace==='sheets'&&<section className=\"lp-inventory-workspace lp-sheets-workspace\""),'Google Sheets must have its own workspace');
assert(page.includes("workspace==='leads'&&<section className=\"inventory-panel\""),'Lead inventory must have its own workspace');
assert(!page.includes('sourceOpen'),'Legacy mixed source panel state must be removed');
assert(css.includes('.lp-inventory-workspaces'),'Separated Lead Partner workspace navigation must be styled');
assert(css.includes('grid-template-columns:minmax(0,1fr)!important'),'Lead Partner inventory content must use the full available width');
assert(css.includes('.lp-sheets-workspace .partner-sheet-list'),'Sheet connections must render as dedicated cards');
assert(sidebar.includes("to:'/lead-partner/contact'"),'Lead Partner Contact must use a protected partner route');
assert(!sidebar.includes("contact?audience=lead_partners"),'Lead Partner sidebar must not point to the public contact query route');
assert(app.includes('path="/lead-partner/contact" element={<PortalContact audience="lead_partners"/>}'),'Protected Lead Partner Contact route must render the partner contact component');
assert(app.includes("audience==='lead_partners'")&&app.includes('to="/lead-partner/contact"'),'Legacy public contact query must redirect to the protected Lead Partner Contact route');
assert(contact.includes("audienceCopy")&&contact.includes("lead_partners"),'Partner contact component must keep Lead Partner-specific support copy');
console.log('Lead Partner inventory separated workspace regression test passed.');
