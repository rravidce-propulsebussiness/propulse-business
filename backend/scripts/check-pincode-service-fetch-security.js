const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/services/pincodeService.js'),
  'utf8'
);

if (!/AbortController\(\)/.test(source) || !/setTimeout\(\(\) => controller\.abort\(\), 8000\)/.test(source)) {
  throw new Error('Pincode service security regression: request timeout is missing');
}
if (!/headers:\s*\{\s*Accept:\s*'application\/json'\s*\}/.test(source)) {
  throw new Error('Pincode service security regression: JSON accept header is missing');
}
if (!/MAX_POSTAL_PINCODE_BYTES\s*=\s*256\s*\*\s*1024/.test(source)) {
  throw new Error('Pincode service security regression: response size limit is missing');
}
if (!/contentLength > MAX_POSTAL_PINCODE_BYTES/.test(source)) {
  throw new Error('Pincode service security regression: Content-Length limit is missing');
}
if (!/readResponseTextLimited\(response, MAX_POSTAL_PINCODE_BYTES\)/.test(source) || !/total > maxBytes/.test(source)) {
  throw new Error('Pincode service security regression: streamed response size limit is missing');
}
if (!/JSON\.parse\(body\)/.test(source)) {
  throw new Error('Pincode service security regression: bounded JSON parsing is missing');
}
if (/response\.json\(\)/.test(source)) {
  throw new Error('Pincode service security regression: unbounded response.json() must not be used');
}

console.log('Pincode service fetch security regression test passed.');
