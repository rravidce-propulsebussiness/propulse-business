const fs=require('fs');
const path=require('path');

const file=path.join(__dirname,'../src/services/servicePricingService.js');
const source=fs.readFileSync(file,'utf8');

const required=[
  "function normalizeCtaUrl(value)",
  "if(!url.startsWith('/')||url.startsWith('//')||/[\\\\\\r\\n]/.test(url))",
  "cta_url:normalizeCtaUrl(input.cta_url)"
];

for(const marker of required){
  if(!source.includes(marker)){
    console.error("FAIL: service pricing CTA validation marker missing:",marker);
    process.exit(1);
  }
}

const controllerFile=path.join(__dirname,'../src/controllers/servicePricingController.js');
const controllerSource=fs.readFileSync(controllerFile,'utf8');
const adminSource=fs.readFileSync(path.join(__dirname,'../../frontend/src/admin/pages/AdminServicePricing.jsx'),'utf8');
const homeSource=fs.readFileSync(path.join(__dirname,'../../frontend/src/pages/Home.jsx'),'utf8');
const growScaleMigration=fs.readFileSync(path.join(__dirname,'../src/database/migrations/20260927_service_pricing_grow_scale_only.sql'),'utf8');
if(!controllerSource.includes("['INVALID_PRICING','INVALID_CTA_URL'].includes(e.code)?400")){
  console.error('FAIL: service pricing update controller does not map INVALID_CTA_URL to 400');
  process.exit(1);
}

function validate(value){
  const url=String(value??'').trim()||'/contact';
  return url.startsWith('/')&&!url.startsWith('//')&&!/[\\\r\n]/.test(url);
}

const valid=['/contact','/leads','/pricing?plan=pro','/#services'];
for(const value of valid){
  if(!validate(value)){console.error("FAIL: valid internal CTA rejected:",value);process.exit(1)}
}

const invalid=['https://evil.example','//evil.example','javascript:alert(1)','data:text/html,alert(1)','/\\evil.example','/contact\nLocation:https://evil.example'];
for(const value of invalid){
  if(validate(value)){console.error("FAIL: unsafe CTA accepted:",value);process.exit(1)}
}


if(!source.includes("const CATEGORIES=['Grow','Scale'];")){
  console.error('FAIL: backend Service Pricing categories must be Grow and Scale only');
  process.exit(1);
}
if(!source.includes("WHERE category = ANY($1::text[])")){
  console.error('FAIL: Service Pricing list must filter out legacy categories');
  process.exit(1);
}
if(!adminSource.includes("const categories=['Grow','Scale']")||adminSource.includes("'Marketing','Lead Sales','Government Compliance'")){
  console.error('FAIL: Admin Service Pricing must expose only Grow and Scale');
  process.exit(1);
}
if(!homeSource.includes("['Grow','Scale'].includes(item?.category)")||homeSource.includes("category: 'Marketing'")||homeSource.includes("category: 'Lead Sales'")||homeSource.includes("category: 'Government Compliance'")){
  console.error('FAIL: public Service Pricing must use only Grow and Scale');
  process.exit(1);
}
if(!growScaleMigration.includes("DELETE FROM service_pricing")||!growScaleMigration.includes("CHECK (category IN ('Grow','Scale'))")){
  console.error('FAIL: database migration must remove and block legacy Service Pricing categories');
  process.exit(1);
}

console.log('Service pricing security and Grow/Scale regression test passed.');
