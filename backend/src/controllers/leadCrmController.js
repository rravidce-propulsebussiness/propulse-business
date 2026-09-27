const leadCrmService = require('../services/leadCrmService');
const {sendError}=require('../utils/errorResponse');
async function update(req,res){try{const row=await leadCrmService.updateLeadCrm({leadId:req.params.id,userId:req.user.id,status:req.body.status,remarks:req.body.remarks,nextFollowupAt:req.body.nextFollowupAt,markFollowedUp:req.body.markFollowedUp===true});return res.json(row)}catch(error){const map={INVALID_LEAD:400,INVALID_STATUS:400,INVALID_DATE:400,FORBIDDEN:403};const status=map[error.code]||500;if(status===500)console.error('Update lead CRM failed:',error.message);return sendError(res,status,error,'Failed to update lead CRM',{code:error.code||'CRM_UPDATE_FAILED'})}}
module.exports={update};
