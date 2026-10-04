const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const migration=read('src/database/migrations/2026-09-26-lead-entitlement-grants.sql');
const accessMigration=read('src/database/migrations/2026-09-26-lead-entitlement-z-access-rules.sql');
const ruleMigration=read('src/database/migrations/2026-09-27-lead-entitlement-registration-rules.sql');
const campaignMigration=read('src/database/migrations/2026-09-27-z-business-entitlement-campaigns.sql');
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
assert(ruleMigration.includes('CREATE TABLE IF NOT EXISTS lead_entitlement_registration_rules'),'Targeted registration-rule table must exist');
assert(ruleMigration.includes("verification_scope IN ('any','verified','unverified')"),'Registration rules must support verified, non-verified and any verification targets');
assert(ruleMigration.includes('industry_id INTEGER REFERENCES industries'),'Registration rules must support industry targeting');
assert(ruleMigration.includes('state_id INTEGER REFERENCES states')&&ruleMigration.includes('city_id INTEGER REFERENCES cities'),'Registration rules must support location targeting');
assert(ruleMigration.includes('registration_rule_id INTEGER'),'Issued registration grants must retain their source rule');
assert(campaignMigration.includes('CREATE TABLE IF NOT EXISTS lead_entitlement_business_campaigns'),'Business entitlement campaign table must exist');
assert(campaignMigration.includes("audience_scope IN ('all','specific_users')"),'Business entitlements must support all or specific-user audiences');
assert(campaignMigration.includes("verification_scope IN ('any','verified','unverified')"),'Business entitlements must support verification targeting');
assert(campaignMigration.includes('industry_id INTEGER REFERENCES industries')&&campaignMigration.includes('state_id INTEGER REFERENCES states')&&campaignMigration.includes('city_id INTEGER REFERENCES cities'),'Business entitlements must support industry and location targeting');
assert(campaignMigration.includes("source IN ('admin','new_business','campaign')"),'Campaign grants must be a supported entitlement source');
assert(campaignMigration.includes('campaign_id INTEGER'),'Campaign-issued grants must retain campaign traceability');
assert(campaignMigration.includes('uq_lead_entitlement_campaign_user'),'Campaign issuance must be idempotent per user');
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

assert(grants.includes("cpd.status='verified'"),'Business context must detect verification status');
assert(grants.includes("rule.verification_scope==='verified'")&&grants.includes("rule.verification_scope==='unverified'"),'Registration-rule matching must support verified and non-verified businesses');
assert(grants.includes('business.industry_ids.includes(Number(rule.industry_id))'),'Registration rules must match business industries');
assert(grants.includes('business.state_ids.includes(Number(rule.state_id))')&&grants.includes('business.city_ids.includes(Number(rule.city_id))'),'Registration rules must match business locations');
assert(grants.includes('ruleSpecificity'),'Most-specific matching registration rule must win');
assert(grants.includes("business.role!=='business'"),'Automatic entitlement must be restricted to business accounts');
assert(grants.includes('registeredAt.getTime()+windowDays'),'Welcome expiry must be measured from registration time');
assert(grants.includes("source='new_business' DO NOTHING"),'Welcome grant issuance must be idempotent');
assert(grants.includes("VALUES($1,'admin'"),'Manual Admin grants must have an explicit admin source');
assert(grants.includes('BUSINESS_NOT_VERIFIED'),'Manual grants must reject unverified businesses');
assert(grants.includes('INVALID_ENTITLEMENT_ACCESS'),'Grants must reject configurations with no buyer-access type');
assert(grants.includes('FOR UPDATE'),'Grant usage must lock active grant rows before claim consumption');
assert(grants.includes('allow_single,allow_shared,allow_auto_release,allow_exclusive'),'Registration rules and issued grants must persist buyer-access rules');
assert(grants.includes('allow_single,allow_shared,allow_auto_release,allow_exclusive'),'Issued grants must snapshot their access rules');
assert(grants.includes('async function updateGrant'),'Grant service must support entitlement edits');
assert(grants.includes('async function deleteGrant'),'Grant service must support entitlement deletes');
assert(grants.includes('async function createRegistrationRule'),'Grant service must support multiple registration-rule creation');
assert(grants.includes('async function updateRegistrationRule'),'Grant service must support registration-rule edits');
assert(grants.includes('async function deleteRegistrationRule'),'Grant service must support registration-rule deletes');
assert(grants.includes('async function createBusinessCampaign'),'Grant service must create audience-targeted business entitlements');
assert(grants.includes('async function updateBusinessCampaign'),'Business entitlement campaigns must be editable');
assert(grants.includes('async function deleteBusinessCampaign'),'Business entitlement campaigns must be deletable');
assert(grants.includes("campaign.audience_scope==='specific_users'"),'Campaign matching must support selected business users');
assert(grants.includes("campaign.verification_scope==='verified'")&&grants.includes("campaign.verification_scope==='unverified'"),'Campaign matching must support verification filters');
assert(grants.includes('bps.industry_id=')&&grants.includes('bpl.state_id=')&&grants.includes('bpl2.city_id='),'Campaign matching must enforce industry/state/city filters');
assert(grants.includes("SELECT u.user_id,'campaign',$2")&&grants.includes('jsonb_to_recordset($1::jsonb)'),'Matching businesses must receive campaign grants through a batched insert');
assert(grants.includes('DELETE FROM lead_entitlement_grants WHERE id=ANY($1::int[])'),'Campaign sync must batch unused-recipient grant deletes');
assert(grants.includes('WHERE id=ANY($1::int[])')&&grants.includes('revokeIds'),'Campaign sync must batch recipient revocations');
assert(grants.includes('updatePayload')&&grants.includes('insertPayload'),'Campaign sync must batch existing and new recipient mutations');
assert(grants.includes('CAMPAIGN_ALLOWANCE_BELOW_USAGE'),'Campaign edits must protect already-used credits');
assert(grants.includes("grant.source==='admin'&&claimCount===0"),'Unused manual grants should be hard-deletable');
assert(grants.includes("WHERE g.revoked_at IS NULL"),'Deleted/revoked grants must stay out of Recent entitlements');

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
assert(adminRoutes.includes("router.post('/lead-entitlements/rules'"),'Admin registration-rule create route must exist');
assert(adminRoutes.includes("router.post('/lead-entitlements/grants'"),'Admin manual grant route must exist');
assert(adminRoutes.includes("router.put('/lead-entitlements/grants/:grantId'"),'Admin entitlement edit route must exist');
assert(adminRoutes.includes("router.delete('/lead-entitlements/grants/:grantId'"),'Admin entitlement delete route must exist');
assert(adminRoutes.includes("router.put('/lead-entitlements/rules/:ruleId'"),'Admin registration-rule edit route must exist');
assert(adminRoutes.includes("router.delete('/lead-entitlements/rules/:ruleId'"),'Admin registration-rule delete route must exist');
assert(adminRoutes.includes("router.post('/lead-entitlements/campaigns'"),'Admin business entitlement create route must exist');
assert(adminRoutes.includes("router.put('/lead-entitlements/campaigns/:campaignId'"),'Admin business entitlement edit route must exist');
assert(adminRoutes.includes("router.delete('/lead-entitlements/campaigns/:campaignId'"),'Admin business entitlement delete route must exist');
assert(adminController.includes('INVALID_ENTITLEMENT_ACCESS:400'),'Invalid access-rule selections must return HTTP 400');

assert(app.includes('/admin/leads/entitlements'),'Admin Lead Entitlements page route must exist');
assert(layout.includes("{to:'/admin/leads/entitlements',label:'Lead Entitlements'}"),'Lead Entitlements must appear inside Leads navigation');
assert(page.includes('＋ Registration rule')&&page.includes('＋ Business entitlement'),'Admin UI must expose separate compact rule and entitlement create actions');
assert(page.includes('verificationScope')&&page.includes('Verified + Non-verified')&&page.includes('Non-verified only'),'Admin UI must expose verification targeting');
assert(page.includes('All industries')&&page.includes('All states')&&page.includes('All cities'),'Admin UI must expose industry and location targeting');
assert(page.includes('entitlement-card-grid'),'Recent entitlements must use flexible cards instead of the wide table');
assert(page.includes("audienceScope:'all'")&&page.includes('All business users')&&page.includes('Specific business users'),'Business entitlement UI must support all or selected businesses');
assert(page.includes('businessCampaigns')&&page.includes("kind:'campaign'"),'Business entitlement campaigns must appear as recent cards');
assert(page.includes('openEditCampaign(item)')&&page.includes('deleteCampaign(item)'),'Business entitlement cards must support edit and delete');
assert(page.includes('campaign.userIds.includes'),'Specific-business targeting must support multi-select');
assert(page.includes('Verified + Non-verified')&&page.includes('Verified only')&&page.includes('Non-verified only'),'Business entitlement UI must support verification filters');
assert(page.includes('Single Buyer')&&page.includes('Shared')&&page.includes('Auto Release'),'Admin UI must expose all buyer-access strategy toggles');
assert(page.includes('Exclusive Early Access'),'Admin UI must expose Exclusive Early Access override');
assert(page.includes('Claimed access'),'Admin UI must expose claimed-access duration');
assert(page.includes('history-edit')&&page.includes('history-delete'),'Recent entitlement rows must support edit and delete');
assert(page.includes('openEditGrant(item)'),'Saved grants must be editable from Recent entitlements');
assert(page.includes("'Lifetime'"),'Zero claimed-access duration must be labeled Lifetime');
assert(page.includes('grant-access-tags'),'Grant history must display saved access rules');

const resetArray=reset.slice(reset.indexOf('const RESET_TABLES=['),reset.indexOf('];',reset.indexOf('const RESET_TABLES=['))+2);
assert(resetArray.includes("'lead_entitlement_grants'"),'Test reset must clear issued grants');
assert(!resetArray.includes("'lead_entitlement_settings'"),'Test reset must preserve legacy entitlement configuration');
assert(!resetArray.includes("'lead_entitlement_registration_rules'"),'Test reset must preserve registration rules');
assert(resetArray.includes("'lead_entitlement_business_campaigns'")&&resetArray.includes("'lead_entitlement_business_campaign_users'"),'Test reset must clear operational business entitlement campaigns');

assert(leads.includes("leadAccess.entitlementSource==='new_business'?'Welcome lead entitlement'"),'Marketplace must label welcome entitlements accurately');
assert(leads.includes("leadAccess.entitlementSource==='admin'?'Propulse lead entitlement'"),'Marketplace must label manual entitlements accurately');
assert(leads.includes("leadAccess.entitlementSource==='campaign'?'Business entitlement'"),'Marketplace must label campaign business entitlements accurately');
assert(entitlement.includes("claimIsActive"),'Lead access must distinguish active and expired historical claims');
assert(entitlement.includes('Previous complimentary lead access expired'),'Expired complimentary access must not be presented as active');
assert(purchase.includes("AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP) LIMIT 1 FOR UPDATE"),'Expired claims must not block a paid lead purchase');
assert(purchase.includes("LEFT JOIN lead_entitlement_claims c ON c.lead_id=l.id AND c.user_id=$1 AND (c.expires_at IS NULL OR c.expires_at>=CURRENT_TIMESTAMP)"),'Expired claims must disappear from Purchased Leads');
assert(marketplace.includes("ec.expires_at IS NULL OR ec.expires_at>=CURRENT_TIMESTAMP"),'Expired claims must not hide marketplace leads or occupy marketplace capacity');
assert(readService.includes("ec.expires_at IS NULL OR ec.expires_at>=CURRENT_TIMESTAMP")&&readService.includes("ec2.expires_at IS NULL OR ec2.expires_at>=CURRENT_TIMESTAMP"),'Lead counters must ignore expired entitlement claims');
assert(accessStrategy.includes("expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP"),'Buyer-capacity close checks must ignore expired entitlement claims');

console.log('Targeted registration and business entitlement regression test passed.');
