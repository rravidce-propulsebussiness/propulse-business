const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const service=read('src/services/leadService.js');
const adminImport=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const csvImport=read('src/services/adminLeadCsvImportService.js');

assert(service.includes('function normalizePricingOverrides'),'Lead service must preserve partial imported pricing rows');
assert(service.includes('function mergePricing(base,overridePricing)')&&service.includes('normalizePricingOverrides(overridePricing?.shares)'),
  'Imported pricing must merge without shadowing its own argument (a duplicate name crashes the backend on start)');
assert(service.includes('const next={...current,...row}'),'Imported pricing must overlay Admin-configured pricing field by field');
assert(service.includes('resolveEffectivePricing(configured,pricing,pricingSource)'),'Create/update path must resolve imported/lead pricing over Admin pricing');
assert(service.includes("pricingSource==='rule'?configured"),'Blank imported pricing must use Admin configuration');
assert(service.includes('function assertValidPricing')&&service.includes("error.code='PRICING_REQUIRED'"),'Lead create/update must reject missing or zero pricing');
assert(service.includes('Lead pricing for ')&&service.includes('share(s) is incomplete'),'Import-only tiers must reject incomplete Normal/Pro pricing');

assert(adminImport.includes('propulse-lead-upload-sample.csv'),'CSV sample must use the Propulse filename');

assert(csvImport.includes('function parsePricing(raw)'),'CSV uploads must parse pricing columns');
assert(csvImport.includes("pricingSource:pricing?'import':'rule'"),'CSV uploads must choose imported pricing or configured pricing');
assert(csvImport.includes("accessSource:hasAccessOverride?'import':'rule'"),'CSV uploads must choose imported access values or configured access defaults');
assert(csvImport.includes('!isPricingColumn(key)'),'Pricing columns must not leak into custom fields');

console.log('Lead import pricing fallback regression test passed.');
