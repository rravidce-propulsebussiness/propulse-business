const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../src/services/pincodeDetectionService.js'),'utf8');

if(!/AbortController\(\)/.test(source)||!/setTimeout\(\(\) => controller\.abort\(\), 10000\)/.test(source)) throw new Error('India Post security regression: request timeout is missing');
if(!/Accept:\s*\'application\/json\'/.test(source)) throw new Error('India Post security regression: JSON accept header is missing');
if(!/MAX_INDIA_POST_BYTES\s*=\s*256\s*\*\s*1024/.test(source)) throw new Error('India Post security regression: response size limit is missing');
if(!/contentLength > MAX_INDIA_POST_BYTES/.test(source)) throw new Error('India Post security regression: Content-Length limit is missing');
if(!/readResponseTextLimited\(response, MAX_INDIA_POST_BYTES\)/.test(source)||!/total > maxBytes/.test(source)) throw new Error('India Post security regression: streamed response size limit is missing');
if(!/JSON\.parse\(body\)/.test(source)) throw new Error('India Post security regression: bounded JSON parsing is missing');
if(/response\.json\(\)/.test(source)) throw new Error('India Post security regression: unbounded response.json() must not be used');
console.log('India Post fetch security regression test passed.');
