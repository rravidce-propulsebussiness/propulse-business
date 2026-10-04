const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const membership=read('../frontend/src/pages/Membership.jsx');
const paymentController=read('src/controllers/paymentController.js');
const resetService=read('src/services/adminTestResetService.js');

assert(resetService.includes("'memberships'"),'Test reset must clear membership rows');
assert(paymentController.includes("membership?{...membership,...access}:access"),'Current membership endpoint may return access-only data after reset');

assert(membership.includes("const membershipRecord = (value) => value?.membership_plan_id ? value : null"),'Membership UI must distinguish a real membership row from access-only data');
assert(membership.includes('setCurrentMembership(membershipRecord(membership))'),'Initial membership load must normalize access-only responses');
assert(membership.includes('setCurrentMembership(membershipRecord(refreshedMembership))'),'Post-checkout refresh must normalize membership responses');
assert(!membership.includes("user?.membership_type || ''"),'Cached user membership_type must not decide current membership state');
assert(membership.includes("const currentGroup = currentMembership?.membership_plan_id"),'Current membership group must require a real membership record');
assert(membership.includes("const isCurrent = Boolean(currentMembership?.membership_plan_id) && currentGroup === level.key"),'Plan buttons must only become current when a real membership exists');
assert(membership.includes("saveSession({ user: { ...user, is_pro_member: access.isPro } })"),'Live access response must refresh the cached Pro flag after reset');
assert(!membership.includes("String(currentMembership?.plan_group || currentMembership?.plan?.plan_group || (isProMember ? 'grow' : ''))"),'Pro access alone must not manufacture a current GROW plan');

console.log('Membership post-reset UI regression test passed.');
