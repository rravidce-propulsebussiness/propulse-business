const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const wizard=read('../frontend/src/pages/RequirementWizard.jsx');
const quoteModel=read('../frontend/src/utils/customerQuotation.js');
const pdf=read('../frontend/src/utils/requirementQuotePdf.js');
const home=read('../frontend/src/pages/Home.jsx');
const globalLeadPopup=read('../frontend/src/components/GlobalLeadPopup.jsx');
const migration=read('src/database/migrations/20260930_quote_ready_construction_flow.sql');

assert.match(home,/propulse:open-lead-popup/);
assert.match(globalLeadPopup,/Tell Us Your Requirement/);
assert.match(globalLeadPopup,/Submit Requirement/);
assert.match(globalLeadPopup,/Continue to Detailed Requirement/);
assert.match(globalLeadPopup,/navigate\('\/quote#'\+hash\)/);
assert.match(wizard,/calculateRequirementQuotation/);
assert.match(wizard,/Generate Detailed Quotation/);
assert.match(wizard,/Download Detailed Quotation PDF/);
assert.match(wizard,/quotation:\s*submissionResult\?\.quotation/);
assert.match(quoteModel,/getConstructionPackage/);
assert.match(quoteModel,/total=Math\.round\(builtUp\*packageRate\)/);
assert.match(quoteModel,/PAYMENT_SCHEDULE/);
assert.match(quoteModel,/function specificationsFor/);
assert.match(quoteModel,/selected\.specs/);
assert.match(quoteModel,/effectiveRateText/);
assert.match(pdf,/Specifications/);
assert.match(pdf,/Schedule of Payments/);
assert.match(pdf,/Works \/ Costs Not Included/);
assert.match(pdf,/Points to Note/);
assert.match(migration,/built_up_area/);
assert.match(migration,/is_required=TRUE/);
assert.match(migration,/'basement','boolean'/);
assert.match(migration,/'site_access','single_select'/);
assert.match(migration,/Construction Quotation/);

console.log('Construction quotation flow checks passed.');
