const callbackService=require('../services/projectCallbackService');

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
module.exports={list,updateStatus};
