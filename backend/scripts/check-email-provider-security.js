const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../src/services/emailService.js'),'utf8');

if(/response\.text\(\).*details|details\.slice\(0,\s*300\)|response\.text\(\)\.catch\(\(\)\s*=>\s*''\).*details/i.test(source)){
  throw new Error('Email provider security regression: provider response body must not be included in errors');
}
if(!/Email provider rejected the reset email \(HTTP \$\{response\.status\}\)/.test(source)){
  throw new Error('Email provider security regression: generic provider error missing');
}
if(!/response\.text\(\)\.catch/.test(source)){
  throw new Error('Email provider security regression: provider response should be consumed before throwing');
}
console.log('Email provider error security regression test passed.');
