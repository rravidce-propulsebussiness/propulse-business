const estimatorService = require('../services/estimatorService');

function sendError(res, error, fallback) {
  const status = Number(error?.status) || (
    ['FLOW_NOT_FOUND','ESTIMATE_NOT_FOUND','ESTIMATOR_VERSION_NOT_FOUND','NOT_ESTIMATOR'].includes(error?.code) ? 404 :
    error?.code === 'ESTIMATOR_NOT_CONFIGURED' ? 409 :
    400
  );
  if (status >= 500) console.error(fallback, error);
  return res.status(status).json({ error: error?.message || fallback, code: error?.code });
}

async function getAdminConfig(req, res) {
  try { return res.json(await estimatorService.getAdminConfig(req.params.id)); }
  catch (error) { return sendError(res,error,'Failed to load estimator configuration'); }
}

async function saveAdminConfig(req, res) {
  try { return res.json(await estimatorService.saveAdminConfig(req.params.id,req.body || {})); }
  catch (error) { return sendError(res,error,'Failed to save estimator configuration'); }
}

async function calculate(req, res) {
  try {
    const result = await estimatorService.calculate({
      key:req.params.key,
      flowToken:req.body?.flowToken,
      answers:req.body?.answers,
    });
    return res.status(201).json(result);
  } catch (error) {
    return sendError(res,error,'Failed to calculate estimate');
  }
}

async function getCalculation(req, res) {
  try { return res.json(await estimatorService.getCalculation(req.params.publicId)); }
  catch (error) { return sendError(res,error,'Failed to load estimate'); }
}

async function convertCalculation(req, res) {
  try {
    const result = await estimatorService.convertCalculation({
      publicId:req.params.publicId,
      contact:req.body?.contact,
      consent:req.body?.consent,
      submissionKey:req.body?.submissionKey,
      website:req.body?.website,
    });
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    return sendError(res,error,'Failed to request quotations');
  }
}

module.exports = { getAdminConfig,saveAdminConfig,calculate,getCalculation,convertCalculation };
