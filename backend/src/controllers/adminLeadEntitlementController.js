const grantService=require('../services/leadEntitlementGrantService');
const {sendError}=require('../utils/errorResponse');

function statusFor(error){
  const map={
    INVALID_ENTITLEMENT_SETTINGS:400,
    INVALID_ENTITLEMENT_ACCESS:400,
    INVALID_GRANT_USER:400,
    INVALID_GRANT_QUANTITY:400,
    BUSINESS_NOT_VERIFIED:403,
    INVALID_GRANT:400,
    GRANT_NOT_FOUND:404,
    INVALID_ENTITLEMENT_RULE:400,
    ENTITLEMENT_RULE_NOT_FOUND:404,
    INVALID_BUSINESS_CAMPAIGN:400,
    BUSINESS_CAMPAIGN_NOT_FOUND:404,
    CAMPAIGN_ALLOWANCE_BELOW_USAGE:400
  };
  return map[error.code]||500;
}

async function overview(req,res){
  try{return res.json(await grantService.getAdminOverview())}
  catch(error){console.error('Admin lead entitlement overview failed:',error);return res.status(500).json({error:'Failed to load lead entitlements'})}
}

async function businesses(req,res){
  try{
    return res.json({data:await grantService.listBusinesses({
      search:req.query.search||'',
      limit:req.query.limit||30,
      verification:req.query.verification||'any'
    })});
  }catch(error){console.error('Business lookup failed:',error);return res.status(500).json({error:'Failed to load businesses'})}
}

async function createRule(req,res){
  try{return res.status(201).json(await grantService.createRegistrationRule(req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Registration entitlement rule create failed:',error);
    return sendError(res,status,error,'Failed to create registration entitlement rule',{code:error.code});
  }
}

async function updateRule(req,res){
  try{return res.json(await grantService.updateRegistrationRule(req.params.ruleId,req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Registration entitlement rule update failed:',error);
    return sendError(res,status,error,'Failed to update registration entitlement rule',{code:error.code});
  }
}

async function deleteRule(req,res){
  try{return res.json(await grantService.deleteRegistrationRule(req.params.ruleId))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Registration entitlement rule delete failed:',error);
    return sendError(res,status,error,'Failed to delete registration entitlement rule',{code:error.code});
  }
}

async function createCampaign(req,res){
  try{return res.status(201).json(await grantService.createBusinessCampaign(req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Business entitlement campaign create failed:',error);
    return sendError(res,status,error,'Failed to create business entitlement',{code:error.code});
  }
}

async function updateCampaign(req,res){
  try{return res.json(await grantService.updateBusinessCampaign(req.params.campaignId,req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Business entitlement campaign update failed:',error);
    return sendError(res,status,error,'Failed to update business entitlement',{code:error.code});
  }
}

async function deleteCampaign(req,res){
  try{return res.json(await grantService.deleteBusinessCampaign(req.params.campaignId,req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Business entitlement campaign delete failed:',error);
    return sendError(res,status,error,'Failed to delete business entitlement',{code:error.code});
  }
}

async function createGrant(req,res){
  try{return res.status(201).json(await grantService.createManualGrant(req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Manual lead entitlement grant failed:',error);
    return sendError(res,status,error,'Failed to create lead entitlement grant',{code:error.code});
  }
}

async function updateGrant(req,res){
  try{return res.json(await grantService.updateGrant(req.params.grantId,req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Lead entitlement grant update failed:',error);
    return sendError(res,status,error,'Failed to update entitlement grant',{code:error.code});
  }
}

async function deleteGrant(req,res){
  try{return res.json(await grantService.deleteGrant(req.params.grantId,req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Lead entitlement grant delete failed:',error);
    return sendError(res,status,error,'Failed to delete entitlement grant',{code:error.code});
  }
}

module.exports={overview,businesses,createRule,updateRule,deleteRule,createCampaign,updateCampaign,deleteCampaign,createGrant,updateGrant,deleteGrant};
