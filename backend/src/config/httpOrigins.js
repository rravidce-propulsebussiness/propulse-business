function parseOrigin(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (value === '*') throw new Error('CORS_ORIGIN must not contain * when credentialed cookies are enabled');
  let url;
  try { url = new URL(value); } catch { throw new Error(`Invalid CORS_ORIGIN value: ${value}`); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Invalid CORS_ORIGIN protocol: ${value}`);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`CORS_ORIGIN must contain origins only: ${value}`);
  }
  return url.origin;
}

function getConfiguredOrigins({ isProduction = process.env.NODE_ENV === 'production', env = process.env } = {}) {
  const values = String(env.CORS_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (!values.length) {
    if (isProduction) throw new Error('CORS_ORIGIN must be configured in production');
    return ['http://localhost:5173'];
  }

  const origins = values.map(parseOrigin).filter(Boolean);

  // PUBLIC_APP_URL is an explicitly configured, trusted application address.
  // Hostinger deployments can move domains while retaining a stale CORS_ORIGIN.
  // Accept only the canonical HTTPS origin for that hostname, never a request's
  // untrusted Host or X-Forwarded-Host header.
  if (isProduction && String(env.PUBLIC_APP_URL || '').trim()) {
    let publicUrl;
    try { publicUrl = new URL(String(env.PUBLIC_APP_URL).trim()); } catch { publicUrl = null; }
    if (publicUrl && ['https:', 'http:'].includes(publicUrl.protocol)
        && !publicUrl.username && !publicUrl.password
        && publicUrl.pathname === '/' && !publicUrl.search && !publicUrl.hash
        && !['localhost', '127.0.0.1', '[::1]'].includes(publicUrl.hostname)) {
      origins.push('https://' + publicUrl.host);
    }
  }

  return [...new Set(origins)];
}

module.exports = { getConfiguredOrigins, parseOrigin };
