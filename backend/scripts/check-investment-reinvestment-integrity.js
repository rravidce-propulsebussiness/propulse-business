const assert = require('assert');
const pool = require('../src/config/database');

async function main() {
  try {
    const duplicateChildren = await pool.query(`
      SELECT parent_investment_id, COUNT(*)::int AS count
      FROM investments
      WHERE parent_investment_id IS NOT NULL
      GROUP BY parent_investment_id
      HAVING COUNT(*) > 1
    `);
    assert.strictEqual(duplicateChildren.rowCount, 0, `Duplicate reinvestment cycles found: ${JSON.stringify(duplicateChildren.rows)}`);

    const brokenChildren = await pool.query(`
      SELECT child.id
      FROM investments child
      LEFT JOIN investments parent ON parent.id = child.parent_investment_id
      WHERE child.parent_investment_id IS NOT NULL AND parent.id IS NULL
    `);
    assert.strictEqual(brokenChildren.rowCount, 0, 'Reinvestment cycle points to a missing parent investment');

    const invalidChildren = await pool.query(`
      SELECT child.id
      FROM investments child
      JOIN investments parent ON parent.id = child.parent_investment_id
      WHERE child.user_id <> parent.user_id OR child.industry_id <> parent.industry_id
    `);
    assert.strictEqual(invalidChildren.rowCount, 0, 'Reinvestment must remain with the same investor and industry');

    const paidWithoutSettlement = await pool.query(`
      SELECT id FROM investments
      WHERE status = 'paid' AND payout_amount IS NULL
    `);
    assert.strictEqual(paidWithoutSettlement.rowCount, 0, 'Paid investment must have a settlement amount');

    console.log('Investment reinvestment integrity regression test passed.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
