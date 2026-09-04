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

async function syncState(req, res) {
  try {
    const result = await pincodeService.syncPincodesForState(req.params.stateId);
    if (!result) return res.status(404).json({ error: 'State not found' });
    return res.json({ message: `Pincodes synced for ${result.state.name}`, ...result });
  } catch (error) {
    console.error('Sync state pincodes failed:', error.message);
    return res.status(502).json({ error: error.message || 'Failed to sync state pincodes' });
  }
}

let allIndiaJob = { status: 'idle', startedAt: null, finishedAt: null, result: null, error: null };

async function syncAll(req, res) {
  if (allIndiaJob.status === 'running') return res.status(409).json(allIndiaJob);
  allIndiaJob = { status: 'running', startedAt: new Date().toISOString(), finishedAt: null, result: null, error: null };
  setImmediate(async () => {
    try {
      allIndiaJob.result = await pincodeService.syncAllIndiaPincodes();
      allIndiaJob.status = 'completed';
    } catch (error) {
      allIndiaJob.status = 'failed';
      allIndiaJob.error = error.message;
    } finally {
      allIndiaJob.finishedAt = new Date().toISOString();
    }
  });
  return res.status(202).json(allIndiaJob);
}

function syncStatus(req, res) {
  return res.json(allIndiaJob);
}

module.exports = { search, getOne, syncState, syncAll, syncStatus };
