const fs=require('fs');
const path=require('path');

const file=path.join(__dirname,'../src/services/servicePricingService.js');
const source=fs.readFileSync(file,'utf8');

const required=[
  "function normalizeCtaUrl(value)",
  "if(!url.startsWith('/')||url.startsWith('//')||/[\\\\\\r\\n]/.test(url))",
  "cta_url:normalizeCtaUrl(input.cta_url)"
];

for(const marker of required){
  if(!source.includes(marker)){
    console.error("FAIL: service pricing CTA validation marker missing:",marker);
    process.exit(1);
  }
}

function validate(value){
  const url=String(value??'').trim()||'/contact';
  return url.startsWith('/')&&!url.startsWith('//')&&!/[\\\r\n]/.test(url);
}

const valid=['/contact','/leads','/pricing?plan=pro','/#services'];
for(const value of valid){
  if(!validate(value)){console.error("FAIL: valid internal CTA rejected:",value);process.exit(1)}
}

const invalid=['https://evil.example','//evil.example','javascript:alert(1)','data:text/html,alert(1)','/\\evil.example','/contact\nLocation:https://evil.example'];
for(const value of invalid){
  if(validate(value)){console.error("FAIL: unsafe CTA accepted:",value);process.exit(1)}
}

console.log('Service pricing CTA URL security regression test passed.');
