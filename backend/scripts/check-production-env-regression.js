const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.join(__dirname, 'check-production-env.js');

function run(overrides) {
  return spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DB_HOST: 'db.internal',
      DB_PORT: '5432',
      DB_NAME: 'propulse',
      DB_USER: 'propulse',
      DB_PASSWORD: 'database-password',
      DB_SSL: 'true',
      JWT_SECRET: 'x'.repeat(64),
      CORS_ORIGIN: 'https://app.example.com',
      PUBLIC_APP_URL: 'https://app.example.com',
      TRUST_PROXY: '1',
      RESEND_API_KEY: '',
      RESEND_FROM_EMAIL: '',
      GOOGLE_CLIENT_ID: '',
      ADMIN_PASSWORD: '',
      UPLOAD_STORAGE_ROOT: '/var/lib/propulse/uploads',
      HEALTH_CHECK_TIMEOUT_MS: '2500',
      RUN_MIGRATIONS_ON_STARTUP: 'false',
      RUN_BACKGROUND_JOBS_IN_WEB: 'false',
      RUN_MIGRATIONS_ON_WORKER_STARTUP: 'false',
      ...overrides,
    },
  });
}

const valid = run({});
assert.equal(valid.status, 0, valid.stderr || valid.stdout);
assert.match(valid.stdout, /Production environment check passed/);

const unsafe = run({
  JWT_SECRET: 'short',
  CORS_ORIGIN: '*',
  PUBLIC_APP_URL: 'http://app.example.com/path',
  TRUST_PROXY: 'true',
  UPLOAD_STORAGE_ROOT: '',
  HEALTH_CHECK_TIMEOUT_MS: '20000',
});
assert.notEqual(unsafe.status, 0);
const output = `${unsafe.stdout}\n${unsafe.stderr}`;
assert.match(output, /JWT_SECRET/);
assert.match(output, /CORS_ORIGIN/);
assert.match(output, /PUBLIC_APP_URL/);
assert.match(output, /TRUST_PROXY=true/);
assert.match(output, /UPLOAD_STORAGE_ROOT/);
assert.match(output, /HEALTH_CHECK_TIMEOUT_MS/);

console.log('Production environment preflight regression test passed.');
