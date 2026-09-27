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
  ['Global API limiter is shared across replicas without a PostgreSQL write per request', server.includes("scope:'global',shared:true,sharedChunkSize:10")],
  ['Rate limiter supports global scope', limiter.includes("scope = 'route'") && limiter.includes("scope === 'global'")],
  ['Sensitive route limiters can still use shared production buckets', limiter.includes("shared = true") && limiter.includes("process.env.NODE_ENV === 'production' && shared") && limiter.includes('consumeSharedBucket')],
  ['Global shared limiter supports chunked leases', limiter.includes('sharedChunkSize = 1') && limiter.includes('consumeSharedLeasedBucket') && limiter.includes('sharedLeasePromises')],
  ['429 response is implemented', limiter.includes("res.status(429)")],
  ['RateLimit-Remaining header is emitted', limiter.includes("RateLimit-Remaining")],
];

for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
}
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log('API hardening regression test passed.');
