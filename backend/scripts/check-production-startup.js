const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
require('dotenv').config({ quiet: true });

async function main() {
  if (!/^(propulse_verify_|ci_|investment_ci)/.test(process.env.DB_NAME || '')) throw new Error('Use a disposable test database.');
  const port = 18000 + Math.floor(Math.random() * 10000);
  const child = spawn(process.execPath, ['src/server.js'], {
    windowsHide: true,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port), TRUST_PROXY: 'false',
      CORS_ORIGIN: 'https://example.test', PUBLIC_APP_URL: 'https://example.test', JWT_SECRET: randomBytes(48).toString('hex') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const exited = new Promise(resolve => child.on('exit', resolve));
  try {
    const base = `http://127.0.0.1:${port}`;
    let healthy = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
      try {
        const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { healthy = true; break; }
      } catch { /* Wait for migrations and listener. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert(healthy, `Server did not start: ${output}`);
    const health = await fetch(`${base}/health`);
    assert.equal((await health.json()).database, 'connected');
    assert(health.headers.get('strict-transport-security'));
    assert.equal(health.headers.get('x-powered-by'), null);
    const invalid = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    });
    assert.equal(invalid.status, 400);
    const forbidden = await fetch(`${base}/api/investments`, { headers: { origin: 'https://untrusted.test' } });
    assert.equal(forbidden.status, 403);
    const anonymous = await fetch(`${base}/api/investments`);
    assert.equal(anonymous.status, 401);
    assert(anonymous.headers.has('ratelimit-remaining'), 'Production shared rate limiter must execute');
    const csrf = await fetch(`${base}/api/payments/1/reference`, {
      method: 'POST', headers: { cookie: 'propulse_auth=invalid', 'content-type': 'application/json' }, body: '{}',
    });
    assert.equal(csrf.status, 403);
    console.log('Production startup, database health, headers, JSON errors, CORS, CSRF and shared rate limiter passed.');
  } finally {
    child.kill();
    await exited;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
