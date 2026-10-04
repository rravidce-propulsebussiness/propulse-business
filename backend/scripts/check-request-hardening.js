const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const server=read('src/server.js');
const api=read('../frontend/src/utils/api.js');
assert(server.includes("const DEFAULT_JSON_BYTES='1mb'"),'Default JSON body limit must remain constrained');
assert(server.includes("const LARGE_JSON_BYTES='9mb'"),'Large proof uploads must use an explicit bounded limit');
assert(server.includes("const largeJsonFor=method=>(req,res,next)=>req.method===method?largeJsonParser(req,res,next):next();"),'Large-body parser must be method-scoped');
for(const [route,method] of [
  ['/api/auth/company-proofs','POST'],
  ['/api/payments/:id/reference','POST'],
  ['/api/wallet/topups','POST'],
  ['/api/investments/admin/transfer-requests/:id/process','POST'],
  ['/api/investments/admin/:id/payout','POST'],
  ['/api/admin/lead-partner-payouts/direct','POST'],
  ['/api/admin/lead-partner-payouts/:payoutId','PATCH'],
  ['/api/admin/homepage-media','POST'],
])assert(server.includes(`app.use('${route}',largeJsonFor('${method}'))`),`Large JSON exception missing for ${method} ${route}`);
for(const broad of ["/api/payments',express.json","/api/wallet',express.json","/api/investments',express.json","/api/lead-partner',express.json"])assert(!server.includes(broad),`Large JSON parser must not cover the whole ${broad.split("'")[0]} route family`);
assert(api.includes('const DEFAULT_REQUEST_TIMEOUT_MS = 20000'),'Frontend API calls must have a default timeout');
assert(api.includes("timeoutError.code = 'REQUEST_TIMEOUT'"),'Timeouts must surface a stable error code');
assert(api.includes("const { timeoutMs, signal: callerSignal, ...fetchOptions } = requestOptions"),'Caller abort signals must remain supported');
console.log('Request timeout and JSON body-limit regression test passed.');
