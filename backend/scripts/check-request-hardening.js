const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const server=read('src/server.js');
const api=read('../frontend/src/utils/api.js');
assert(server.includes("const DEFAULT_JSON_BYTES='1mb'"),'Default JSON body limit must remain constrained');
assert(server.includes("const LARGE_JSON_BYTES='9mb'"),'Large proof uploads must use an explicit bounded limit');
for(const prefix of ['/api/auth/company-proofs','/api/payments','/api/wallet','/api/investments','/api/lead-partner'])assert(server.includes(`app.use('${prefix}',express.json({limit:LARGE_JSON_BYTES}))`),`Large JSON exception missing for ${prefix}`);
assert(api.includes('const DEFAULT_REQUEST_TIMEOUT_MS = 20000'),'Frontend API calls must have a default timeout');
assert(api.includes("timeoutError.code = 'REQUEST_TIMEOUT'"),'Timeouts must surface a stable error code');
assert(api.includes("const { timeoutMs, signal: callerSignal, ...fetchOptions } = requestOptions"),'Caller abort signals must remain supported');
console.log('Request timeout and JSON body-limit regression test passed.');
