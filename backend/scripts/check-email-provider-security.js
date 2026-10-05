const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../src/services/emailService.js'),'utf8');

if(/response\.text\(\).*details|details\.slice\(0,\s*300\)|response\.text\(\)\.catch\(\(\)\s*=>\s*''\).*details/i.test(source)){
  throw new Error('Email provider security regression: provider response body must not be included in errors');
}
if(!/Email provider rejected the \$\{context\} email \(HTTP \$\{response\.status\}\)/.test(source)){
  throw new Error('Email provider security regression: generic provider error missing');
}
if(!/EMAIL_PROVIDER_REJECTED/.test(source)||!/EMAIL_PROVIDER_TIMEOUT/.test(source)){
  throw new Error('Email provider security regression: stable internal provider error codes are required');
}
if(/throw new Error\([^)]*body/i.test(source)){
  throw new Error('Email provider security regression: provider response body must not be thrown or logged');
}
if(!source.includes('readResponseTextLimited(response,64*1024)')&&!source.includes('readResponseTextLimited(response, 64 * 1024)')){
  throw new Error('Email provider security regression: provider response should be bounded before throwing');
}
console.log('Email provider error security regression test passed.');
