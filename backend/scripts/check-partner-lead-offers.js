// Platform offers must not reduce Lead Partner earnings: coupons and promotion lead credits apply
// only to ProPulse-owned leads unless Admin enables "Also allow on Lead Partner leads" per coupon.
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const migration=read('src/database/migrations/20261114_coupon_partner_lead_option.sql');
assert(/applies_to_partner_leads BOOLEAN NOT NULL DEFAULT FALSE/.test(migration),'Coupon partner-lead option must default to off');
const coupons=read('src/services/couponService.js');
assert(coupons.includes("fail('Offers cannot be used on Lead Partner leads','PARTNER_LEAD_NOT_ELIGIBLE')"),'Coupon validation must refuse Lead Partner leads');
assert(coupons.includes('if(partnerLead&&!coupon.applies_to_partner_leads)continue;'),'Public offers must be hidden on Lead Partner leads');
assert(read('src/services/leadPurchaseService.js').includes("purchaseType:'lead',industryId:lead.industry_id,leadId:lead.id"),'Lead purchase must validate coupons against the lead');
const grants=read('src/services/leadEntitlementGrantService.js');
assert(grants.includes("CASE WHEN g.source='promotion'")&&grants.includes('if(lead.lead_partner_id&&grant.partner_leads_allowed===false)return false;'),'Promotion lead credits must not claim Lead Partner leads');
assert(/access_capacity_locked,lead_partner_id\s+FROM leads WHERE id=\$1 FOR UPDATE/.test(read('src/services/leadEntitlementService.js')),'Lead claim must load lead_partner_id');
assert(read('src/controllers/leadPurchaseController.js').includes('PARTNER_LEAD_NOT_ELIGIBLE:400'),'Purchase must return 400 for partner-lead coupon refusals');
console.log('Partner lead offers regression test passed.');
