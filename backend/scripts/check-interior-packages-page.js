const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const app=read('../frontend/src/App.jsx');
const packages=read('../frontend/src/pages/Packages.jsx');
const css=read('../frontend/src/pages/Packages.css');
const wizard=read('../frontend/src/pages/RequirementWizard.jsx');
const quoteModel=read('../frontend/src/utils/customerQuotation.js');
const home=read('../frontend/src/pages/Home.jsx');

assert.match(app,/path="\/packages"/);
assert(app.includes('path="/interior-cost-estimator" element={<Navigate to="/packages#interior" replace/>}'));
assert(app.includes('path="/construction-cost-estimator" element={<Navigate to="/quote#construction" replace/>}'));

assert.match(packages,/Construction Packages/);
assert.match(packages,/Interior Packages/);
assert.match(packages,/Standard, Premium & Royal/);
assert.match(packages,/₹1,699/);
assert.match(packages,/₹1,899/);
assert.match(packages,/₹2,099/);
assert.match(packages,/Tata 550 TMT/);
assert.match(packages,/UltraTech 53 grade/);
assert.match(packages,/Parryware Premium/);
assert.match(packages,/Get .* Quote/);
assert.match(packages,/Standard vs Premium Interiors/);
assert.match(packages,/₹1,399/);
assert.match(packages,/₹1,599/);
assert.match(packages,/Gurjan BWP/);
assert.match(packages,/Greenply \/ Century Ply 710/);
assert.match(packages,/Hettich \/ Häfele/);
assert.match(packages,/HDHMR sheet upgrade/);
assert.doesNotMatch(packages,/interior-cost-estimator/);
assert.doesNotMatch(packages,/Calculate Interior Estimate/);

assert.match(css,/\.pkg-construction-grid/);
assert.match(css,/\.pkg-construction-table/);
assert.match(css,/\.pkg-custom-grid/);
assert.match(wizard,/qualityByPackage/);
assert.match(wizard,/royal:\s*'luxury'/);
assert.match(quoteModel,/luxury:'Royal'/);
assert.match(home,/View Packages/);

console.log('Combined construction and interior packages page checks passed.');
