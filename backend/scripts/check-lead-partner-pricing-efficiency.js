const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'../src/services/leadPartnerPricingService.js'),'utf8');
const start=source.indexOf('async function applyRuleToExistingLeads');
const end=source.indexOf('async function saveRule',start);
assert(start>=0&&end>start,'Lead Partner pricing apply function must exist');
const block=source.slice(start,end);

assert(block.includes('UPDATE leads AS l'),'Pricing rules must be applied with one set-wise UPDATE');
assert(!block.includes('SELECT id FROM leads'),'Pricing rule application must not prefetch every lead ID');
assert(!/for\s*\(const lead of rows\)/.test(block),'Pricing rule application must not issue one UPDATE per lead');
assert(block.includes("COALESCE(l.partner_pricing_overridden,FALSE)=FALSE"),'Set-wise update must preserve manual pricing overrides');
assert(block.includes("l.status IN ('available','paused')"),'Set-wise update must preserve eligible lead statuses');
assert(block.includes('r.industry_id IS NULL OR r.industry_id=l.industry_id'),'Industry rule matching must retain specificity');
assert(block.includes('r.city_id IS NULL OR r.city_id=l.city_id'),'City rule matching must retain specificity');
assert(block.includes("r.lead_type=l.lead_type"),'Rules must match the lead type');
assert(block.includes("l.partner_base_pricing, l.pricing"),'Deactivated or deleted rules must revert to the base pricing');

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
