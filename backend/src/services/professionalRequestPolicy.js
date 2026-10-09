// Shared professional enquiry access decisions. Existing projects default to
// the original behaviour: active Pro membership is free, others pay.
const MODES=Object.freeze({
  free:'Free for all assigned professionals',
  paid:'Paid for all',
  member_free_nonmember_paid:'Members free · Non-members paid',
  members_only:'Members only · Free acceptance',
});
const DEFAULT_MODE='member_free_nonmember_paid';
const normalizeMode=mode=>Object.hasOwn(MODES,mode)?mode:DEFAULT_MODE;
function eligibleForFree(mode,hasMembership){
  mode=normalizeMode(mode);
  return mode==='free'||(hasMembership&&(mode==='member_free_nonmember_paid'||mode==='members_only'));
}
function canPay(mode,hasMembership){
  mode=normalizeMode(mode);
  return mode==='paid'||(mode==='member_free_nonmember_paid'&&!hasMembership);
}
async function proMembership(userId,client){
  return (await client.query(`
    SELECT m.id FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id
    WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP
      AND m.expires_at>CURRENT_TIMESTAMP AND mp.is_active=TRUE
      AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro'
    ORDER BY m.expires_at DESC LIMIT 1`,[userId])).rows[0]||null;
}
function fromLead(lead){
  return normalizeMode(lead?.custom_fields?._professional_access_mode);
}
module.exports={MODES,DEFAULT_MODE,normalizeMode,eligibleForFree,canPay,proMembership,fromLead};
