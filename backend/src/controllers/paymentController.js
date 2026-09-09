const pool = require('../config/database');
const paymentService = require('../services/paymentService');
const leadPaymentApprovalService = require('../services/leadPaymentApprovalService');
const investmentService = require('../services/investmentService');
const investmentPaymentDraftService = require('../services/investmentPaymentDraftService');
const { getMembershipAccess, getCurrentProMembership } = require('../services/membershipAccessService');

async function checkoutMembership(req,res){try{const result=await paymentService.createMembershipCheckout({userId:req.user.id,membershipPlanId:req.body.membershipPlanId,couponCode:req.body.couponCode});res.status(201).json(result)}catch(error){console.error('Membership checkout failed:',error.message);const status=error.code==='PAYMENT_PENDING'||error.code==='DUPLICATE_COUPON_REDEMPTION'?409:['INVALID_PLAN','PLAN_NOT_FOUND','INVALID_AMOUNT','PRO_REQUIRED','COUPON_NOT_FOUND','COUPON_INACTIVE','COUPON_NOT_STARTED','COUPON_EXPIRED','MIN_ORDER','PURCHASE_NOT_ELIGIBLE','PLAN_NOT_ELIGIBLE','USER_NOT_ELIGIBLE','INDUSTRY_NOT_ELIGIBLE','USAGE_LIMIT','USER_USAGE_LIMIT','INVALID_AMOUNT','COUPON_REDEMPTION_INVALID'].includes(error.code)?400:500;res.status(status).json({error:error.message||'Failed to create membership payment',code:error.code,paymentId:error.paymentId})}}
async function submitPaymentReference(req,res){
  try {
    const draftId=String(req.params.id||'');
    const manualReference=String(req.body.manualReference||'').trim();
    const proofUrl=req.body.proofUrl;
    if(draftId.startsWith('draft_')){
      if(!manualReference)return res.status(400).json({error:'Payment reference / UTR is required',code:'REFERENCE_REQUIRED'});
      if(!proofUrl)return res.status(400).json({error:'Payment proof is required',code:'PROOF_REQUIRED'});
      const draft=investmentPaymentDraftService.consume(draftId,req.user.id);
      if(!draft)return res.status(404).json({error:'Payment session expired. Please start the direct payment again.',code:'DRAFT_NOT_FOUND'});
      const result=await investmentService.createInvestmentCheckout({...draft,useWallet:false});
      if(result.investment?.id){await pool.query('UPDATE investments SET reinvestment_enabled=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND user_id=$3',[Boolean(draft.reinvestmentEnabled),Number(result.investment.id),Number(req.user.id)]);}
      const updated=await paymentService.submitPaymentReference({userId:req.user.id,paymentId:result.payment.id,manualReference,proofUrl,notes:req.body.notes||`Investment #${result.investment?.id||result.payment?.purchase_id} direct payment`});
      return res.json(updated);
    }
    const result=await paymentService.submitPaymentReference({userId:req.user.id,paymentId:req.params.id,manualReference,proofUrl,notes:req.body.notes});res.json(result)
  }catch(error){console.error('Submit payment reference failed:',error.message);const status=error.code==='DUPLICATE_REFERENCE'?409:['REFERENCE_REQUIRED','PROOF_REQUIRED','PAYMENT_NOT_PENDING'].includes(error.code)?400:error.code==='NOT_FOUND'||error.code==='DRAFT_NOT_FOUND'?404:error.code==='PAYMENT_PENDING'?409:500;res.status(status).json({error:error.message||'Failed to submit payment reference',code:error.code})}
}
async function getCurrentMembership(req,res){try{const [membership,access]=await Promise.all([getCurrentProMembership(req.user.id),getMembershipAccess(req.user.id)]);res.json(membership?{...membership,...access}:access)}catch(error){console.error('Get membership access failed:',error.message);res.status(500).json({error:'Failed to fetch membership'})}}
async function getUserMembershipPayments(req,res){try{res.json(await paymentService.getUserMembershipPayments(req.user.id));}catch(error){console.error('Get user membership payments failed:',error.message);res.status(500).json({error:'Failed to fetch membership payment history'});}}
async function getPayments(req,res){try{const result=await paymentService.getPayments({status:req.query.status,search:req.query.search,page:req.query.page,limit:req.query.limit});const items=(result.items||[]).filter(payment=>payment.purchase_type!=='lead'&&payment.purchase_type!=='wallet_topup');const visiblePending=items.filter(payment=>payment.status==='pending').length;const visibleTotal=items.length;res.json({...result,items,total:visibleTotal,pages:visibleTotal?Math.ceil(visibleTotal/Math.max(Number(result.limit)||50,1)):0,stats:{...(result.stats||{}),pending:visiblePending,total:visibleTotal}})}catch(error){console.error('Get payments failed:',error.message);res.status(500).json({error:'Failed to fetch payments'})}}
async function getLeadPayments(req,res){
  try{
    const values=[];
    const where=[`p.purchase_type='lead'`];
    const requestedStatus=String(req.query.status||'pending').trim().toLowerCase();
    if(requestedStatus&&requestedStatus!=='all'){values.push(requestedStatus);where.push(`p.status=$${values.length}`);}
    const search=String(req.query.search||'').trim();
    if(search){
      values.push(`%${search}%`);
      const n=values.length;
      where.push(`(u.name ILIKE $${n} OR u.email ILIKE $${n} OR COALESCE(bp.business_name,'') ILIKE $${n} OR COALESCE(bp.phone,'') ILIKE $${n} OR CAST(p.id AS TEXT) ILIKE $${n} OR CAST(p.purchase_id AS TEXT) ILIKE $${n} OR COALESCE(p.manual_reference,'') ILIKE $${n} OR COALESCE(l.customer_name,'') ILIKE $${n} OR COALESCE(l.requirement,'') ILIKE $${n})`);
    }
    const safeLimit=Math.min(Math.max(Number(req.query.limit)||50,1),100);
    const safePage=Math.max(Number(req.query.page)||1,1);
    const offset=(safePage-1)*safeLimit;
    const baseWhere=`WHERE ${where.join(' AND ')}`;
    const from=`payments p JOIN users u ON u.id=p.user_id LEFT JOIN business_profiles bp ON bp.user_id=u.id LEFT JOIN leads l ON l.id=p.purchase_id`;
    const countResult=await pool.query(`SELECT COUNT(*)::int AS total FROM ${from} ${baseWhere}`,values);
    const statsResult=await pool.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE p.status='pending')::int AS pending,COUNT(*) FILTER (WHERE p.status='paid')::int AS paid,COUNT(*) FILTER (WHERE p.status='rejected')::int AS rejected,COUNT(*) FILTER (WHERE p.status='failed')::int AS failed FROM ${from} ${baseWhere}`,values);
    const dataValues=[...values,safeLimit,offset];
    const items=(await pool.query(`SELECT p.*,u.name AS user_name,u.email AS user_email,bp.business_name,bp.phone,l.id AS lead_id,l.customer_name,l.requirement,l.property_type,l.budget,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,c.name AS city_name,COALESCE(p.wallet_amount,0)::numeric AS wallet_amount,COALESCE(p.external_amount,0)::numeric AS external_amount FROM ${from} LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities c ON c.id=l.city_id ${baseWhere} ORDER BY p.created_at DESC,p.id DESC LIMIT $${dataValues.length-1} OFFSET $${dataValues.length}`,dataValues)).rows;
    const total=Number(countResult.rows[0]?.total||0);
    res.json({items,total,page:safePage,limit:safeLimit,pages:Math.ceil(total/safeLimit),stats:statsResult.rows[0]||{total:0,pending:0,paid:0,rejected:0,failed:0}});
  }catch(error){console.error('Get lead payments failed:',error.message);res.status(500).json({error:'Failed to fetch lead payment approvals'})}
}
async function getMembershipCustomers(req,res){try{res.json(await paymentService.getMembershipCustomers({search:req.query.search,page:req.query.page,limit:req.query.limit}));}catch(error){console.error('Get membership customers failed:',error.message);res.status(500).json({error:'Failed to fetch membership customers'});}}
async function getMembershipCustomerDetails(req,res){try{const result=await paymentService.getMembershipCustomerDetails(req.params.userId);if(!result)return res.status(404).json({error:'User not found'});res.json(result)}catch(error){console.error('Get membership customer details failed:',error.message);res.status(500).json({error:'Failed to fetch membership details'})}}
async function updatePaymentStatus(req,res){try{const {status}=req.body;if(!['paid','rejected','failed'].includes(status))return res.status(400).json({error:'Only paid, rejected, or failed are valid admin review outcomes'});const paymentType=(await pool.query(`SELECT purchase_type FROM payments WHERE id=$1`,[req.params.id])).rows[0]?.purchase_type;const payment=paymentType==='lead'?await leadPaymentApprovalService.updateLeadPaymentStatus({paymentId:req.params.id,status,adminId:req.user.id,notes:req.body.notes}):await paymentService.updatePaymentStatus(req.params.id,status,req.user.id,req.body.notes);if(!payment)return res.status(404).json({error:'Payment not found'});res.json(payment)}catch(error){console.error('Update payment failed:',error.message);const badRequestCodes=['PAYMENT_NOT_MANUAL','PAYMENT_ALREADY_PAID','PAYMENT_TERMINAL','INVALID_PAYMENT_TRANSITION','PLAN_NOT_FOUND','INVALID_PLAN','PRO_REQUIRED','ANOTHER_PRO_ACTIVE','NOT_AVAILABLE','CAPACITY_REACHED','PURCHASE_NOT_FOUND','REFERENCE_REQUIRED','PROOF_REQUIRED','INSUFFICIENT_BALANCE'];res.status(error.code==='MEMBERSHIP_NOT_FOUND'||error.code==='NOT_FOUND'?404:(badRequestCodes.includes(error.code)||error.code==='23514')?400:500).json({error:error.message||'Failed to update payment',code:error.code})}}
async function updateMembership(req,res){try{const membership=await paymentService.updateMembership({membershipId:req.params.id,action:req.body.action,days:req.body.days,expiresAt:req.body.expiresAt,adminId:req.user.id});res.json(membership);}catch(error){console.error('Update membership from payments failed:',error.message);const bad=['INVALID_MEMBERSHIP_ACTION','INVALID_MEMBERSHIP_DAYS','PRO_REQUIRED','ANOTHER_PRO_ACTIVE'];res.status(error.code==='MEMBERSHIP_NOT_FOUND'?404:(bad.includes(error.code)||error.code==='23514')?400:500).json({error:error.message||'Failed to update membership',code:error.code});}}
module.exports={checkoutMembership,submitPaymentReference,getCurrentMembership,getUserMembershipPayments,getPayments,getLeadPayments,getMembershipCustomers,getMembershipCustomerDetails,updatePaymentStatus,updateMembership};