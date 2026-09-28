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
  if (expectedCommit) assert(commitMatches(versionBody.commit, expectedCommit), `Deployed commit ${versionBody.commit} does not match expected ${expectedCommit}`);
  if (expectedEnvironment) assert.equal(String(versionBody.environment).toLowerCase(), expectedEnvironment, 'Deployed environment identity does not match the release target');

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

  const allowed = await request('/api/investments', { headers: { origin: appOrigin } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), appOrigin, 'Configured frontend origin must receive CORS permission');
  assert.equal(allowed.status, 401, 'Anonymous investment API request should be unauthorized');

  const untrustedOrigin = new URL(appOrigin);
  untrustedOrigin.hostname = `untrusted-${untrustedOrigin.hostname}`;
  const blocked = await request('/api/investments', { headers: { origin: untrustedOrigin.origin } });
  assert.equal(blocked.status, 403, 'Untrusted origin must be rejected');

  const missing = await request('/definitely-not-a-route');
  assert.equal(missing.status, 404);

  console.log(`Deployed smoke test passed: ${versionBody.environment} ${String(versionBody.commit).slice(0,12)}; HTTPS health, readiness, security headers, CORS, auth boundary and 404 behavior.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
