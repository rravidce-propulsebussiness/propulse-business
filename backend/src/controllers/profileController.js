const profileService = require('../services/profileService');
const { sendError } = require('../utils/errorResponse');
const projectVideoService = require('../services/projectVideoService');
const projectPlanService = require('../services/projectPlanService');
const projectImageService = require('../services/projectImageService');
const projectCallbackService = require('../services/projectCallbackService');
const professionalQuoteService=require('../services/professionalProjectQuoteService');
const brochureService=require('../services/brochureService');

async function getProfile(req, res) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Business profile not found' });
    return res.json(profile);
  } catch (error) {
    console.error('Get profile failed:', error.message);
    return res.status(500).json({ error: 'Failed to load business profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const {
      name,email,phone,businessName,businessDetails,services,locations,
      publicHeadline,publicSummary,yearsExperience,publicProfileEnabled,projects,plans,
    } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !businessName?.trim() || !businessDetails?.trim()) {
      return res.status(400).json({ error: 'Complete all business details' });
    }
    const result = await profileService.updateProfile(req.user.id, {
      name,email,phone,businessName,businessDetails,services,locations,
      publicHeadline,publicSummary,yearsExperience,publicProfileEnabled,projects,plans,
    });
    return res.json(result);
  } catch (error) {
    const map={INVALID_PROFILE_SELECTION:400,PROFILE_ACCOUNT_NOT_FOUND:404,PROFILE_NOT_FOUND:404};
    if(error.code==='23505')return res.status(409).json({error:'Email address is already in use'});
    const status=map[error.code]||500;
    if(status===500)console.error('Update profile failed:', error);
    return sendError(res,status,error,'Failed to update profile',{code:error.code});
  }
}

async function uploadProjectVideo(req,res){
  try{
    if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
    const result=await projectVideoService.saveProjectVideo(req.user.id,req.get('content-type'),req.body);
    return res.status(201).json(result);
  }catch(error){
    const bad=new Set(['INVALID_PROJECT_VIDEO_TYPE','INVALID_PROJECT_VIDEO','PROJECT_VIDEO_TOO_LARGE']);
    const status=bad.has(error.code)?400:500;
    if(status===500)console.error('Project video upload failed:',error);
    return sendError(res,status,error,'Failed to upload project video',{code:error.code});
  }
}


async function projectVideoUploadAction(req,res,operation){
  if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
  try{
    const data=req.body||{};
    const service=projectVideoService;
    const result=operation==='start'?await service.prepareVideoUpload(req.user.id,data.mimeType,data.size)
      :operation==='part'?service.presignVideoPart(req.user.id,data.reference,data.uploadId,data.partNumber)
      :operation==='finish'?await service.finishVideoUpload(req.user.id,data)
      :await service.abortVideoUpload(req.user.id,data);
    return res.status(operation==='start'?201:200).json(result);
  }catch(error){
    const invalid=['INVALID_PROJECT_VIDEO','INVALID_PROJECT_VIDEO_TYPE','INVALID_PROJECT_VIDEO_URL',
      'PROJECT_VIDEO_OWNERSHIP','PROJECT_VIDEO_TOO_LARGE','VIDEO_UPLOAD_MISMATCH'];
    const status=invalid.includes(error.code)||/^Invalid /.test(error.message)?400:503;
    if(status===503)console.error('Direct video upload operation failed:',operation,error.message);
    return sendError(res,status,error,'Unable to process video upload',{code:error.code});
  }
}
const startProjectVideoUpload=(req,res)=>projectVideoUploadAction(req,res,'start');
const signProjectVideoPart=(req,res)=>projectVideoUploadAction(req,res,'part');
const finishProjectVideoUpload=(req,res)=>projectVideoUploadAction(req,res,'finish');
const abortProjectVideoUpload=(req,res)=>projectVideoUploadAction(req,res,'abort');

async function uploadProjectPlan(req,res){
  try{
    if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
    const result=await projectPlanService.saveProjectPlan(req.user.id,req.get('content-type'),req.body);
    return res.status(201).json(result);
  }catch(error){
    const bad=new Set(['INVALID_PROJECT_PLAN_TYPE','INVALID_PROJECT_PLAN','PROJECT_PLAN_TOO_LARGE']);
    const status=bad.has(error.code)?400:500;
    if(status===500)console.error('Project plan upload failed:',error);
    return sendError(res,status,error,'Failed to upload project plan',{code:error.code});
  }
}

async function uploadProjectImage(req,res){
  try{
    if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
    const result=await projectImageService.saveProjectImage(req.user.id,req.get('content-type'),req.body);
    return res.status(201).json(result);
  }catch(error){
    const bad=new Set(['INVALID_PROJECT_IMAGE_TYPE','INVALID_PROJECT_IMAGE','PROJECT_IMAGE_TOO_LARGE']);
    const status=bad.has(error.code)?400:500;
    if(status===500)console.error('Project gallery photo upload failed:',error);
    return sendError(res,status,error,'Failed to upload project photo',{code:error.code});
  }
}

async function listProjectCallbacks(req,res){
  try{
    if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
    return res.json({data:await projectCallbackService.listForProfessional(req.user.id)});
  }catch(error){
    console.error('List project callbacks failed:',error.message);
    return sendError(res,500,error,'Unable to load callback requests');
  }
}
async function listBrochures(req,res){
  try{
    if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
    return res.json({data:await brochureService.listMine(req.user.id)});
  }catch(error){console.error('List brochures failed:',error.message);return res.status(500).json({error:'Unable to load brochures'});}
}
async function saveBrochures(req,res){
  try{
    if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
    return res.json({data:await brochureService.saveMine(req.user.id,req.body?.brochures)});
  }catch(error){
    const status=error.code==='INVALID_BROCHURE'||error.code==='PROJECT_PLAN_OWNERSHIP'?400:500;
    if(status===500)console.error('Save brochures failed:',error.message);
    return res.status(status).json({error:status===500?'Unable to save brochures':error.message});
  }
}
async function listProjectQuotes(req,res){
  if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
  try{return res.json({data:await professionalQuoteService.listForProfessional(req.user.id)});}
  catch(error){console.error('List professional quote leads failed:',error);return res.status(500).json({error:'Unable to load quotation leads'});}
}
async function updateProjectQuote(req,res){
  if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
  try{return res.json(await professionalQuoteService.updateByProfessional(req.user.id,req.params.quoteId,req.body||{}));}
  catch(error){
    const code=String(error.code||'');
    const status=code==='QUOTE_NOT_FOUND'?404:code==='QUOTE_FORBIDDEN'?403:code.startsWith('INVALID_')?400:500;
    if(status===500)console.error('Update quotation lead failed:',error);
    return res.status(status).json({error:status===500?'Unable to update quotation':error.message});
  }
}

async function acceptProjectRequest(req,res){
  if(req.user?.role!=='business')return res.status(403).json({error:'Business account required'});
  try{
    const access=require('../services/professionalRequestAccessService');
    return res.json(await access.accept(req.user.id,req.params.kind,req.params.id));
  }catch(error){
    const status=({
      INVALID_REQUEST_ID:400,INVALID_REQUEST_KIND:400,REQUEST_FORBIDDEN:403,
      MEMBERSHIP_REQUIRED:403,LEAD_LINK_INVALID:409,LEAD_NOT_READY:409,LEAD_NOT_AVAILABLE:409,
      CAPACITY_REACHED:409,PAYMENT_PENDING:409,PROFILE_MISMATCH:403,NOT_AVAILABLE:409,
      INVALID_PRICE:409,PRICING_REQUIRED:409,INSUFFICIENT_BALANCE:402
    })[error.code]||500;
    if(status===500)console.error('Professional request acceptance failed',{code:error.code,message:error.message});
    return res.status(status).json({error:status===500?'Unable to accept request':error.message,code:error.code||'REQUEST_ACCEPT_FAILED'});
  }
}

module.exports = { getProfile, updateProfile, uploadProjectVideo, startProjectVideoUpload,signProjectVideoPart,finishProjectVideoUpload,abortProjectVideoUpload, uploadProjectPlan, uploadProjectImage, listProjectCallbacks, listBrochures, saveBrochures, listProjectQuotes, updateProjectQuote, acceptProjectRequest };