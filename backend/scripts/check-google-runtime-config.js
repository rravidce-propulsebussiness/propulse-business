const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

const routes = fs.readFileSync(path.join(root, 'backend/src/routes/authRoutes.js'), 'utf8');
const button = fs.readFileSync(path.join(root, 'frontend/src/components/GoogleButton.jsx'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'frontend/src/utils/googleIdentityServices.js'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/hostinger-main-prebuild.yml'), 'utf8');

assert.match(routes, /router\.get\('\/google\/config'/, 'Public Google config endpoint must exist');
assert.match(routes, /process\.env\.GOOGLE_CLIENT_ID/, 'Google config must use the server-side ID');
assert.match(routes, /Cache-Control', 'no-store'/, 'Google config must be uncached');
assert.match(loader, /fetch\('\/api\/auth\/google\/config'/, 'Frontend must load the Google ID at runtime');
assert.match(loader, /response\.status === 403/, 'Runtime config should explain a rejected origin');
assert.match(button, /await assertGoogleConfiguration\(\)/, 'Google button must await runtime config');
assert.doesNotMatch(button, /import\.meta\.env\.VITE_GOOGLE_CLIENT_ID/, 'Button must not depend on build-time Vite credentials');
assert.match(workflow, /VITE_PUBLIC_SITE_URL: https:\/\/propulsetechnologies\.online/, 'Prebuilt frontend must use the correct public domain');
assert.doesNotMatch(workflow, /sghomesinterior\.in/, 'Production workflow must not use the former domain');
const { getConfiguredOrigins } = require('../src/config/httpOrigins');
assert.deepEqual(
  getConfiguredOrigins({
    isProduction: true,
    env: {
      CORS_ORIGIN: 'https://former.example',
      PUBLIC_APP_URL: 'http://propulsetechnologies.online',
    },
  }),
  ['https://former.example', 'https://propulsetechnologies.online'],
  'Production allows only the configured canonical HTTPS website when the CORS setting is stale'
);
assert.deepEqual(
  getConfiguredOrigins({
    isProduction: true,
    env: {
      CORS_ORIGIN: 'https://propulsetechnologies.online',
      PUBLIC_APP_URL: 'https://propulsetechnologies.online',
    },
  }),
  ['https://propulsetechnologies.online'],
  'Matching canonical origins do not appear twice'
);
assert(!getConfiguredOrigins({
  isProduction: true,
  env: { CORS_ORIGIN: 'https://former.example', PUBLIC_APP_URL: 'https://propulsetechnologies.online' },
}).includes('https://untrusted.example'), 'Unknown origins must remain blocked');

console.log('Google login runtime configuration regression check passed.');
