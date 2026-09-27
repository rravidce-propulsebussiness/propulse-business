const grantService=require('../services/leadEntitlementGrantService');

function statusFor(error){
  const map={
    INVALID_ENTITLEMENT_SETTINGS:400,
    INVALID_ENTITLEMENT_ACCESS:400,
    INVALID_GRANT_USER:400,
    INVALID_GRANT_QUANTITY:400,
    BUSINESS_NOT_VERIFIED:403,
    INVALID_GRANT:400,
    GRANT_NOT_FOUND:404
  };
  return map[error.code]||500;
}

async function overview(req,res){
  try{return res.json(await grantService.getAdminOverview())}
  catch(error){console.error('Admin lead entitlement overview failed:',error);return res.status(500).json({error:'Failed to load lead entitlements'})}
}

async function businesses(req,res){
  try{
    return res.json({data:await grantService.listVerifiedBusinesses({
      search:req.query.search||'',
      limit:req.query.limit||30
    })});
  }catch(error){console.error('Verified business lookup failed:',error);return res.status(500).json({error:'Failed to load verified businesses'})}
}

async function updateSettings(req,res){
  try{return res.json(await grantService.updateSettings(req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Lead entitlement settings update failed:',error);
    return res.status(status).json({error:error.message||'Failed to update lead entitlement settings',code:error.code});
  }
}

async function createGrant(req,res){
  try{return res.status(201).json(await grantService.createManualGrant(req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Manual lead entitlement grant failed:',error);
    return res.status(status).json({error:error.message||'Failed to create lead entitlement grant',code:error.code});
  }
}

async function updateGrant(req,res){
  try{return res.json(await grantService.updateGrant(req.params.grantId,req.body||{},req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Lead entitlement grant update failed:',error);
    return res.status(status).json({error:error.message||'Failed to update entitlement grant',code:error.code});
  }
}

async function deleteGrant(req,res){
  try{return res.json(await grantService.deleteGrant(req.params.grantId,req.user?.id))}
  catch(error){
    const status=statusFor(error);
    if(status===500)console.error('Lead entitlement grant delete failed:',error);
    return res.status(status).json({error:error.message||'Failed to delete entitlement grant',code:error.code});
  }
}

async function deleteSettings(req,res){
  try{return res.json(await grantService.deleteSettings(req.user?.id))}
  catch(error){
    console.error('Lead entitlement settings delete failed:',error);
    return res.status(500).json({error:'Failed to delete registration entitlement'});
  }
}

module.exports={overview,businesses,updateSettings,deleteSettings,createGrant,updateGrant,deleteGrant};
