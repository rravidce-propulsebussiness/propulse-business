const review=require('../services/professionalMediaReviewAdminService');
exports.list=async(req,res)=>{
  try{res.json({data:await review.list()});}
  catch(error){console.error('Admin media privacy listing failed:',error.message);res.status(500).json({error:'Unable to load media review queue'});}
};
exports.update=async(req,res)=>{
  try{res.json({data:await review.update(req.user.id,req.body||{})});}
  catch(error){res.status(error.code==='MEDIA_REVIEW_NOT_FOUND'?404:400).json({error:error.message});}
};
