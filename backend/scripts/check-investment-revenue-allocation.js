const assert=require('assert');
const pool=require('../src/config/database');

async function main(){
  try{
    const index=await pool.query(`SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND indexname='uq_investment_reinvestment_parent'`);
    assert.strictEqual(index.rowCount,1,'Reinvestment parent uniqueness is missing');
    const bad=await pool.query(`SELECT COUNT(*)::int AS count FROM investment_revenue_allocations WHERE allocated_amount<0 OR investor_share_percent<0 OR investor_share_percent>100`);
    assert.strictEqual(bad.rows[0].count,0,'Invalid investment revenue allocations found');
    const orphans=await pool.query(`SELECT COUNT(*)::int AS count FROM investment_revenue_allocations a LEFT JOIN investments i ON i.id=a.investment_id LEFT JOIN lead_purchases p ON p.id=a.lead_purchase_id WHERE i.id IS NULL OR p.id IS NULL`);
    assert.strictEqual(orphans.rows[0].count,0,'Orphaned investment revenue allocations found');
    const duplicateParents=await pool.query(`SELECT parent_investment_id,COUNT(*)::int AS count FROM investments WHERE parent_investment_id IS NOT NULL GROUP BY parent_investment_id HAVING COUNT(*)>1`);
    assert.strictEqual(duplicateParents.rowCount,0,'Multiple reinvestments exist for one settled investment');
    console.log('Investment revenue allocation/reinvestment regression test passed.');
  }finally{await pool.end()}
}
main().catch(e=>{console.error(e.stack||e.message);process.exit(1)});
