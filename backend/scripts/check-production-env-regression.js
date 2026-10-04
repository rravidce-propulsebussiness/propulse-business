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
      HTTP_REQUEST_TIMEOUT_MS: '60000',
      HTTP_HEADERS_TIMEOUT_MS: '15000',
      HTTP_KEEP_ALIVE_TIMEOUT_MS: '5000',
      HTTP_MAX_REQUESTS_PER_SOCKET: '1000',
      SLOW_REQUEST_MS: '2000',
      DB_POOL_MAX: '5',
      DB_IDLE_TIMEOUT_MS: '30000',
      DB_CONNECTION_TIMEOUT_MS: '10000',
      DB_STATEMENT_TIMEOUT_MS: '30000',
      DB_IDLE_IN_TX_TIMEOUT_MS: '60000',
      RUN_MIGRATIONS_ON_STARTUP: 'false',
      RUN_BACKGROUND_JOBS_IN_WEB: 'false',
      RUN_MIGRATIONS_ON_WORKER_STARTUP: 'false',
      REQUIRE_BACKGROUND_WORKER: 'true',
      WORKER_HEARTBEAT_INTERVAL_MS: '30000',
      WORKER_HEARTBEAT_MAX_AGE_SECONDS: '120',
      ...overrides,
    },
  });
}

const valid = run({});
assert.equal(valid.status, 0, valid.stderr || valid.stdout);
assert.match(valid.stdout, /Production environment check passed/);

const urlOnly = run({
  DATABASE_URL: 'postgresql://postgres.project-ref:password@pooler.example.com:5432/postgres',
  DB_HOST: '',
  DB_PORT: '',
  DB_NAME: '',
  DB_USER: '',
  DB_PASSWORD: '',
});
assert.equal(urlOnly.status, 0, urlOnly.stderr || urlOnly.stdout);
assert.match(urlOnly.stdout, /Production environment check passed/);

const r2Only = run({
  UPLOAD_STORAGE_ROOT: '',
  PRIVATE_OBJECT_STORAGE_DRIVER: 's3',
  PRIVATE_OBJECT_STORAGE_ENDPOINT: 'https://example-account.r2.cloudflarestorage.com',
  PRIVATE_OBJECT_STORAGE_REGION: 'auto',
  PRIVATE_OBJECT_STORAGE_BUCKET: 'propulse-files',
  PRIVATE_OBJECT_STORAGE_ACCESS_KEY_ID: 'test-access',
  PRIVATE_OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test-secret',
  PRIVATE_OBJECT_STORAGE_SIGNED_URL_SECONDS: '60',
  PRIVATE_OBJECT_STORAGE_BACKUP_STRATEGY: 'bucket_versioning',
});
assert.equal(r2Only.status, 0, r2Only.stderr || r2Only.stdout);
assert.match(r2Only.stdout, /Production environment check passed/);

const unsafe = run({
  JWT_SECRET: 'short',
  CORS_ORIGIN: '*',
  PUBLIC_APP_URL: 'http://app.example.com/path',
  TRUST_PROXY: 'true',
  UPLOAD_STORAGE_ROOT: '',
  HEALTH_CHECK_TIMEOUT_MS: '20000',
  HTTP_REQUEST_TIMEOUT_MS: '4000',
  HTTP_HEADERS_TIMEOUT_MS: '90000',
  DB_POOL_MAX: '99',
  DB_STATEMENT_TIMEOUT_MS: '299999',
  SLOW_REQUEST_MS: '100',
  REQUIRE_BACKGROUND_WORKER: 'true',
  RUN_BACKGROUND_JOBS_IN_WEB: 'true',
  WORKER_HEARTBEAT_INTERVAL_MS: '120000',
  WORKER_HEARTBEAT_MAX_AGE_SECONDS: '60',
});
assert.notEqual(unsafe.status, 0);
const output = `${unsafe.stdout}\n${unsafe.stderr}`;
assert.match(output, /JWT_SECRET/);
assert.match(output, /CORS_ORIGIN/);
assert.match(output, /PUBLIC_APP_URL/);
assert.match(output, /TRUST_PROXY=true/);
assert.match(output, /UPLOAD_STORAGE_ROOT/);
assert.match(output, /HEALTH_CHECK_TIMEOUT_MS/);
assert.match(output, /HTTP_REQUEST_TIMEOUT_MS/);
assert.match(output, /HTTP_HEADERS_TIMEOUT_MS/);
assert.match(output, /DB_POOL_MAX/);
assert.match(output, /DB_STATEMENT_TIMEOUT_MS/);
assert.match(output, /SLOW_REQUEST_MS/);
assert.match(output, /REQUIRE_BACKGROUND_WORKER/);
assert.match(output, /WORKER_HEARTBEAT_MAX_AGE_SECONDS/);

console.log('Production environment preflight regression test passed.');
