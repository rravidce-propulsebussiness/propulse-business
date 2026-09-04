const assert=require('assert');
const pool=require('../src/config/database');
async function main(){try{const rules=await pool.query(`SELECT COUNT(*)::int count FROM investment_industry_rules WHERE return_percent<>0`);assert.strictEqual(rules.rows[0].count,0,'Fixed investment return percentages must remain zero');const cols=await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='investments' AND column_name='realized_revenue'`);assert.strictEqual(cols.rowCount,1,'Realized revenue field is required');console.log('No-fixed-return investor model check passed.')}finally{await pool.end()}}
main().catch(e=>{console.error(e.stack||e.message);process.exit(1)});
