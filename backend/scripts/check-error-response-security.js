const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { sendError } = require('../src/utils/errorResponse');

const root = path.resolve(__dirname, '..');
const files = [
  'src/controllers/leadPartnerController.js',
  'src/controllers/investmentController.js',
  'src/controllers/investmentCycleController.js',
  'src/controllers/paymentController.js',
  'src/controllers/walletController.js',
];

const rawInternalErrorPatterns = [
  /status\(500\)\.json\(\{\s*error:\s*(?:e|error)\.message/,
  /status\([^)]*500[^)]*\)\.json\(\{\s*error:\s*(?:e|error)\.message/,
];

for (const relative of files) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of rawInternalErrorPatterns) {
    if (pattern.test(source)) {
      throw new Error(`Unsafe raw internal error response in ${relative}: ${pattern}`);
    }
  }
  if (!source.includes("require('../utils/errorResponse')")) {
    throw new Error(`Missing safe error response helper import in ${relative}`);
  }
}

function respond(status, error, code) {
  const response = { status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  sendError(response, status, error, 'Request failed', { code });
  return response;
}

assert.deepEqual(respond(500, new Error('connection string leaked'), 'DB_FAILED').body,
  { error: 'Request failed' });
assert.deepEqual(respond(400, new Error('constraint "secret"'), '23514').body,
  { error: 'Request failed' });
assert.deepEqual(respond(400, new Error('internal exception')).body,
  { error: 'Request failed' });
assert.deepEqual(respond(409, new Error('Already reviewed'), 'ALREADY_REVIEWED').body,
  { error: 'Already reviewed', code: 'ALREADY_REVIEWED' });
assert.equal(respond(200, new Error('internal exception'), 'DB_FAILED').statusCode, 500);

console.log('Error response security regression test passed.');
