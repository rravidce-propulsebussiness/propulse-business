const pincodeService = require('../services/pincodeService');

async function search(req, res) {
  try {
    const rows = await pincodeService.searchPincodes({ query: req.query.search || req.query.q || '', stateId: req.query.stateId, limit: req.query.limit });
    return res.json(rows);
  } catch (error) {
    console.error('Search pincodes failed:', error.message);
    return res.status(500).json({ error: 'Failed to search pincodes' });
  }
}

async function getOne(req, res) {
  try {
    const pincode = String(req.params.pincode || '').trim();
    if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ error: 'Pincode must be 6 digits' });
    const row = await pincodeService.getPincode(pincode);
    return row ? res.json(row) : res.status(404).json({ error: 'Pincode not found' });
  } catch (error) {
    console.error('Get pincode failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch pincode' });
  }
}

module.exports = { search, getOne };