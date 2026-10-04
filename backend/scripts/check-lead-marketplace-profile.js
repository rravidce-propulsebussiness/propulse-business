const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const optionalAuth=read('src/middleware/optionalAuthMiddleware.js');
const marketplace=read('src/services/leadMarketplaceService.js');
const purchase=read('src/services/leadPurchaseService.js');

assert(optionalAuth.includes("part.startsWith('propulse_auth=')"),'Optional auth must read the HttpOnly auth cookie');
assert(optionalAuth.includes('getAuthenticatedUser'),'Optional auth must validate the current server-side session');
assert(marketplace.includes("if(role!=='admin'&&userId){"),'Logged-in marketplace requests must always apply business-profile filtering');
assert(!marketplace.includes("!String(allIndustries||'').match"),'allIndustries must not bypass logged-in profile filtering');
assert(!marketplace.includes("!String(allLocations||'').match"),'allLocations must not bypass logged-in profile filtering');
assert(marketplace.includes('business_profile_services'),'Marketplace must match business profile services');
assert(marketplace.includes('business_profile_locations'),'Marketplace must match business profile locations');
assert(marketplace.includes("const p3=String.fromCharCode(36)+values.length"),'Purchased-lead exclusion must build a PostgreSQL bind placeholder');
assert(marketplace.includes("const pClaim=String.fromCharCode(36)+values.length"),'Claimed-lead exclusion must build a PostgreSQL bind placeholder');
assert(marketplace.includes("const p4=String.fromCharCode(36)+values.length"),'Investor self-exclusion must build a PostgreSQL bind placeholder');
assert(!marketplace.includes("const p3=`${values.length}`"),'Marketplace must not add unbound user parameters');
assert((marketplace.match(/module\.exports=\{getMarketplacePage\};/g)||[]).length===1,'Marketplace service must contain exactly one export block');
assert(!/^\+values\.length/m.test(marketplace),'Marketplace service must not contain appended corruption fragments');
assert(purchase.includes('matchesBusinessProfile'),'Lead purchase must keep server-side profile validation');

console.log('Lead marketplace profile filtering regression test passed.');
