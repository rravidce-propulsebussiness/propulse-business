const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const inventory=read('src/services/leadPartnerInventoryService.js');
const ui=read('../frontend/src/pages/LeadPartnerInventory.jsx');
const investor=read('../frontend/src/pages/InvestorInvestmentSection.jsx');

assert(inventory.includes("n==='singleonly'"),'Lead Partner Google Sheet import must accept Single Only wording');
assert(inventory.includes("interiordesignandhomeinteriors:'interiordesignandhomeimprovement'")&&inventory.includes('canonicalIndustryValue'),'Lead Partner sheet import must normalize legacy Interior Design & Home Interiors values to the active Interior Design & Home Improvement catalog');
assert(inventory.includes('Industry, Service and Subservice are all blank'),'Blank classification rows must report a precise actionable reason');
assert(inventory.includes('const locationCache=new Map()'),'Lead Partner sheet import must cache repeated PIN/location resolution within one file');
assert(!inventory.includes('state_id=$1,updated_at=CURRENT_TIMESTAMP'),'Lead Partner PIN state persistence must not write the nonexistent india_pincodes.updated_at column');
assert(inventory.includes('SET state_id=$1')&&inventory.includes('WHERE pincode=$2 AND (state_id IS DISTINCT FROM $1 OR state_id IS NULL)'),'Lead Partner PIN import must still persist the canonical State ID');
assert(inventory.includes('const settings=await partnerPricing.getSettings()'),'Partner pricing settings must be loaded once per import rather than per row');
assert(inventory.includes('failureSummary:summarizeFailures(failures)'),'Lead Partner import must return categorized failure diagnostics');
assert(inventory.includes("if (error.code === 'DUPLICATE_LEAD')")&&inventory.includes('duplicateSamples.push(detail)'),'Duplicate rows must be counted separately from genuine failures');
assert(inventory.includes('failures.push(detail)'),'Only genuine import errors must populate the failure list');
assert(!investor.includes('const isSold ='),'Unused investor isSold helper must remain removed');
console.log('Lead Partner CSV import diagnostics/efficiency regression test passed.');
