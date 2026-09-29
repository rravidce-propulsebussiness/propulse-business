const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const routes=read('src/routes/customerFlowRoutes.js');
const controller=read('src/controllers/estimatorController.js');
const estimator=read('src/services/estimatorService.js');
const funnelEvents=read('src/services/customerFunnelEventService.js');
const funnelAnalytics=read('src/services/customerFunnelAnalyticsService.js');
const wizard=read('../frontend/src/pages/EstimatorWizard.jsx');
const wizardCss=read('../frontend/src/pages/EstimatorWizard.css');
const companySite=read('../frontend/src/pages/CompanySitePage.jsx');
const companySiteCss=read('../frontend/src/pages/CompanySitePage.css');

assert.doesNotMatch(routes,/\/estimates\/:publicId\/convert/,'Legacy estimator quote-conversion route must stay removed');
assert.doesNotMatch(controller,/convertCalculation/,'Legacy quote-conversion controller must stay removed');
assert.doesNotMatch(estimator,/async function convertCalculation|estimator_quote_request|quote_requested/,'Estimator service must create customer leads directly without a separate quote conversion');
assert.doesNotMatch(estimator,/contactPending/,'Active estimator lifecycle must not recreate a contact-pending state');
assert.match(estimator,/leadCaptured:Boolean\(leadId\)/,'Estimator response must expose direct lead capture');
assert.match(estimator,/normalizeName\(contact\?\.name\)/,'Estimator must validate customer name before calculation');
assert.match(estimator,/normalizePhone\(contact\?\.phone\)/,'Estimator must validate mobile before calculation');
assert.match(estimator,/consent !== true/,'Estimator must require contact consent before calculation');
assert.doesNotMatch(funnelEvents,/'quote_form_opened'|'quote_submitted'/,'New legacy quote funnel events must not be accepted');
assert.doesNotMatch(funnelAnalytics,/Legacy quote form opened|Legacy quote request submitted/,'Estimator journey analytics must end at estimate and lead completion');
assert.match(wizard,/question\.questionKey==='estimate_mode'/,'Estimator must present a dedicated rough/detailed choice');
assert.match(wizard,/est-package-choice-grid/,'Estimator must present package choices as premium cards');
assert.match(wizard,/Download Estimate PDF/,'Completed estimates must offer a PDF download');
assert.match(wizard,/name and mobile number/i,'Estimator contact step must explain mandatory lead contact');
assert.match(wizardCss,/\.est-mode-grid/,'Rough/detailed cards need dedicated premium styling');
assert.match(wizardCss,/\.est-package-choice/,'Package choices need dedicated premium styling');
assert.match(wizard,/useSearchParams/,'Estimator must support validated customer deep-link preselection');
assert.match(wizard,/initialEstimatorAnswers/,'Estimator deep links must be validated against the published flow');
assert.match(companySite,/\?mode=rough/,'Company service pages must deep-link directly to rough estimate mode');
assert.match(companySite,/\?mode=detailed/,'Company service pages must deep-link directly to detailed estimate mode');
assert.match(companySite,/package=\$\{encodeURIComponent\(packageKey\)\}/,'Published package cards must carry the package selection into the estimator');
assert.match(companySiteCss,/\.csp-package-start/,'Package-to-estimator actions need dedicated premium styling');
assert.match(companySite,/activeDetails\.slice\(0,6\)/,'Public package cards must stay compact before expansion');
assert.match(companySite,/csp-spec-toggle/,'Customers must be able to expand the full published package specification list');
assert.match(companySiteCss,/\.csp-spec-toggle/,'Expandable package specifications need dedicated styling');

console.log('Customer-only estimator regression checks passed.');
