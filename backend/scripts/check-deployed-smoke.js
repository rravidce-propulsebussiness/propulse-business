const assert = require('node:assert/strict');

const baseUrl = String(process.env.DEPLOY_BASE_URL || '').replace(/\/$/, '');
const appOrigin = String(process.env.DEPLOY_APP_ORIGIN || '').replace(/\/$/, '');
const expectedCommit = String(process.env.DEPLOY_EXPECTED_COMMIT || '').trim().toLowerCase();
const expectedEnvironment = String(process.env.DEPLOY_EXPECTED_ENVIRONMENT || '').trim().toLowerCase();

if (!baseUrl) throw new Error('Set DEPLOY_BASE_URL to the deployed backend/public origin, for example https://staging.example.com');
if (!appOrigin) throw new Error('Set DEPLOY_APP_ORIGIN to the deployed frontend origin');

const base = new URL(baseUrl);
const app = new URL(appOrigin);
const placeholderHost = hostname => /(^|\.)(example\.(com|test)|yourdomain\.com)$/i.test(hostname);
if (placeholderHost(base.hostname) || placeholderHost(app.hostname)) {
  throw new Error('Replace the example/yourdomain placeholder with a real deployed staging or production hostname before running test:deployed');
}
if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) {
  throw new Error('DEPLOY_BASE_URL must use HTTPS outside localhost');
}

function commitMatches(actual, expected) {
  const left = String(actual || '').trim().toLowerCase();
  const right = String(expected || '').trim().toLowerCase();
  if (!/^[0-9a-f]{7,64}$/.test(left) || !/^[0-9a-f]{7,64}$/.test(right)) return false;
  return left === right || left.startsWith(right) || right.startsWith(left);
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000), ...options });
}

async function main() {
  const live = await request('/health/live');
  assert.equal(live.status, 200, 'Liveness endpoint must return 200');
  assert.equal((await live.json()).status, 'ok');

  const version = await request('/health/version');
  assert.equal(version.status, 200, 'Version endpoint must return 200');
  const versionBody = await version.json();
  assert.equal(versionBody.status, 'ok');
  assert(versionBody.commit, 'Version endpoint must expose a deployment commit');
  assert(versionBody.environment, 'Version endpoint must expose a deployment environment');

  const release = await request('/release.json', { headers: { 'cache-control': 'no-cache' } });
  assert.equal(release.status, 200, 'Frontend release marker must return 200');
  const releaseBody = await release.json();
  assert(releaseBody.commit, 'Frontend release marker must expose a deployment commit');

  const versionMatches = expectedCommit ? commitMatches(versionBody.commit, expectedCommit) : false;
  const markerMatches = expectedCommit ? commitMatches(releaseBody.commit, expectedCommit) : false;
  if (expectedCommit) {
    assert(versionMatches || markerMatches, `Neither backend commit ${versionBody.commit} nor frontend marker ${releaseBody.commit} matches expected ${expectedCommit}`);
  }

  const effectiveEnvironment = String(versionBody.environment || releaseBody.environment || '').toLowerCase();
  if (expectedEnvironment) assert.equal(effectiveEnvironment, expectedEnvironment, 'Deployed environment identity does not match the release target');

  const ready = await request('/health/ready');
  assert.equal(ready.status, 200, 'Readiness endpoint must return 200');
  const readyBody = await ready.json();
  assert.equal(readyBody.database, 'connected');

  const health = await request('/health');
  assert.equal(health.status, 200, 'Legacy /health endpoint must remain healthy');

  for (const response of [live, version, ready, health]) {
    assert.match(String(response.headers.get('cache-control') || ''), /no-store/i, 'Health endpoints must not be cached');
    assert.equal(response.headers.get('x-powered-by'), null, 'Express signature must be disabled');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    if (base.protocol === 'https:') assert(response.headers.get('strict-transport-security'), 'HTTPS deployment must send HSTS');
  }

  const session = await request('/api/auth/session', { headers: { origin: appOrigin } });
  assert.equal(session.status, 200, 'Public auth session bootstrap must return 200');
  const sessionBody = await session.json();
  assert.equal(sessionBody.authenticated, false, 'Anonymous deployed smoke must remain unauthenticated');
  assert.equal(sessionBody.user, null, 'Anonymous deployed smoke must not expose a user');

  const soundSettings = await request('/api/sound-settings', { headers: { origin: appOrigin } });
  assert.equal(soundSettings.status, 200, 'Public sound settings must return 200');
  const soundSettingsBody = await soundSettings.json();
  assert.equal(typeof soundSettingsBody.masterEnabled, 'boolean', 'Public sound settings must expose a usable configuration');

  const experts = await request('/api/experts?page=1&pageSize=1', { headers: { origin: appOrigin } });
  assert.equal(experts.status, 200, 'Public Experts directory API must return 200');
  const expertsBody = await experts.json();
  assert(Array.isArray(expertsBody.data), 'Public Experts directory must return a data array');
  assert(expertsBody.pagination && typeof expertsBody.pagination === 'object', 'Public Experts directory must return pagination metadata');

  const allowed = await request('/api/investments', { headers: { origin: appOrigin } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), appOrigin, 'Configured frontend origin must receive CORS permission');
  assert.equal(allowed.status, 401, 'Anonymous investment API request should be unauthorized');

  const untrustedOrigin = new URL(appOrigin);
  untrustedOrigin.hostname = `untrusted-${untrustedOrigin.hostname}`;
  const blocked = await request('/api/investments', { headers: { origin: untrustedOrigin.origin } });
  assert.equal(blocked.status, 403, 'Untrusted origin must be rejected');

  const missing = await request('/definitely-not-a-route');
  assert.equal(missing.status, 404);

  const effectiveCommit = versionMatches ? versionBody.commit : releaseBody.commit;
  console.log(`Deployed smoke test passed: ${effectiveEnvironment} ${String(effectiveCommit).slice(0,12)}; HTTPS health, readiness, release identity, public session/sound/Experts APIs, security headers, CORS, auth boundary and 404 behavior.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
