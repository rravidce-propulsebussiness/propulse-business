const callbackService=require('../services/projectCallbackService');
const quotes=require('../services/professionalProjectQuoteService');
const marketplace=require('../services/projectMarketplaceLeadService');

async function list(req,res){
  try{return res.json({data:await callbackService.listForAdmin()});}
  catch(error){console.error('Admin callback list failed:',error.message);return res.status(500).json({error:'Unable to load callback requests'});}
}
async function updateStatus(req,res){
  try{return res.json(await callbackService.setAdminStatus(req.params.id,req.body?.status));}
  catch(error){
    const code=String(error.code||'');
    const status=code==='PROFILE_NOT_FOUND'?404:code.startsWith('INVALID_')?400:500;
    if(status===500)console.error('Admin callback status update failed:',error.message);
    return res.status(status).json({error:status===500?'Unable to update callback status':error.message});
  }
}
async function listQuotes(req,res){
  try{return res.json({data:await quotes.listForAdmin()});}
  catch(error){console.error('Admin project quote coordination list failed:',error);return res.status(500).json({error:'Unable to load project quote leads'});}
}
async function retryMarketplace(req,res){
  const kind=String(req.params.kind||'');
  if(!['quote','callback','profile'].includes(kind))return res.status(400).json({error:'Invalid professional enquiry type'});
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Invalid request reference'});
  try{
    const result=await marketplace.sync(kind,id);
    return res.json(result);
  }catch(error){
    if(error.code==='PROJECT_REQUEST_NOT_FOUND')return res.status(404).json({error:error.message});
    console.error('Admin marketplace lead retry failed:',error.message);
    return res.status(500).json({error:'Unable to retry marketplace lead creation'});
  }
}
async function authorizeLegacyMarketplace(req,res){
  const kind=String(req.params.kind||'');
  const id=Number(req.params.id);
  if(!['quote','callback'].includes(kind)||!Number.isSafeInteger(id)||id<1)
    return res.status(400).json({error:'Invalid legacy project enquiry'});
  try{
    return res.json(await marketplace.authorizeLegacy(kind,id,{
      pincode:req.body?.pincode,
      consentConfirmed:req.body?.consentConfirmed,
      evidence:req.body?.evidence,
      adminId:req.user?.id
    }));
  }catch(error){
    const codes={INVALID_LEGACY_AUTHORIZATION:400,INVALID_REQUEST_KIND:400,PROJECT_REQUEST_NOT_FOUND:404,LEGACY_ENQUIRY_ALREADY_PROCESSED:409};
    if(codes[error.code])return res.status(codes[error.code]).json({error:error.message,code:error.code});
    console.error('Admin legacy marketplace authorization failed:',error.message);
    return res.status(500).json({error:'Unable to authorize legacy marketplace lead'});
  }
}
module.exports={list,updateStatus,listQuotes,retryMarketplace,authorizeLegacyMarketplace};
