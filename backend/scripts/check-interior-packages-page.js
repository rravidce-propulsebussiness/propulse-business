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
const constructionCatalog=read('../frontend/src/data/constructionPackageCatalog.js');
const interiorCatalog=read('../frontend/src/data/interiorPackageCatalog.js');
const retiredInteriorEstimator=read('src/database/migrations/20261002_zzz_disable_interior_cost_estimator.sql');
const nginx=read('../frontend/deploy/nginx.conf');

assert.match(app,/path="\/packages"/);
assert(app.includes('path="/interior-cost-estimator" element={<Navigate to="/packages#interior" replace/>}'));
assert(app.includes('path="/estimate/interior-cost-estimator" element={<Navigate to="/packages#interior" replace/>}'));
assert(app.includes('path="/construction-cost-estimator" element={<Navigate to="/quote?package=standard#construction" replace/>}'));
assert(retiredInteriorEstimator.includes("WHERE key='interior-cost-estimator'"));
assert(retiredInteriorEstimator.includes('is_active=FALSE'));
assert(nginx.includes('location = /estimate/interior-cost-estimator'));
assert(nginx.includes('return 301 "/packages#interior"'));

assert.match(packages,/Construction Packages/);
assert.match(packages,/Interior Packages/);
assert.match(packages,/CONSTRUCTION_PACKAGE_CATALOG/);
assert.match(packages,/INTERIOR_PACKAGES/);
assert.match(packages,/name: 'Standard'/);
assert.match(packages,/name: 'Premium'/);
assert.match(packages,/name: 'Royal'/);
assert.match(constructionCatalog,/rate: 1750/);
assert.match(constructionCatalog,/rate: 1899/);
assert.match(constructionCatalog,/rate: 2099/);
assert.match(constructionCatalog,/Tata 550 TMT/);
assert.match(constructionCatalog,/UltraTech 53 grade/);
assert.match(constructionCatalog,/Parryware Premium/);
assert.match(packages,/Get Quote/);
assert.match(interiorCatalog,/price: 1399/);
assert.match(interiorCatalog,/price: 1599/);
assert.match(interiorCatalog,/Gurjan BWP/);
assert.match(interiorCatalog,/Greenply \/ Century Ply 710/);
assert.match(interiorCatalog,/Hettich \/ Häfele/);
assert.match(packages,/Side-by-Side Comparison/);
assert.doesNotMatch(packages,/interior-cost-estimator/);
assert.doesNotMatch(packages,/Calculate Interior Estimate/);

assert.match(css,/\.pkg-premium-grid\.construction/);
assert.match(css,/\.pkg-comparison-table/);
assert.match(css,/\.pkg-category-nav/);
assert.match(wizard,/qualityByPackage/);
assert.match(wizard,/royal:\s*'luxury'/);
assert.match(quoteModel,/luxury:'Royal'/);
assert.match(home,/View Packages/);

console.log('Combined construction and interior packages page checks passed.');
