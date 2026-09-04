const assert = require('assert');
const pool = require('../src/config/database');

async function main() {
  try {
    const duplicateGroups = await pool.query(`
      SELECT plan_type,
             lower(trim(plan_group)) AS group_key,
             billing_months,
             COUNT(*)::int AS count
      FROM membership_plans
      GROUP BY plan_type, lower(trim(plan_group)), billing_months
      HAVING COUNT(*) > 1
    `);
    assert.strictEqual(
      duplicateGroups.rowCount,
      0,
      `Duplicate membership plan periods remain: ${JSON.stringify(duplicateGroups.rows)}`
    );

    const nullGroups = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM membership_plans
      WHERE plan_group IS NULL OR trim(plan_group) = '' OR billing_months IS NULL
    `);
    assert.strictEqual(nullGroups.rows[0].count, 0, 'Membership plans must have normalized group and billing period');

    const uniqueIndex = await pool.query(`
      SELECT 1
      FROM pg_indexes
      WHERE schemaname='public' AND indexname='uq_membership_plan_semantic_period'
    `);
    assert.strictEqual(uniqueIndex.rowCount, 1, 'Membership semantic uniqueness index is missing');

    console.log('Membership duplicate/integrity regression test passed.');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
