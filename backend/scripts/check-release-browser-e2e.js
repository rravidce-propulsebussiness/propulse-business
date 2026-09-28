const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const seed=read('scripts/seed-release-e2e.js');
const workflow=read('../.github/workflows/ci.yml');
const config=read('../frontend/e2e/playwright.config.mjs');
const spec=read('../frontend/e2e/release-smoke.spec.mjs');

assert(seed.includes("E2E_SEED=true is required"),'E2E seed must require an explicit opt-in');
assert(seed.includes("Refusing to seed E2E accounts in production"),'E2E seed must refuse production');
assert(seed.includes("reference_type='e2e_seed'"),'Business E2E wallet balance must have a matching ledger entry');
assert(workflow.includes('Release browser E2E'),'CI must run the browser release gate');
assert(workflow.includes('@playwright/test@1.55.0'),'Playwright CI dependency must be pinned');
assert(workflow.includes('npm run db:bootstrap')&&workflow.includes('seed-release-e2e.js'),'E2E must use a disposable bootstrapped PostgreSQL database');
assert(workflow.includes('npm run worker'),'E2E must verify the dedicated background worker alongside the web process');
assert(config.includes("workers:1")&&config.includes("retries:1"),'Release E2E must stay deterministic and bounded');
assert(spec.includes("fetch('/api/admin/system-health'")&&spec.includes('expect(status).toBe(403)'),'Business role must be denied Admin APIs');
assert(spec.includes("fetch('/api/admin/financial-integrity'")&&spec.includes('expect(status).toBe(403)'),'Lead Partner role must be denied Admin financial APIs');
assert(spec.includes('page.reload()'),'E2E must verify HttpOnly cookie session survival across reload');
console.log('Release browser E2E regression test passed.');
