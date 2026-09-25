// Run only against a disposable database bootstrapped with db:bootstrap.
const assert = require('node:assert/strict');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');
const drafts = require('../src/services/investmentPaymentDraftService');
const payments = require('../src/services/paymentService');
const controller = require('../src/controllers/paymentController');

async function main() {
  if (!/^(propulse_verify_|ci_|investment_ci)/.test(process.env.DB_NAME || '')) {
    throw new Error('Use a disposable test database (propulse_verify_*, ci_*, or investment_ci).');
  }
  const tag = `flow-${Date.now()}`;
  const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
  const user = async role => (await q(`INSERT INTO users(name,email,password_hash,role)
    VALUES($1,$2,'test',$3) RETURNING *`, [tag, `${tag}-${role}-${Math.random()}@example.test`, role]))[0];
  const admin = await user('admin');
  const standard = await user('business');
  const pro = await user('business');
  const partner = await user('lead_partner');
  const industry = (await q('INSERT INTO industries(name,slug) VALUES($1,$1) RETURNING id', [tag]))[0].id;
  const state = (await q('SELECT id FROM states WHERE is_active=TRUE LIMIT 1'))[0].id;
  const existingPlan = (await q("SELECT id FROM membership_plans WHERE plan_type='pro' AND plan_group='grow' AND is_active=TRUE LIMIT 1"))[0];
  const plan = existingPlan?.id || (await q("INSERT INTO membership_plans(name,price,duration_days,plan_type,plan_group) VALUES($1,100,30,'pro','grow') RETURNING id", [tag]))[0].id;
  await q(`INSERT INTO memberships(user_id,membership_plan_id,starts_at,expires_at)
    VALUES($1,$2,CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '30 days')`, [pro.id, plan]);
  await q('UPDATE investor_settings SET is_enabled=TRUE,requires_pro=TRUE,customer_industry_limit=10 WHERE id=1');
  await q('INSERT INTO investment_industry_rules(industry_id,minimum_amount,maximum_amount) VALUES($1,100,100000)', [industry]);
  await q('INSERT INTO investor_industry_location_limits(industry_id,state_id,investor_limit) VALUES($1,$2,10)', [industry, state]);

  async function authorize(middleware, account, expected, version = account?.auth_version) {
    const token = account && jwt.sign({ id: account.id, role: 'admin', auth_version: version }, process.env.JWT_SECRET || 'change-this-secret-in-development-only');
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
    let status = 200;
    const res = { status(value) { status = value; return this; }, json() {} };
    await middleware(req, res, () => {});
    assert.equal(status, expected);
  }
  const investor = require('../src/middleware/investorMiddleware');
  const adminOnly = require('../src/middleware/adminMiddleware');
  const partnerOnly = require('../src/middleware/leadPartnerMiddleware');
  await authorize(investor, null, 401);
  for (const account of [admin, standard, partner]) await authorize(investor, account, 403);
  await authorize(investor, pro, 200);
  await authorize(investor, pro, 401, Number(pro.auth_version || 0) + 1);
  await authorize(adminOnly, pro, 403); // Forged token role cannot override database role.
  await authorize(adminOnly, admin, 200);
  await authorize(partnerOnly, standard, 403);
  await authorize(partnerOnly, partner, 200);

  const input = { userId: pro.id, industryId: industry, stateId: state, cityId: null, amount: 1000, reinvestmentEnabled: false };
  const investmentService = require('../src/services/investmentService');
  await q('UPDATE investor_settings SET requires_pro=FALSE WHERE id=1');
  for (const account of [admin, standard, partner]) {
    assert.equal((await investmentService.getInvestmentAccess(account.id)).canInvest, false);
    await assert.rejects(drafts.create({...input,userId:account.id}), {code:'PRO_REQUIRED'});
  }
  assert.equal((await investmentService.getInvestmentAccess(pro.id)).canInvest, true);
  await q('UPDATE investor_settings SET requires_pro=TRUE WHERE id=1');
  await assert.rejects(drafts.create({...input,amount:1}), {code:'AMOUNT_OUT_OF_RANGE'});
  assert.equal((await q('SELECT * FROM investment_cycles WHERE user_id=$1', [pro.id])).length, 0, 'Draft validation must not leave an empty cycle');
  const id = await drafts.create(input);
  const submission = { id, userId: pro.id, manualReference: `${tag}-UTR`, proofUrl: 'data:image/png;base64,iVBORw0KGgo=' };
  await assert.rejects(drafts.submit({ ...submission, userId: standard.id }), { code: 'DRAFT_NOT_FOUND' });
  await q("UPDATE memberships SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE user_id=$1", [pro.id]);
  await assert.rejects(drafts.submit(submission), { code: 'PRO_REQUIRED' });
  await q("UPDATE memberships SET expires_at=CURRENT_TIMESTAMP+INTERVAL '30 days' WHERE user_id=$1", [pro.id]);

  // Reload simulates another process: no in-memory state may be needed.
  delete require.cache[require.resolve('../src/services/investmentPaymentDraftService')];
  const otherInstance = require('../src/services/investmentPaymentDraftService');
  const results = await Promise.all([drafts.submit(submission), otherInstance.submit(submission)]);
  assert.equal(results[0].id, results[1].id, 'Concurrent retries must use one payment');
  assert.equal(results[0].status, 'pending');
  assert.equal((await q('SELECT * FROM investments WHERE user_id=$1', [pro.id])).length, 1);
  assert.equal((await q('SELECT status FROM investments WHERE user_id=$1', [pro.id]))[0].status, 'pending');

  // Both reviewers race: only one may activate/credit the investment.
  const approvals = await Promise.allSettled([
    payments.updatePaymentStatus(results[0].id, 'paid', admin.id),
    payments.updatePaymentStatus(results[0].id, 'paid', admin.id),
  ]);
  assert.equal(approvals.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(approvals.find(x => x.status === 'rejected').reason.code, 'PAYMENT_ALREADY_PAID');
  assert.equal((await q('SELECT * FROM investment_transactions WHERE user_id=$1', [pro.id])).length, 1);

  const retryId = await drafts.create(input);
  await assert.rejects(drafts.submit({ ...submission, id: retryId }), { code: 'DUPLICATE_REFERENCE' });
  assert.equal((await q('SELECT * FROM investments WHERE user_id=$1', [pro.id])).length, 1, 'Failed proof must roll back checkout');
  assert.equal((await q('SELECT payment_id FROM investment_payment_drafts WHERE id=$1', [retryId]))[0].payment_id, null);
  const retried = await drafts.submit({ ...submission, id: retryId, manualReference: `${tag}-retry` });
  await payments.updatePaymentStatus(retried.id, 'rejected', admin.id);
  await assert.rejects(payments.updatePaymentStatus(retried.id, 'paid', admin.id), { code: 'PAYMENT_TERMINAL' });

  const expiredId = await drafts.create(input);
  await q("UPDATE investment_payment_drafts SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=$1", [expiredId]);
  await assert.rejects(drafts.submit({ ...submission, id: expiredId }), { code: 'DRAFT_NOT_FOUND' });

  const emptyProof = (await q(`INSERT INTO payments(user_id,amount,payment_method,status,purchase_type,external_amount,wallet_amount)
    VALUES($1,100,'manual','pending','membership',100,0) RETURNING id`, [standard.id]))[0].id;
  await assert.rejects(payments.updatePaymentStatus(emptyProof, 'paid', admin.id), { code: 'PAYMENT_PROOF_REQUIRED' });
  let page;
  await controller.getPayments({ query: { limit: 1, page: 1, search: tag } }, { json(value) { page = value; } });
  assert.equal(page.items.length, 1);
  assert(page.total >= 3 && page.pages >= 3, 'Admin pagination must retain database totals');
  assert.equal(await payments.updatePaymentStatus(2147483647, 'paid', admin.id), null);
  console.log('Production payment flow passed: roles, sessions, expiry, durable drafts, concurrency, rollback, review and pagination.');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => pool.end());
