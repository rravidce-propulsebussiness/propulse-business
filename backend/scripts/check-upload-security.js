const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validateDataUrlSignature } = require('../src/utils/fileValidation');

const homepage = fs.readFileSync(path.join(__dirname, '../src/services/homepageMediaService.js'), 'utf8');
const pricing = fs.readFileSync(path.join(__dirname, '../src/services/servicePricingService.js'), 'utf8');

const png = Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
const jpeg = Buffer.from([255,216,255,224]).toString('base64');
const webp = Buffer.from('RIFF' + '1234' + 'WEBP', 'ascii').toString('base64');
const fakePng = Buffer.from('%PDF-1.7', 'ascii').toString('base64');

assert.strictEqual(validateDataUrlSignature(`data:image/png;base64,${png}`, ['image/png']), true);
assert.strictEqual(validateDataUrlSignature(`data:image/jpeg;base64,${jpeg}`, ['image/jpeg']), true);
assert.strictEqual(validateDataUrlSignature(`data:image/webp;base64,${webp}`, ['image/webp']), true);
assert.strictEqual(validateDataUrlSignature(`data:image/png;base64,${fakePng}`, ['image/png']), false);

for (const [label, source] of [['homepage', homepage], ['service pricing', pricing]]) {
  assert(source.includes('validateDataUrlSignature'), `${label}: signature validator is not imported`);
  assert(source.includes("validateDataUrlSignature(value,['image/jpeg','image/png','image/webp'])"), `${label}: signature validation is not enforced`);
  assert(source.includes("crypto.randomBytes(12).toString('hex')"), `${label}: upload filename is not generated with cryptographic randomness`);
}

console.log('Image upload signature security checks passed.');
