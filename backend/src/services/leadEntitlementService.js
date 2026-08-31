const pool=require('../config/database');

function fail(message,code){throw Object.assign(new Error(message),{code});}
function parseEntitlements(value){if(Array.isArray(value))return value;try{const x=typeof value==='string'?JSON.parse(value):value;return Array.isArray(x)?x:[]}catch{return[]}}
function entitlementForLead(entitlements,lead){const wanted=lead.lead_type==='premium'?'premium':'shared';return entitlements.find(x=>String(x.type||'').toLowerCase()===wanted)||null}

async function getLeadAccess(userId,leadId){
  if(!userId) return {authenticated:false,claimed:false,canClaim:false};
  const leadResult=await pool.query(`SELECT id,lead_type,is_exclusive,created_at,exclusive_delay_days,status FROM leads WHERE id=$1`,[leadId]);
  const lead=leadResult.rows[0];
  if(!lead) fail('Lead not found','LEAD_NOT_FOUND');
  const claimed=await pool.query(`SELECT id,claimed_at,expires_at,entitlement_type FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2`,[userId,leadId]);
  if(claimed.rows[0]) return {authenticated:true,claimed:true,canClaim:false,claim:claimed.rows[0]};
  if(lead.status!=='available') return {authenticated:true,claimed:false,canClaim:false,reason:'Lead is not available'};
  if(lead.is_exclusive && new Date(new Date(lead.created_at).getTime()+Number(lead.exclusive_delay_days||0)*86400000)>new Date()) return {authenticated:true,claimed:false,canClaim:false,reason:'Exclusive lead is not yet available'};
  const membershipResult=await pool.query(`SELECT m.id,m.starts_at,m.expires_at,mp.lead_entitlements,mp.lead_expiry_days FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>=CURRENT_TIMESTAMP AND mp.is_active=TRUE AND mp.plan_type IN ('pro','non_pro') ORDER BY m.expires_at DESC LIMIT 1`,[userId]);
  const membership=membershipResult.rows[0];
  if(!membership) return {authenticated:true,claimed:false,canClaim:false,reason:'No active membership entitlement'};
  const entitlement=entitlementForLead(parseEntitlements(membership.lead_entitlements),lead);
  if(!entitlement || entitlement.complimentary===false) return {authenticated:true,claimed:false,canClaim:false,reason:'This lead is not included in your membership'};
  const monthly=Math.max(0,Number(entitlement.monthly_quantity??entitlement.quantity??0));
  if(monthly<=0) return {authenticated:true,claimed:false,canClaim:false,reason:'No remaining entitlement configured'};
  const starts=new Date(membership.starts_at); const now=new Date();
  const months=Math.max(0,(now.getFullYear()-starts.getFullYear())*12+now.getMonth()-starts.getMonth());
  const periodStart=new Date(starts); periodStart.setMonth(periodStart.getMonth()+months);
  const periodEnd=new Date(periodStart); periodEnd.setMonth(periodEnd.getMonth()+1);
  const usedResult=await pool.query(`SELECT COUNT(*)::int AS used FROM lead_entitlement_claims WHERE user_id=$1 AND membership_id=$2 AND claimed_at>= $3 AND claimed_at < $4`,[userId,membership.id,periodStart,periodEnd]);
  const used=Number(usedResult.rows[0]?.used||0);
  return {authenticated:true,claimed:false,canClaim:used<monthly,remaining:Math.max(0,monthly-used),monthlyLimit:monthly,entitlementType:entitlement.type,membershipId:membership.id};
}

async function claimLead(userId,leadId){
  const access=await getLeadAccess(userId,leadId);
  if(!access.canClaim){
    if(access.reason==='Lead is not available') fail(access.reason,'LEAD_UNAVAILABLE');
    if(access.reason==='Exclusive lead is not yet available') fail(access.reason,'EXCLUSIVE_LOCKED');
    if(access.reason==='No active membership entitlement') fail(access.reason,'NO_MEMBERSHIP_ENTITLEMENT');
    if(access.reason==='This lead is not included in your membership') fail(access.reason,'ENTITLEMENT_NOT_INCLUDED');
    if(access.reason==='No remaining entitlement configured') fail(access.reason,'ENTITLEMENT_EMPTY');
    if(access.claimed) fail('Lead already claimed','ALREADY_CLAIMED');
    fail('Monthly lead entitlement exhausted','ENTITLEMENT_EXHAUSTED');
  }
  const lead=await pool.query(`SELECT customer_name,customer_phone,customer_email,requirement,property_type,budget,source,notes,custom_fields,industry_id,service_id,subservice_id,state_id,city_id,lead_type FROM leads WHERE id=$1`,[leadId]);
  if(!lead.rows[0]) fail('Lead not found','LEAD_NOT_FOUND');
  const expiryDays=Number(access.entitlementType==='premium'?0:0);
  try{
    const inserted=await pool.query(`INSERT INTO lead_entitlement_claims(user_id,lead_id,membership_id,entitlement_type,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING *`,[userId,leadId,access.membershipId,access.entitlementType,expiryDays>0?new Date(Date.now()+expiryDays*86400000):null]);
    return {claim:inserted.rows[0],lead:lead.rows[0],remaining:Math.max(0,Number(access.remaining||1)-1)};
  }catch(error){
    if(error.code==='23505') fail('Lead already claimed','ALREADY_CLAIMED');
    throw error;
  }
}

module.exports={getLeadAccess,claimLead};
