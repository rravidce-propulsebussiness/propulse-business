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

    const activeTierDuplicates = await pool.query(`
      SELECT m.user_id, lower(replace(coalesce(mp.plan_type,''),'-','_')) AS plan_type, COUNT(*)::int AS count
      FROM memberships m
      JOIN membership_plans mp ON mp.id=m.membership_plan_id
      WHERE m.status='active' AND m.expires_at>CURRENT_TIMESTAMP
        AND lower(replace(coalesce(mp.plan_type,''),'-','_')) IN ('pro','booster','investor')
      GROUP BY m.user_id, lower(replace(coalesce(mp.plan_type,''),'-','_'))
      HAVING COUNT(*) > 1
    `);
    assert.strictEqual(
      activeTierDuplicates.rowCount,
      0,
      `Multiple active memberships exist in the same tier: ${JSON.stringify(activeTierDuplicates.rows)}`
    );

    const tierTrigger = await pool.query(`
      SELECT 1
      FROM pg_trigger
      WHERE tgname='trg_membership_tier_integrity'
        AND NOT tgisinternal
    `);
    assert.strictEqual(tierTrigger.rowCount, 1, 'Membership tier integrity trigger is missing');

    console.log('Membership duplicate/tier integrity regression test passed.');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
