const service=require('../services/videoProcessingSettingsService');
const {sendError}=require('../utils/errorResponse');

async function get(req,res){
  try{return res.json(await service.getSettings());}
  catch(error){console.error('Video processing settings load failed:',error);return sendError(res,500,error,'Could not load video settings');}
}
async function update(req,res){
  try{return res.json(await service.updateSettings(req.user.id,req.body||{}));}
  catch(error){
    const status=error.code==='INVALID_VIDEO_PROCESSING_SETTINGS'?400:500;
    if(status===500)console.error('Video processing settings save failed:',error);
    return sendError(res,status,error,'Could not save video settings',{code:error.code});
  }
}
module.exports={get,update};
