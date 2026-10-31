const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');

const service=read('backend/src/services/directProjectEnquiryService.js');
const routes=read('backend/src/routes/directProjectEnquiryRoutes.js');
const server=read('backend/src/server.js');
const migration=read('backend/src/database/migrations/20261101_direct_project_enquiries.sql');
const form=read('frontend/src/components/DirectProjectEnquiryForm.jsx');
const contact=read('frontend/src/pages/Contact.jsx');
const admin=read('frontend/src/admin/pages/AdminDirectEnquiries.jsx');
const leadEntry=read('frontend/src/admin/pages/AdminLeads.jsx');
const sidebar=read('frontend/src/admin/components/AdminLayout.jsx');

assert.match(migration,/CREATE TABLE IF NOT EXISTS propulse_direct_project_enquiries/);
assert.match(migration,/submission_key VARCHAR\(100\) NOT NULL UNIQUE/);
assert.match(service,/INSERT INTO propulse_direct_project_enquiries/);
assert.match(service,/ON CONFLICT \(submission_key\) DO NOTHING/);
assert.doesNotMatch(service,/INSERT INTO leads|createLead|leadService|leadMarketplace|marketplace_sync/,
  'Direct ProPulse enquiries must never create marketplace lead inventory');
assert.match(server,/app\.use\('\/api\/direct-project-enquiries',directProjectEnquiryRoutes\)/);
assert.match(routes,/router\.post\('\/',publicSubmissionLimit,/);
assert.match(routes,/router\.get\('\/',requireAdmin,/);
assert.match(routes,/router\.patch\('\/:id\/status',requireAdmin,adminWriteLimit,/);
assert.match(routes,/const publicSubmissionLimit=rateLimit/);
assert.match(form,/publicRequest\('\/direct-project-enquiries'/);
assert.match(form,/not offered for sale to other contractors/);
assert.match(form,/form\.consent/);
assert.doesNotMatch(form,/\/customer-flows\/|openLeadPopup/,
  'Direct contact must never enter the global marketplace consultation path');
assert.match(contact,/DirectProjectEnquiryForm/);
assert.match(contact,/Compare Professionals/);
assert.match(leadEntry,/params\.get\('view'\)==='direct'/);
assert.match(sidebar,/\/admin\/leads\?view=direct/);
assert.match(admin,/authRequest\('\/direct-project-enquiries\?/);
assert.match(admin,/method:'PATCH'/);

const {validateSubmission}=require('../src/services/directProjectEnquiryService');
const sample={
  name:'Home Owner',phone:'9876543210',email:'HOME@EXAMPLE.COM',
  serviceType:'construction',location:'Uppal, Hyderabad',
  requirement:'Independent G+1 home, plot 200 sq yd.',
  submissionKey:'direct_0123456789abcdef_abc',consent:true,
};
const safe=validateSubmission(sample);
assert.equal(safe.phone,'+919876543210');
assert.equal(safe.email,'home@example.com');
assert.equal(safe.serviceType,'construction');
assert.throws(()=>validateSubmission({...sample,consent:false}),/Consent/);
assert.throws(()=>validateSubmission({...sample,serviceType:'property'}),/construction or interiors/);
assert.throws(()=>validateSubmission({...sample,requirement:'short'}),/10–2000/);
console.log('Direct ProPulse enquiry storage, consent, admin visibility and marketplace isolation checks passed.');
