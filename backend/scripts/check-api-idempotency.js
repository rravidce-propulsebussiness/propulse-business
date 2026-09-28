const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const migration=read('src/database/migrations/20260928_api_idempotency_keys.sql');
const middleware=read('src/middleware/idempotencyMiddleware.js');
const paymentRoutes=read('src/routes/paymentRoutes.js');
const walletRoutes=read('src/routes/walletRoutes.js');
const leadRoutes=read('src/routes/leadRoutes.js');
const api=read('../frontend/src/utils/api.js');
const wallet=read('../frontend/src/pages/Wallet.jsx');
const membership=read('../frontend/src/pages/Membership.jsx');
const leadsApi=read('../frontend/src/api/leads.js');
const e2e=read('../frontend/e2e/release-smoke.spec.mjs');

assert(migration.includes('CREATE TABLE IF NOT EXISTS api_idempotency_keys'),'Idempotency ledger migration is missing');
assert(migration.includes('CONSTRAINT uq_api_idempotency_key UNIQUE(user_id,scope,idempotency_key)'),'Idempotency key uniqueness must be per user and scope');
assert(migration.includes('idx_api_idempotency_keys_expires'),'Idempotency expiry index is missing');
assert(middleware.includes("IDEMPOTENCY_KEY_REQUIRED"),'Protected money mutations must require an Idempotency-Key');
assert(middleware.includes("IDEMPOTENCY_KEY_REUSED"),'Reusing a key with a different payload must be rejected');
assert(middleware.includes("IDEMPOTENCY_IN_PROGRESS"),'Concurrent duplicate requests must be rejected while the first is processing');
assert(middleware.includes("Idempotency-Replayed"),'Completed requests must advertise replay responses');
assert(middleware.includes("SET status='completed'")&&middleware.includes('response_body=$3::jsonb'),'Successful responses must be persisted before replay');
assert(paymentRoutes.includes("idempotency('membership.checkout')"),'Membership checkout must require idempotency');
assert(walletRoutes.includes("idempotency('wallet.topup')"),'Wallet top-ups must require idempotency');
assert(leadRoutes.includes("idempotency('lead.purchase')"),'Lead purchases must require idempotency');
assert(api.includes('pendingIdempotencyKeys')&&api.includes("headers['Idempotency-Key'] = key"),'Frontend API helper must reuse an action idempotency key across retries');
assert(wallet.includes('idempotency:true'),'Wallet top-up UI must opt into idempotency');
assert(membership.includes('idempotency: true'),'Membership checkout UI must opt into idempotency');
assert(leadsApi.includes('idempotency: true'),'Lead purchase API must opt into idempotency');
assert(e2e.includes('replayedPurchase')&&e2e.includes('replayedTopup'),'Release E2E must verify replayed financial requests');
assert(e2e.includes('idempotencyKey:purchaseKey')&&e2e.includes('idempotencyKey:topupKey'),'Release E2E must reuse the same key for retry simulation');

console.log('API idempotency regression test passed.');
