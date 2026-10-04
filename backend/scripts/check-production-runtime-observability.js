const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const server=read('src/server.js');
const env=read('scripts/check-production-env.js');

assert(server.includes('const slowRequestMs='),'Server must expose a bounded slow-request threshold');
assert(server.includes("if(!isProduction)return next()"),'Slow-request logging must stay production-only');
assert(server.includes("res.once('finish'"),'Request timing must complete after the response finishes');
assert(server.includes('req.method} ${req.path} -> ${res.statusCode}'),'Slow/error log must omit query strings and include method/path/status');
assert(env.includes("boundedInteger('DB_POOL_MAX',5,2,10)"),'Production preflight must validate DB pool size');
assert(env.includes("boundedInteger('DB_CONNECTION_TIMEOUT_MS',10000,1000,60000)"),'Production preflight must validate DB connection timeout');
assert(env.includes('DB_STATEMENT_TIMEOUT_MS must not exceed HTTP_REQUEST_TIMEOUT_MS'),'Database work must not outlive the HTTP request timeout');
assert(env.includes("boundedInteger('SLOW_REQUEST_MS',2000,250,60000)"),'Slow request threshold must be bounded');
console.log('Production database/runtime observability regression test passed.');
