function getConfiguredOrigins() {
  return String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function hasAuthCookie(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map(part => part.trim())
    .some(part => part.startsWith('propulse_auth='));
}

function hasBearerToken(req) {
  return String(req.headers.authorization || '').startsWith('Bearer ');
}

function originFromReferer(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function csrfProtection(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  // Bearer-authenticated API clients are not exposed to cookie CSRF.
  if (hasBearerToken(req) || !hasAuthCookie(req)) return next();

  const allowedOrigins = getConfiguredOrigins();
  const origin = String(req.headers.origin || '').trim();
  const refererOrigin = originFromReferer(String(req.headers.referer || '').trim());
  const requestOrigin = origin || refererOrigin;

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) return next();

  return res.status(403).json({ error: 'CSRF validation failed' });
}

module.exports = csrfProtection;
