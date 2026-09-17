const service=require('../services/leadReportService');

async function create(req,res){
  try{return res.status(201).json(await service.createReport({leadId:req.params.leadId,reporterUserId:req.user.id,reason:String(req.body?.reason||'').trim().toLowerCase(),details:req.body?.details}));}
  catch(error){
    const bad=['INVALID_REPORT_REASON','REPORTING_DISABLED','REPORT_NOT_ELIGIBLE','LEAD_NOT_FOUND','LEAD_ALREADY_INVALID','REPORT_ALREADY_PENDING'];
    return res.status(bad.includes(error.code)?400:500).json({error:error.message||'Failed to report lead',code:error.code});
  }
}
async function mine(req,res){try{return res.json(await service.getMyReports(req.user.id))}catch(error){return res.status(500).json({error:'Failed to fetch your reports'})}}
async function adminList(req,res){try{return res.json(await service.getAdminReports({status:req.query.status,page:req.query.page,limit:req.query.limit}))}catch(error){return res.status(error.code==='INVALID_REPORT_STATUS'?400:500).json({error:error.message||'Failed to fetch lead reports',code:error.code})}}
async function adminReview(req,res){try{return res.json(await service.reviewReport({reportId:req.params.id,reviewerUserId:req.user.id,status:String(req.body?.status||'').trim().toLowerCase()}))}catch(error){const bad=['INVALID_REVIEW_STATUS','REPORT_NOT_FOUND','REPORT_ALREADY_REVIEWED'];return res.status(bad.includes(error.code)?400:500).json({error:error.message||'Failed to review lead report',code:error.code})}}
async function adminControl(req,res){try{return res.json(await service.setReportingControl({userId:req.params.userId,canReportLeads:req.body?.canReportLeads!==false,reason:req.body?.reason,adminUserId:req.user.id}))}catch(error){return res.status(400).json({error:error.message||'Failed to update reporting permission',code:error.code})}}
async function myControl(req,res){try{return res.json(await service.getReportingControl(req.user.id))}catch(error){return res.status(500).json({error:'Failed to fetch reporting permission'})}}
module.exports={create,mine,adminList,adminReview,adminControl,myControl};
