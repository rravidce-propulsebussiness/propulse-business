const service = require('../services/leadPartnerCsvImportService');
const {sendError}=require('../utils/errorResponse');

function importStatus(error){
  if(error?.code==='SYNC_IN_PROGRESS')return 409;
  return /CSV|Industry|Service|State|City|Pincode|Maximum|active/i.test(String(error?.message||'')) ? 400 : 500;
}

async function inventory(req, res) {
  try { return res.json(await service.listInventory({ userId: req.user.id, status: req.query.status, search: req.query.search })); }
  catch (error) { console.error('Lead Partner inventory failed:', error.message); return sendError(res,500,error,'Failed to load lead inventory'); }
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
module.exports = { inventory, importCsv };
