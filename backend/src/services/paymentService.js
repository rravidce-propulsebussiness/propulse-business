const pool = require('../config/database');
const { isProMember } = require('./membershipAccessService');

async function createManualPayment({userId,amount,manualReference,proofUrl,notes,membershipPlanId}) {
  if(!manualReference || !String(manualReference).trim()) throw Object.assign(new Error('Payment reference / UTR is required'),{code:'REFERENCE_REQUIRED'});
  if(!membershipPlanId) throw Object.assign(new Error('A membership plan is required'),{code:'INVALID_PLAN'});
  const planResult=await pool.query(`SELECT id,name,plan_type,price,duration_days,is_active FROM membership_plans WHERE id=$1`,[membershipPlanId]);
  const plan=planResult.rows[0];
  if(!plan || !plan.is_active) throw Object.assign(new Error('Membership plan is not available'),{code:'PLAN_NOT_FOUND'});
  const planType=String(plan.plan_type||'').toLowerCase();
  if(!['pro','booster'].includes(planType)) {
    if(planType==='investor') throw Object.assign(new Error('Investor access is available only to customers with an active Pro membership and is not purchased separately'),{code:'PRO_REQUIRED'});
    throw Object.assign(new Error('This membership plan cannot be purchased'),{code:'INVALID_PLAN'});
  }
  if(planType==='booster' && !(await isProMember(userId))) throw Object.assign(new Error('An active Pro membership is required before purchasing Booster'),{code:'PRO_REQUIRED'});
  const expected=Number(plan.price),submitted=Number(amount);
  if(!Number.isFinite(expected)||expected<=0||!Number.isFinite(submitted)||Math.abs(expected-submitted)>0.01) throw Object.assign(new Error('Payment amount does not match the selected membership plan'),{code:'INVALID_AMOUNT'});
  const reference=String(manualReference).trim();
  const duplicate=await pool.query(`SELECT id FROM payments WHERE payment_method='manual' AND LOWER(BTRIM(manual_reference))=LOWER(BTRIM($1)) LIMIT 1`,[reference]);
  if(duplicate.rows[0]) throw Object.assign(new Error('This payment reference / UTR has already been submitted'),{code:'DUPLICATE_REFERENCE'});
  try {
    const result=await pool.query(`INSERT INTO payments (user_id,membership_plan_id,amount,payment_method,status,manual_reference,proof_url,notes) VALUES ($1,$2,$3,'manual','pending',$4,$5,$6) RETURNING *`,[userId,plan.id,expected,reference,proofUrl||null,notes||`${plan.name} membership`]);
    return result.rows[0];
  } catch(error) {
    if(error.code==='23505') throw Object.assign(new Error('This payment reference / UTR has already been submitted'),{code:'DUPLICATE_REFERENCE'});
    throw error;
  }
}

async function getPayments({status,search,page=1,limit=50}) {
  const values=[],where=[];
  if(status&&status!=='all'){values.push(status);where.push(`p.status=$${values.length}`);}
  if(search){values.push(`%${String(search).trim()}%`);where.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR COALESCE(p.manual_reference,'') ILIKE $${values.length})`);}
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),100),safePage=Math.max(Number(page)||1,1),offset=(safePage-1)*safeLimit;
  const countResult=await pool.query(`SELECT COUNT(*)::int AS total FROM payments p JOIN users u ON u.id=p.user_id ${where.length?`WHERE ${where.join(' AND ')}`:''}`,values);
  const dataValues=[...values,safeLimit,offset];
  const result=await pool.query(`SELECT p.*,u.name AS user_name,u.email AS user_email,bp.business_name,mp.name AS membership_plan_name FROM payments p JOIN users u ON u.id=p.user_id LEFT JOIN business_profiles bp ON bp.user_id=u.id LEFT JOIN membership_plans mp ON mp.id=p.membership_plan_id ${where.length?`WHERE ${where.join(' AND ')}`:''} ORDER BY p.created_at DESC LIMIT $${dataValues.length-1} OFFSET $${dataValues.length}`,dataValues);
  return {items:result.rows,total:countResult.rows[0].total,page:safePage,limit:safeLimit,pages:Math.ceil(countResult.rows[0].total/safeLimit)};
}

async function activateMembership(client,payment) {
  if(!payment.membership_plan_id) return null;
  const planResult=await client.query(`SELECT id,plan_type,duration_days,is_active FROM membership_plans WHERE id=$1`,[payment.membership_plan_id]);
  const plan=planResult.rows[0];
  if(!plan||!plan.is_active) throw Object.assign(new Error('Membership plan is no longer available'),{code:'PLAN_NOT_FOUND'});
  const planType=String(plan.plan_type||'').toLowerCase();
  if(!['pro','booster'].includes(planType)) throw Object.assign(new Error('Only Pro or Booster membership payments can be activated'),{code:'INVALID_PLAN'});
  if(planType==='booster' && !(await isProMember(payment.user_id,client))) throw Object.assign(new Error('An active Pro membership is required before Booster can be activated'),{code:'PRO_REQUIRED'});
  const currentResult=await client.query(`SELECT id,starts_at,expires_at FROM memberships WHERE user_id=$1 AND membership_plan_id=$2 AND status='active' AND expires_at>CURRENT_TIMESTAMP ORDER BY expires_at DESC LIMIT 1 FOR UPDATE`,[payment.user_id,plan.id]);
  const current=currentResult.rows[0];
  const now=new Date(),base=current&&new Date(current.expires_at)>now?new Date(current.expires_at):now,end=new Date(base);
  end.setDate(end.getDate()+Math.max(1,Number(plan.duration_days||30)));
  if(current) await client.query(`UPDATE memberships SET payment_id=$1,expires_at=$2,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=$3`,[payment.id,end,current.id]);
  else await client.query(`INSERT INTO memberships(user_id,membership_plan_id,payment_id,starts_at,expires_at,status) VALUES($1,$2,$3,$4,$5,'active')`,[payment.user_id,plan.id,payment.id,base,end]);
  return{planId:plan.id,planType,expiresAt:end};
}

async function updatePaymentStatus(id,status,adminId,notes) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const existing=await client.query(`SELECT * FROM payments WHERE id=$1 FOR UPDATE`,[id]);
    const payment=existing.rows[0];
    if(!payment){await client.query('ROLLBACK');return null;}
    if(payment.payment_method!=='manual') throw Object.assign(new Error('Only manual payments can be reviewed from the admin payment panel'),{code:'PAYMENT_NOT_MANUAL'});
    const currentStatus=String(payment.status||'').toLowerCase();
    if(currentStatus==='paid') throw Object.assign(new Error('A paid payment cannot be reviewed again'),{code:'PAYMENT_ALREADY_PAID'});
    if(['rejected','failed','refunded'].includes(currentStatus)) throw Object.assign(new Error(`Payment is already in terminal state: ${currentStatus}`),{code:'PAYMENT_TERMINAL'});
    if(!['paid','rejected','failed'].includes(status)) throw Object.assign(new Error('Invalid payment status transition'),{code:'INVALID_PAYMENT_TRANSITION'});
    let membership=null;
    if(status==='paid') membership=await activateMembership(client,payment);
    await client.query(`UPDATE payments SET status=$1,reviewed_by=$2,reviewed_at=CURRENT_TIMESTAMP,paid_at=CASE WHEN $1='paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,notes=COALESCE($3,notes),updated_at=CURRENT_TIMESTAMP WHERE id=$4`,[status,adminId,notes||null,id]);
    const updated=(await client.query(`SELECT * FROM payments WHERE id=$1`,[id])).rows[0];
    await client.query('COMMIT');
    return{...updated,membership_activation:membership};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

module.exports={createManualPayment,getPayments,updatePaymentStatus};
