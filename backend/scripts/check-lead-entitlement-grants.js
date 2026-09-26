const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const migration=read('src/database/migrations/2026-09-26-lead-entitlement-grants.sql');
const grants=read('src/services/leadEntitlementGrantService.js');
const entitlement=read('src/services/leadEntitlementService.js');
const adminService=read('src/services/adminService.js');
const adminRoutes=read('src/routes/adminRoutes.js');
const reset=read('src/services/adminTestResetService.js');
const app=read('../frontend/src/App.jsx');
const layout=read('../frontend/src/admin/components/AdminLayout.jsx');
const page=read('../frontend/src/admin/pages/AdminLeadEntitlements.jsx');
const leads=read('../frontend/src/pages/LeadsV2.jsx');
const purchase=read('src/services/leadPurchaseService.js');
const marketplace=read('src/services/leadMarketplaceService.js');
const readService=read('src/services/leadReadService.js');
const accessStrategy=read('src/services/leadAccessStrategyService.js');

assert(migration.includes('CREATE TABLE IF NOT EXISTS lead_entitlement_settings'),'Entitlement settings table must exist');
assert(migration.includes('new_business_enabled BOOLEAN NOT NULL DEFAULT FALSE'),'New-business entitlement must be disabled by default');
assert(migration.includes('new_business_window_days INTEGER NOT NULL DEFAULT 7'),'Default registration window must be seven days');
assert(migration.includes('CREATE TABLE IF NOT EXISTS lead_entitlement_grants'),'Lead entitlement grants table must exist');
assert(migration.includes("WHERE source='new_business'"),'A partial unique index must enforce one welcome grant per business');
assert(migration.includes('ALTER COLUMN membership_id DROP NOT NULL'),'Claims must support non-membership grants');
assert(migration.includes('ADD COLUMN IF NOT EXISTS grant_id'),'Claims must link to entitlement grants');

assert(grants.includes("cpd.status='verified'"),'Grant eligibility must require a verified company proof');
assert(grants.includes("business.role!=='business'"),'Automatic entitlement must be restricted to business accounts');
assert(grants.includes('registeredAt.getTime()+int(settings.new_business_window_days'),'Welcome expiry must be measured from registration time');
assert(grants.includes("source='new_business' DO NOTHING"),'Welcome grant issuance must be idempotent');
assert(grants.includes("source,'admin'")||grants.includes("'admin',$2"),'Manual Admin grants must have an explicit admin source');
assert(grants.includes('BUSINESS_NOT_VERIFIED'),'Manual grants must reject unverified businesses');
assert(grants.includes('FOR UPDATE'),'Grant usage must lock active grant rows before claim consumption');

assert(entitlement.includes('grantService.findAvailableGrant(userId,entitlementType,pool)'),'Lead access must consider non-membership grants');
assert(entitlement.indexOf('grantService.findAvailableGrant(userId,type,client')<entitlement.indexOf('membershipAccess(userId,lead,client,{lock:true})'),'Claim flow must consume grant credits before membership allowance');
assert(entitlement.includes('grant_id,entitlement_type,expires_at'),'Grant claims must persist grant_id');
assert(entitlement.includes("entitlementSource:'membership'"),'Membership entitlement source must remain explicit');

assert(adminService.includes('leadEntitlementGrantService.ensureNewBusinessGrant(updated.user_id, client)'),'Verified company proof approval must immediately issue an eligible welcome grant');
assert(adminRoutes.includes("router.get('/lead-entitlements'"),'Admin entitlement overview route must exist');
assert(adminRoutes.includes("router.put('/lead-entitlements/settings'"),'Admin entitlement settings route must exist');
assert(adminRoutes.includes("router.post('/lead-entitlements/grants'"),'Admin manual grant route must exist');
assert(adminRoutes.includes("router.patch('/lead-entitlements/grants/:grantId/revoke'"),'Admin revoke route must exist');

assert(app.includes('/admin/leads/entitlements'),'Admin Lead Entitlements page route must exist');
assert(layout.includes("{to:'/admin/leads/entitlements',label:'Lead Entitlements'}"),'Lead Entitlements must appear inside Leads navigation');
assert(page.includes('Registration entitlement')&&page.includes('Grant leads to a verified business'),'Admin UI must expose welcome settings and manual grants');
assert(page.includes('Once per verified business'),'Admin UI must explain one-time eligibility');

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

console.log('Verified business lead entitlement regression test passed.');
