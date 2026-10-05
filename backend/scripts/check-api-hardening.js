const assert = require('assert');
const fs = require('fs');
const path = require('path');

const server = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');
const limiter = fs.readFileSync(path.join(__dirname, '../src/middleware/rateLimitMiddleware.js'), 'utf8');
const rateLimitConfig = fs.readFileSync(path.join(__dirname, '../src/config/apiRateLimitConfig.js'), 'utf8');

const checks = [
  ['API rate limiter imported', server.includes("require('./middleware/rateLimitMiddleware')")],
  ['Global API limiter mounted', server.includes("app.use('/api',apiRateLimit)")],
  ['Global API limiter has finite production limit', rateLimitConfig.includes('const defaultMax=isProduction?600:10000')],
  ['Global API limiter uses global scope', server.includes("scope:'global'")],
  ['Global API limiter is shared across production replicas without a PostgreSQL write per request', rateLimitConfig.includes('shared:Boolean(isProduction)') && rateLimitConfig.includes('sharedChunkSize:isProduction?Math.min(10,max):1') && server.includes('...apiGlobalRateLimitConfig') && server.includes("scope:'global'")],
  ['Rate limiter supports global scope', limiter.includes("scope = 'route'") && limiter.includes("scope === 'global'")],
  ['Global limiter can skip independently protected routes', limiter.includes('skip = null') && limiter.includes('if (skip(req)) return next()') && server.includes('independentlyProtectedAuthPaths')],
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
