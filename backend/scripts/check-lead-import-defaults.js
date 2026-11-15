const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const upload=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const pricingUi=read('../frontend/src/admin/pages/AdminLeadPricing.jsx');
const leadService=read('src/services/leadService.js');
const csvImport=read('src/services/adminLeadCsvImportService.js');


assert(!upload.includes('LeadImportDefaults'),'Manual CSV upload must not duplicate connection default buttons');
assert(!upload.includes('uploadDefaults'),'Manual CSV upload must not keep hidden connection-default state');
assert(upload.includes('const parsed=await enrichLocations(raw.map(make));'),'Manual CSV import must parse the uploaded row directly');
assert(upload.includes('Blank pricing and buyer-access fields use your Admin Lead Pricing configuration'),'Manual CSV upload must explain Admin fallback for blank values');
assert(upload.includes("strategyRaw==='singleonly'"),'Manual CSV must accept Single Only as an explicit sheet strategy');

assert(csvImport.includes("applyDefaults({...original,Source:get(original,['Source'])||source},defaults)"),'CSV rows must pass through the backend precedence helper');
assert(csvImport.includes("n==='singleonly'"),'CSV Access Strategy must accept Single Only wording');

assert(pricingUi.includes('<option value="permanent_single">Single Only</option>'),'Lead Pricing must expose Single Only while retaining permanent_single internally');
assert(leadService.includes('resolveEffectivePricing(configured,pricing,pricingSource)'),'Sheet pricing must merge over Admin configured pricing');
assert(leadService.includes('function mergePricing(base,overridePricing)'),'Pricing must keep one field-level import-over-config merge path');

console.log('Lead import optional defaults regression test passed.');
