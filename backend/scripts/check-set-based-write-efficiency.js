const assert=require('assert');
const fs=require('fs');
const path=require('path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

const auth=read('src/services/authService.js');
const coupon=read('src/services/couponService.js');
const profile=read('src/services/profileService.js');
const sheetCompat=read('src/services/leadPartnerInventoryCompatService.js');
const sheetBase=read('src/services/leadPartnerInventoryService.js');
const leadService=read('src/services/leadService.js');
const grantService=read('src/services/leadEntitlementGrantService.js');

assert(auth.includes('WITH requested AS')&&auth.includes('UNNEST($1::int[],$2::int[],$3::int[])'),'Signup service validation must be set-based');
assert(auth.includes('INSERT INTO business_profile_services')&&auth.includes('FROM UNNEST($2::int[],$3::int[],$4::int[])'),'Signup service relationships must be inserted in one set-based statement');
assert(auth.includes('INSERT INTO business_profile_locations')&&auth.includes('FROM UNNEST($2::int[],$3::int[])'),'Signup locations must be inserted in one set-based statement');
assert(!auth.includes('for (const selection of services) await client.query'),'Signup must not query once per service selection');
assert(!auth.includes('for (const location of locations) await client.query'),'Signup must not query once per location selection');

assert(coupon.includes("INSERT INTO coupon_users(coupon_id,user_id) SELECT $1,x FROM UNNEST($2::int[]) AS x"),'Coupon user targeting must use a set-based insert');
assert(coupon.includes("INSERT INTO coupon_industries(coupon_id,industry_id) SELECT $1,x FROM UNNEST($2::int[]) AS x"),'Coupon industry targeting must use a set-based insert');
assert(!coupon.includes('for(const userId of userIds)await client.query'),'Coupon user targeting must not insert one row per query');
assert(!coupon.includes('for(const industryId of industryIds)await client.query'),'Coupon industry targeting must not insert one row per query');
const publicOffers=coupon.slice(coupon.indexOf('async function getPublicOffersForUser'),coupon.indexOf('async function reserveRedemption'));
assert(publicOffers.includes('NOT EXISTS(SELECT 1 FROM coupon_users'), 'Public coupon offers must evaluate audience eligibility in the main SQL query');
assert(publicOffers.includes("cr.status IN ('reserved','redeemed')"), 'Public coupon offers must evaluate usage limits in the main SQL query');
assert(!publicOffers.includes('audienceEligible('), 'Public coupon offer listing must not query audience eligibility per coupon');
assert(!publicOffers.includes('usageEligible('), 'Public coupon offer listing must not query usage limits per coupon');

assert(profile.includes('WITH requested AS')&&profile.includes('UNNEST($1::int[],$2::int[],$3::int[])'),'Profile service/location validation must be set-based');
assert(profile.includes('INSERT INTO business_profile_services')&&profile.includes('FROM UNNEST($2::int[],$3::int[],$4::int[])'),'Profile service relationships must be inserted in one statement');
assert(profile.includes('INSERT INTO business_profile_locations')&&profile.includes('FROM UNNEST($2::int[],$3::int[],$4::int[],$5::text[])'),'Profile locations must be inserted in one statement');
assert(!profile.includes('for (const item of services)'),'Profile update must not query once per service selection');
assert(!profile.includes('for (const item of locations)'),'Profile update must not query once per location selection');

assert(!sheetCompat.includes('async function persistDetails')&&!sheetCompat.includes('jsonb_to_recordset'),
  'Sheet imports must not run fuzzy post-import updates against existing leads');
const partnerImport=sheetCompat.slice(sheetCompat.indexOf('async function importCsv('),sheetCompat.indexOf('function csvEscape('));
assert(partnerImport.includes('return base.importCsv('),
  'Partner Sheet import must delegate lead creation and custom-field persistence to the base importer');
assert(!partnerImport.includes('pool.query(')&&!partnerImport.includes('UPDATE leads'),
  'Partner Sheet import must not re-match or modify existing leads after the base import');
assert(sheetBase.includes('customFields: buildImportedCustomFields(row)')&&sheetBase.includes('leadService.createLead('),
  'Base Sheet importer must attach custom fields directly to each created lead');
assert(leadService.includes('sanitizeCustomFields(customFields)')&&leadService.includes('INSERT INTO leads'),
  'Lead creation must persist custom fields atomically with the new lead');

const campaignSync=grantService.slice(grantService.indexOf('async function syncBusinessCampaign'),grantService.indexOf('async function createBusinessCampaign'));
assert(campaignSync.includes('jsonb_to_recordset($1::jsonb)'),'Business entitlement campaign sync must batch recipient updates/inserts');
assert(campaignSync.includes('id=ANY($1::int[])'),'Business entitlement campaign sync must batch deletes/revokes');

console.log('Set-based write efficiency checks passed.');
