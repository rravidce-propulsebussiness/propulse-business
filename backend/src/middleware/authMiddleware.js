const authService = require('../services/authService');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const tokenUser = authService.verifyToken(header.slice(7));
    const currentUser = await authService.getAuthenticatedUser(tokenUser.id);
    if (!currentUser) return res.status(401).json({ error: 'Invalid or expired session' });
    req.user = currentUser;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = requireAuth;
