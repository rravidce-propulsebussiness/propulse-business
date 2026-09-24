const fs=require('fs');
const path=require('path');

const service=fs.readFileSync(path.join(__dirname,'../src/services/contactService.js'),'utf8');
const controller=fs.readFileSync(path.join(__dirname,'../src/controllers/contactController.js'),'utf8');

const required=[
  /new URL\(raw\)/,
  /url\.protocol!=='https:'/,
  /url\.username\|\|url\.password/,
  /MAX_URL_LENGTH=2048/,
  /raw\.startsWith\('\/'\)&&!raw\.startsWith\('\/\/'\)/,
  /INVALID_CONTACT_URL/,
];
for(const pattern of required){
  if(!pattern.test(service)) throw new Error('Contact URL security regression: missing '+pattern);
}
if(!/INVALID_CONTACT_URL.*\?400/.test(controller.replace(/\s+/g,''))){
  throw new Error('Contact URL security regression: controller must return HTTP 400');
}
if(/href=\{s\.url\}/.test(service)){
  // This is intentionally not a frontend check; service validation is the trust boundary.
}
console.log('Contact destination URL security checks passed.');
