const service = require('../services/leadPartnerInventoryService');

async function inventory(req, res) {
  try { return res.json(await service.listInventory({ userId: req.user.id, status: req.query.status, search: req.query.search })); }
  catch (error) { console.error('Lead Partner inventory failed:', error.message); return res.status(500).json({ error: 'Failed to load lead inventory' }); }
}

async function importGoogleSheet(req, res) {
  try {
    const url = String(req.body?.url || '').trim();
    if (!url) return res.status(400).json({ error: 'Google Sheets URL is required' });
    return res.status(201).json(await service.importGoogleSheet({ userId: req.user.id, url }));
  } catch (error) {
    console.error('Lead Partner Google Sheet import failed:', error.message);
    return res.status(/Google Sheet|CSV|Industry|Service|State|City|Pincode|Maximum/.test(error.message) ? 400 : 500).json({ error: error.message || 'Failed to import Google Sheet' });
  }
}

async function importCsv(req, res) {
  try {
    const csv = String(req.body?.csv || '');
    if (!csv.trim()) return res.status(400).json({ error: 'CSV data is required' });
    return res.status(201).json(await service.importCsv({ userId: req.user.id, csv }));
  } catch (error) {
    console.error('Lead Partner CSV import failed:', error.message);
    return res.status(400).json({ error: error.message || 'Failed to import CSV' });
  }
}

module.exports = { inventory, importGoogleSheet, importCsv };
