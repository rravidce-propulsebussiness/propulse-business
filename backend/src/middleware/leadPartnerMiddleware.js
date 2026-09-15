const requireAuth = require('./authMiddleware');

function requireLeadPartner(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user.role !== 'lead_partner') {
      return res.status(403).json({ error: 'Lead Partner access required.' });
    }
    return next();
  });
}

module.exports = requireLeadPartner;
