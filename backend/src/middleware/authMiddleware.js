const authService = require('../services/authService');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const cookieToken = req.cookies?.propulse_auth;
    const token = header.startsWith('Bearer ') ? header.slice(7) : cookieToken;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const tokenUser = authService.verifyToken(token);
    const currentUser = await authService.getAuthenticatedUser(tokenUser.id, tokenUser.auth_version);
    if (!currentUser) return res.status(401).json({ error: 'Invalid or expired session' });
    req.user = currentUser;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = requireAuth;
