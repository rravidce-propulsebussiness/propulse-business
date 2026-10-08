const service=require('../services/adminCompletedProjectService');
const {sendError}=require('../utils/errorResponse');

function respondError(res,error){
  const status=['INVALID_PROJECT_IMAGE_TYPE','INVALID_PROJECT_IMAGE','PROJECT_IMAGE_TOO_LARGE','PROJECT_IMAGE_OWNERSHIP'].includes(error.code)?400:error.code==='COMPLETED_PROJECT_NOT_FOUND'||error.code==='BUSINESS_PROFILE_NOT_FOUND'?404:
    error.code==='INVALID_COMPLETED_PROJECT'?400:500;
  if(status===500)console.error('Admin project publishing failed:',error);
  return sendError(res,status,error,'Unable to save completed project',{code:error.code});
}
async function list(req,res){
  try{return res.json(await service.list(req.query||{}));}
  catch(error){return respondError(res,error);}
}
async function create(req,res){
  try{return res.status(201).json(await service.save(req.body||{}));}
  catch(error){return respondError(res,error);}
}
async function update(req,res){
  try{return res.json(await service.save(req.body||{},{id:req.params.projectId}));}
  catch(error){return respondError(res,error);}
}
async function uploadPhoto(req,res){
  try{return res.status(201).json(await service.uploadPhoto(req.params.userId,req.get('content-type'),req.body));}
  catch(error){return respondError(res,error);}
}
module.exports={list,create,update,uploadPhoto};
