const fs = require('fs');
const path = require('path');

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

const helper = fs.readFileSync(path.join(root, 'src/utils/errorResponse.js'), 'utf8');
if (!helper.includes('isServerError') || !helper.includes('error?.message')) {
  throw new Error('Safe error response helper does not distinguish server errors from client errors.');
}

console.log('Error response security regression test passed.');
