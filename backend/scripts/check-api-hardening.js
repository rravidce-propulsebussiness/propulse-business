const assert = require('assert');
const fs = require('fs');
const path = require('path');

const server = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');
const limiter = fs.readFileSync(path.join(__dirname, '../src/middleware/rateLimitMiddleware.js'), 'utf8');

const checks = [
  ['API rate limiter imported', server.includes("require('./middleware/rateLimitMiddleware')")],
  ['Global API limiter mounted', server.includes("app.use('/api',apiRateLimit)")],
  ['Global API limiter has finite limit', server.includes("max:600")],
  ['Global API limiter uses global scope', server.includes("scope:'global'")],
  ['Rate limiter supports global scope', limiter.includes("scope = 'route'") && limiter.includes("scope === 'global'")],
  ['Production uses shared bucket', limiter.includes("process.env.NODE_ENV === 'production'") && limiter.includes('consumeSharedBucket')],
  ['429 response is implemented', limiter.includes("res.status(429)")],
  ['RateLimit-Remaining header is emitted', limiter.includes("RateLimit-Remaining")],
];

for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
}
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log('API hardening regression test passed.');
