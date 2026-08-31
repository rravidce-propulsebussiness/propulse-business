const leadEntitlementService=require('../services/leadEntitlementService');

async function getAccess(req,res){
  try{return res.json(await leadEntitlementService.getLeadAccess(req.user.id,req.params.id));}
  catch(error){if(error.code==='LEAD_NOT_FOUND')return res.status(404).json({error:error.message});console.error('Lead access failed:',error.message);return res.status(500).json({error:'Failed to check lead access'});}
}

async function claim(req,res){
  try{return res.status(201).json(await leadEntitlementService.claimLead(req.user.id,req.params.id));}
  catch(error){const map={LEAD_NOT_FOUND:404,LEAD_UNAVAILABLE:409,EXCLUSIVE_LOCKED:409,NO_MEMBERSHIP_ENTITLEMENT:403,ENTITLEMENT_NOT_INCLUDED:403,ENTITLEMENT_EMPTY:403,ENTITLEMENT_EXHAUSTED:403,ALREADY_CLAIMED:409};const status=map[error.code]||500;if(status===500)console.error('Lead claim failed:',error.message);return res.status(status).json({error:error.message||'Failed to claim lead',code:error.code});}
}

module.exports={getAccess,claim};
