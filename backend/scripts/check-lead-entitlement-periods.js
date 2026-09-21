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
      if (sql.includes('SELECT COUNT(*)::int AS used')) return { rows: [{ used: 10 }] };
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

async function runMonthlyResetTest() {
  const now = new Date();
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const { service, calls, originalPool, servicePath, poolPath } = loadService({ startsAt: previousMonth.toISOString(), billingMonths: 3 });
  try {
    const access = await service.getLeadAccess(7, 1);
    assert.strictEqual(access.canClaim, true, 'A monthly non-rollover entitlement must reset each month');
    assert.strictEqual(access.remaining, 10, 'A new monthly period should restore the monthly allowance');
    const claimQuery = calls.find(call => call.sql.includes('SELECT COUNT(*)::int AS used'));
    assert(claimQuery, 'The entitlement usage query must be executed');
    const periodStart = new Date(claimQuery.params[3]);
    const periodEnd = new Date(claimQuery.params[4]);
    assertDateParts(periodStart, now.getUTCFullYear(), now.getUTCMonth(), 1, 'Current monthly period start');
    const expectedEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    assertDateParts(periodEnd, expectedEnd.getUTCFullYear(), expectedEnd.getUTCMonth(), 1, 'Current monthly period end');
  } finally {
    require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: originalPool };
    delete require.cache[servicePath];
  }
}

async function runDayBoundaryTest() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 30));
  const { service, calls, originalPool, servicePath, poolPath } = loadService({ startsAt: start.toISOString(), billingMonths: 12 });
  try {
    await service.getLeadAccess(7, 1);
    const claimQuery = calls.find(call => call.sql.includes('SELECT COUNT(*)::int AS used'));
    assert(claimQuery, 'The entitlement usage query must be executed for the boundary test');
    const periodStart = new Date(claimQuery.params[3]);
    assert.strictEqual(periodStart.getUTCFullYear(), start.getUTCFullYear(), 'A month must not elapse before the anniversary day');
    assert.strictEqual(periodStart.getUTCMonth(), start.getUTCMonth(), 'A month must not elapse before the anniversary day');
    assert.strictEqual(periodStart.getUTCDate(), 30, 'Membership anniversary must preserve the start day');
  } finally {
    require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: originalPool };
    delete require.cache[servicePath];
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
