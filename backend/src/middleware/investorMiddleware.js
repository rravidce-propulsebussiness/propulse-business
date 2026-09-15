const requireAuth = require('./authMiddleware');
const { isProMember } = require('../services/membershipAccessService');

async function requireInvestor(req, res, next) {
  return requireAuth(req, res, async () => {
    try {
      // Investors are normal User accounts (stored as the existing `business` role)
      // with an active Pro membership. Lead Partner and Admin accounts are never
      // eligible for investor APIs.
      if (req.user.role !== 'business') {
        return res.status(403).json({ error: 'Investor access is available to User accounts with Pro membership.' });
      }
      if (!(await isProMember(req.user.id))) {
        return res.status(403).json({ error: 'Active Pro membership is required for investor access.' });
      }
      return next();
    } catch (error) {
      console.error('Investor authorization failed:', error.message);
      return res.status(500).json({ error: 'Failed to verify investor access' });
    }
  });
}

module.exports = requireInvestor;
