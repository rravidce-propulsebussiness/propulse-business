const leadEntitlementService=require('../services/leadEntitlementService');
const {sendError}=require('../utils/errorResponse');

async function getAccess(req,res){
  try{return res.json(await leadEntitlementService.getLeadAccess(req.user.id,req.params.id));}
  catch(error){if(error.code==='LEAD_NOT_FOUND')return sendError(res,404,error,'Lead not found',{code:error.code});console.error('Lead access failed:',error.message);return sendError(res,500,error,'Failed to check lead access');}
}

async function claim(req,res){
  try{return res.status(201).json(await leadEntitlementService.claimLead(req.user.id,req.params.id));}
  catch(error){const map={LEAD_NOT_FOUND:404,LEAD_UNAVAILABLE:409,CAPACITY_REACHED:409,EXCLUSIVE_LOCKED:409,NO_MEMBERSHIP_ENTITLEMENT:403,ENTITLEMENT_NOT_INCLUDED:403,ENTITLEMENT_EMPTY:403,ENTITLEMENT_EXHAUSTED:403,ALREADY_CLAIMED:409,PROFILE_MISMATCH:403};const status=map[error.code]||500;if(status===500)console.error('Lead claim failed:',error.message);return sendError(res,status,error,'Failed to claim lead',{code:error.code});}
}

module.exports={getAccess,claim};
