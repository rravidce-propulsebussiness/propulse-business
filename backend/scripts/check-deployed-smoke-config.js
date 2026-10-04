const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.join(__dirname, 'check-deployed-smoke.js');
const result = spawnSync(process.execPath, [script], {
  encoding: 'utf8',
  env: {
    ...process.env,
    DEPLOY_BASE_URL: 'https://staging.yourdomain.com',
    DEPLOY_APP_ORIGIN: 'https://staging.yourdomain.com',
  },
});

assert.notEqual(result.status, 0, 'Placeholder deployment URLs must be rejected');
const output = String(result.stdout || '') + '\n' + String(result.stderr || '');
assert.match(output, /placeholder/i, 'Placeholder rejection should explain what to replace');
assert.doesNotMatch(output, /ECONNRESET|ENOTFOUND|fetch failed/i, 'Placeholder rejection must happen before network access');

console.log('Deployed smoke configuration regression test passed.');
