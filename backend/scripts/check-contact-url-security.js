const contactService=require('../src/services/contactService');
const fs=require('fs');
const path=require('path');

const serviceSource=fs.readFileSync(path.join(__dirname,'../src/services/contactService.js'),'utf8');
const controllerSource=fs.readFileSync(path.join(__dirname,'../src/controllers/contactController.js'),'utf8');

if(!/new URL\(raw\)/.test(serviceSource)) throw new Error('Contact URL security regression: URL parser missing');
if(!/url\.protocol!=='https:'/.test(serviceSource)) throw new Error('Contact URL security regression: HTTPS-only check missing');
if(!/url\.username\|\|url\.password/.test(serviceSource)) throw new Error('Contact URL security regression: credential-bearing URL rejection missing');
if(!/MAX_URL_LENGTH=2048/.test(serviceSource)) throw new Error('Contact URL security regression: URL length limit missing');
if(!/raw\.startsWith\('\/'\)&&!raw\.startsWith\('\/\/'\)/.test(serviceSource)) throw new Error('Contact URL security regression: internal-path validation missing');
if(!/INVALID_CONTACT_URL/.test(serviceSource)) throw new Error('Contact URL security regression: invalid URL error missing');
if(!/INVALID_CONTACT_URL.*\?400/.test(controllerSource.replace(/\s+/g,''))) throw new Error('Contact URL security regression: controller must return HTTP 400');

function assertThrows(label,fn){
  try{fn(); throw new Error(label+' was accepted');}
  catch(error){
    if(error.message===label+' was accepted') throw error;
    if(error.code!=='INVALID_CONTACT_URL') throw new Error(label+' rejected with unexpected error: '+error.message);
  }
}
function assertEquals(label,actual,expected){
  if(actual!==expected) throw new Error(label+' expected '+JSON.stringify(expected)+' but got '+JSON.stringify(actual));
}

assertEquals('internal website path',contactService.normalize({website_url:'/contact'}).website_url,'/contact');
assertEquals('HTTPS website URL',contactService.normalize({website_url:'https://example.com/path'}).website_url,'https://example.com/path');
assertEquals('HTTPS maps URL',contactService.normalize({maps_url:'https://maps.google.com/?q=Hyderabad'}).maps_url,'https://maps.google.com/?q=Hyderabad');

for(const [label,value] of [
  ['protocol-relative URL','//evil.example'],
  ['javascript URL','javascript:alert(1)'],
  ['data URL','data:text/html,<script>alert(1)</script>'],
  ['plain HTTP URL','http://example.com'],
  ['credential-bearing HTTPS URL','https://user:pass@example.com'],
  ['newline URL','https://example.com/ok\n/evil'],
  ['backslash protocol-relative URL','/\\evil.example'],
  ['oversized URL','https://example.com/'+('a'.repeat(2048))]
]){
  assertThrows(label,()=>contactService.normalize({website_url:value}));
}

assertThrows('invalid maps URL',()=>contactService.normalize({maps_url:'javascript:alert(1)'}));
assertThrows('invalid social URL',()=>contactService.normalize({social_handles:[{platform:'Instagram',url:'http://evil.example'}]}));

console.log('Contact destination URL security regression test passed.');
