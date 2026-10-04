const assert = require('node:assert/strict');
const pool = require('../src/config/database');

async function main(){
  const tables=(await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])",
    [['estimator_rate_items','estimator_adjustments','estimator_calculations']]
  )).rows.map(row=>row.table_name);
  assert.deepEqual(new Set(tables),new Set(['estimator_rate_items','estimator_adjustments','estimator_calculations']));

  const numericColumns=(await pool.query(
    "SELECT table_name,column_name,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' AND ((table_name='estimator_rate_items' AND column_name IN ('amount_min','amount_max')) OR (table_name='estimator_adjustments' AND column_name IN ('value_min','value_max')) OR (table_name='estimator_calculations' AND column_name IN ('result_min','result_max'))) ORDER BY table_name,column_name"
  )).rows;
  assert.equal(numericColumns.length,6);
  for(const column of numericColumns){
    assert.equal(Number(column.numeric_precision),14);
    assert.equal(Number(column.numeric_scale),2);
  }

  const constraints=(await pool.query(
    "SELECT pg_get_constraintdef(oid) definition FROM pg_constraint WHERE conrelid IN ('estimator_rate_items'::regclass,'estimator_adjustments'::regclass,'estimator_calculations'::regclass)"
  )).rows.map(row=>row.definition).join('\n');
  assert.match(constraints,/customer_flow_versions/i);
  assert.match(constraints,/result_max >= result_min/i);
  assert.match(constraints,/calculation_type/i);
  assert.match(constraints,/adjustment_type/i);

  const publicIdIndex=(await pool.query(
    "SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='estimator_calculations' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%public_id%'"
  )).rowCount;
  assert.equal(publicIdIndex,1);

  console.log('Estimator schema integrity checks passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
