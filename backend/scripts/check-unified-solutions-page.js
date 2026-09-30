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
assert.match(app,/path="\/solutions" element={<Solutions\/>}/);
assert.match(app,/LegacySolutionRedirect/);
assert.match(app,/path="\/build" element={<LegacySolutionRedirect hash="construction"\/>}/);
assert.match(app,/path="\/design" element={<LegacySolutionRedirect hash="interiors"\/>}/);
assert.match(app,/path="\/property" element={<LegacySolutionRedirect hash="property"\/>}/);

assert.match(solutions,/ONE HOMEOWNER WORKSPACE/);
assert.match(solutions,/Construction Packages|Construction/);
assert.match(solutions,/Interiors/);
assert.match(solutions,/Real Estate/);
assert.match(solutions,/RequirementWizard flowKey={active\.flowKey}/);
assert.match(solutions,/location\.search/);
assert.match(css,/\.sol-switch/);
assert.match(css,/\.sol-flow \.rq-premium-header/);
assert.match(css,/\.sol-flow \.irx-header/);
assert.match(css,/\.sol-flow \.rq-premium-hero/);
assert.match(css,/\.sol-flow \.irx-hero/);
assert.match(css,/\.sol-flow \.rex-hero/);
assert.doesNotMatch(solutions,/sol-active-summary/);

assert.match(home,/\/solutions#construction/);
assert.match(home,/\/solutions#interiors/);
assert.match(home,/\/solutions#property/);
assert.match(packages,/\/solutions\?package=/);

console.log('Unified homeowner solutions page checks passed.');
