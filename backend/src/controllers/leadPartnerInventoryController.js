const service = require('../services/leadPartnerInventoryCompatService');
const {sendError}=require('../utils/errorResponse');

function importStatus(error){
  if(error?.code==='SHEET_CONNECTION_NOT_FOUND')return 404;
  if(error?.code==='SYNC_IN_PROGRESS')return 409;
  return /Google Sheet|CSV|Industry|Service|State|City|Pincode|Maximum|active/i.test(String(error?.message||'')) ? 400 : 500;
}

async function inventory(req, res) {
  try { return res.json(await service.listInventory({ userId: req.user.id, status: req.query.status, search: req.query.search })); }
  catch (error) { console.error('Lead Partner inventory failed:', error.message); return sendError(res,500,error,'Failed to load lead inventory'); }
}
async function importGoogleSheet(req, res) {
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Google Sheets URL is required' });
    return res.status(201).json(await service.importGoogleSheet({ userId: req.user.id, url }));
  } catch (error) {
    const status=importStatus(error); if(status===500)console.error('Lead Partner Google Sheet import failed:', error.message);
    return sendError(res,status,error,'Failed to import Google Sheet',{code:error.code});
  }
}
async function importCsv(req, res) {
  try {
    const csv = String(req.body?.csv || '');
    if (!csv.trim()) return res.status(400).json({ error: 'CSV data is required' });
    return res.status(201).json(await service.importCsv({ userId: req.user.id, csv }));
  } catch (error) {
    const status=importStatus(error); if(status===500)console.error('Lead Partner CSV import failed:', error.message);
    return sendError(res,status,error,'Failed to import CSV',{code:error.code});
  }
}
async function sheetConnections(req, res) {
  try { return res.json({ connections: await service.getSheetConnections({ userId: req.user.id }) }); }
  catch (error) { console.error('Lead Partner sheet connections failed:', error.message); return sendError(res,500,error,'Failed to load Google Sheet connections'); }
}
async function previewGoogleSheet(req,res){
  try{
    const url=String(req.body?.url||'').trim();
    if(!url)return res.status(400).json({error:'Google Sheets URL is required'});
    return res.json(await service.previewGoogleSheet({
      userId:req.user.id,
      url,
      defaultIndustryId:req.body?.defaultIndustryId,
      columnMappings:req.body?.columnMappings||{}
    }));
  }catch(error){
    const status=['SHEET_MAPPING_COLUMN_MISSING','SHEET_MAPPING_CONFLICT'].includes(error.code)?400:importStatus(error);
    if(status===500)console.error('Lead Partner Google Sheet preview failed:',error.message);
    return sendError(res,status,error,'Failed to analyze Google Sheet',{code:error.code});
  }
}
async function connectGoogleSheet(req, res) {
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Google Sheets URL is required' });
    const result = await service.connectGoogleSheet({ userId: req.user.id, url, defaultIndustryId:req.body?.defaultIndustryId, columnMappings:req.body?.columnMappings||{}, previewToken:req.body?.previewToken });
    return res.status(201).json({ ...result.import, connection: result.connection });
  } catch (error) {
    const status=['SHEET_PREVIEW_REQUIRED','SHEET_PREVIEW_EXPIRED','SHEET_CHANGED_SINCE_PREVIEW','SHEET_PREVIEW_HAS_INVALID_ROWS','SHEET_MAPPING_COLUMN_MISSING','SHEET_MAPPING_CONFLICT'].includes(error.code)?400:importStatus(error); if(status===500)console.error('Lead Partner Google Sheet connect failed:', error.message);
    return sendError(res,status,error,'Failed to connect Google Sheet',{code:error.code});
  }
}
async function syncGoogleSheet(req, res) {
  try {
    const result = await service.syncGoogleSheet({ userId: req.user.id, connectionId: Number(req.params.connectionId) });
    return res.json({ ...result.import, connection: result.connection });
  } catch (error) {
    const status=importStatus(error); if(status===500)console.error('Lead Partner Google Sheet sync failed:', error.message);
    return sendError(res,status,error,'Failed to sync Google Sheet',{code:error.code});
  }
}
async function updateSheetDefaultIndustry(req,res){
  try{
    const connection=await service.updateSheetDefaultIndustry({userId:req.user.id,connectionId:Number(req.params.connectionId),defaultIndustryId:req.body?.defaultIndustryId});
    const synced=await service.syncGoogleSheet({userId:req.user.id,connectionId:Number(req.params.connectionId)});
    return res.json({...synced.import,connection:{...synced.connection,default_industry_name:connection.default_industry_name}});
  }catch(error){
    const status=error.code==='SHEET_CONNECTION_NOT_FOUND'?404:error.code==='INVALID_DEFAULT_INDUSTRY'?400:importStatus(error);
    if(status===500)console.error('Lead Partner Google Sheet default Industry update failed:',error.message);
    return sendError(res,status,error,'Failed to update Google Sheet default Industry',{code:error.code});
  }
}
async function disableSheetConnection(req, res) {
  try { return res.json({ connection: await service.disableSheetConnection({ userId: req.user.id, connectionId: Number(req.params.connectionId) }) }); }
  catch (error) {
    const status=error.code==='SHEET_CONNECTION_NOT_FOUND'?404:500;if(status===500)console.error('Lead Partner Google Sheet disconnect failed:', error.message);
    return sendError(res,status,error,'Failed to disconnect Google Sheet',{code:error.code});
  }
}
module.exports = { inventory, importGoogleSheet, importCsv, sheetConnections, previewGoogleSheet, connectGoogleSheet, syncGoogleSheet, updateSheetDefaultIndustry, disableSheetConnection };
