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
async function connectGoogleSheet(req, res) {
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Google Sheets URL is required' });
    const result = await service.connectGoogleSheet({ userId: req.user.id, url });
    return res.status(201).json({ ...result.import, connection: result.connection });
  } catch (error) {
    const status=importStatus(error); if(status===500)console.error('Lead Partner Google Sheet connect failed:', error.message);
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
async function disableSheetConnection(req, res) {
  try { return res.json({ connection: await service.disableSheetConnection({ userId: req.user.id, connectionId: Number(req.params.connectionId) }) }); }
  catch (error) {
    const status=error.code==='SHEET_CONNECTION_NOT_FOUND'?404:500;if(status===500)console.error('Lead Partner Google Sheet disconnect failed:', error.message);
    return sendError(res,status,error,'Failed to disconnect Google Sheet',{code:error.code});
  }
}
module.exports = { inventory, importGoogleSheet, importCsv, sheetConnections, connectGoogleSheet, syncGoogleSheet, disableSheetConnection };
