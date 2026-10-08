const pool=require('../config/database');
const accessStrategy=require('./leadAccessStrategyService');
const purchaseService=require('./leadPurchaseCouponService');

const TYPES={
  quote:{table:'professional_project_quote_requests',project:'IS NOT NULL',source:'professional_project_quote'},
  callback:{table:'project_callback_requests',project:'IS NOT NULL',source:'professional_project_callback'},
  profile:{table:'project_callback_requests',project:'IS NULL',source:'professional_profile_callback'},
};
function fail(message,code='REQUEST_ACCESS_UNAVAILABLE'){throw Object.assign(new Error(message),{code});}
function details(kind){const selected=TYPES[String(kind||'')];if(!selected)fail('Unsupported enquiry type','INVALID_REQUEST_KIND');return selected;}
const id=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<1)fail('Invalid enquiry ID','INVALID_REQUEST_ID');return n;};
const ownerId=origin=>Number(origin?.professionalUserId);
const recordMatches=(lead,kind,requestId,userId)=>lead?.source===details(kind).source&&
  Number(lead.custom_fields?._project_origin?.requestId)===Number(requestId)&&
  String(lead.custom_fields?._project_origin?.type)===kind&&
  ownerId(lead.custom_fields?._project_origin)===Number(userId);

async function activeMembership(userId,client=pool){
  return (await client.query(`
    SELECT m.id FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id
    WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP
      AND m.expires_at>CURRENT_TIMESTAMP AND mp.is_active=TRUE
      AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro'
    ORDER BY m.expires_at DESC LIMIT 1`,[userId])).rows[0]||null;
}

async function accessMap(userId,rows){
  const ids=[...new Set(rows.map(row=>Number(row.marketplace_lead_id)).filter(v=>Number.isSafeInteger(v)&&v>0))];
  if(!ids.length)return{membership:await activeMembership(userId),byLead:new Map()};
  const [member,result]=await Promise.all([
    activeMembership(userId),
    pool.query(`
      SELECT l.id,l.source,l.status,l.custom_fields,l.pricing,l.buyer_capacity,l.access_strategy,
        l.release_to_two_after_hours,l.release_to_three_after_hours,l.created_at,l.access_capacity_locked,
        EXISTS(SELECT 1 FROM lead_purchases p WHERE p.lead_id=l.id AND p.user_id=$2 AND p.status='paid') AS paid,
        EXISTS(SELECT 1 FROM lead_entitlement_claims c WHERE c.lead_id=l.id AND c.user_id=$2
          AND (c.expires_at IS NULL OR c.expires_at>=CURRENT_TIMESTAMP)) AS claimed,
        EXISTS(SELECT 1 FROM lead_purchases p JOIN payments pay ON pay.id=p.payment_id
          WHERE p.lead_id=l.id AND p.user_id=$2 AND p.status='pending_payment' AND pay.status='pending') AS pending
      FROM leads l WHERE l.id=ANY($1::int[])`,[ids,userId])
  ]);
  return{membership:member,byLead:new Map(result.rows.map(row=>[Number(row.id),row]))};
}

async function attachAccess(userId,rows,kind){
  if(!rows.length)return[];
  const {membership,byLead}=await accessMap(userId,rows);
  return rows.map(row=>{
    const lead=byLead.get(Number(row.marketplace_lead_id));
    const valid=lead&&recordMatches(lead,kind,row.id,userId);
    const unlocked=Boolean(valid&&(lead.paid||lead.claimed));
    const capacity=valid?accessStrategy.effectiveCapacity(lead):0;
    const priceRow=valid?(Array.isArray(lead.pricing?.shares)?lead.pricing.shares:[]).find(p=>Number(p.shares)===capacity):null;
    const price=Number(priceRow?.normal||0);
    return{...row,
      customer_phone:unlocked?row.customer_phone:null,
      customer_email:unlocked?row.customer_email:null,
      access:{
        unlocked,
        eligibleForFree:Boolean(membership),
        leadId:valid?Number(lead.id):null,
        price:Number.isFinite(price)&&price>0?price:null,
        status:unlocked?'unlocked':!valid?'review_required':lead.pending?'pending_payment':lead.status==='available'?'locked':'review_required'
      }
    };
  });
}

async function findAssigned(userId,kind,requestId){
  const conf=details(kind),requestIdValue=id(requestId);
  const result=await pool.query(`
    SELECT r.id,r.business_user_id,r.marketplace_lead_id,l.source,l.status,l.custom_fields
    FROM ${conf.table} r LEFT JOIN leads l ON l.id=r.marketplace_lead_id
    WHERE r.id=$1 AND r.business_user_id=$2 AND r.project_id ${conf.project}
    LIMIT 1`,[requestIdValue,userId]);
  const row=result.rows[0];if(!row)fail('This enquiry is not assigned to your professional account','REQUEST_FORBIDDEN');
  if(!row.marketplace_lead_id)fail('Enquiry pricing is being verified. Please try after review.','LEAD_NOT_READY');
  if(!recordMatches(row,kind,requestIdValue,userId))fail('The linked enquiry needs Admin review','LEAD_LINK_INVALID');
  return Number(row.marketplace_lead_id);
}

async function isUnlocked(userId,kind,requestId){
  const conf=details(kind);
  const result=await pool.query(`
    SELECT 1 FROM ${conf.table} r JOIN leads l ON l.id=r.marketplace_lead_id
    WHERE r.id=$1 AND r.business_user_id=$2 AND r.project_id ${conf.project}
      AND l.source=$3 AND l.custom_fields->'_project_origin'->>'requestId'=$4
      AND l.custom_fields->'_project_origin'->>'professionalUserId'=$5
      AND (EXISTS(SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.user_id=$2 AND lp.status='paid')
        OR EXISTS(SELECT 1 FROM lead_entitlement_claims ec WHERE ec.lead_id=l.id AND ec.user_id=$2
          AND (ec.expires_at IS NULL OR ec.expires_at>=CURRENT_TIMESTAMP)))
    LIMIT 1`,[id(requestId),userId,conf.source,String(requestId),String(userId)]);
  return Boolean(result.rows.length);
}

async function claimAssigned(userId,leadId,kind,requestId){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`lead-capacity:${leadId}`]);
    const lead=(await client.query('SELECT * FROM leads WHERE id=$1 FOR UPDATE',[leadId])).rows[0];
    if(!recordMatches(lead,kind,requestId,userId))fail('This lead is not assigned to your account','REQUEST_FORBIDDEN');
    const already=(await client.query(`SELECT 1 FROM lead_purchases WHERE lead_id=$1 AND user_id=$2 AND status='paid'
      UNION ALL SELECT 1 FROM lead_entitlement_claims WHERE lead_id=$1 AND user_id=$2
        AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP) LIMIT 1`,[leadId,userId])).rows[0];
    if(already){await client.query('COMMIT');return{status:'unlocked',leadId};}
    if(lead.status!=='available')fail('Enquiry is not available for acceptance','LEAD_NOT_AVAILABLE');
    const member=await activeMembership(userId,client);
    if(!member)fail('An active Pro membership is required for free acceptance','MEMBERSHIP_REQUIRED');
    const pending=(await client.query(`SELECT 1 FROM lead_purchases lp JOIN payments p ON p.id=lp.payment_id
      WHERE lp.lead_id=$1 AND lp.user_id=$2 AND lp.status='pending_payment' AND p.status='pending' LIMIT 1`,[leadId,userId])).rows[0];
    if(pending)fail('A payment is already pending; complete it or contact support','PAYMENT_PENDING');
    const capacity=accessStrategy.effectiveCapacity(lead);
    const occupied=Number((await client.query(`
      SELECT COUNT(DISTINCT user_id)::int AS total FROM (
        SELECT lp.user_id FROM lead_purchases lp LEFT JOIN payments p ON p.id=lp.payment_id
          WHERE lp.lead_id=$1 AND (lp.status='paid' OR (lp.status='pending_payment' AND p.status='pending'))
        UNION SELECT ec.user_id FROM lead_entitlement_claims ec WHERE ec.lead_id=$1
          AND (ec.expires_at IS NULL OR ec.expires_at>=CURRENT_TIMESTAMP)
      ) a`,[leadId])).rows[0]?.total||0);
    if(occupied>=capacity)fail('All available lead slots have been taken','CAPACITY_REACHED');
    await client.query(`INSERT INTO lead_entitlement_claims(user_id,lead_id,membership_id,entitlement_type,expires_at)
      VALUES($1,$2,$3,'professional_request',NULL) ON CONFLICT(user_id,lead_id) DO NOTHING`,[userId,leadId,member.id]);
    await accessStrategy.lockCapacity(client,leadId,capacity);
    await accessStrategy.closeIfFull(client,leadId);
    await client.query('COMMIT');
    return{status:'unlocked',leadId,method:'membership'};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
  finally{client.release();}
}

async function accept(userId,kind,requestId){
  if(!Number.isSafeInteger(Number(userId))||Number(userId)<1)fail('Business sign-in required','REQUEST_FORBIDDEN');
  const leadId=await findAssigned(userId,kind,requestId);
  if(await isUnlocked(userId,kind,requestId))return{status:'unlocked',leadId};
  if(await activeMembership(userId))return claimAssigned(userId,leadId,kind,id(requestId));
  const purchase=await purchaseService.purchaseLead({userId,leadId,useWallet:true});
  if(purchase.status==='paid'||purchase.alreadyPurchased)return{status:'unlocked',leadId,method:'payment'};
  return{status:'pending_payment',leadId,payment:purchase.payment,
    walletAmount:Number(purchase.wallet_amount||0),externalAmount:Number(purchase.external_amount||0),
    requiresExternalPayment:purchase.requires_external_payment===true};
}

module.exports={attachAccess,findAssigned,isUnlocked,accept,activeMembership,recordMatches};
