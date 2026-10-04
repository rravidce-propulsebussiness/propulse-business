const authService = require('../services/authService');
const supabaseAuthService = require('../services/supabaseAuthService');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const cookieHeader = String(req.headers.cookie || '');
  const cookieToken = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('propulse_auth='))
    ?.slice('propulse_auth='.length);
  const decodedCookieToken = cookieToken ? decodeURIComponent(cookieToken) : null;
  const currentToken = bearerToken || decodedCookieToken;

  if (!currentToken) return res.status(401).json({ error: 'Authentication required' });

  // Backward-compatible path: preserve all existing Propulse cookie/JWT sessions.
  try {
    const tokenUser = authService.verifyToken(currentToken);
    const currentUser = await authService.getAuthenticatedUser(tokenUser.id, tokenUser.auth_version);
    if (currentUser) {
      req.user = currentUser;
      req.authProvider = 'propulse';
      return next();
    }
  } catch {
    // A bearer token may instead be a Supabase Auth access token.
  }

  // Supabase bearer auth is opt-in. It never changes existing cookie behaviour.
  if (!bearerToken || !supabaseAuthService.isConfigured()) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  try {
    const supabaseUser = await supabaseAuthService.verifyAccessToken(bearerToken);
    const currentUser = await authService.getAuthenticatedUserBySupabaseId(supabaseUser.id);
    if (!currentUser) {
      return res.status(401).json({
        error: 'Supabase account is valid but is not linked to a Propulse account',
        code: 'SUPABASE_ACCOUNT_NOT_LINKED',
      });
    }

    req.user = currentUser;
    req.supabaseUser = supabaseUser;
    req.authProvider = 'supabase';
    return next();
  } catch (error) {
    if (error.code === 'SUPABASE_AUTH_TIMEOUT') {
      return res.status(503).json({ error: 'Authentication service is temporarily unavailable' });
    }
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = requireAuth;
