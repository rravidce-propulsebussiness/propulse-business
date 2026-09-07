const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const originalLoad = Module._load;
const queries = [];
let nextCount = 1;

Module._load = function(request, parent, isMain) {
  if (request === '../config/database' && parent?.filename?.endsWith(`${path.sep}rateLimitMiddleware.js`)) {
    return {
      query: async (text, params) => {
        queries.push({ text, params });
        return { rows: [{ request_count: nextCount++, retry_after: 60 }] };
      },
    };
  }
  return originalLoad.apply(this, arguments);
};

(async () => {
  try {
    process.env.NODE_ENV = 'production';
    const rateLimit = require('../src/middleware/rateLimitMiddleware');
    const middleware = rateLimit({ windowMs: 60_000, max: 2 });
    const req = { ip: '127.0.0.1', baseUrl: '/api/payments', path: '/membership', route: { path: '/membership' } };
    const headers = {};
    const responses = [];
    const makeRes = () => ({
      setHeader: (name, value) => { headers[name] = value; },
      status: (code) => ({ json: (body) => responses.push({ code, body }) }),
    });

    let nextCalls = 0;
    await middleware(req, makeRes(), () => { nextCalls += 1; });
    await middleware(req, makeRes(), () => { nextCalls += 1; });
    await middleware(req, makeRes(), () => { nextCalls += 1; });

    assert.equal(queries.length, 3, 'production limiter must use the shared database bucket');
    assert.equal(nextCalls, 2, 'requests above the configured limit must be rejected');
    assert.equal(responses[0].code, 429);
    assert.equal(headers['RateLimit-Limit'], '2');
    assert.equal(headers['RateLimit-Remaining'], '0');
    assert.match(queries[0].text, /INSERT INTO rate_limit_buckets/);
    assert.match(queries[0].text, /ON CONFLICT \(bucket_key\) DO UPDATE/);

    console.log('Shared rate-limit bucket regression test passed.');
  } finally {
    Module._load = originalLoad;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
