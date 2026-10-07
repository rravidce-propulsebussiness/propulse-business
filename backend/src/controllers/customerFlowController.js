const customerFlowService = require('../services/customerFlowService');
const publicLeadIntakeService = require('../services/publicLeadIntakeService');
const leadReferenceStorageService = require('../services/leadReferenceStorageService');
const pool = require('../config/database');
const emailService = require('../services/emailService');

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
    const status=Number(error?.status)||(['INVALID_ATTACHMENT','ATTACHMENT_TOO_LARGE','ATTACHMENT_LIMIT','INVALID_LEAD'].includes(error?.code)?400:error?.code==='LEAD_NOT_FOUND'?404:error?.code==='ATTACHMENT_NOT_ALLOWED'?403:500);
    if(status>=500)console.error('Public reference upload failed:',error);
    return res.status(status).json({error:error?.message||'Failed to upload reference file',code:error?.code});
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
    if(file.buffer)return res.send(file.buffer);
    return res.sendFile(file.path);
  }catch(error){
    const status=Number(error?.status)||(error?.code==='ATTACHMENT_NOT_FOUND'||error?.code==='LEAD_NOT_FOUND'?404:500);
    if(status>=500)console.error('Admin reference download failed:',error);
    return res.status(status).json({error:error?.message||'Failed to load reference file',code:error?.code});
  }
}

async function emailQuotation(req,res){
  try{
    const leadId=Number(req.params.leadId); const submissionKey=String(req.body?.submissionKey||'');
    const row=(await pool.query('SELECT id,customer_name,customer_email,intake_submission_key FROM leads WHERE id=$1',[leadId])).rows[0];
    if(!row||!row.customer_email||String(row.intake_submission_key||'')!==submissionKey)return res.status(404).json({error:'Quotation request not found'});
    const match=String(req.body?.pdfDataUrl||'').match(/^data:application\/pdf;base64,([A-Za-z0-9+/=]+)$/);
    if(!match||match[1].length>8*1024*1024)return res.status(400).json({error:'Invalid quotation PDF'});
    await emailService.sendCustomerQuotationEmail({to:row.customer_email,name:row.customer_name,leadId:row.id,total:String(req.body?.total||'').slice(0,80),packageName:String(req.body?.packageName||'').slice(0,120),pdfBase64:match[1]});
    return res.json({sent:true});
  }catch(error){console.error('Quotation email failed:',error);return res.status(502).json({error:'Quotation was created, but email delivery failed'});}
}
module.exports = { listAdmin,getAdmin,create,saveDraft,publish,setStatus,getPublic,submitConsultation,submitPublic,uploadReference,downloadReferenceAdmin,emailQuotation };
