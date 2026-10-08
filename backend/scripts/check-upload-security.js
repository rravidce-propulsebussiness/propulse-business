const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validateDataUrlSignature } = require('../src/utils/fileValidation');

const homepage = fs.readFileSync(path.join(__dirname, '../src/services/homepageMediaService.js'), 'utf8');
const wallet = fs.readFileSync(path.join(__dirname, '../src/services/walletService.js'), 'utf8');
const paymentProof = fs.readFileSync(path.join(__dirname, '../src/utils/paymentProofValidation.js'), 'utf8');
const authRoutes = fs.readFileSync(path.join(__dirname, '../src/routes/authRoutes.js'), 'utf8');
const authService = fs.readFileSync(path.join(__dirname, '../src/services/authService.js'), 'utf8');

const png = Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
const jpeg = Buffer.from([255,216,255,224]).toString('base64');
const webp = Buffer.from('RIFF' + '1234' + 'WEBP', 'ascii').toString('base64');
const fakePng = Buffer.from('%PDF-1.7', 'ascii').toString('base64');

assert.strictEqual(validateDataUrlSignature(`data:image/png;base64,${png}`, ['image/png']), true);
assert.strictEqual(validateDataUrlSignature(`data:image/jpeg;base64,${jpeg}`, ['image/jpeg']), true);
assert.strictEqual(validateDataUrlSignature(`data:image/webp;base64,${webp}`, ['image/webp']), true);
assert.strictEqual(validateDataUrlSignature(`data:image/png;base64,${fakePng}`, ['image/png']), false);

assert(homepage.includes('validateDataUrlSignature'), 'homepage: signature validator is not imported');
assert(homepage.includes("validateDataUrlSignature(value,['image/jpeg','image/png','image/webp'])"), 'homepage: signature validation is not enforced');
assert(homepage.includes("crypto.randomBytes(12).toString('hex')"), 'homepage: upload filename is not generated with cryptographic randomness');

assert(wallet.includes('assertTopupProof(proofUrl)')&&wallet.includes("require('../utils/paymentProofValidation')"),
  'wallet proof: shared upload validator must be enforced before storage');
assert(paymentProof.includes('validateDataUrlSignature(source,ALLOWED_PROOF_MIMES)'),
  'wallet proof: shared validator must check file magic bytes');
assert(paymentProof.includes("['image/png','image/jpeg','image/webp','application/pdf']"),
  'wallet proof: shared validator must enforce approved proof types');
assert(paymentProof.includes('MAX_PROOF_BYTES=5*1024*1024')&&wallet.includes('MAX_TOPUP_PROOF_BYTES'),
  'wallet proof: 5 MB size limit must be enforced');

assert(authRoutes.includes("const companyProofUploadLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });"), 'company proof upload rate limit is not configured');
assert(authRoutes.includes("router.post('/company-proofs', requireAuth, companyProofUploadLimit, authController.uploadCompanyProofs);"), 'company proof upload route is missing its dedicated rate limit');
assert(authService.includes('MAX_PASSWORD_CHARS = 64') && authService.includes('MAX_BCRYPT_BYTES = 72'), 'signup/reset password must enforce bcrypt-safe upper bounds');
console.log('Image upload and authentication boundary security checks passed.');
