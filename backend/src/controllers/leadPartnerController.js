const leadPartnerService = require('../services/leadPartnerService');

async function dashboard(req, res) {
  try {
    return res.json(await leadPartnerService.getDashboard(req.user.id));
  } catch (error) {
    console.error('Lead Partner dashboard failed:', error.message);
    return res.status(500).json({ error: 'Failed to load Lead Partner dashboard' });
  }
}

module.exports = { dashboard };
