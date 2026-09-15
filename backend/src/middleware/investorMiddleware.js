const requireAuth = require('./authMiddleware');

function requireInvestor(req, res, next) {
  return requireAuth(req, res, () => {
    // In this account model, investors are normal users (business role) with
    // an active Pro membership. Lead Partner is a separate role.
    if (req.user.role !== 'business') {
      return res.status(403).json({ error: 'Investor access is available to User accounts with Pro membership.' });
    }
    return next();
  });
}

module.exports = requireInvestor;
