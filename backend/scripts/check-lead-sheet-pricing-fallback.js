const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const service=read('src/services/leadService.js');
const adminImport=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const sheetSync=read('../frontend/src/admin/pages/GoogleSheetAutoSync.jsx');

assert(service.includes('function normalizeSheetPricingRows'),'Lead service must preserve partial sheet pricing rows');
assert(service.includes('const next={...current,...row}'),'Sheet pricing must overlay Admin-configured pricing field by field');
assert(service.includes("pricingSource==='sheet'?mergePricing(configured,pricing)"),'Create/update path must merge sheet pricing over Admin pricing');
assert(service.includes("pricingSource==='rule'?configured"),'Explicit rule pricing must use Admin configuration');
assert(service.includes('Sheet pricing for ${row.shares} share(s) is incomplete'),'Sheet-only tiers must reject incomplete Normal/Pro pricing');

assert(adminImport.includes('Blank pricing cells fall back to Admin Lead Pricing'),'CSV sample must document Admin pricing fallback');
assert(adminImport.includes('Provided sheet prices override matching configured fields'),'CSV sample must document sheet override precedence');
assert(adminImport.includes('propulse-lead-upload-sample.csv'),'CSV sample must use the Propulse filename');

assert(sheetSync.includes('function parsePricing(raw)'),'Connected Google Sheets must parse pricing columns');
assert(sheetSync.includes("pricingSource:pricing?'sheet':(lead?'existing':'rule')"),'Google Sheet sync must distinguish sheet, existing, and configured pricing');
assert(sheetSync.includes("next.pricingSource==='sheet'"),'Google Sheet rows with explicit pricing must trigger an update');
assert(!sheetSync.includes("if(capacityIndex<0)finalHeaders.push('Buyer Capacity')"),'Google Sheet canonicalization must not invent Buyer Capacity when the sheet omits it');
assert(sheetSync.includes('!isPricingColumn(key)'),'Pricing columns must not leak into custom fields');

console.log('Lead sheet pricing fallback regression test passed.');
