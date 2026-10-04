const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const server=read('src/server.js');
const env=read('scripts/check-production-env.js');

assert(server.includes("crypto.randomUUID()"),'Requests must receive a cryptographically strong correlation ID');
assert(server.includes("res.setHeader('X-Request-Id',req.requestId)"),'Request ID must be returned to clients for support correlation');
assert(server.includes('server.requestTimeout=httpRequestTimeoutMs'),'HTTP request timeout must be explicit');
assert(server.includes('server.headersTimeout=httpHeadersTimeoutMs'),'HTTP headers timeout must be explicit');
assert(server.includes('server.keepAliveTimeout=httpKeepAliveTimeoutMs'),'HTTP keep-alive timeout must be explicit');
assert(server.includes('server.maxRequestsPerSocket=httpMaxRequestsPerSocket'),'Sockets must have a bounded request lifetime');
assert(server.includes('server.maxHeadersCount=100'),'Header count must be bounded');
assert(env.includes("HTTP_HEADERS_TIMEOUT_MS must not exceed HTTP_REQUEST_TIMEOUT_MS"),'Production preflight must reject inconsistent HTTP timeout configuration');
console.log('HTTP runtime hardening regression test passed.');
