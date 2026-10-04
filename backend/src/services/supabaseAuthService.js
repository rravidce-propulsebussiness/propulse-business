const DEFAULT_TIMEOUT_MS = 10000;

function envFlag(name, fallback = false) {
  const raw = String(process.env[name] ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function config() {
  return {
    enabled: envFlag('SUPABASE_AUTH_ENABLED', false),
    url: String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, ''),
    publishableKey: String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim(),
  };
}

function isConfigured() {
  const value = config();
  return Boolean(value.enabled && value.url && value.publishableKey);
}

async function verifyAccessToken(accessToken) {
  if (!isConfigured()) {
    const error = new Error('Supabase Auth is not enabled');
    error.code = 'SUPABASE_AUTH_DISABLED';
    throw error;
  }

  const token = String(accessToken || '').trim();
  if (!token) {
    const error = new Error('Supabase access token is required');
    error.code = 'SUPABASE_TOKEN_REQUIRED';
    throw error;
  }

  const { url, publishableKey } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error('Invalid or expired Supabase session');
      error.code = 'INVALID_SUPABASE_SESSION';
      error.status = response.status;
      throw error;
    }

    const user = await response.json();
    if (!user?.id || !user?.email) {
      const error = new Error('Supabase session does not contain a usable identity');
      error.code = 'INVALID_SUPABASE_IDENTITY';
      throw error;
    }
    return user;
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error('Supabase Auth verification timed out');
      timeoutError.code = 'SUPABASE_AUTH_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { isConfigured, verifyAccessToken };
