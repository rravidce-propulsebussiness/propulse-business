const homepageMediaService=require('../services/homepageMediaService');
const {sendError}=require('../utils/errorResponse');

async function getPublic(req,res){
  try{return res.json(await homepageMediaService.get())}
  catch(error){console.error('Get homepage media failed:',error.message);return sendError(res,500,error,'Failed to load homepage media')}
}
async function getAdmin(req,res){
  try{return res.json(await homepageMediaService.get())}
  catch(error){console.error('Get admin homepage media failed:',error.message);return sendError(res,500,error,'Failed to load homepage media')}
}
async function upload(req,res){
  try{return res.json(await homepageMediaService.replace(req.body?.slot,req.body?.dataUrl))}
  catch(error){
    const bad=['INVALID_SLOT','INVALID_IMAGE','IMAGE_TOO_LARGE'];
    const status=bad.includes(error.code)?400:500;
    if(status===500)console.error('Save homepage image failed:',error.message);
    return sendError(res,status,error,'Failed to save homepage image',{code:error.code});
  }
}
async function remove(req,res){
  try{return res.json(await homepageMediaService.remove(req.params.slot))}
  catch(error){const status=error.code==='INVALID_SLOT'?400:500;if(status===500)console.error('Remove homepage image failed:',error.message);return sendError(res,status,error,'Failed to remove homepage image',{code:error.code})}
}
module.exports={getPublic,getAdmin,upload,remove};
