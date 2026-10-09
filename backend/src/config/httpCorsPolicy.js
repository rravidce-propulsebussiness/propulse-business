// Frontend assets are public files, not credentialed API responses.
// Hostinger may serve more than one hostname. A stale API CORS allowlist must not
// prevent the browser from loading same-origin hashed JavaScript and CSS files.
function shouldBypassCorsForPublicAssets(req, servingFrontend) {
  const method = String(req?.method || '').toUpperCase();
  const requestPath = String(req?.path || '');
  return Boolean(servingFrontend)
    && (method === 'GET' || method === 'HEAD')
    && /^\/assets\/[^/]+$/.test(requestPath);
}

module.exports = { shouldBypassCorsForPublicAssets };
