const requireAuth = require('./authMiddleware');

function authorizeAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (req.user) return authorizeAdmin(req, res, next);
  return requireAuth(req, res, () => authorizeAdmin(req, res, next));
}

module.exports = requireAdmin;
