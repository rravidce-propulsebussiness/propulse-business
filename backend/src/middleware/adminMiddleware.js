const requireAuth = require('./authMiddleware');

function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
  });
}

module.exports = requireAdmin;
