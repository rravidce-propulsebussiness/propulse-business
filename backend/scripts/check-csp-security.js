const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendIndex = fs.readFileSync(path.join(root, '..', 'frontend', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'src', 'server.js'), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

const frontendMatch = frontendIndex.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
assert(frontendMatch, 'Frontend CSP meta tag exists');

if (frontendMatch) {
  const csp = frontendMatch[1];
  assert(csp.includes("default-src 'self'"), 'Frontend CSP has self default');
  assert(csp.includes("script-src 'self' https://accounts.google.com/gsi/client"), 'Frontend CSP allows Google GIS script only');
  assert(csp.includes("frame-src https://accounts.google.com/gsi/"), 'Frontend CSP allows Google GIS iframe');
  assert(csp.includes("connect-src 'self' https://accounts.google.com/gsi/"), 'Frontend CSP allows same-origin and Google GIS connections');
  assert(csp.includes("object-src 'none'"), 'Frontend CSP disables plugin/object content');
  assert(csp.includes("base-uri 'self'"), 'Frontend CSP restricts base URI');
  assert(!csp.includes("'unsafe-eval'"), 'Frontend CSP does not allow unsafe eval');
}

assert(server.includes('Content-Security-Policy'), 'Backend sends a Content-Security-Policy header');
assert(server.includes("default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'"), 'Backend API CSP is restrictive');
assert(server.includes("X-Frame-Options','DENY"), 'Backend denies framing with X-Frame-Options');

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('CSP security regression test passed.');
