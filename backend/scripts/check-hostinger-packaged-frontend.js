const fs=require('fs');
const path=require('path');
const server=fs.readFileSync(path.join(__dirname,'../src/server.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(__dirname,'../package.json'),'utf8'));
const builder=fs.readFileSync(path.join(__dirname,'build-hostinger-frontend.js'),'utf8');
function assert(v,m){if(!v){console.error('FAIL: '+m);process.exitCode=1}else console.log('PASS: '+m)}
assert(pkg.scripts.postinstall==='node scripts/build-hostinger-frontend.js','postinstall uses Hostinger frontend packager');
assert(builder.includes("fs.cpSync(frontendDist,publicDir"),'frontend dist is copied inside backend/public');
assert(server.includes("packagedFrontendPath=path.resolve(__dirname,'../public')"),'server prefers packaged frontend');
assert(server.includes("workspaceFrontendPath=path.resolve(__dirname,'../../frontend/dist')"),'server retains local workspace fallback');
if(process.exitCode)process.exit(process.exitCode);
console.log('Hostinger packaged-frontend regression passed.');
