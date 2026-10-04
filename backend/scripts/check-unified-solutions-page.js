const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const app=read('../frontend/src/App.jsx');
const solutions=read('../frontend/src/pages/Solutions.jsx');
const css=read('../frontend/src/pages/Solutions.css');
const home=read('../frontend/src/pages/Home.jsx');
const packages=read('../frontend/src/pages/Packages.jsx');

assert.match(app,/const Solutions=lazy/);
assert.match(app,/path="\/quote" element={<Solutions\/>}/);
assert.match(app,/path="\/solutions" element={<LegacySolutionRedirect\/>}/);
assert.match(app,/LegacySolutionRedirect/);
assert.match(app,/path="\/build" element={<LegacySolutionRedirect hash="construction"\/>}/);
assert.match(app,/path="\/design" element={<LegacySolutionRedirect hash="interiors"\/>}/);
assert.match(app,/path="\/property" element={<LegacySolutionRedirect hash="property"\/>}/);

assert.match(solutions,/quote-flow-switcher/);
assert.match(solutions,/Choose quote type/);
assert.match(solutions,/Construction/);
assert.match(solutions,/Interiors/);
assert.match(solutions,/Real Estate/);
assert.match(solutions,/RequirementWizard flowKey={active\.flowKey}/);
assert.match(solutions,/location\.search/);
assert.match(solutions,/aria-pressed={activeKey===key}/);
assert.match(css,/\.quote-flow-switcher/);
assert.match(css,/quoteFlowIn/);
assert.match(css,/\.quote-flow \.rq-premium-hero/);
assert.match(css,/\.quote-flow \.irx-hero/);
assert.match(css,/\.quote-flow \.rex-hero/);

assert.match(home,/\/quote#construction/);
assert.match(home,/\/quote#interiors/);
assert.match(home,/\/quote#property/);
assert.match(packages,/\/quote\?package=/);

console.log('Approved unified quote page checks passed.');
