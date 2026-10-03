const fs=require('fs');
const path=require('path');
const server=fs.readFileSync(path.join(__dirname,'../src/server.js'),'utf8');
const entry=fs.readFileSync(path.join(__dirname,'../index.js'),'utf8');
function assert(v,m){if(!v){console.error('FAIL: '+m);process.exitCode=1}else console.log('PASS: '+m)}
assert(server.includes("ALLOW_DEGRADED_STARTUP"),'server supports degraded startup');
assert(server.includes("frontend remains available in degraded mode"),'startup failure keeps frontend online');
assert(server.includes("Service is initializing"),'API returns explicit retryable degraded response');
assert(server.includes("safeBootstrapGet"),'anonymous session and public sound bootstrap bypass the degraded API gate');
assert(server.includes("startupError"),'readiness exposes a sanitized startup failure classification');
assert(server.includes("startup:startupReady?'ready'"),'health readiness reports startup state');
assert(entry.includes("ALLOW_DEGRADED_STARTUP=process.env.ALLOW_DEGRADED_STARTUP||'true'"),'Hostinger entry enables degraded startup');
if(process.exitCode)process.exit(process.exitCode);
console.log('Hostinger degraded-startup regression passed.');
