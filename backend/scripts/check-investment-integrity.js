const assert=require('assert');
const pool=require('../src/config/database');

async function main(){
  try{
    const requiredColumns=await pool.query(`
      SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema='public' AND ((table_name='investor_settings' AND column_name IN ('investment_cycle_days','auto_reinvest','investor_revenue_share_percent'))
        OR (table_name='investments' AND column_name IN ('realized_revenue','payout_amount','reinvestment_enabled','parent_investment_id')))
    `);
    const found=new Set(requiredColumns.rows.map(x=>`${x.table_name}.${x.column_name}`));
    for(const key of ['investor_settings.investment_cycle_days','investor_settings.auto_reinvest','investor_settings.investor_revenue_share_percent','investments.realized_revenue','investments.payout_amount','investments.reinvestment_enabled','investments.parent_investment_id'])assert(found.has(key),`Missing ${key}`);

    const table=await pool.query(`SELECT to_regclass('public.investment_revenue_allocations') AS name`);
    assert.strictEqual(table.rows[0].name,'investment_revenue_allocations');

    const dup=await pool.query(`SELECT investment_id,lead_purchase_id,COUNT(*)::int count FROM investment_revenue_allocations GROUP BY investment_id,lead_purchase_id HAVING COUNT(*)>1`);
    assert.strictEqual(dup.rowCount,0,'Duplicate investment revenue allocations found');

    const parentDup=await pool.query(`SELECT parent_investment_id,COUNT(*)::int count FROM investments WHERE parent_investment_id IS NOT NULL GROUP BY parent_investment_id HAVING COUNT(*)>1`);
    assert.strictEqual(parentDup.rowCount,0,'An investment has multiple reinvestment children');

    const settings=await pool.query(`SELECT investment_cycle_days,auto_reinvest,investor_revenue_share_percent FROM investor_settings WHERE id=1`);
    assert.strictEqual(settings.rowCount,1,'Investor settings row missing');
    assert(Number(settings.rows[0].investment_cycle_days)>0,'Investment cycle must be positive');
    assert(Number(settings.rows[0].investor_revenue_share_percent)>=0 && Number(settings.rows[0].investor_revenue_share_percent)<=100,'Revenue share must be 0-100');

    console.log('Investment revenue/reinvestment integrity test passed.');
  }finally{await pool.end()}
}
main().catch(e=>{console.error(e.stack||e.message);process.exit(1)});
