const authService = require('../services/authService');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const cookieHeader = String(req.headers.cookie || '');
    const cookieToken = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith('propulse_auth='))?.slice('propulse_auth='.length);
    const decodedCookieToken = cookieToken ? decodeURIComponent(cookieToken) : null;
    const token = header.startsWith('Bearer ') ? header.slice(7) : decodedCookieToken;
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
