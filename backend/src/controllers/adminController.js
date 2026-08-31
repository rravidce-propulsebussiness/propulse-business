const adminService = require('../services/adminService');

async function getDashboardStats(req, res) {
  try {
    return res.json(await adminService.getDashboardStats());
  } catch (error) {
    console.error('Get admin dashboard stats failed:', error.message);
    return res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
}

async function getBusinesses(req, res) {
  try {
    const businesses = await adminService.getBusinesses(req.query);
    return res.json(businesses);
  } catch (error) {
    console.error('Get admin businesses failed:', error.message);
    return res.status(500).json({ error: 'Failed to load businesses' });
  }
}

async function setBusinessStatus(req, res) {
  try {
    const isActive = Boolean(req.body?.isActive);
    const business = await adminService.setBusinessStatus(req.params.id, isActive);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    return res.json(business);
  } catch (error) {
    console.error('Set business status failed:', error.message);
    return res.status(500).json({ error: 'Failed to update business status' });
  }
}

module.exports = { getDashboardStats, getBusinesses, setBusinessStatus };
