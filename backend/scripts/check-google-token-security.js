const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../src/services/authService.js'),'utf8');
const controller=fs.readFileSync(path.join(__dirname,'../src/controllers/authController.js'),'utf8');

if(!/AbortController\(\)/.test(source)||!/setTimeout\(\(\) => controller\.abort\(\), 10000\)/.test(source)) throw new Error('Google token security regression: verification timeout is missing');
if(!/Accept:\s*'application\/json'/.test(source)) throw new Error('Google token security regression: JSON accept header is missing');
if(!/contentLength > 64 \* 1024/.test(source)||!/Buffer\.byteLength\(body, 'utf8'\) > 64 \* 1024/.test(source)) throw new Error('Google token security regression: response size limit is missing');
if(!/GOOGLE_TOKEN_TIMEOUT/.test(controller)||!/GOOGLE_TOKEN_VERIFICATION_FAILED/.test(controller)) throw new Error('Google token security regression: availability errors are not handled');
console.log('Google token verification security regression test passed.');
