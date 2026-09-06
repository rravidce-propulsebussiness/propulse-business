const pool = require('../config/database');
const { isProMember } = require('./membershipAccessService');

async function createManualPayment({userId,amount,manualReference,proofUrl,notes,membershipPlanId}) {
  if(!manualReference || !String(manualReference).trim()) throw Object.assign(new Error('Payment reference / UTR is required'),{code:'REFERENCE_REQUIRED'});
  if(!membershipPlanId) throw Object.assign(new Error('A membership plan is required'),{code:'INVALID_PLAN'});
  const planResult=await pool.query(`SELECT id,name,plan_type,price,duration_days,is_active FROM membership_plans WHERE id=$1`,[membershipPlanId]);
  const plan=planResult.rows[0];
  if(!plan || !plan.is_active) throw Object.assign(new Error('Membership plan is not available'),{code:'PLAN_NOT_FOUND'});
  const planType=String(plan.plan_type||'').toLowerCase();
  if(!['pro','booster','investor'].includes(planType)) throw Object.assign(new Error('This membership plan cannot be purchased'),{code:'INVALID_PLAN'});
  if(['booster','investor'].includes(planType) && !(await isProMember(userId))) throw Object.assign(new Error(`An active Pro membership is required before purchasing ${planType==='investor'?'Investment':'Booster'}`),{code:'PRO_REQUIRED'});
  const expected=Number(plan.price),submitted=Number(amount);
  if(!Number.isFinite(expected)||expected<=0||!Number.isFinite(submitted)||Math.abs(expected-submitted)>0.01) throw Object.assign(new Error('Payment amount does not match the selected membership plan'),{code:'INVALID_AMOUNT'});
  const reference=String(manualReference).trim(); const client=await pool.connect();
  try { await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`payment-reference:${reference.toLowerCase()}`]);
    const duplicate=await client.query(`SELECT id FROM payments WHERE payment_method='manual' AND LOWER(BTRIM(manual_reference))=LOWER(BTRIM($1)) LIMIT 1`,[reference]);
    if(duplicate.rows[0]) throw Object.assign(new Error('This payment reference / UTR has already been submitted'),{code:'DUPLICATE_REFERENCE'});
    const result=await client.query(`INSERT INTO payments (user_id,membership_plan_id,amount,payment_method,status,manual_reference,proof_url,notes) VALUES ($1,$2,$3,'manual','pending',$4,$5,$6) RETURNING *`,[userId,plan.id,expected,reference,proofUrl||null,notes||`${plan.name} membership`]);
    await client.query('COMMIT'); return result.rows[0];
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

async function getPayments({status,search,page=1,limit=50}) {
  const values=[],where=[];
  if(status&&status!=='all'){values.push(status);where.push(`p.status=$${values.length}`);}
  if(search){values.push(`%${String(search).trim()}%`);where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(bp.business_name,'') ILIKE $${values.length} OR COALESCE(p.manual_reference,'') ILIKE $${values.length} OR COALESCE(mp.name,'') ILIKE $${values.length})`);}
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),100),safePage=Math.max(Number(page)||1,1),offset=(safePage-1)*safeLimit,baseWhere=where.length?`WHERE ${where.join(' AND ')}`:'';
  const from=`payments p JOIN users u ON u.id=p.user_id LEFT JOIN business_profiles bp ON bp.user_id=u.id LEFT JOIN membership_plans mp ON mp.id=p.membership_plan_id`;
  const countResult=await pool.query(`SELECT COUNT(*)::int AS total FROM ${from} ${baseWhere}`,values);
  const statsResult=await pool.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE p.status='pending')::int AS pending,COUNT(*) FILTER (WHERE p.status='paid')::int AS paid,COUNT(*) FILTER (WHERE p.status='rejected')::int AS rejected,COUNT(*) FILTER (WHERE p.status='failed')::int AS failed,COUNT(*) FILTER (WHERE p.status='refunded')::int AS refunded,COUNT(*) FILTER (WHERE p.payment_method='manual')::int AS manual FROM ${from} ${baseWhere}`,values);
  const dataValues=[...values,safeLimit,offset];
  const result=await pool.query(`
    SELECT p.*,u.name AS user_name,u.email AS user_email,bp.business_name,
           mp.name AS membership_plan_name,mp.plan_type AS membership_plan_type,mp.billing_period,mp.billing_months,
           COALESCE(w.balance,0)::numeric AS wallet_balance,
           CASE WHEN p.membership_plan_id IS NOT NULL THEN 'membership' ELSE 'other' END AS payment_type,
           lm.id AS membership_id,lm.starts_at AS membership_starts_at,lm.expires_at AS membership_expires_at,lm.status AS membership_status,
           CASE WHEN lm.expires_at IS NULL THEN NULL ELSE GREATEST(0,CEIL(EXTRACT(EPOCH FROM (lm.expires_at-CURRENT_TIMESTAMP))/86400.0))::int END AS membership_remaining_days
    FROM ${from}
    LEFT JOIN wallets w ON w.user_id=u.id
    LEFT JOIN LATERAL (
      SELECT m.id,m.starts_at,m.expires_at,m.status
      FROM memberships m
      WHERE m.user_id=p.user_id AND m.membership_plan_id=p.membership_plan_id
      ORDER BY (m.status='active' AND m.expires_at>CURRENT_TIMESTAMP) DESC,m.expires_at DESC,m.id DESC
      LIMIT 1
    ) lm ON TRUE
    ${baseWhere}
    ORDER BY p.created_at DESC,p.id DESC
    LIMIT $${dataValues.length-1} OFFSET $${dataValues.length}` ,dataValues);
  return {items:result.rows,total:countResult.rows[0].total,page:safePage,limit:safeLimit,pages:Math.ceil(countResult.rows[0].total/safeLimit),stats:statsResult.rows[0]};
}

async function getMembershipCustomers({search,page=1,limit=50}) {
  const values=[]; const where=[];
  if(search){values.push(`%${String(search).trim()}%`);where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(bp.business_name,'') ILIKE $${values.length} OR EXISTS (SELECT 1 FROM memberships sm JOIN membership_plans sp ON sp.id=sm.membership_plan_id WHERE sm.user_id=u.id AND sp.name ILIKE $${values.length}))`);}
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),100),safePage=Math.max(Number(page)||1,1),offset=(safePage-1)*safeLimit,baseWhere=where.length?`WHERE ${where.join(' AND ')}`:'';
  const from=`users u LEFT JOIN business_profiles bp ON bp.user_id=u.id JOIN memberships m ON m.user_id=u.id LEFT JOIN membership_plans mp ON mp.id=m.membership_plan_id`;
  const count=(await pool.query(`SELECT COUNT(*)::int AS total FROM (SELECT u.id FROM ${from} ${baseWhere} GROUP BY u.id) x`,values)).rows[0].total;
  const dataValues=[...values,safeLimit,offset];
  const result=await pool.query(`
    SELECT u.id AS user_id,u.name AS user_name,u.email AS user_email,bp.business_name,
           COALESCE((SELECT string_agg(x.location_label,' · ' ORDER BY x.location_label) FROM (SELECT DISTINCT c.name || ', ' || s.name AS location_label FROM business_profile_locations bpl JOIN cities c ON c.id=bpl.city_id JOIN states s ON s.id=bpl.state_id JOIN business_profiles lbp ON lbp.id=bpl.business_profile_id WHERE lbp.user_id=u.id AND bpl.is_active=TRUE) x),'—') AS location,
           COUNT(DISTINCT m.id)::int AS membership_count,
           COUNT(DISTINCT m.id) FILTER (WHERE m.status='active' AND m.expires_at>CURRENT_TIMESTAMP)::int AS active_membership_count,
           COALESCE(string_agg(DISTINCT mp.name,', ' ORDER BY mp.name) FILTER (WHERE m.status='active' AND m.expires_at>CURRENT_TIMESTAMP),'—') AS plans,
           MAX(m.expires_at) FILTER (WHERE m.status='active' AND m.expires_at>CURRENT_TIMESTAMP) AS active_expires_at,
           MAX(p.created_at) AS last_payment_at,
           COUNT(DISTINCT p.id) FILTER (WHERE p.status='paid')::int AS paid_payment_count
    FROM ${from}
    LEFT JOIN payments p ON p.id=m.payment_id
    ${baseWhere}
    GROUP BY u.id,u.name,u.email,bp.business_name
    ORDER BY COALESCE(bp.business_name,u.name),u.id
    LIMIT $${dataValues.length-1} OFFSET $${dataValues.length}` ,dataValues);
  return {items:result.rows,total:count,page:safePage,limit:safeLimit,pages:Math.ceil(count/safeLimit)};
}

async function getMembershipCustomerDetails(userId) {
  const customerResult=await pool.query(`
    SELECT u.id AS user_id,u.name AS user_name,u.email AS user_email,bp.business_name,
           COALESCE((SELECT string_agg(x.location_label,' · ' ORDER BY x.location_label) FROM (SELECT DISTINCT c.name || ', ' || s.name AS location_label FROM business_profile_locations bpl JOIN cities c ON c.id=bpl.city_id JOIN states s ON s.id=bpl.state_id JOIN business_profiles lbp ON lbp.id=bpl.business_profile_id WHERE lbp.user_id=u.id AND bpl.is_active=TRUE) x),'—') AS location
    FROM users u LEFT JOIN business_profiles bp ON bp.user_id=u.id WHERE u.id=$1`,[userId]);
  const customer=customerResult.rows[0]; if(!customer) return null;
  const plans=(await pool.query(`
    SELECT m.id AS membership_id,m.status,m.starts_at,m.expires_at,m.payment_id,
           mp.id AS plan_id,mp.name AS plan_name,mp.plan_group,mp.plan_type,mp.description,mp.price,mp.duration_days,mp.billing_period,mp.billing_months,mp.benefits,mp.lead_entitlements,mp.add_ons,mp.lead_rollover_enabled,mp.lead_expiry_days,
           p.amount AS payment_amount,p.status AS payment_status,p.payment_method,p.manual_reference,p.created_at AS payment_created_at,p.paid_at
    FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id
    LEFT JOIN payments p ON p.id=m.payment_id
    WHERE m.user_id=$1
    ORDER BY (m.status='active' AND m.expires_at>CURRENT_TIMESTAMP) DESC,m.expires_at DESC,m.id DESC`,[userId])).rows;
  const history=(await pool.query(`
    SELECT * FROM (
      SELECT 'payment'::text AS event_source,m.id AS membership_id,p.id AS payment_id,mp.name AS plan_name,mp.plan_type,p.status AS payment_status,m.status AS membership_status,
             m.starts_at,m.expires_at,p.amount,p.manual_reference,p.created_at AS event_at,'payment'::text AS action,NULL::text AS notes
      FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id LEFT JOIN payments p ON p.id=m.payment_id
      WHERE m.user_id=$1
      UNION ALL
      SELECT 'admin'::text AS event_source,h.membership_id,h.payment_id,mp.name AS plan_name,mp.plan_type,NULL::text AS payment_status,h.new_status AS membership_status,
             NULL::timestamp AS starts_at,h.new_expires_at AS expires_at,NULL::numeric AS amount,NULL::text AS manual_reference,h.created_at AS event_at,h.action,h.notes
      FROM membership_admin_history h JOIN memberships hm ON hm.id=h.membership_id JOIN membership_plans mp ON mp.id=hm.membership_plan_id
      WHERE h.user_id=$1
    ) timeline
    ORDER BY event_at DESC`,[userId])).rows;
  return {customer,plans,history};
}

async function activateMembership(client,payment) {
  if(!payment.membership_plan_id) return null;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`membership-user:${payment.user_id}`]);
  const planResult=await client.query(`SELECT id,name,plan_type,duration_days,is_active FROM membership_plans WHERE id=$1`,[payment.membership_plan_id]); const plan=planResult.rows[0];
  if(!plan||!plan.is_active) throw Object.assign(new Error('Membership plan is no longer available'),{code:'PLAN_NOT_FOUND'});
  const planType=String(plan.plan_type||'').toLowerCase(); if(!['pro','booster','investor'].includes(planType)) throw Object.assign(new Error('Only Pro, Booster or Investment membership payments can be activated'),{code:'INVALID_PLAN'});
  if(['booster','investor'].includes(planType) && !(await isProMember(payment.user_id,client))) throw Object.assign(new Error(`An active Pro membership is required before ${planType==='investor'?'Investment':'Booster'} can be activated`),{code:'PRO_REQUIRED'});

  const currentResult=await client.query(`
    SELECT m.id,m.membership_plan_id,m.starts_at,m.expires_at,m.status,mp.name AS plan_name
    FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id
    WHERE m.user_id=$1 AND m.status='active' AND m.expires_at>CURRENT_TIMESTAMP
      AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))=$2
    ORDER BY m.expires_at DESC,m.id DESC
    LIMIT 1 FOR UPDATE OF m`,[payment.user_id,planType]);
  const current=currentResult.rows[0],now=new Date();
  const base=current&&new Date(current.expires_at)>now?new Date(current.expires_at):now;
  const end=new Date(base); end.setDate(end.getDate()+Math.max(1,Number(plan.duration_days||30)));
  let membershipId;
  let note='Membership activated from paid payment';
  if(current){
    membershipId=current.id;
    if(planType==='pro' && current.membership_plan_id!==plan.id) note=`Pro membership changed from ${current.plan_name} to ${plan.name} and extended from the existing expiry`;
    else if(current.membership_plan_id!==plan.id) note=`${planType} membership changed from ${current.plan_name} to ${plan.name} and extended from the existing expiry`;
    await client.query(`UPDATE memberships SET membership_plan_id=$1,payment_id=$2,expires_at=$3,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=$4`,[plan.id,payment.id,end,current.id]);
  } else {
    const inserted=await client.query(`INSERT INTO memberships(user_id,membership_plan_id,payment_id,starts_at,expires_at,status) VALUES($1,$2,$3,$4,$5,'active') RETURNING id`,[payment.user_id,plan.id,payment.id,base,end]); membershipId=inserted.rows[0].id;
  }
  await client.query(`INSERT INTO membership_admin_history(membership_id,user_id,action,old_status,new_status,old_expires_at,new_expires_at,payment_id,notes) VALUES($1,$2,'payment_activation',$3,'active',$4,$5,$6,$7)`,[membershipId,payment.user_id,current?.status||null,current?.expires_at||null,end,payment.id,note]);
  return{planId:plan.id,planType,expiresAt:end,upgradedFrom:current&&current.membership_plan_id!==plan.id?current.plan_name:null};
}

async function updatePaymentStatus(id,status,adminId,notes) {
  const client=await pool.connect();
  try { await client.query('BEGIN'); const existing=await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`,[id]); const payment=existing.rows[0]; if(!payment)return null;
    if(payment.payment_method!=='manual') throw Object.assign(new Error('Only manual payments can be reviewed from the admin payment panel'),{code:'PAYMENT_NOT_MANUAL'});
    const currentStatus=String(payment.status||'').toLowerCase(); if(currentStatus==='paid') throw Object.assign(new Error('A paid payment cannot be reviewed again'),{code:'PAYMENT_ALREADY_PAID'}); if(['rejected','failed','refunded'].includes(currentStatus)) throw Object.assign(new Error(`Payment is already in terminal state: ${currentStatus}`),{code:'PAYMENT_TERMINAL'});
    if(!['paid','rejected','failed'].includes(status)) throw Object.assign(new Error('Invalid payment status transition'),{code:'INVALID_PAYMENT_TRANSITION'}); let membership=null; if(status==='paid')membership=await activateMembership(client,payment);
    await client.query(`UPDATE payments SET status=$1::varchar,reviewed_by=$2,reviewed_at=CURRENT_TIMESTAMP,paid_at=CASE WHEN $1::varchar='paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,notes=COALESCE($3::text,notes),updated_at=CURRENT_TIMESTAMP WHERE id=$4`,[status,adminId,notes||null,id]); const updated=(await client.query(`SELECT * FROM payments WHERE id=$1`,[id])).rows[0]; await client.query('COMMIT'); return{...updated,membership_activation:membership};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

async function updateMembership({membershipId,action,days,expiresAt,adminId}) {
  const allowed=['activate','deactivate','extend','reduce','set_expiry'];
  if(!allowed.includes(action)) throw Object.assign(new Error('Invalid membership action'),{code:'INVALID_MEMBERSHIP_ACTION'});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const keyRow=(await client.query(`SELECT user_id FROM memberships WHERE id=$1`,[membershipId])).rows[0];
    if(!keyRow) throw Object.assign(new Error('Membership not found'),{code:'MEMBERSHIP_NOT_FOUND'});
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`membership-user:${keyRow.user_id}`]);
    const row=(await client.query(`SELECT m.id,m.user_id,m.membership_plan_id,m.payment_id,m.starts_at,m.expires_at,m.status,mp.name AS plan_name,mp.plan_type,mp.duration_days FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.id=$1 FOR UPDATE OF m`,[membershipId])).rows[0];
    if(!row) throw Object.assign(new Error('Membership not found'),{code:'MEMBERSHIP_NOT_FOUND'});
    const oldStatus=row.status,oldExpires=row.expires_at,now=new Date();
    if(action==='activate') {
      const tier=String(row.plan_type||'').toLowerCase();
      if(['booster','investor'].includes(tier) && !(await isProMember(row.user_id,client))) throw Object.assign(new Error(`An active Pro membership is required before ${tier==='investor'?'Investment':'Booster'} can be activated`),{code:'PRO_REQUIRED'});
      if(tier==='pro') {
        const other=(await client.query(`SELECT m.id,mp.name AS plan_name FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.id<>$2 AND m.status='active' AND m.expires_at>CURRENT_TIMESTAMP AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro' LIMIT 1`,[row.user_id,row.id])).rows[0];
        if(other) throw Object.assign(new Error(`Another active Pro membership already exists (${other.plan_name}). Deactivate it before activating this record.`),{code:'ANOTHER_PRO_ACTIVE'});
      }
      let end=new Date(row.expires_at); if(!Number.isFinite(end.getTime())||end<=now){end=new Date(now);end.setDate(end.getDate()+Math.max(1,Number(row.duration_days||30)));}
      await client.query(`UPDATE memberships SET status='active',starts_at=CASE WHEN starts_at>CURRENT_TIMESTAMP OR expires_at<=CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP ELSE starts_at END,expires_at=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[end,membershipId]);
    } else if(action==='deactivate') {
      await client.query(`UPDATE memberships SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[membershipId]);
    } else if(action==='extend'||action==='reduce') {
      const value=Number(days); if(!Number.isInteger(value)||value<=0||value>3650) throw Object.assign(new Error('Days must be a whole number between 1 and 3650'),{code:'INVALID_MEMBERSHIP_DAYS'});
      if(action==='extend') { const base=new Date(row.expires_at)>now?new Date(row.expires_at):now; const end=new Date(base); end.setDate(end.getDate()+value); await client.query(`UPDATE memberships SET expires_at=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[end,membershipId]); }
      else { const end=new Date(row.expires_at); end.setDate(end.getDate()-value); const final=end<=now?now:end; await client.query(`UPDATE memberships SET expires_at=$1,status=CASE WHEN $1::timestamp<=CURRENT_TIMESTAMP THEN 'cancelled' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[final,membershipId]); }
    } else if(action==='set_expiry') {
      const end=new Date(expiresAt); if(!expiresAt||!Number.isFinite(end.getTime())) throw Object.assign(new Error('A valid expiry date is required'),{code:'INVALID_EXPIRY'});
      await client.query(`UPDATE memberships SET expires_at=$1,status=CASE WHEN $1::timestamp<=CURRENT_TIMESTAMP THEN 'cancelled' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,[end,membershipId]);
    }
    const updated=(await client.query(`SELECT m.id,m.user_id,m.membership_plan_id,m.payment_id,m.starts_at,m.expires_at,m.status,mp.name AS plan_name,mp.plan_type,mp.billing_period,mp.billing_months FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.id=$1`,[membershipId])).rows[0];
    await client.query(`INSERT INTO membership_admin_history(membership_id,user_id,admin_id,action,old_status,new_status,old_expires_at,new_expires_at,payment_id,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[membershipId,row.user_id,adminId||null,action,oldStatus,updated.status,oldExpires,updated.expires_at,row.payment_id,notesForMembershipAction(action)]);
    await client.query('COMMIT'); return updated;
  } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();}
}

function notesForMembershipAction(action){
  return ({activate:'Membership activated by admin',deactivate:'Membership deactivated by admin',extend:'Membership extended by admin',reduce:'Membership reduced by admin',set_expiry:'Membership expiry changed by admin'})[action] || null;
}

module.exports={createManualPayment,getPayments,getMembershipCustomers,getMembershipCustomerDetails,updatePaymentStatus,updateMembership};
