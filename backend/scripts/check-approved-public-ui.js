const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const app=read('../frontend/src/App.jsx');
const home=read('../frontend/src/pages/Home.jsx');
const homeCss=read('../frontend/src/pages/Home.css');
const quote=read('../frontend/src/pages/Solutions.jsx');
const quoteCss=read('../frontend/src/pages/Solutions.css');
const wizard=read('../frontend/src/pages/RequirementWizard.jsx');
const packages=read('../frontend/src/pages/Packages.jsx');
const publicHeader=read('../frontend/src/styles/PublicMarketingHeader.css');
const contact=read('../frontend/src/pages/Contact.jsx');

assert.match(app,/path="\/quote" element={<Solutions\/>}/);
assert.match(app,/path="\/solutions" element={<LegacySolutionRedirect\/>}/);
assert.match(app,/targetHash=hash\?'#'\+hash/);

assert.match(home,/Build\. Design\./);
assert.match(home,/All in One Place\./);
assert.match(home,/Get Free Quote/);
assert.match(home,/View Packages/);
assert.match(home,/Trusted Businesses/);
assert.match(home,/Transparent Process/);
assert.match(home,/hc-approved-service-card/);
assert.match(home,/\/quote#construction/);
assert.match(home,/\/quote#interiors/);
assert.match(home,/\/quote#property/);

assert.match(homeCss,/\.hc-approved-hero/);
assert.match(homeCss,/hcApprovedZoom/);
assert.match(homeCss,/hcApprovedCard/);

assert.match(quote,/What do you need help with\?/);
assert.match(quote,/quote-service-grid/);
assert.match(quote,/Construction/);
assert.match(quote,/Interiors/);
assert.match(quote,/Real Estate/);
assert.match(quote,/\/quote'\+location\.search\+'#'/);
assert.match(quoteCss,/quoteCardRise/);
assert.match(quoteCss,/quoteFlowIn/);
assert.match(quoteCss,/\.quote-flow \.rq-premium-hero/);
assert.match(quoteCss,/\.quote-flow \.irx-hero/);
assert.match(quoteCss,/\.quote-flow \.rex-hero/);

assert.match(wizard,/flowKey === 'property'/);
assert.match(wizard,/RealEstateRequirementExact/);
assert.match(packages,/\/quote\?package=/);
assert.match(publicHeader,/Approved homepage \/ quote mockup/);
assert.match(contact,/PublicContact/);
assert.match(contact,/audience=website/);
assert.match(contact,/Reach the ProPulse Team/);
assert.match(contact,/to="\/contact"/);
assert.doesNotMatch(contact,/Navigate to="\/#contact"/);

console.log('Approved public UI mockup checks passed.');
