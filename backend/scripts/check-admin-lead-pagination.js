const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const routes=read('src/routes/leadRoutes.js');
const controller=read('src/controllers/leadController.js');
const service=read('src/services/leadService.js');
const ui=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');

assert(routes.includes("router.get('/admin-page',requireAdmin,leadController.getAdminLeadsPage)"),'Admin Leads must expose a protected paginated endpoint');
assert(controller.includes('leadService.getAdminLeadsPage'),'Admin Leads controller must use the paginated service');
assert(service.includes('async function getAdminLeadsPage'),'Admin Leads paginated service must exist');
assert(service.includes('Math.min(100'),'Admin Leads page size must have a hard upper bound');
assert(service.includes('LIMIT $')&&service.includes('OFFSET $'),'Admin Leads query must use database pagination');
assert(service.includes("origin==='lead_partner'")&&service.includes("origin==='investor'")&&service.includes("origin==='ours'"),'Admin Leads pagination must support origin filters');
assert(service.includes("['public_requirement','public_estimator'].includes")&&!service.includes("contactState==='awaiting_contact'")&&!service.includes("contactState==='contact_ready'"),'Admin Leads pagination must support customer intake source filters without reviving retired contact-state filtering');
assert(service.includes("Number.isInteger(Number(leadId))")&&service.includes("'l.id=?'"),'Admin Leads pagination must support exact lead-id deep links');
assert(ui.includes('All intake sources')&&ui.includes('Customer forms')&&ui.includes('Estimators'),'Manage Leads must expose customer intake source filters');
assert(!ui.includes('All contact states')&&!ui.includes('Contact ready')&&!ui.includes('Awaiting contact'),'Manage Leads must keep retired contact-readiness filters removed');
assert(ui.includes("initialQueryValue('source'")&&ui.includes("initialQueryValue('leadId'"),'Manage Leads must honor exact deep-linked customer acquisition filters');
assert(ui.includes("req(managePath(targetPage))"),'Manage Leads must request the paginated admin endpoint');
assert(ui.includes("else if(silent){applyLeads(await req('/leads?status=all'))}"),'Upload workspace must keep full lead data for duplicate checks');
assert(ui.includes('v9-pagination'),'Manage Leads must render pagination controls');
console.log('Admin Leads server-side pagination regression test passed.');
