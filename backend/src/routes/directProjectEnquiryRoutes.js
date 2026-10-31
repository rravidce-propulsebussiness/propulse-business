const express=require('express');
const requireAdmin=require('../middleware/adminMiddleware');
const rateLimit=require('../middleware/rateLimitMiddleware');
const enquiries=require('../services/directProjectEnquiryService');

const router=express.Router();
const publicSubmissionLimit=rateLimit({windowMs:10*60*1000,max:5});
const adminWriteLimit=rateLimit({windowMs:60*1000,max:50});

function sendError(res,error){
  const status=Number(error?.status)||(
    /^(INVALID_|CONSENT_REQUIRED)/.test(error?.code||'')?400:500
  );
  if(status>=500) console.error('Direct ProPulse enquiry error:',error?.message||error);
  return res.status(status).json({error:status>=500?'Direct enquiry service is temporarily unavailable':error.message,code:error?.code});
}

router.post('/',publicSubmissionLimit,async(req,res)=>{
  try{
    const result=await enquiries.submit(req.body||{});
    return res.status(result.duplicate?200:201).json(result);
  }catch(error){return sendError(res,error)}
});
router.get('/',requireAdmin,async(req,res)=>{
  try{return res.json(await enquiries.list(req.query||{}))}
  catch(error){return sendError(res,error)}
});
router.patch('/:id/status',requireAdmin,adminWriteLimit,async(req,res)=>{
  try{return res.json(await enquiries.changeStatus(req.params.id,req.body?.status))}
  catch(error){return sendError(res,error)}
});
module.exports=router;
