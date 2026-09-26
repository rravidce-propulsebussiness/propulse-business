const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const migration=read('src/database/migrations/20260926_lead_access_strategy.sql');
const access=read('src/services/leadAccessStrategyService.js');
const leadService=read('src/services/leadService.js');
const leadRead=read('src/services/leadReadService.js');
const purchase=read('src/services/leadPurchaseService.js');
const entitlement=read('src/services/leadEntitlementService.js');
const marketplace=read('src/services/leadMarketplaceService.js');
const partnerInventory=read('src/services/leadPartnerInventoryService.js');
const partnerPricing=read('src/services/leadPartnerPricingService.js');
const adminPricing=read('../frontend/src/admin/pages/AdminLeadPricing.jsx');
const adminLeads=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const partnerUi=read('../frontend/src/pages/LeadPartnerInventory.jsx');
const marketplaceUi=read('../frontend/src/pages/LeadsV2.jsx');

assert(migration.includes("access_strategy IN ('permanent_single','auto_release','shared')"),'Lead strategy constraint must allow only the three supported strategies');
assert(migration.includes('buyer_capacity BETWEEN 1 AND 3'),'Buyer capacity must support single buyer and cap at three');
assert(migration.includes("('basic','auto_release',3,24,48)"),'Basic default aging must be 1→2 at 24h and →3 at 48h');
assert(migration.includes("('premium','auto_release',3,48,96)"),'Premium default aging must keep exclusivity longer');
assert(migration.includes('lead_effective_buyer_capacity'),'Database must expose one effective-capacity function');

assert(access.includes('permanent_single')&&access.includes('auto_release')&&access.includes('shared'),'Shared access service must own all access strategies');
assert(access.includes('fallback.accessStrategy??fallback.defaultStrategy'),'Normalized Admin access settings must remain valid as lead defaults');
assert(access.includes('access_capacity_locked=COALESCE(access_capacity_locked,$1)'),'First acquisition must lock the current capacity stage');
assert(access.includes("UPDATE leads SET status='sold'"),'Lead must close when the locked capacity is filled');

assert(leadService.includes('accessService.resolveForLead'),'Lead creation must reuse the shared access configuration');
assert(leadService.includes("accessSource==='sheet'||accessSource==='rule'"),'Lead updates must resolve sheet/config access from one shared configuration');
assert(leadService.includes('Lead pricing must include exactly 1, 2 and 3 buyer tiers'),'Admin pricing must be fixed to 1/2/3 buyer stages');

assert(purchase.includes('lead-capacity:'),'Paid checkout must use a lead-wide capacity lock');
assert(purchase.includes('const requested=capacity'),'Buyer must not choose the sharing stage');
assert(purchase.includes('accessService.lockCapacity'),'First completed paid purchase must lock the stage');
assert(purchase.includes('accessService.closeIfFull'),'Paid purchases must close a full lead');

assert(entitlement.includes('lead-capacity:'),'Membership claims must use the same lead-wide capacity lock');
assert(entitlement.includes('accessService.effectiveCapacity'),'Membership claims must enforce effective buyer capacity');
assert(entitlement.includes('accessService.lockCapacity'),'Membership claims must lock the current stage');
assert(entitlement.includes('accessService.closeIfFull'),'Membership claims must close a full lead');
assert(entitlement.includes('const {isProMember}=require(\'./leadReadService\')'),'Membership access must reuse the shared Pro-membership check');
assert(entitlement.includes('!await isProMember(userId)')&&entitlement.includes('!pro)fail(\'Pro Early Access is still active\''),'Pro Early Access must block non-Pro claims without blocking Pro members');

assert(marketplace.includes('lead_effective_buyer_capacity'),'Marketplace must hide leads whose current buyer stage is full');
assert(marketplace.includes("lp.status='pending_payment'")&&marketplace.includes("pcap.status='pending'"),'Marketplace availability must reserve pending-payment buyer slots');
assert(leadRead.includes('occupied_buyer_count')&&leadRead.includes('effectiveBuyerCapacity-occupiedBuyerCount'),'Displayed remaining slots must include pending-payment reservations');
assert(partnerInventory.includes('accessStrategy:strategy'),'Lead Partner imports must pass the same access strategy to lead creation');
assert(partnerInventory.includes('lead_effective_buyer_capacity'),'Lead Partner inventory must expose the current buyer stage');
assert(partnerInventory.includes('lead_entitlement_claims'),'Lead Partner buyer counts must include membership claims');
assert(partnerInventory.includes('partnerProOnePrice'),'Lead Partner sheets must support an exact Pro 1 Buyer price');
assert(partnerPricing.includes('buildFixedPartnerPricing'),'Lead Partner sheet pricing must reuse the existing partner pricing curve');

assert(adminPricing.includes('BUYER_TIERS=[1,2,3]'),'Admin pricing UI must expose only 1/2/3 buyer tiers');
assert(adminPricing.includes('BUYER ACCESS DEFAULTS'),'Admin pricing must manage Basic/Premium access defaults');
assert(adminLeads.includes("'Access Strategy'")&&adminLeads.includes("'Release to 2 Hours'"),'Admin lead sample must include access strategy timing fields');
assert(partnerUi.includes("'Access Strategy'")&&partnerUi.includes("'Pro 1 Buyer'"),'Lead Partner sample must include access strategy and partner base price');
assert(partnerUi.includes('lead.effective_buyer_capacity||lead.buyer_capacity||3'),'Lead Partner UI must show the current buyer stage instead of only the configured maximum');
assert(marketplaceUi.includes('Current Buyer Access'),'Customer checkout must show system-selected buyer access');
assert(!marketplaceUi.includes('Select Number of Shares'),'Customer checkout must not ask the buyer to choose the sharing stage');
assert(!marketplaceUi.includes('selectedSharePack')&&!marketplaceUi.includes('setSelectedSharePack'),'Customer checkout must not keep obsolete buyer-controlled share state');
assert(marketplaceUi.includes('const currentPricingRow = buyModal?.pricing?.shares?.[0] || null'),'Checkout must use the one server-selected pricing stage');

console.log('Lead access strategy regression test passed.');
