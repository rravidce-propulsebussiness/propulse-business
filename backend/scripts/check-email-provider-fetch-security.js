const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../src/services/emailService.js'),'utf8');

if(!/AbortController\(\)/.test(source)||!/setTimeout\(\(\) => controller\.abort\(\), 10000\)/.test(source)) throw new Error('Email provider security regression: request timeout is missing');
if(!/signal:\s*controller\.signal/.test(source)) throw new Error('Email provider security regression: fetch abort signal is missing');
if(!/Accept:\s*'application\/json'/.test(source)) throw new Error('Email provider security regression: JSON accept header is missing');
if(!/contentLength > 64 \* 1024/.test(source)) throw new Error('Email provider security regression: provider response size limit is missing');
if(!/readResponseTextLimited\(response, 64 \* 1024\)/.test(source)||!/total > maxBytes/.test(source)) throw new Error('Email provider security regression: streamed response size limit is missing');
if(!/Email provider request timed out/.test(source)) throw new Error('Email provider security regression: timeout error is missing');
if(!/Email provider rejected the reset email \(HTTP \$\{response\.status\}\)/.test(source)) throw new Error('Email provider security regression: generic provider error missing');
if(/details\.slice|response\.text\(\).*details/i.test(source)) throw new Error('Email provider security regression: provider response details must not leak');
console.log('Email provider fetch security regression test passed.');
