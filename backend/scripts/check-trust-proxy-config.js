const assert = require('assert');
const { parseTrustProxySetting } = require('../src/config/trustProxy');

assert.strictEqual(parseTrustProxySetting(undefined), false);
assert.strictEqual(parseTrustProxySetting(''), false);
assert.strictEqual(parseTrustProxySetting('false'), false);
assert.strictEqual(parseTrustProxySetting('FALSE'), false);
assert.strictEqual(parseTrustProxySetting('0'), false);
assert.strictEqual(parseTrustProxySetting('off'), false);
assert.strictEqual(parseTrustProxySetting('true'), true);
assert.strictEqual(parseTrustProxySetting('1'), true);
assert.strictEqual(parseTrustProxySetting('yes'), true);
assert.strictEqual(parseTrustProxySetting('2'), 2);
assert.strictEqual(parseTrustProxySetting('loopback'), 'loopback');
assert.strictEqual(parseTrustProxySetting('127.0.0.1'), '127.0.0.1');

console.log('TRUST_PROXY parsing checks passed.');
