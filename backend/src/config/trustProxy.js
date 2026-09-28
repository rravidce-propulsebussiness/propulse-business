function parseTrustProxySetting(value) {
  const raw = String(value ?? '').trim();
  const normalized = raw.toLowerCase();

  if (!raw || ['false', '0', 'no', 'off'].includes(normalized)) return false;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (/^\d+$/.test(raw)) return Number(raw);

  return raw;
}

module.exports = { parseTrustProxySetting };
