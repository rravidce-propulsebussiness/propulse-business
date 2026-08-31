const adminService = require('../services/adminService');

async function getDashboardStats(req, res) {
  try {
    const stats = await adminService.getDashboardStats();
    return res.json(stats);
  } catch (error) {
    console.error('Get admin dashboard stats failed:', error.message);
    return res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
}

module.exports = { getDashboardStats };
