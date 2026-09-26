const pool=require('../config/database');const accessService=require('./leadAccessStrategyService');

function fail(message,code){throw Object.assign(new Error(message),{code});}
function parseEntitlements(value){if(Array.isArray(value))return value;try{const x=typeof value==='string'?JSON.parse(value):value;return Array.isArray(x)?x:[]}catch{return[]}}
function entitlementForLead(entitlements,lead){const wanted=lead.lead_type==='premium'?'premium':'shared';return entitlements.find(x=>String(x.type||'').toLowerCase()===wanted)||null}
function monthsBetween(start,end){
  const months=(end.getUTCFullYear()-start.getUTCFullYear())*12+end.getUTCMonth()-start.getUTCMonth();
  return Math.max(0, months - (end.getUTCDate()<start.getUTCDate() ? 1 : 0));
}

function addMonthsClamped(date,months){
  const source=new Date(date);
  const day=source.getUTCDate();
  const target=new Date(Date.UTC(source.getUTCFullYear(),source.getUTCMonth(),1,source.getUTCHours(),source.getUTCMinutes(),source.getUTCSeconds(),source.getUTCMilliseconds()));
  target.setUTCMonth(target.getUTCMonth()+months);
  const lastDay=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(day,lastDay));
  return target;
}

function periodForMembership(membership){
  const billingMonths=Math.max(1,Number(membership.billing_months||1));
  const starts=new Date(membership.starts_at);
  const now=new Date();
  const elapsedMonths=monthsBetween(starts,now);
  const periodIndex=Math.floor(elapsedMonths/billingMonths);
  const periodStart=addMonthsClamped(starts,periodIndex*billingMonths);
  const periodEnd=addMonthsClamped(periodStart,billingMonths);
  const monthlyIndex=Math.floor(elapsedMonths);
  const monthlyStart=addMonthsClamped(starts,monthlyIndex);
  const monthlyEnd=addMonthsClamped(monthlyStart,1);
  return {billingMonths,periodStart,periodEnd,monthlyStart,monthlyEnd};
}

async function getLeadAccess(userId,leadId){
  if(!userId)return {authenticated:false,claimed:false,canClaim:false};
  const leadResult=await pool.query(`SELECT id,lead_type,is_exclusive,created_at,exclusive_delay_days,status,industry_id,service_id,subservice_id,state_id,city_id,buyer_capacity,access_strategy,release_to_two_after_hours,release_to_three_after_hours,access_capacity_locked FROM leads WHERE id=$1`,[leadId]);
  const lead=leadResult.rows[0];if(!lead)fail('Lead not found','LEAD_NOT_FOUND');
  const claimed=await pool.query(`SELECT id,claimed_at,expires_at,entitlement_type FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2`,[userId,leadId]);
  if(claimed.rows[0])return{authenticated:true,claimed:true,canClaim:false,claim:claimed.rows[0]};
  if(lead.status!=='available')return{authenticated:true,claimed:false,canClaim:false,reason:'Lead is not available'};
  const capacity=accessService.effectiveCapacity(lead);const occupied=Number((await pool.query(`SELECT COUNT(DISTINCT buyer.user_id)::int AS occupied FROM (SELECT lp.user_id FROM lead_purchases lp LEFT JOIN payments p ON p.id=lp.payment_id WHERE lp.lead_id=$1 AND (lp.status='paid' OR (lp.status='pending_payment' AND p.status='pending')) UNION SELECT ec.user_id FROM lead_entitlement_claims ec WHERE ec.lead_id=$1) buyer`,[leadId])).rows[0]?.occupied||0);if(occupied>=capacity)return{authenticated:true,claimed:false,canClaim:false,reason:'Lead buyer capacity reached',buyerCapacity:capacity,buyersUsed:occupied};
  const exclusiveAt=new Date(new Date(lead.created_at).getTime()+Number(lead.exclusive_delay_days||0)*86400000);
  if(lead.is_exclusive&&exclusiveAt>new Date())return{authenticated:true,claimed:false,canClaim:false,reason:'Exclusive lead is not yet available'};
  const membershipResult=await pool.query(`SELECT m.id,m.starts_at,m.expires_at,m.membership_plan_id,mp.billing_months,mp.lead_entitlements,mp.lead_rollover_enabled,mp.lead_expiry_days FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>=CURRENT_TIMESTAMP AND mp.is_active=TRUE AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_')) IN ('pro','non_pro') ORDER BY m.expires_at DESC LIMIT 1`,[userId]);
  const membership=membershipResult.rows[0];if(!membership)return{authenticated:true,claimed:false,canClaim:false,reason:'No active membership entitlement'};
  const entitlement=entitlementForLead(parseEntitlements(membership.lead_entitlements),lead);if(!entitlement||entitlement.complimentary===false)return{authenticated:true,claimed:false,canClaim:false,reason:'This lead is not included in your membership'};
  const {billingMonths,periodStart,periodEnd,monthlyStart,monthlyEnd}=periodForMembership(membership);
  const monthly=Math.max(0,Number(entitlement.monthly_quantity??entitlement.quantity??0));const periodTotal=Math.max(monthly*billingMonths,Number(entitlement.period_total_quantity??monthly*billingMonths));
  if(monthly<=0&&periodTotal<=0)return{authenticated:true,claimed:false,canClaim:false,reason:'No remaining entitlement configured'};
  const usageStart=membership.lead_rollover_enabled===false?monthlyStart:periodStart;const usageEnd=membership.lead_rollover_enabled===false?monthlyEnd:periodEnd;
  const usedResult=await pool.query(`SELECT COUNT(*)::int AS used FROM lead_entitlement_claims WHERE user_id=$1 AND membership_id=$2 AND entitlement_type=$3 AND claimed_at>= $4 AND claimed_at < $5`,[userId,membership.id,entitlement.type,usageStart,usageEnd]);
  const used=Number(usedResult.rows[0]?.used||0);const allowance=membership.lead_rollover_enabled===false?Math.max(0,monthly):Math.max(0,periodTotal);
  return{authenticated:true,claimed:false,canClaim:used<allowance,remaining:Math.max(0,allowance-used),monthlyLimit:monthly,periodTotalLimit:periodTotal,billingMonths,entitlementType:entitlement.type,membershipId:membership.id,periodStart,periodEnd,expiryDays:Math.max(0,Number(membership.lead_expiry_days||0))};
}

async function getLeadAccessMap(userId,leadIds){
  const ids=[...new Set((leadIds||[]).map(Number).filter(Number.isInteger))];if(!userId||!ids.length)return {};
  const [leadsResult,membershipResult,claimsResult,capacityResult]=await Promise.all([
    pool.query(`SELECT id,lead_type,is_exclusive,created_at,exclusive_delay_days,status,buyer_capacity,access_strategy,release_to_two_after_hours,release_to_three_after_hours,access_capacity_locked FROM leads WHERE id=ANY($1::int[])`,[ids]),
    pool.query(`SELECT m.id,m.starts_at,m.expires_at,mp.billing_months,mp.lead_entitlements,mp.lead_rollover_enabled,mp.lead_expiry_days FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>=CURRENT_TIMESTAMP AND mp.is_active=TRUE AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_')) IN ('pro','non_pro') ORDER BY m.expires_at DESC LIMIT 1`,[userId]),
    pool.query(`SELECT lead_id,id,claimed_at,expires_at,entitlement_type FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=ANY($2::int[])`,[userId,ids]),
    pool.query(`SELECT lead_id,COUNT(DISTINCT user_id)::int AS occupied FROM (SELECT lp.lead_id,lp.user_id FROM lead_purchases lp LEFT JOIN payments p ON p.id=lp.payment_id WHERE lp.lead_id=ANY($1::int[]) AND (lp.status='paid' OR (lp.status='pending_payment' AND p.status='pending')) UNION SELECT ec.lead_id,ec.user_id FROM lead_entitlement_claims ec WHERE ec.lead_id=ANY($1::int[])) buyers GROUP BY lead_id`,[ids]),
  ]);
  const membership=membershipResult.rows[0]||null;const claims=new Map(claimsResult.rows.map(x=>[Number(x.lead_id),x]));const occupiedByLead=new Map(capacityResult.rows.map(x=>[Number(x.lead_id),Number(x.occupied||0)]));const out={};
  if(!membership){for(const lead of leadsResult.rows){const claim=claims.get(Number(lead.id));out[lead.id]={authenticated:true,claimed:Boolean(claim),canClaim:false,reason:'No active membership entitlement',...(claim?{claim}:{})};}return out;}
  const {billingMonths,periodStart,periodEnd,monthlyStart,monthlyEnd}=periodForMembership(membership);const entitlements=parseEntitlements(membership.lead_entitlements);
  const usageStart=membership.lead_rollover_enabled===false?monthlyStart:periodStart;const usageEnd=membership.lead_rollover_enabled===false?monthlyEnd:periodEnd;
  const usedResult=await pool.query(`SELECT entitlement_type,COUNT(*)::int AS used FROM lead_entitlement_claims WHERE user_id=$1 AND membership_id=$2 AND claimed_at>= $3 AND claimed_at < $4 GROUP BY entitlement_type`,[userId,membership.id,usageStart,usageEnd]);
  const usedByType=new Map(usedResult.rows.map(x=>[String(x.entitlement_type||'').toLowerCase(),Number(x.used||0)]));const now=new Date();
  for(const lead of leadsResult.rows){
    const claimed=claims.get(Number(lead.id));if(claimed){out[lead.id]={authenticated:true,claimed:true,canClaim:false,claim:claimed};continue;}
    if(lead.status!=='available'){out[lead.id]={authenticated:true,claimed:false,canClaim:false,reason:'Lead is not available'};continue;}
    const capacity=accessService.effectiveCapacity(lead);const occupied=occupiedByLead.get(Number(lead.id))||0;if(occupied>=capacity){out[lead.id]={authenticated:true,claimed:false,canClaim:false,reason:'Lead buyer capacity reached',buyerCapacity:capacity,buyersUsed:occupied};continue;}
    const exclusiveAt=new Date(new Date(lead.created_at).getTime()+Number(lead.exclusive_delay_days||0)*86400000);if(lead.is_exclusive&&exclusiveAt>now){out[lead.id]={authenticated:true,claimed:false,canClaim:false,reason:'Exclusive lead is not yet available'};continue;}
    const entitlement=entitlementForLead(entitlements,lead);if(!entitlement||entitlement.complimentary===false){out[lead.id]={authenticated:true,claimed:false,canClaim:false,reason:'This lead is not included in your membership'};continue;}
    const monthly=Math.max(0,Number(entitlement.monthly_quantity??entitlement.quantity??0));const periodTotal=Math.max(monthly*billingMonths,Number(entitlement.period_total_quantity??monthly*billingMonths));const allowance=membership.lead_rollover_enabled===false?Math.max(0,monthly):Math.max(0,periodTotal);const used=usedByType.get(String(entitlement.type||'').toLowerCase())||0;const remaining=Math.max(0,allowance-used);
    out[lead.id]={authenticated:true,claimed:false,canClaim:remaining>0,remaining,monthlyLimit:monthly,periodTotalLimit:periodTotal,billingMonths,entitlementType:entitlement.type,membershipId:membership.id,periodStart,periodEnd,expiryDays:Math.max(0,Number(membership.lead_expiry_days||0))};
  }
  return out;
}

async function matchesBusinessProfile(client,lead,userId){
  const serviceMatch=await client.query(`SELECT 1 FROM business_profiles bp JOIN business_profile_services bps ON bps.business_profile_id=bp.id WHERE bp.user_id=$1 AND bps.is_active=TRUE AND ($2::int IS NULL OR bps.industry_id=$2) AND ($3::int IS NULL OR bps.service_id=$3) AND ($4::int IS NULL OR bps.subservice_id IS NULL OR bps.subservice_id=$4) LIMIT 1`,[userId,lead.industry_id,lead.service_id,lead.subservice_id]);
  if(!serviceMatch.rows.length)fail('Complete your business services before claiming this lead','PROFILE_MISMATCH');
  const locationMatch=await client.query(`SELECT 1 FROM business_profiles bp JOIN business_profile_locations bpl ON bpl.business_profile_id=bp.id WHERE bp.user_id=$1 AND bpl.is_active=TRUE AND ($2::int IS NULL OR bpl.state_id=$2) AND ($3::int IS NULL OR bpl.city_id=$3) LIMIT 1`,[userId,lead.state_id,lead.city_id]);
  if(!locationMatch.rows.length)fail('Add this lead location to your business profile before claiming','PROFILE_MISMATCH');
}

async function claimLead(userId,leadId){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`lead-capacity:${leadId}`]);
    const leadResult=await client.query(`SELECT id,lead_type,is_exclusive,created_at,exclusive_delay_days,status,industry_id,service_id,subservice_id,state_id,city_id,customer_name,customer_phone,customer_email,requirement,property_type,budget,source,notes,custom_fields,buyer_capacity,access_strategy,release_to_two_after_hours,release_to_three_after_hours,access_capacity_locked FROM leads WHERE id=$1 FOR UPDATE`,[leadId]);
    const lead=leadResult.rows[0];if(!lead)fail('Lead not found','LEAD_NOT_FOUND');if(lead.status!=='available')fail('Lead is not available','LEAD_UNAVAILABLE');
    const existing=await client.query(`SELECT id FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2 FOR UPDATE`,[userId,leadId]);if(existing.rows[0])fail('Lead already claimed','ALREADY_CLAIMED');
    const purchased=await client.query(`SELECT id FROM lead_purchases WHERE user_id=$1 AND lead_id=$2 AND status='paid' LIMIT 1`,[userId,leadId]);if(purchased.rows[0])fail('Lead has already been purchased','ALREADY_PURCHASED');
    const capacity=accessService.effectiveCapacity(lead);const occupied=Number((await client.query(`SELECT COUNT(DISTINCT slot.user_id)::int AS occupied FROM (SELECT lp.user_id FROM lead_purchases lp LEFT JOIN payments p ON p.id=lp.payment_id WHERE lp.lead_id=$1 AND (lp.status='paid' OR (lp.status='pending_payment' AND p.status='pending')) UNION SELECT ec.user_id FROM lead_entitlement_claims ec WHERE ec.lead_id=$1) slot`,[leadId])).rows[0]?.occupied||0);if(occupied>=capacity)fail('Lead buyer capacity reached','CAPACITY_REACHED');
    const exclusiveAt=new Date(new Date(lead.created_at).getTime()+Number(lead.exclusive_delay_days||0)*86400000);if(lead.is_exclusive&&exclusiveAt>new Date())fail('Pro Early Access is still active','EXCLUSIVE_LOCKED');
    await matchesBusinessProfile(client,lead,userId);
    const membershipResult=await client.query(`SELECT m.id,m.starts_at,m.expires_at,mp.billing_months,mp.lead_entitlements,mp.lead_rollover_enabled,mp.lead_expiry_days FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>=CURRENT_TIMESTAMP AND mp.is_active=TRUE AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_')) IN ('pro','non_pro') ORDER BY m.expires_at DESC LIMIT 1 FOR UPDATE OF m`,[userId]);
    const membership=membershipResult.rows[0];if(!membership)fail('No active membership entitlement','NO_MEMBERSHIP_ENTITLEMENT');
    const entitlement=entitlementForLead(parseEntitlements(membership.lead_entitlements),lead);if(!entitlement||entitlement.complimentary===false)fail('This lead is not included in your membership','ENTITLEMENT_NOT_INCLUDED');
    const {billingMonths,periodStart,periodEnd,monthlyStart,monthlyEnd}=periodForMembership(membership);const monthly=Math.max(0,Number(entitlement.monthly_quantity??entitlement.quantity??0));const periodTotal=Math.max(monthly*billingMonths,Number(entitlement.period_total_quantity??monthly*billingMonths));if(monthly<=0&&periodTotal<=0)fail('No remaining entitlement configured','ENTITLEMENT_EMPTY');
    const usageStart=membership.lead_rollover_enabled===false?monthlyStart:periodStart;const usageEnd=membership.lead_rollover_enabled===false?monthlyEnd:periodEnd;
    const usedResult=await client.query(`SELECT COUNT(*)::int AS used FROM lead_entitlement_claims WHERE user_id=$1 AND membership_id=$2 AND entitlement_type=$3 AND claimed_at>= $4 AND claimed_at < $5`,[userId,membership.id,entitlement.type,usageStart,usageEnd]);
    const used=Number(usedResult.rows[0]?.used||0);const allowance=membership.lead_rollover_enabled===false?Math.max(0,monthly):Math.max(0,periodTotal);if(used>=allowance)fail('Lead entitlement exhausted','ENTITLEMENT_EXHAUSTED');
    const expiryDays=Math.max(0,Number(membership.lead_expiry_days||0));const inserted=await client.query(`INSERT INTO lead_entitlement_claims(user_id,lead_id,membership_id,entitlement_type,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING *`,[userId,leadId,membership.id,entitlement.type,expiryDays>0?new Date(Date.now()+expiryDays*86400000):null]);
    await accessService.lockCapacity(client,leadId,capacity);await accessService.closeIfFull(client,leadId);
    await client.query('COMMIT');return{claim:inserted.rows[0],lead,remaining:Math.max(0,allowance-used-1)};
  }catch(error){try{await client.query('ROLLBACK')}catch{}if(error.code==='23505')fail('Lead already claimed','ALREADY_CLAIMED');throw error}
  finally{client.release()}
}
module.exports={getLeadAccess,getLeadAccessMap,claimLead};
