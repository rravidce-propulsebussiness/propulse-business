const pincodeService = require('../services/pincodeService');
const detectionService = require('../services/pincodeDetectionService');

async function search(req, res) {
  try {
    const rows = await pincodeService.searchPincodes({ query: req.query.search || req.query.q || '', stateId: req.query.stateId, limit: req.query.limit });
    return res.json(rows);
  } catch (error) {
    console.error('Search pincodes failed:', error.message);
    return res.status(500).json({ error: 'Failed to search pincodes' });
  }
}

async function resolve(req, res) {
  try {
    const row = await pincodeService.resolvePincode({
      stateId: req.query.stateId,
      cityId: req.query.cityId,
      district: req.query.district,
      location: req.query.location,
    });
    return res.json(row || { pincode: null, resolved: false });
  } catch (error) {
    console.error('Resolve pincode failed:', error.message);
    return res.status(500).json({ error: 'Failed to resolve pincode' });
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

async function detect(req, res) {
  try {
    const result = await detectionService.detectPincode(req.body?.pincode || req.params?.pincode, {
      forceRefresh: req.body?.forceRefresh === true,
    });
    return res.json(result);
  } catch (error) {
    const bad = ['INVALID_PINCODE', 'PIN_NOT_FOUND', 'PIN_LOOKUP_TIMEOUT'];
    return res.status(bad.includes(error.code) ? 400 : 502).json({ error: error.message || 'Failed to detect PIN', code: error.code });
  }
}

async function listUnmapped(req, res) {
  try {
    return res.json(await detectionService.listUnmappedPins({ limit: req.query.limit }));
  } catch (error) {
    console.error('List unmapped PINs failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch unmapped PINs' });
  }
}

async function mapToCity(req, res) {
  try {
    const result = await detectionService.mapPinToCity(req.params.pincode, req.body?.cityId, 'manual');
    return res.json(result);
  } catch (error) {
    const bad = ['INVALID_PINCODE', 'INVALID_CITY', 'PIN_NOT_DETECTED', 'CITY_NOT_FOUND', 'CITY_STATE_MISMATCH'];
    return res.status(bad.includes(error.code) ? 400 : 500).json({ error: error.message || 'Failed to map PIN', code: error.code });
  }
}

module.exports = { search, resolve, getOne, detect, listUnmapped, mapToCity };
