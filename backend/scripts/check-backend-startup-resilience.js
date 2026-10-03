const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');

const listenIndex = server.indexOf("server=app.listen(PORT,'0.0.0.0'");
const dependencyInitIndex = server.indexOf('void initializeDependencies();');
assert.ok(listenIndex >= 0, 'Backend must bind the HTTP listener');
assert.ok(dependencyInitIndex > listenIndex, 'HTTP listener must bind before dependency initialization starts');

assert.match(server, /if\(startupReady\)return next\(\)/, 'API gate must allow traffic only after startup dependencies are ready');
assert.match(server, /code:'BACKEND_NOT_READY'/, 'Dependency outages must return a structured 503 instead of dropping the process');
assert.match(server, /setTimeout\(\(\)=>\{startupTimer=null;void initializeDependencies\(\);\},startupRetryMs\)/, 'Dependency initialization must retry');
assert.match(server, /app\.get\('\/health\/live'/, 'Liveness endpoint must remain available while dependencies recover');
assert.match(server, /status:'starting'/, 'Readiness endpoint must expose initializing state');

console.log('Backend startup resilience checks passed.');
