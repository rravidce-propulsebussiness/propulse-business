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

const listStart=source.indexOf('async function list(userId,');
const listEnd=source.indexOf('function validateRuleInput',listStart);
assert(listStart>=0&&listEnd>listStart,'Lead Partner pricing workspace list function must exist');
const listBlock=source.slice(listStart,listEnd);
assert(!listBlock.includes('LIMIT 500'),'Pricing workspace must not load a fixed 500-lead snapshot');
assert(listBlock.includes('safeLimit=Math.min(100'),'Pricing workspace page size must be bounded');
assert(listBlock.includes('SELECT COUNT(*)::int total FROM leads'),'Pricing workspace must return a database total for pagination');
assert(listBlock.includes('rowParams.length-1')&&listBlock.includes('rowParams.length'),'Pricing workspace must use parameterized SQL pagination');
assert(listBlock.includes("CAST(l.id AS TEXT)"),'Pricing workspace search must support lead ID');

console.log('Lead Partner pricing set-based and pagination efficiency regression test passed.');
