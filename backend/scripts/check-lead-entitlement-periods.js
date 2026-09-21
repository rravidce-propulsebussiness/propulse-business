const assert = require('assert');

function loadService({ startsAt, billingMonths = 3 }) {
  const servicePath = require.resolve('../src/services/leadEntitlementService');
  const poolPath = require.resolve('../src/config/database');
  const originalPool = require(poolPath);
  const calls = [];
  const pool = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('FROM leads WHERE id=$1')) {
        return { rows: [{ id: 1, lead_type: 'shared', is_exclusive: false, created_at: new Date('2026-01-01T00:00:00Z'), exclusive_delay_days: 0, status: 'available', industry_id: 1, service_id: 1, subservice_id: null, state_id: 1, city_id: 1 }] };
      }
      if (sql.includes('FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2')) return { rows: [] };
      if (sql.includes('FROM memberships m')) {
        return { rows: [{
          id: 10,
          starts_at: new Date(startsAt),
          expires_at: new Date('2030-04-01T00:00:00Z'),
          membership_plan_id: 20,
          billing_months: billingMonths,
          lead_entitlements: [{ type: 'shared', monthly_quantity: 10, period_total_quantity: 30, complimentary: true }],
          lead_rollover_enabled: false,
          lead_expiry_days: 0,
        }] };
      }
      if (sql.includes('SELECT COUNT(*)::int AS used')) return { rows: [{ used: 0 }] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: pool };
  delete require.cache[servicePath];
  return { service: require(servicePath), calls, originalPool, servicePath, poolPath };
}

function assertDateParts(date, expectedYear, expectedMonth, expectedDay, label) {
  assert.strictEqual(date.getUTCFullYear(), expectedYear, `${label}: year`);
  assert.strictEqual(date.getUTCMonth(), expectedMonth, `${label}: month`);
  assert.strictEqual(date.getUTCDate(), expectedDay, `${label}: day`);
}

function loadServiceWithNow({ startsAt, now, billingMonths = 3, used = 0 }) {
  const loaded = loadService({ startsAt, billingMonths });
  const originalDate = global.Date;
  const fixedNow = new originalDate(now);

  class FixedDate extends originalDate {
    constructor(...args) {
      if (args.length === 0) super(fixedNow.getTime());
      else super(...args);
    }
    static now() { return fixedNow.getTime(); }
  }

  // The mock returns usage only for the current window; the tests below
  // focus on the exact window boundaries calculated by the service.
  loaded.pool.query = undefined;
  global.Date = FixedDate;
  return { ...loaded, restoreDate: () => { global.Date = originalDate; } };
}

async function runMonthlyResetTest() {
  const { service, calls, originalPool, servicePath, poolPath, restoreDate } = loadServiceWithNow({
    startsAt: '2026-08-22T12:00:00Z',
    now: '2026-09-22T12:00:00Z',
    billingMonths: 3,
  });
  try {
    const access = await service.getLeadAccess(7, 1);
    assert.strictEqual(access.canClaim, true, 'A non-rollover entitlement must reset for the new monthly period');
    assert.strictEqual(access.remaining, 10, 'The new monthly period must restore the monthly allowance');
    const claimQuery = calls.find(call => call.sql.includes('SELECT COUNT(*)::int AS used'));
    assert(claimQuery, 'The entitlement usage query must be executed');
    assertDateParts(new Date(claimQuery.params[3]), 2026, 8, 22, 'Monthly period start');
    assertDateParts(new Date(claimQuery.params[4]), 2026, 9, 22, 'Monthly period end');
  } finally {
    restoreDate();
    require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: originalPool };
    delete require.cache[servicePath];
  }
}

async function runDayBoundaryTest() {
  const before = loadServiceWithNow({
    startsAt: '2025-09-30T12:00:00Z',
    now: '2026-09-29T12:00:00Z',
    billingMonths: 12,
  });
  try {
    await before.service.getLeadAccess(7, 1);
    const claimQuery = before.calls.find(call => call.sql.includes('SELECT COUNT(*)::int AS used'));
    assert(claimQuery, 'The pre-anniversary usage query must be executed');
    assertDateParts(new Date(claimQuery.params[3]), 2026, 8, 30, 'Pre-anniversary monthly period start');
    assertDateParts(new Date(claimQuery.params[4]), 2026, 9, 30, 'Pre-anniversary monthly period end');
  } finally {
    before.restoreDate();
    require.cache[before.poolPath] = { id: before.poolPath, filename: before.poolPath, loaded: true, exports: before.originalPool };
    delete require.cache[before.servicePath];
  }

  const onAnniversary = loadServiceWithNow({
    startsAt: '2025-09-30T12:00:00Z',
    now: '2026-09-30T12:00:00Z',
    billingMonths: 12,
  });
  try {
    await onAnniversary.service.getLeadAccess(7, 1);
    const claimQuery = onAnniversary.calls.find(call => call.sql.includes('SELECT COUNT(*)::int AS used'));
    assert(claimQuery, 'The anniversary usage query must be executed');
    assertDateParts(new Date(claimQuery.params[3]), 2026, 8, 30, 'Anniversary monthly period start');
    assertDateParts(new Date(claimQuery.params[4]), 2026, 9, 30, 'Anniversary monthly period end');
  } finally {
    onAnniversary.restoreDate();
    require.cache[onAnniversary.poolPath] = { id: onAnniversary.poolPath, filename: onAnniversary.poolPath, loaded: true, exports: onAnniversary.originalPool };
    delete require.cache[onAnniversary.servicePath];
  }
}

async function main() {
  await runMonthlyResetTest();
  await runDayBoundaryTest();
  console.log('Lead entitlement monthly-reset and date-boundary regression tests passed.');
}

main().catch(error => {
  console.error(`Lead entitlement regression tests failed: ${error.message}`);
  process.exit(1);
});
