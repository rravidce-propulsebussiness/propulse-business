const criticalActionAudit=require('./criticalActionAuditService');
const notificationService=require('./notificationService');
const pool=require('../config/database');
const paymentService=require('./paymentService');
const walletService=require('./walletService');
const leadCrmPurchaseService=require('./leadCrmPurchaseService');
const leadEntitlementGrantService=require('./leadEntitlementGrantService');
const membershipPlanService=require('./membershipPlanService');

function number(value){const n=Number(value);return Number.isFinite(n)?n:0}
function activeMembership(plans=[]){
  const now=Date.now();
  return plans.find(plan=>plan.status==='active'&&new Date(plan.starts_at).getTime()<=now&&new Date(plan.expires_at).getTime()>now&&String(plan.plan_type||'').toLowerCase()==='pro')||null;
}
function daysRemaining(value){
  if(!value)return null;
  return Math.max(0,Math.ceil((new Date(value).getTime()-Date.now())/86400000));
}

function summarizeEntitlementGrants(grants=[]){
  const summary={shared:{allowance:0,used:0,remaining:0},premium:{allowance:0,used:0,remaining:0}};
  for(const grant of grants){
    const sharedAllowance=number(grant.shared_quantity);
    const premiumAllowance=number(grant.premium_quantity);
    const sharedUsed=Math.min(sharedAllowance,number(grant.used_shared));
    const premiumUsed=Math.min(premiumAllowance,number(grant.used_premium));
    summary.shared.allowance+=sharedAllowance;
    summary.shared.used+=sharedUsed;
    summary.shared.remaining+=Math.max(0,sharedAllowance-sharedUsed);
    summary.premium.allowance+=premiumAllowance;
    summary.premium.used+=premiumUsed;
    summary.premium.remaining+=Math.max(0,premiumAllowance-premiumUsed);
  }
  return summary;
}

async function getActiveEntitlementSummary(userId){
  const grants=await leadEntitlementGrantService.getActiveGrants(userId,pool,{ensureWelcome:false});
  return{grants,summary:summarizeEntitlementGrants(grants)};
}


async function getUserBase(userId){
  return (await pool.query(`
    SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,u.updated_at,
           bp.id AS business_profile_id,bp.business_name,bp.phone,bp.business_details,
           EXISTS(
             SELECT 1 FROM company_proof_documents cpd
             WHERE cpd.user_id=u.id AND cpd.status='verified'
           ) AS is_verified,
           COALESCE((
             SELECT json_agg(json_build_object(
               'industryId',bps.industry_id,'industryName',i.name,
               'serviceId',bps.service_id,'serviceName',s.name,
               'subserviceId',bps.subservice_id,'subserviceName',ss.name
             ) ORDER BY i.name,s.name,ss.name)
             FROM business_profile_services bps
             JOIN industries i ON i.id=bps.industry_id
             JOIN services s ON s.id=bps.service_id
             LEFT JOIN subservices ss ON ss.id=bps.subservice_id
             WHERE bps.business_profile_id=bp.id AND bps.is_active=TRUE
           ),'[]'::json) AS services,
           COALESCE((
             SELECT json_agg(json_build_object(
               'stateId',bpl.state_id,'stateName',st.name,
               'cityId',bpl.city_id,'cityName',c.name,
               'subcityId',bpl.subcity_id,'subcityName',sc.name,
               'pincode',bpl.pincode
             ) ORDER BY st.name,c.name,sc.name)
             FROM business_profile_locations bpl
             JOIN states st ON st.id=bpl.state_id
             JOIN cities c ON c.id=bpl.city_id
             LEFT JOIN subcities sc ON sc.id=bpl.subcity_id
             WHERE bpl.business_profile_id=bp.id AND bpl.is_active=TRUE
           ),'[]'::json) AS locations
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id=u.id
    WHERE u.id=$1
  `,[userId])).rows[0]||null;
}

async function getAccountAudit(userId){
  return (await pool.query(`
    SELECT a.id,a.action,a.before_data,a.after_data,a.reason,a.created_at,
           admin.name AS admin_name,admin.email AS admin_email
    FROM admin_user_audit a
    LEFT JOIN users admin ON admin.id=a.admin_id
    WHERE a.user_id=$1
    ORDER BY a.created_at DESC,a.id DESC
    LIMIT 150
  `,[userId])).rows;
}

async function getProofs(userId){
  return (await pool.query(`
    SELECT cpd.id,cpd.original_name,cpd.mime_type,cpd.file_size,cpd.file_url,
           cpd.status,cpd.reviewed_at,cpd.review_reason,cpd.created_at,cpd.updated_at,
           reviewer.name AS reviewer_name
    FROM company_proof_documents cpd
    LEFT JOIN users reviewer ON reviewer.id=cpd.reviewed_by
    WHERE cpd.user_id=$1
    ORDER BY cpd.created_at DESC,cpd.id DESC
  `,[userId])).rows;
}

async function getPayments(userId){
  return (await pool.query(`
    SELECT p.id,p.amount,p.status,p.payment_method,p.manual_reference,p.gateway_payment_id,
           p.wallet_amount,p.external_amount,p.purchase_type,p.purchase_id,p.notes,
           p.created_at,p.updated_at,p.paid_at,
           mp.name AS membership_plan_name,mp.plan_group AS membership_plan_group,
           lp.lead_id
    FROM payments p
    LEFT JOIN membership_plans mp ON mp.id=p.membership_plan_id
    LEFT JOIN lead_purchases lp ON lp.payment_id=p.id
    WHERE p.user_id=$1
    ORDER BY p.created_at DESC,p.id DESC
    LIMIT 150
  `,[userId])).rows.map(row=>({
    ...row,
    amount:number(row.amount),
    wallet_amount:number(row.wallet_amount),
    external_amount:number(row.external_amount)
  }));
}

async function getEntitlementHistory(userId){
  return (await pool.query(`
    SELECT g.id,g.source,g.registration_rule_id,g.campaign_id,
           g.shared_quantity,g.premium_quantity,g.starts_at,g.expires_at,g.claim_expiry_days,
           g.allow_single,g.allow_shared,g.allow_auto_release,g.allow_exclusive,
           g.revoked_at,g.notes,g.created_at,g.updated_at,
           rr.name AS registration_rule_name,
           bc.name AS campaign_name,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='shared')::int AS used_shared,
           COUNT(c.id) FILTER(WHERE c.entitlement_type='premium')::int AS used_premium
    FROM lead_entitlement_grants g
    LEFT JOIN lead_entitlement_registration_rules rr ON rr.id=g.registration_rule_id
    LEFT JOIN lead_entitlement_business_campaigns bc ON bc.id=g.campaign_id
    LEFT JOIN lead_entitlement_claims c ON c.grant_id=g.id
    WHERE g.user_id=$1
    GROUP BY g.id,rr.name,bc.name
    ORDER BY COALESCE(g.updated_at,g.created_at) DESC,g.id DESC
    LIMIT 100
  `,[userId])).rows;
}

function activityFrom({membership,wallet,payments,leads,entitlements,audit}){
  const rows=[];
  for(const h of membership?.history||[])rows.push({
    type:'membership',at:h.event_at,title:h.plan_name||'Membership',
    detail:h.event_source==='admin'?String(h.action||'Admin membership update').replace(/_/g,' '):`Payment ${h.payment_status||h.membership_status||''}`.trim(),
    status:h.membership_status||h.payment_status||null
  });
  for(const tx of wallet?.transactions||[])rows.push({
    type:'wallet',at:tx.created_at,title:tx.description||'Wallet activity',
    detail:`${tx.type||'transaction'} · ₹${number(tx.amount).toLocaleString('en-IN')}`,
    status:tx.status||tx.payment_status||null
  });
  for(const p of payments||[])rows.push({
    type:'payment',at:p.paid_at||p.created_at,title:`${p.purchase_type||'Payment'} payment #${p.id}`,
    detail:`₹${number(p.amount).toLocaleString('en-IN')}${p.manual_reference?` · ${p.manual_reference}`:''}`,
    status:p.status||null
  });
  for(const lead of (leads||[]).slice(0,75))rows.push({
    type:'lead',at:lead.created_at||lead.claimed_at,title:`Lead #${lead.lead_id}`,
    detail:`${lead.industry_name||'Lead'} · ${lead.pricing_tier||lead.payment_method||'access'}`,
    status:lead.crm_status||lead.purchase_status||'accessed'
  });
  for(const grant of entitlements||[])rows.push({
    type:'entitlement',at:grant.updated_at||grant.created_at,
    title:grant.campaign_name||grant.registration_rule_name||`Entitlement #${grant.id}`,
    detail:`${grant.shared_quantity||0} Basic · ${grant.premium_quantity||0} Premium`,
    status:grant.revoked_at?'revoked':'active'
  });
  for(const item of audit||[])rows.push({
    type:'account',at:item.created_at,title:String(item.action||'Account update').replace(/_/g,' '),
    detail:(item.admin_name?`Admin: ${item.admin_name}`:'Admin action')+(item.reason?` · ${item.reason}`:''),
    status:'admin'
  });
  return rows.filter(row=>row.at).sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,150);
}

async function getUser360(userId){
  const user=await getUserBase(userId);
  if(!user)return null;

  const [membership,wallet,leads,activeEntitlements,entitlements,payments,availablePlans,proofs,audit]=await Promise.all([
    paymentService.getMembershipCustomerDetails(userId),
    walletService.getAdminWalletCustomerDetails(userId),
    leadCrmPurchaseService.getHistory(userId),
    getActiveEntitlementSummary(userId),
    getEntitlementHistory(userId),
    getPayments(userId),
    membershipPlanService.getPlans(false),
    getProofs(userId),
    getAccountAudit(userId)
  ]);

  const current=activeMembership(membership?.plans||[]);
  const remainingDays=daysRemaining(current?.expires_at);
  const paidPayments=payments.filter(item=>item.status==='paid');
  const pendingPayments=payments.filter(item=>item.status==='pending');
  const pendingTopupCount=number(wallet?.stats?.pending_topups);
  const attention=[];
  if(!user.is_active)attention.push({level:'critical',code:'ACCOUNT_INACTIVE',text:'Account is inactive'});
  if(user.role==='business'&&!user.is_verified)attention.push({level:'warning',code:'UNVERIFIED',text:'Business is not verified'});
  if(current&&remainingDays!==null&&remainingDays<=7)attention.push({level:'warning',code:'MEMBERSHIP_EXPIRING',text:`${String(current.plan_group||current.plan_name||'Membership').toUpperCase()} expires in ${remainingDays} day${remainingDays===1?'':'s'}`});
  if(pendingPayments.length)attention.push({level:'warning',code:'PENDING_PAYMENT',text:`${pendingPayments.length} payment${pendingPayments.length===1?'':'s'} pending review`});
  if(pendingTopupCount)attention.push({level:'warning',code:'PENDING_TOPUP',text:`${pendingTopupCount} wallet recharge${pendingTopupCount===1?'':'s'} pending review`});

  return{
    user,
    snapshot:{
      currentMembership:current,
      membershipRemainingDays:remainingDays,
      walletBalance:number(wallet?.wallet?.balance),
      leadsAccessed:(leads||[]).length,
      totalPaid:paidPayments.reduce((sum,item)=>sum+number(item.amount),0),
      activeEntitlements:activeEntitlements?.summary||{shared:{},premium:{}},
      pendingPayments:pendingPayments.length,
      pendingTopups:pendingTopupCount
    },
    attention,
    membership:membership||{customer:null,plans:[],history:[]},
    availablePlans:(availablePlans||[]).filter(plan=>plan.is_active!==false&&String(plan.plan_type||'').toLowerCase()==='pro'&&['grow','scale'].includes(String(plan.plan_group||'').toLowerCase())),
    wallet:wallet||{wallet:{balance:0},recharges:[],transactions:[],totals:{}},
    leads:leads||[],
    payments,
    entitlements,
    proofs,
    audit,
    entitlementSummary:activeEntitlements?.summary||{shared:{},premium:{}},
    activity:activityFrom({membership,wallet,payments,leads,entitlements,audit})
  };
}

async function setMembershipPlan({userId,planId,adminId,days,reason}){
  const cleanReason=String(reason||'').trim();
  if(!cleanReason)throw Object.assign(new Error('Reason is required'),{code:'REASON_REQUIRED'});
  const safeDays=days===undefined||days===null||days===''?null:Number(days);
  if(safeDays!==null&&(!Number.isInteger(safeDays)||safeDays<1||safeDays>3650))throw Object.assign(new Error('Days must be a whole number between 1 and 3650'),{code:'INVALID_MEMBERSHIP_DAYS'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const user=(await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId])).rows[0];
    if(!user)throw Object.assign(new Error('User not found'),{code:'NOT_FOUND'});
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`membership-user:${userId}`]);

    const plan=(await client.query(`
      SELECT id,name,plan_group,plan_type,duration_days,is_active
      FROM membership_plans WHERE id=$1
    `,[planId])).rows[0];
    if(!plan||!plan.is_active||String(plan.plan_type||'').toLowerCase()!=='pro'||!['grow','scale'].includes(String(plan.plan_group||'').toLowerCase())){
      throw Object.assign(new Error('Choose an active GROW or SCALE plan'),{code:'INVALID_PLAN'});
    }

    const current=(await client.query(`
      SELECT m.*,mp.name AS old_plan_name,mp.plan_group AS old_plan_group
      FROM memberships m
      JOIN membership_plans mp ON mp.id=m.membership_plan_id
      WHERE m.user_id=$1
        AND m.status='active'
        AND m.expires_at>CURRENT_TIMESTAMP
        AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro'
      ORDER BY m.expires_at DESC,m.id DESC
      LIMIT 1
      FOR UPDATE OF m
    `,[userId])).rows[0]||null;

    const now=new Date();
    let membership;
    if(current){
      const expiry=safeDays!==null?new Date(now.getTime()+safeDays*86400000):new Date(current.expires_at);
      membership=(await client.query(`
        UPDATE memberships
        SET membership_plan_id=$1,status='active',expires_at=$2,
            -- A plan reassignment must not retain pricing or lead allowances
            -- saved for the previous plan. Same-plan extensions keep overrides.
            pricing_rule_id=CASE WHEN membership_plan_id=$1 THEN pricing_rule_id ELSE NULL END,
            effective_price=CASE WHEN membership_plan_id=$1 THEN effective_price ELSE NULL END,
            lead_entitlements_snapshot=CASE WHEN membership_plan_id=$1 THEN lead_entitlements_snapshot ELSE NULL END,
            updated_at=CURRENT_TIMESTAMP
        WHERE id=$3
        RETURNING *
      `,[plan.id,expiry,current.id])).rows[0];
      await client.query(`
        INSERT INTO membership_admin_history(
          membership_id,user_id,admin_id,action,old_status,new_status,
          old_expires_at,new_expires_at,payment_id,notes
        ) VALUES($1,$2,$3,'change_plan',$4,'active',$5,$6,$7,$8)
      `,[current.id,userId,adminId||null,current.status,current.expires_at,membership.expires_at,current.payment_id,
        `${current.old_plan_name} → ${plan.name}. ${cleanReason}`]);
    }else{
      const duration=safeDays!==null?safeDays:Math.max(1,Number(plan.duration_days||30));
      const expiry=new Date(now.getTime()+duration*86400000);
      membership=(await client.query(`
        INSERT INTO memberships(user_id,membership_plan_id,starts_at,expires_at,status)
        VALUES($1,$2,CURRENT_TIMESTAMP,$3,'active')
        RETURNING *
      `,[userId,plan.id,expiry])).rows[0];
      await client.query(`
        INSERT INTO membership_admin_history(
          membership_id,user_id,admin_id,action,old_status,new_status,
          old_expires_at,new_expires_at,payment_id,notes
        ) VALUES($1,$2,$3,'assign_plan',NULL,'active',NULL,$4,NULL,$5)
      `,[membership.id,userId,adminId||null,membership.expires_at,`Assigned ${plan.name}. ${cleanReason}`]);
    }
    await criticalActionAudit.record(client,{
      actorId:adminId,category:'membership',
      action:current?'membership.change_plan':'membership.assign_plan',
      entityType:'membership',entityId:membership.id,
      beforeData:current?{membershipId:current.id,planId:current.membership_plan_id,planName:current.old_plan_name,status:current.status,expiresAt:current.expires_at}:null,
      afterData:{membershipId:membership.id,planId:plan.id,planName:plan.name,status:membership.status,expiresAt:membership.expires_at},
      reason:cleanReason,metadata:{userId:Number(userId)},source:'admin_user_360'
    });
    await notificationService.notifyUser({
      userId,type:current?'membership_plan_changed':'membership_assigned',category:'membership',severity:'success',
      title:current?'Membership plan changed':'Membership activated',
      message:current?`Your membership was changed to ${plan.name} by ProPulse.`:`${plan.name} membership was activated for your account.`,
      actionUrl:'/membership',relatedType:'membership',relatedId:membership.id,
      dedupeKey:`membership-plan:${membership.id}:${plan.id}:${new Date(membership.expires_at).toISOString()}`,
      metadata:{planId:plan.id,planName:plan.name,expiresAt:membership.expires_at}
    },client);
    await client.query('COMMIT');
    return membership;
  }catch(error){
    try{await client.query('ROLLBACK')}catch{}
    throw error;
  }finally{client.release()}
}

module.exports={getUser360,setMembershipPlan};
