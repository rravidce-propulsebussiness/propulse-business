const soundSettingsService=require('../services/soundSettingsService');
const {sendError}=require('../utils/errorResponse');

async function getPublic(req,res){
  try{return res.json(await soundSettingsService.getPublicSettings());}
  catch(error){console.error('Load public sound settings failed:',error);return sendError(res,500,error,'Failed to load sound settings');}
}

async function getAdmin(req,res){
  try{return res.json(await soundSettingsService.getSettings());}
  catch(error){console.error('Load admin sound settings failed:',error);return sendError(res,500,error,'Failed to load sound settings');}
}

async function updateAdmin(req,res){
  try{return res.json(await soundSettingsService.updateSettings(req.user?.id,req.body||{}));}
  catch(error){console.error('Update sound settings failed:',error);return sendError(res,500,error,'Failed to update sound settings');}
}

module.exports={getPublic,getAdmin,updateAdmin};
