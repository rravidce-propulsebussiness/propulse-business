const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const app=read('../frontend/src/App.jsx');
const packages=read('../frontend/src/pages/Packages.jsx');
const css=read('../frontend/src/pages/Packages.css');
const estimator=read('../frontend/src/pages/EstimatorWizard.jsx');
const home=read('../frontend/src/pages/Home.jsx');

assert.match(app,/path="\/packages"/);
assert.match(packages,/Standard vs Premium/);
assert.match(packages,/₹1,399/);
assert.match(packages,/₹1,599/);
assert.match(packages,/Gurjan BWP/);
assert.match(packages,/Greenply \/ Century Ply 710/);
assert.match(packages,/Hettich \/ Häfele/);
assert.match(packages,/CUSTOMISATIONS/);
assert.match(packages,/HDHMR sheet upgrade/);
assert.match(packages,/Gypsum false ceiling/);
assert.match(packages,/Get Detailed Interior Estimate/);
assert.match(packages,/warranty, brand, service and payment commitments belong to the business/i);
assert.match(css,/\.pkg-comparison/);
assert.match(css,/\.pkg-custom-grid/);
assert.match(estimator,/requestedPackage/);
assert.match(estimator,/finish_quality/);
assert.match(home,/Interior Packages/);

console.log('Interior packages page checks passed.');
