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

function getConfiguredOrigins({ isProduction = process.env.NODE_ENV === 'production' } = {}) {
  const values = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (!values.length) {
    if (isProduction) throw new Error('CORS_ORIGIN must be configured in production');
    return ['http://localhost:5173'];
  }

  return [...new Set(values.map(parseOrigin).filter(Boolean))];
}

module.exports = { getConfiguredOrigins, parseOrigin };
