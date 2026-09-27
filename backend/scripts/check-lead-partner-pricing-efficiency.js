const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../src/services/leadPartnerPricingService.js'),'utf8');
const start=source.indexOf('async function applyRuleToExistingLeads');
const end=source.indexOf('async function saveRule',start);
assert(start>=0&&end>start,'Lead Partner pricing apply function must exist');
const block=source.slice(start,end);

assert(block.includes('UPDATE leads SET pricing=$1::jsonb'),'Pricing rule application must update matching leads set-wise');
assert(!block.includes('SELECT id FROM leads'),'Pricing rule application must not prefetch every lead ID');
assert(!/for\s*\(const lead of rows\)/.test(block),'Pricing rule application must not issue one UPDATE per lead');
assert(block.includes("COALESCE(partner_pricing_overridden,FALSE)=FALSE"),'Set-wise update must preserve partner override protection');
assert(block.includes("status IN ('available','paused')"),'Set-wise update must preserve eligible lead statuses');
assert(/industry_id=\$\$\{params\.length\}/.test(block),'Industry scope must remain parameterized');
assert(/city_id=\$\$\{params\.length\}/.test(block),'City scope must remain parameterized');

console.log('Lead Partner pricing set-based efficiency regression test passed.');
