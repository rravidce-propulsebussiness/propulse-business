const requireAuth = require('./authMiddleware');
const pool = require('../config/database');
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

async function hasInvestorHistory(userId) {
  const result = await pool.query(
    "SELECT 1 FROM investments WHERE user_id=$1 AND status NOT IN ('pending','cancelled') LIMIT 1",
    [userId]
  );
  return result.rowCount > 0;
}

// Read and wind-down access: an investor whose Pro membership lapsed can still
// see existing investments and withdraw earnings already made. New
// investments, checkout and reinvestment keep using requireInvestor (Pro).
async function requireInvestorHolder(req, res, next) {
  return requireAuth(req, res, async () => {
    try {
      if (req.user.role !== 'business') {
        return res.status(403).json({ error: 'Investor access is available to User accounts with Pro membership.' });
      }
      if (!(await isProMember(req.user.id)) && !(await hasInvestorHistory(req.user.id))) {
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
module.exports.requireInvestorHolder = requireInvestorHolder;
module.exports.hasInvestorHistory = hasInvestorHistory;
