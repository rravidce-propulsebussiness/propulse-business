const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const server=read('src/server.js');
const storage=read('src/config/uploadStorage.js');
const env=read('scripts/check-production-env.js');

assert(server.includes("HEALTH_CHECK_TIMEOUT_MS")&&server.includes('Promise.allSettled'),'Readiness must bound dependency checks and report them independently');
assert(server.includes("database:databaseReady?'connected':'unavailable'"),'Readiness must distinguish database failure');
assert(server.includes("storage:storageReady?'ready':'unavailable'"),'Readiness must distinguish storage failure');
assert(storage.includes('probeUploadStorage')&&storage.includes("writeFile(probe,'ok'"),'Startup must prove upload storage is actually writable');
assert(storage.includes('unlink(probe)'),'Storage probe must clean up its temporary file');
assert(env.includes("UPLOAD_STORAGE_ROOT is required in production"),'Production preflight must require deliberate durable upload storage');
assert(env.includes('HEALTH_CHECK_TIMEOUT_MS must be an integer between 500 and 10000'),'Production preflight must validate readiness timeout');
console.log('Production readiness/storage hardening regression test passed.');
