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

function errorSummary(error){
  const cause=error?.cause||{};
  return[
    error?.message,
    cause?.code,
    cause?.hostname,
    cause?.address,
    cause?.port,
    cause?.message,
  ].filter(Boolean).map(String).filter((value,index,array)=>array.indexOf(value)===index).join(' | ').slice(0,500);
}

async function request(path, options = {}) {
  try{
    return await fetch(`${baseUrl}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(10000), ...options });
  }catch(error){
    throw new Error(`Deployment request ${path} failed: ${errorSummary(error)||String(error)}`,{cause:error});
  }
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

  const publicPages = [
    '/',
    '/experts',
    '/projects',
    '/packages',
    '/login',
    '/forgot-password',
    '/hyderabad/construction',
  ];
  let homepageHtml = '';
  for (const path of publicPages) {
    const response = await request(path, { headers: { accept: 'text/html' } });
    assert.equal(response.status, 200, `Public page ${path} must return 200`);
    assert.match(String(response.headers.get('content-type') || ''), /text\/html/i, `Public page ${path} must return HTML`);
    const html = await response.text();
    assert(html.length > 200, `Public page ${path} must return rendered application HTML`);
    assert(!/Application (?:is starting|frontend is starting)|Application is recovering/i.test(html), `Public page ${path} must not return a startup shell`);
    if (path === '/') homepageHtml = html;
  }

  const mainScriptMatch = homepageHtml.match(/<script[^>]+src=["']([^"']*\/assets\/[^"']+\.js)["']/i);
  assert(mainScriptMatch, 'Homepage must reference a built JavaScript asset');
  const mainScript = await request(mainScriptMatch[1]);
  assert.equal(mainScript.status, 200, 'Homepage JavaScript asset must return 200');
  assert.match(String(mainScript.headers.get('content-type') || ''), /(javascript|ecmascript)/i, 'Homepage JavaScript asset must have a JavaScript content type');
  const mainScriptBody = await mainScript.text();
  assert(mainScriptBody.length > 100, 'Homepage JavaScript asset must not be empty');

  const favicon = await request('/favicon.svg');
  assert.equal(favicon.status, 200, 'Favicon must return 200');
  assert.match(String(favicon.headers.get('content-type') || ''), /image\/svg\+xml|svg/i, 'Favicon must have an SVG content type');
  assert((await favicon.text()).includes('<svg'), 'Favicon must return SVG content');

  const logo = await request('/brand/propulse-logo.svg');
  assert.equal(logo.status, 200, 'Public ProPulse logo must return 200');
  assert.match(String(logo.headers.get('content-type') || ''), /image\/svg\+xml|svg/i, 'Public ProPulse logo must have an SVG content type');

  const robots = await request('/robots.txt');
  assert.equal(robots.status, 200, 'robots.txt must return 200');
  const robotsBody = await robots.text();
  assert(robotsBody.includes('Sitemap: '+base.origin+'/sitemap.xml'), 'robots.txt must advertise the production sitemap');
  assert(robotsBody.includes('Disallow: /admin/'), 'robots.txt must keep Admin private');

  const sitemap = await request('/sitemap.xml');
  assert.equal(sitemap.status, 200, 'sitemap.xml must return 200');
  assert.match(String(sitemap.headers.get('content-type') || ''), /xml/i, 'sitemap.xml must have an XML content type');
  const sitemapBody = await sitemap.text();
  assert(sitemapBody.includes('<loc>'+base.origin+'/</loc>'), 'sitemap.xml must include the production homepage');
  assert(sitemapBody.includes('<loc>'+base.origin+'/hyderabad/construction</loc>'), 'sitemap.xml must include the Hyderabad construction landing page');
  assert(!sitemapBody.includes('localhost'), 'Production sitemap must never advertise localhost URLs');

  const session = await request('/api/auth/session', { headers: { origin: appOrigin } });
  assert.equal(session.status, 200, 'Public auth session bootstrap must return 200');
  const sessionBody = await session.json();
  assert.equal(sessionBody.authenticated, false, 'Anonymous deployed smoke must remain unauthenticated');
  assert.equal(sessionBody.user, null, 'Anonymous deployed smoke must not expose a user');

  const googleConfig = await request('/api/auth/google/config', { headers: { origin: appOrigin } });
  assert.equal(googleConfig.status, 200, 'Public Google configuration must not fail with CORS');
  const googleConfigBody = await googleConfig.json();
  assert.match(String(googleConfigBody.clientId || ''), /\.apps\.googleusercontent\.com$/, 'Hostinger must expose a configured Google OAuth web client ID');

  const soundSettings = await request('/api/sound-settings', { headers: { origin: appOrigin } });
  assert.equal(soundSettings.status, 200, 'Public sound settings must return 200');
  const soundSettingsBody = await soundSettings.json();
  assert.equal(typeof soundSettingsBody.masterEnabled, 'boolean', 'Public sound settings must expose a usable configuration');

  const experts = await request('/api/experts?page=1&pageSize=1', { headers: { origin: appOrigin } });
  assert.equal(experts.status, 200, 'Public Experts directory API must return 200');
  const expertsBody = await experts.json();
  assert(Array.isArray(expertsBody.data), 'Public Experts directory must return a data array');
  assert(expertsBody.pagination && typeof expertsBody.pagination === 'object', 'Public Experts directory must return pagination metadata');

  const legacyRedirects = [
    ['/home', '/'],
    ['/leads', '/professionals'],
    ['/industries', '/'],
    ['/pricing', '/#pricing'],
    ['/build?utm_source=smoke', '/quote?utm_source=smoke#construction'],
    ['/design', '/quote#interiors'],
    ['/property', '/quote#property'],
    ['/real-estate', '/quote#property'],
  ];
  for (const [from, to] of legacyRedirects) {
    const response = await request(from, { headers: { accept: 'text/html' } });
    assert.equal(response.status, 301, `Legacy public route ${from} must permanently redirect`);
    assert.equal(response.headers.get('location'), to, `Legacy public route ${from} must redirect to ${to}`);
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

  const effectiveCommit = versionMatches ? versionBody.commit : releaseBody.commit;
  console.log(`Deployed smoke test passed: ${effectiveEnvironment} ${String(effectiveCommit).slice(0,12)}; HTTPS health, readiness, release identity, public pages/assets/SEO files, public session/sound/Experts APIs, security headers, CORS, auth boundary and 404 behavior.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
