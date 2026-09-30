const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const wizard=read('../frontend/src/pages/RequirementWizard.jsx');
const quoteModel=read('../frontend/src/utils/customerQuotation.js');
const pdf=read('../frontend/src/utils/requirementQuotePdf.js');
const home=read('../frontend/src/pages/Home.jsx');
const migration=read('src/database/migrations/20260930_quote_ready_construction_flow.sql');

assert.match(home,/Tell Us Your Requirement/);
assert.match(home,/Submit Basic Requirement/);
assert.match(home,/Get Detailed Construction Quote/);
assert.doesNotMatch(home,/setConsultOpen\(false\)\s*\n\s*navigate\('\/' \+ consultForm\.flowKey\)/);
assert.match(wizard,/calculateRequirementQuotation/);
assert.match(wizard,/Generate Detailed Quotation/);
assert.match(wizard,/Download Detailed Quotation PDF/);
assert.match(wizard,/quotation:\s*submissionResult\?\.quotation/);
assert.match(quoteModel,/construction-cost-estimator/);
assert.match(quoteModel,/PAYMENT_SCHEDULE/);
assert.match(quoteModel,/PACKAGE_SPECIFICATIONS/);
assert.match(quoteModel,/effectiveRateText/);
assert.match(pdf,/Package Specifications/);
assert.match(pdf,/Payment Schedule/);
assert.match(pdf,/Typical exclusions/);
assert.match(pdf,/Important terms/);
assert.match(migration,/built_up_area/);
assert.match(migration,/is_required=TRUE/);
assert.match(migration,/'basement','boolean'/);
assert.match(migration,/'site_access','single_select'/);
assert.match(migration,/Construction Quotation/);

console.log('Construction quotation flow checks passed.');
