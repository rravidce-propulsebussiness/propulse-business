const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const migration=read('src/database/migrations/2026-09-26-lead-entitlement-grants.sql');
const accessMigration=read('src/database/migrations/2026-09-26-lead-entitlement-z-access-rules.sql');
const grants=read('src/services/leadEntitlementGrantService.js');
const entitlement=read('src/services/leadEntitlementService.js');
const adminService=read('src/services/adminService.js');
const adminRoutes=read('src/routes/adminRoutes.js');
const adminController=read('src/controllers/adminLeadEntitlementController.js');
const reset=read('src/services/adminTestResetService.js');
const app=read('../frontend/src/App.jsx');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const page=read('../frontend/src/admin/pages/AdminLeadEntitlements.jsx');
const leads=read('../frontend/src/pages/LeadsV2.jsx');
const purchase=read('src/services/leadPurchaseService.js');
const marketplace=read('src/services/leadMarketplaceService.js');
const readService=read('src/services/leadReadService.js');
const accessStrategy=read('src/services/leadAccessStrategyService.js');
const grantService=require('../src/services/leadEntitlementGrantService');

assert(migration.includes('CREATE TABLE IF NOT EXISTS lead_entitlement_settings'),'Entitlement settings table must exist');
assert(migration.includes('new_business_enabled BOOLEAN NOT NULL DEFAULT FALSE'),'New-business entitlement must be disabled by default');
assert(migration.includes('new_business_window_days INTEGER NOT NULL DEFAULT 7'),'Default registration window must be seven days');
assert(migration.includes('CREATE TABLE IF NOT EXISTS lead_entitlement_grants'),'Lead entitlement grants table must exist');
assert(migration.includes("WHERE source='new_business'"),'A partial unique index must enforce one welcome grant per business');
assert(migration.includes('ALTER COLUMN membership_id DROP NOT NULL'),'Claims must support non-membership grants');
assert(migration.includes('ADD COLUMN IF NOT EXISTS grant_id'),'Claims must link to entitlement grants');

for(const column of [
  'new_business_allow_single',
  'new_business_allow_shared',
  'new_business_allow_auto_release',
  'new_business_allow_exclusive',
  'allow_single',
  'allow_shared',
  'allow_auto_release',
  'allow_exclusive'
]){
  assert(accessMigration.includes(column),`Access-rule migration missing ${column}`);
}
assert(accessMigration.includes('new_business_allow_exclusive BOOLEAN NOT NULL DEFAULT FALSE'),'Exclusive welcome override must default off');
assert(accessMigration.includes('allow_exclusive BOOLEAN NOT NULL DEFAULT FALSE'),'Exclusive manual grant override must default off');

assert(grants.includes("cpd.status='verified'"),'Grant eligibility must require a verified company proof');
assert(grants.includes("business.role!=='business'"),'Automatic entitlement must be restricted to business accounts');
assert(grants.includes('registeredAt.getTime()+windowDays'),'Welcome expiry must be measured from registration time');
assert(grants.includes("source='new_business' DO NOTHING"),'Welcome grant issuance must be idempotent');
assert(grants.includes("VALUES($1,'admin'"),'Manual Admin grants must have an explicit admin source');
assert(grants.includes('BUSINESS_NOT_VERIFIED'),'Manual grants must reject unverified businesses');
assert(grants.includes('INVALID_ENTITLEMENT_ACCESS'),'Grants must reject configurations with no buyer-access type');
assert(grants.includes('FOR UPDATE'),'Grant usage must lock active grant rows before claim consumption');
assert(grants.includes('new_business_allow_single')&&grants.includes('new_business_allow_shared')&&grants.includes('new_business_allow_auto_release'),'Welcome settings must persist buyer-access rules');
assert(grants.includes('new_business_allow_exclusive'),'Welcome settings must persist Exclusive Early Access permission');
assert(grants.includes('allow_single,allow_shared,allow_auto_release,allow_exclusive'),'Issued grants must snapshot their access rules');

const baseGrant={allow_single:true,allow_shared:true,allow_auto_release:true,allow_exclusive:false};
assert(grantService.grantAllowsLead(baseGrant,{access_strategy:'permanent_single'}),'Single Buyer must be allowed when enabled');
assert(grantService.grantAllowsLead(baseGrant,{access_strategy:'shared'}),'Shared must be allowed when enabled');
assert(grantService.grantAllowsLead(baseGrant,{access_strategy:'auto_release'}),'Auto Release must be allowed when enabled');
assert(!grantService.grantAllowsLead({...baseGrant,allow_single:false},{access_strategy:'permanent_single'}),'Single Buyer must be blocked when disabled');
assert(!grantService.grantAllowsLead({...baseGrant,allow_shared:false},{access_strategy:'shared'}),'Shared must be blocked when disabled');
assert(!grantService.grantAllowsLead({...baseGrant,allow_auto_release:false},{access_strategy:'auto_release'}),'Auto Release must be blocked when disabled');
assert(!grantService.grantAllowsLead(baseGrant,{access_strategy:'shared'},{exclusiveActive:true,pro:false}),'Exclusive Early Access must not bypass Pro when override is off');
assert(grantService.grantAllowsLead({...baseGrant,allow_exclusive:true},{access_strategy:'shared'},{exclusiveActive:true,pro:false}),'Exclusive override must permit non-Pro grant access during the exclusive window');
assert(grantService.grantAllowsLead(baseGrant,{access_strategy:'shared'},{exclusiveActive:true,pro:true}),'Normal Pro access must still work when Exclusive override is off');

assert(entitlement.includes('grantService.findAvailableGrant(userId,entitlementType,pool,{'),'Lead access must consider access-filtered non-membership grants');
assert(entitlement.indexOf('grantService.findAvailableGrant(userId,type,client')<entitlement.indexOf('membershipAccess(userId,lead,client,{lock:true})'),'Claim flow must consume eligible grant credits before membership allowance');
assert(entitlement.includes('lead,exclusiveActive,pro'),'Grant lookup must receive lead strategy and exclusive-window context');
assert(entitlement.includes('grantService.grantAllowsLead(item,lead,{exclusiveActive,pro})'),'Lead access map must enforce grant strategy/exclusive eligibility');
assert(entitlement.includes("if(exclusiveActive&&!pro&&!grantAccess)"),'Exclusive window must allow the configured grant override before rejecting non-Pro access');
assert(entitlement.includes('grant_id,entitlement_type,expires_at'),'Grant claims must persist grant_id');
assert(entitlement.includes("entitlementSource:'membership'"),'Membership entitlement source must remain explicit');

assert(adminService.includes('leadEntitlementGrantService.ensureNewBusinessGrant(updated.user_id, client)'),'Verified company proof approval must immediately issue an eligible welcome grant');
assert(adminRoutes.includes("router.get('/lead-entitlements'"),'Admin entitlement overview route must exist');
assert(adminRoutes.includes("router.put('/lead-entitlements/settings'"),'Admin entitlement settings route must exist');
assert(adminRoutes.includes("router.post('/lead-entitlements/grants'"),'Admin manual grant route must exist');
assert(adminRoutes.includes("router.patch('/lead-entitlements/grants/:grantId/revoke'"),'Admin revoke route must exist');
assert(adminController.includes('INVALID_ENTITLEMENT_ACCESS:400'),'Invalid access-rule selections must return HTTP 400');

assert(app.includes('/admin/leads/entitlements'),'Admin Lead Entitlements page route must exist');
assert(layout.includes("{to:'/admin/leads/entitlements',label:'Lead Entitlements'}"),'Lead Entitlements must appear inside Leads navigation');
assert(page.includes('Registration entitlement')&&page.includes('Grant leads to a verified business'),'Admin UI must expose welcome settings and manual grants');
assert(page.includes('Once per verified business'),'Admin UI must explain one-time eligibility');
assert(page.includes('Single Buyer')&&page.includes('Shared')&&page.includes('Auto Release'),'Admin UI must expose all buyer-access strategy toggles');
assert(page.includes('Allow Exclusive Early Access'),'Admin UI must expose Exclusive Early Access override');
assert(page.includes('Claimed lead access duration'),'Admin UI must use a clear claimed-access duration label');
assert(page.includes("'Lifetime'"),'Zero claimed-access duration must be labeled Lifetime');
assert(page.includes('grant-access-tags'),'Grant history must display saved access rules');

const resetArray=reset.slice(reset.indexOf('const RESET_TABLES=['),reset.indexOf('];',reset.indexOf('const RESET_TABLES=['))+2);
assert(resetArray.includes("'lead_entitlement_grants'"),'Test reset must clear issued grants');
assert(!resetArray.includes("'lead_entitlement_settings'"),'Test reset must preserve entitlement configuration');

assert(leads.includes("leadAccess.entitlementSource==='new_business'?'Welcome lead entitlement'"),'Marketplace must label welcome entitlements accurately');
assert(leads.includes("leadAccess.entitlementSource==='admin'?'Propulse lead entitlement'"),'Marketplace must label manual entitlements accurately');
assert(entitlement.includes("claimIsActive"),'Lead access must distinguish active and expired historical claims');
assert(entitlement.includes('Previous complimentary lead access expired'),'Expired complimentary access must not be presented as active');
assert(purchase.includes("AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP) LIMIT 1 FOR UPDATE"),'Expired claims must not block a paid lead purchase');
assert(purchase.includes("LEFT JOIN lead_entitlement_claims c ON c.lead_id=l.id AND c.user_id=$1 AND (c.expires_at IS NULL OR c.expires_at>=CURRENT_TIMESTAMP)"),'Expired claims must disappear from Purchased Leads');
assert(marketplace.includes("ec.expires_at IS NULL OR ec.expires_at>=CURRENT_TIMESTAMP"),'Expired claims must not hide marketplace leads or occupy marketplace capacity');
assert(readService.includes("ec.expires_at IS NULL OR ec.expires_at>=CURRENT_TIMESTAMP")&&readService.includes("ec2.expires_at IS NULL OR ec2.expires_at>=CURRENT_TIMESTAMP"),'Lead counters must ignore expired entitlement claims');
assert(accessStrategy.includes("expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP"),'Buyer-capacity close checks must ignore expired entitlement claims');

console.log('Verified business lead entitlement and access-rule regression test passed.');
