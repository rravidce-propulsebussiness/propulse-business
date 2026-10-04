const service=require('../services/expertDirectoryService');
const {sendError}=require('../utils/errorResponse');

async function overview(req,res){
  try{return res.json(await service.getOverview());}
  catch(error){console.error('Expert directory overview failed:',error);return res.status(500).json({error:'Failed to load expert directory settings'});}
}

async function updateSettings(req,res){
  try{return res.json(await service.updateSettings(req.user.id,req.body||{}));}
  catch(error){
    const status=error.code==='EXPERT_DIRECTORY_PLAN_REQUIRED'?400:500;
    if(status===500)console.error('Expert directory settings update failed:',error);
    return sendError(res,status,error,'Failed to update expert directory settings',{code:error.code});
  }
}

async function businesses(req,res){
  try{return res.json(await service.listBusinesses(req.query||{}));}
  catch(error){console.error('Expert directory business list failed:',error);return res.status(500).json({error:'Failed to load expert directory businesses'});}
}

async function updateBusiness(req,res){
  try{return res.json(await service.updateBusinessVisibility(req.user.id,req.params.userId,req.body||{}));}
  catch(error){
    const status=['INVALID_EXPERT_BUSINESS','INVALID_EXPERT_SORT_ORDER'].includes(error.code)?400:error.code==='EXPERT_BUSINESS_NOT_FOUND'?404:500;
    if(status===500)console.error('Expert directory business update failed:',error);
    return sendError(res,status,error,'Failed to update expert directory business',{code:error.code});
  }
}

module.exports={overview,updateSettings,businesses,updateBusiness};