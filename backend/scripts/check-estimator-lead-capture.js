const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const routes=read('src/routes/customerFlowRoutes.js');
const controller=read('src/controllers/estimatorController.js');
const service=read('src/services/estimatorService.js');

assert.doesNotMatch(routes,/estimates\/:publicId\/convert/,'Estimator must not expose a second quote-conversion endpoint');
assert.doesNotMatch(controller,/convertCalculation/,'Estimator controller must not keep legacy conversion actions');
assert.doesNotMatch(service,/async function convertCalculation|estimator_quote_request|quote_requested/,'Estimator service must not keep legacy quote-conversion lifecycle code');
assert.match(service,/normalizeName\(contact\?\.name\)/,'Estimator calculation must require a customer name');
assert.match(service,/normalizePhone\(contact\?\.phone\)/,'Estimator calculation must require a valid customer mobile');
assert.match(service,/consent !== true/,'Estimator calculation must require consent');
assert.match(service,/ensureEstimatorContactLead/,'Estimator calculation must create or attach the canonical customer lead');
assert.match(service,/leadCaptured:Boolean\(leadId\)/,'Estimator response must confirm canonical lead capture');

console.log('Estimator direct customer-lead capture checks passed.');
