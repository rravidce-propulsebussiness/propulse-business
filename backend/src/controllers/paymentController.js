const { sendError } = require('../utils/errorResponse');
const pool = require('../config/database');
const paymentService = require('../services/paymentService');
const investmentPaymentDraftService = require('../services/investmentPaymentDraftService');
const privateProofStorage = require('../services/privateProofStorageService');
const {sendProofDescriptor}=require('../utils/proofResponse');
const membershipCustomerAdminService = require('../services/membershipCustomerAdminService');
const { getMembershipAccess, getCurrentProMembership } = require('../services/membershipAccessService');
const paymentGatewayService = require('../services/paymentGatewayService');
const telegramPaymentReviewService = require('../services/telegramPaymentReviewService');

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_DATA_URL = /^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/i;

function validatePaymentProof(proofUrl){
  if(typeof proofUrl !== 'string' || !proofUrl.trim()) return { valid:false, code:'PROOF_REQUIRED', message:'Payment proof is required' };
  const match = proofUrl.trim().match(PROOF_DATA_URL);
  if(!match) return { valid:false, code:'INVALID_PROOF', message:'Payment proof must be a PNG, JPEG, WebP, or PDF data file' };
  const payload = match[2].replace(/\s/g,'');
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  const bytes = Math.floor(payload.length * 3 / 4) - padding;
  if(bytes <= 0 || bytes > MAX_PROOF_BYTES) return { valid:false, code:'PROOF_TOO_LARGE', message:'Payment proof must be 5 MB or smaller' };
  let data;
  try { data = Buffer.from(payload, 'base64'); } catch { return { valid:false, code:'INVALID_PROOF', message:'Payment proof is not valid base64 data' }; }
  const mime = match[1].toLowerCase();
  const validSignature = mime==='application/pdf' ? data.subarray(0,5).toString('ascii')==='%PDF-' : mime==='image/png' ? data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime==='image/jpeg' ? data.subarray(0,3).equals(Buffer.from([255,216,255])) : mime==='image/webp' ? data.subarray(0,4).toString('ascii')==='RIFF' && data.subarray(8,12).toString('ascii')==='WEBP' : false;
  if(!validSignature) return { valid:false, code:'INVALID_PROOF', message:'Payment proof content does not match its declared file type' };
  return { valid:true };
}

async function checkoutMembership(req,res){try{const result=await paymentService.createMembershipCheckout({userId:req.user.id,membershipPlanId:req.body.membershipPlanId,couponCode:req.body.couponCode});res.status(201).json(result)}catch(error){console.error('Membership checkout failed:',error.message);const status=error.code==='PAYMENT_PENDING'||error.code==='DUPLICATE_COUPON_REDEMPTION'?409:['INVALID_PLAN','PLAN_NOT_FOUND','INVALID_AMOUNT','PRO_REQUIRED','COUPON_NOT_FOUND','COUPON_INACTIVE','COUPON_NOT_STARTED','COUPON_EXPIRED','MIN_ORDER','PURCHASE_NOT_ELIGIBLE','PLAN_NOT_ELIGIBLE','USER_NOT_ELIGIBLE','INDUSTRY_NOT_ELIGIBLE','USAGE_LIMIT','USER_USAGE_LIMIT','INVALID_AMOUNT','COUPON_REDEMPTION_INVALID'].includes(error.code)?400:500;sendError(res,status,error,'Failed to create membership payment',{code:error.code})}}
async function submitPaymentReference(req,res){
  try {
    const draftId=String(req.params.id||'');
    const manualReference=String(req.body.manualReference||'').trim();
    const proofUrl=req.body.proofUrl;
    if(!manualReference)return res.status(400).json({error:'Payment reference / UTR is required',code:'REFERENCE_REQUIRED'});
    const proofValidation=validatePaymentProof(proofUrl);
    if(!proofValidation.valid)return res.status(400).json({error:proofValidation.message,code:proofValidation.code});
    const storedProof=await privateProofStorage.storeDataUrl(proofUrl,{category:'payments',maxBytes:MAX_PROOF_BYTES});
    try{
      if(draftId.startsWith('draft_')){
        const updated=await investmentPaymentDraftService.submit({id:draftId,userId:req.user.id,manualReference,proofUrl:storedProof,notes:req.body.notes});
        await telegramPaymentReviewService.notifyPaymentReview(updated.id).catch(error=>console.error('Telegram payment review notification failed:',error.message));
        return res.json(updated);
      }
      const result=await paymentService.submitPaymentReference({userId:req.user.id,paymentId:req.params.id,manualReference,proofUrl:storedProof,notes:req.body.notes});
      await telegramPaymentReviewService.notifyPaymentReview(result.id).catch(error=>console.error('Telegram payment review notification failed:',error.message));
      return res.json(result);
    }catch(error){
      await privateProofStorage.removeStoredProof(storedProof).catch(cleanupError=>console.error('Payment proof cleanup failed:',cleanupError.message));
      throw error;
    }
  }catch(error){console.error('Submit payment reference failed:',error.message);const status=error.code==='PRO_REQUIRED'?403:error.code==='DUPLICATE_REFERENCE'?409:['REFERENCE_REQUIRED','PROOF_REQUIRED','INVALID_PROOF','PROOF_TOO_LARGE','PAYMENT_NOT_PENDING','GATEWAY_PAYMENT_ACTIVE','OFFLINE_PAYMENT_DISABLED','INVALID_AMOUNT','INVESTMENT_DISABLED','AMOUNT_OUT_OF_RANGE','MAXIMUM_CAPITAL_REACHED','INDUSTRY_UNAVAILABLE','INDUSTRY_LIMIT_REACHED','LOCATION_REQUIRED','LOCATION_UNAVAILABLE','CYCLE_MODE_MISMATCH'].includes(error.code)?400:error.code==='NOT_FOUND'||error.code==='DRAFT_NOT_FOUND'?404:['PAYMENT_PENDING','LOCATION_CAPACITY_REACHED','ACTIVE_CYCLE_EXISTS','CYCLE_CLOSING'].includes(error.code)?409:500;sendError(res,status,error,'Failed to submit payment reference',{code:error.code})}
}
async function getCurrentMembership(req,res){try{const [membership,access]=await Promise.all([getCurrentProMembership(req.user.id),getMembershipAccess(req.user.id)]);res.json(membership?{...membership,...access}:access)}catch(error){console.error('Get membership access failed:',error.message);res.status(500).json({error:'Failed to fetch membership'})}}
async function getUserMembershipPayments(req,res){try{res.json(await paymentService.getUserMembershipPayments(req.user.id));}catch(error){console.error('Get user membership payments failed:',error.message);res.status(500).json({error:'Failed to fetch membership payment history'});}}
async function getPayments(req,res){try{const result=await paymentService.getPayments({status:req.query.status,search:req.query.search,page:req.query.page,limit:req.query.limit});res.json(result)}catch(error){console.error('Get payments failed:',error.message);res.status(500).json({error:'Failed to fetch payments'})}}
async function getPaymentProof(req,res){try{const data=await paymentService.getAdminPaymentProof(req.params.id);if(!data)return res.status(404).json({error:'Payment not found'});return res.json(data)}catch(error){console.error('Get payment proof failed:',error.message);return sendError(res,500,error,'Failed to fetch payment proof')}}
async function streamPaymentProof(req,res){try{const data=await paymentService.getAdminPaymentProofDescriptor(req.params.id);if(!data)return res.status(404).json({error:'Payment not found'});return sendProofDescriptor(res,data)}catch(error){console.error('Stream payment proof failed:',error.message);return sendError(res,500,error,'Failed to stream payment proof')}}
async function getMembershipCustomers(req,res){try{res.json(await membershipCustomerAdminService.getMembershipCustomers({search:req.query.search,page:req.query.page,limit:req.query.limit}));}catch(error){console.error('Get membership customers failed:',error.stack||error.message);res.status(500).json({error:'Failed to fetch membership customers',code:error.code||'MEMBERSHIP_CUSTOMERS_QUERY_FAILED'});}}
async function getMembershipCustomerDetails(req,res){try{const result=await paymentService.getMembershipCustomerDetails(req.params.userId);if(!result)return res.status(404).json({error:'User not found'});res.json(result)}catch(error){console.error('Get membership customer details failed:',error.message);res.status(500).json({error:'Failed to fetch membership details'})}}
async function updatePaymentStatus(req,res){try{const {status}=req.body;if(!['paid','rejected','failed'].includes(status))return res.status(400).json({error:'Only paid, rejected, or failed are valid admin review outcomes'});const payment=await paymentService.updatePaymentStatus(req.params.id,status,req.user.id,req.body.notes);if(!payment)return res.status(404).json({error:'Payment not found'});res.json(payment)}catch(error){console.error('Update payment failed:',error.message);const badRequestCodes=['PAYMENT_NOT_MANUAL','PAYMENT_ALREADY_PAID','PAYMENT_TERMINAL','INVALID_PAYMENT_TRANSITION','PLAN_NOT_FOUND','INVALID_PLAN','PRO_REQUIRED','ANOTHER_PRO_ACTIVE','NOT_AVAILABLE','CAPACITY_REACHED','PURCHASE_NOT_FOUND','GROW_REQUIRED','SCALE_DOWNGRADE_NOT_ALLOWED','MEMBERSHIP_CHANGED_REPRICE_REQUIRED','MEMBERSHIP_PRORATION_EXPIRED','PAYMENT_PROOF_REQUIRED'];sendError(res,error.code==='MEMBERSHIP_NOT_FOUND'?404:(badRequestCodes.includes(error.code)||error.code==='23514')?400:500,error,'Failed to update payment',{code:error.code})}}
async function updateMembership(req,res){try{const membership=await paymentService.updateMembership({membershipId:req.params.id,action:req.body.action,days:req.body.days,expiresAt:req.body.expiresAt,adminId:req.user.id,reason:req.body.reason});res.json(membership);}catch(error){console.error('Update membership from payments failed:',error.message);const bad=['INVALID_MEMBERSHIP_ACTION','INVALID_MEMBERSHIP_DAYS','INVALID_EXPIRY','PRO_REQUIRED','ANOTHER_PRO_ACTIVE'];sendError(res,error.code==='MEMBERSHIP_NOT_FOUND'?404:(bad.includes(error.code)||error.code==='23514')?400:500,error,'Failed to update membership',{code:error.code});}}
async function getGateways(req,res){try{return res.json(await paymentGatewayService.gateways())}catch(error){return sendError(res,500,error,'Failed to load payment gateways')}}
async function createGatewayOrder(req,res){
  try{
    const result=await paymentGatewayService.createCheckout({
      userId:req.user.id,paymentId:req.body?.paymentId,investmentDraftId:req.body?.investmentDraftId
    });
    return res.status(201).json(result);
  }catch(error){
    const map={NOT_FOUND:404,DRAFT_NOT_FOUND:404,PRO_REQUIRED:403,PAYMENT_REFERENCE_REQUIRED:400,PAYMENT_NOT_PENDING:409,GATEWAY_NOT_REQUIRED:400,MANUAL_PAYMENT_ALREADY_SUBMITTED:409,GATEWAY_CONFLICT:409,GATEWAY_COMING_SOON:409,GATEWAY_DISABLED:403,GATEWAY_NOT_CONFIGURED:503,GATEWAY_PROVIDER_ERROR:502,GATEWAY_TIMEOUT:504,GATEWAY_AMOUNT_MISMATCH:502,GATEWAY_INVALID_RESPONSE:502};
    return sendError(res,map[error.code]||500,error,'Failed to create online payment checkout',{code:error.code});
  }
}
async function confirmGatewayPayment(req,res){
  try{
    const result=await paymentGatewayService.confirmCheckout({
      userId:req.user.id,paymentId:req.params.id,providerOrderId:req.body?.providerOrderId,
      providerPaymentId:req.body?.providerPaymentId,signature:req.body?.signature
    });
    return res.json(result);
  }catch(error){
    const map={NOT_FOUND:404,GATEWAY_ORDER_NOT_FOUND:404,GATEWAY_ORDER_MISMATCH:409,GATEWAY_SIGNATURE_INVALID:400,GATEWAY_PAYMENT_INVALID:400,GATEWAY_AMOUNT_MISMATCH:409,GATEWAY_CURRENCY_MISMATCH:409,GATEWAY_PAYMENT_MISMATCH:409,GATEWAY_PROVIDER_ERROR:502,GATEWAY_TIMEOUT:504,PAYMENT_TERMINAL:409,INVESTMENT_NOT_FOUND:404,INVESTMENT_NOT_PENDING:409,PURCHASE_NOT_FOUND:404,NOT_AVAILABLE:409,CAPACITY_REACHED:409,TOPUP_NOT_FOUND:404,TOPUP_NOT_PENDING:409,TOPUP_PAYMENT_MISMATCH:409};
    return sendError(res,map[error.code]||500,error,'Failed to verify online payment',{code:error.code});
  }
}

module.exports={checkoutMembership,submitPaymentReference,getCurrentMembership,getUserMembershipPayments,getPayments,getPaymentProof,streamPaymentProof,getMembershipCustomers,getMembershipCustomerDetails,getGateways,createGatewayOrder,confirmGatewayPayment,updatePaymentStatus,updateMembership};
