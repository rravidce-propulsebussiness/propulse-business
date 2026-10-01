const customerFlowService = require('../services/customerFlowService');
const publicLeadIntakeService = require('../services/publicLeadIntakeService');

function sendError(res, error, fallback) {
  const status = Number(error?.status) || (
    error?.code === 'FLOW_NOT_FOUND' ? 404 :
    error?.code === 'FLOW_KEY_EXISTS' ? 409 :
    400
  );
  if (status >= 500) console.error(fallback, error);
  return res.status(status).json({ error: error?.message || fallback, code: error?.code });
}

async function listAdmin(req, res) {
  try { return res.json(await customerFlowService.listDefinitions()); }
  catch (error) { console.error('List customer flows failed:', error); return res.status(500).json({ error: 'Failed to load customer flows' }); }
}
async function getAdmin(req, res) {
  try { return res.json(await customerFlowService.getAdminDefinition(req.params.id)); }
  catch (error) { return sendError(res, error, 'Failed to load customer flow'); }
}
async function create(req, res) {
  try { return res.status(201).json(await customerFlowService.createDefinition({ ...req.body, createdBy: req.user?.id })); }
  catch (error) { return sendError(res, error, 'Failed to create customer flow'); }
}
async function saveDraft(req, res) {
  try { return res.json(await customerFlowService.saveDraft(req.params.id, req.body || {}, req.user?.id)); }
  catch (error) { return sendError(res, error, 'Failed to save customer flow'); }
}
async function publish(req, res) {
  try { return res.json(await customerFlowService.publish(req.params.id, req.user?.id)); }
  catch (error) { return sendError(res, error, 'Failed to publish customer flow'); }
}
async function setStatus(req, res) {
  try {
    if (typeof req.body?.isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false' });
    return res.json(await customerFlowService.setDefinitionStatus(req.params.id, req.body.isActive, req.user?.id));
  } catch (error) { return sendError(res, error, 'Failed to update customer flow'); }
}
async function getPublic(req, res) {
  try { return res.json(await customerFlowService.getPublishedFlow(req.params.key)); }
  catch (error) { return sendError(res, error, 'Failed to load requirement form'); }
}
async function submitConsultation(req, res) {
  try {
    const result = await publicLeadIntakeService.submitConsultation({
      key: req.params.key,
      cityId: req.body?.cityId,
      pincode: req.body?.pincode,
      details: req.body?.details,
      contact: req.body?.contact,
      consent: req.body?.consent,
      submissionKey: req.body?.submissionKey,
      website: req.body?.website,
      attribution: req.body?.attribution,
    });
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    if (!error?.status && !error?.code) {
      console.error('Public consultation submission failed:', error);
      return res.status(500).json({ error: 'Failed to submit consultation request' });
    }
    return sendError(res, error, 'Failed to submit consultation request');
  }
}

async function submitPublic(req, res) {
  try {
    const result = await publicLeadIntakeService.submitRequirement({
      key: req.params.key,
      flowToken: req.body?.flowToken,
      answers: req.body?.answers,
      contact: req.body?.contact,
      consent: req.body?.consent,
      submissionKey: req.body?.submissionKey,
      website: req.body?.website,
    });
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    if (!error?.status && !error?.code) {
      console.error('Public requirement submission failed:', error);
      return res.status(500).json({ error: 'Failed to submit requirement' });
    }
    return sendError(res, error, 'Failed to submit requirement');
  }
}

async function uploadReference(req,res){
  try{
    const result=await leadReferenceStorageService.saveReference({
      key:req.params.key,
      leadId:req.params.leadId,
      submissionKey:req.body?.submissionKey,
      originalName:req.body?.originalName,
      dataUrl:req.body?.dataUrl,
      attachmentKey:req.body?.attachmentKey,
    });
    return res.status(result.duplicate?200:201).json(result);
  }catch(error){
    if(!error?.status&&!error?.code)console.error('Public reference upload failed:',error);
    return sendError(res,error?.status||500,error,'Failed to upload reference file',{code:error?.code});
  }
}

async function downloadReferenceAdmin(req,res){
  try{
    const file=await leadReferenceStorageService.getAdminReference({
      leadId:req.params.leadId,
      attachmentId:req.params.attachmentId,
    });
    res.setHeader('Content-Type',file.mime);
    res.setHeader('Content-Disposition',`inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('Cache-Control','private, no-store');
    return res.sendFile(file.path);
  }catch(error){
    if(!error?.status&&!error?.code)console.error('Admin reference download failed:',error);
    return sendError(res,error?.status||500,error,'Failed to load reference file',{code:error?.code});
  }
}

module.exports = { listAdmin,getAdmin,create,saveDraft,publish,setStatus,getPublic,submitConsultation,submitPublic,uploadReference,downloadReferenceAdmin };
