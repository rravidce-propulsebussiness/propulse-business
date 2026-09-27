const assert=require('assert');
const fs=require('fs');
const path=require('path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

const auth=read('src/services/authService.js');
const coupon=read('src/services/couponService.js');

assert(auth.includes('WITH requested AS')&&auth.includes('UNNEST($1::int[],$2::int[],$3::int[])'),'Signup service validation must be set-based');
assert(auth.includes('INSERT INTO business_profile_services')&&auth.includes('FROM UNNEST($2::int[],$3::int[],$4::int[])'),'Signup service relationships must be inserted in one set-based statement');
assert(auth.includes('INSERT INTO business_profile_locations')&&auth.includes('FROM UNNEST($2::int[],$3::int[])'),'Signup locations must be inserted in one set-based statement');
assert(!auth.includes('for (const selection of services) await client.query'),'Signup must not query once per service selection');
assert(!auth.includes('for (const location of locations) await client.query'),'Signup must not query once per location selection');

assert(coupon.includes("INSERT INTO coupon_users(coupon_id,user_id) SELECT $1,x FROM UNNEST($2::int[]) AS x"),'Coupon user targeting must use a set-based insert');
assert(coupon.includes("INSERT INTO coupon_industries(coupon_id,industry_id) SELECT $1,x FROM UNNEST($2::int[]) AS x"),'Coupon industry targeting must use a set-based insert');
assert(!coupon.includes('for(const userId of userIds)await client.query'),'Coupon user targeting must not insert one row per query');
assert(!coupon.includes('for(const industryId of industryIds)await client.query'),'Coupon industry targeting must not insert one row per query');

console.log('Set-based write efficiency checks passed.');
