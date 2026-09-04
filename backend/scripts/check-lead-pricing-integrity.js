const assert=require('assert');
const pool=require('../src/config/database');

async function main(){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const scope=(await client.query(`SELECT i.id industry_id,c.id city_id
      FROM industries i CROSS JOIN cities c
      WHERE i.is_active=TRUE AND c.is_active=TRUE
      ORDER BY i.id,c.id LIMIT 1`)).rows[0];
    assert(scope,'CI catalog must contain an active industry and city');

    const type='basic';
    const count=()=>client.query(`SELECT COUNT(*)::int count FROM lead_pricing_rules
      WHERE industry_id=$1 AND city_id=$2 AND lead_type=$3`,[scope.industry_id,scope.city_id,type]);

    await client.query(`INSERT INTO lead_pricing_rules(industry_id,city_id,lead_type,pricing,is_active)
      VALUES($1,$2,$3,$4::jsonb,TRUE)
      ON CONFLICT (COALESCE(industry_id,0),COALESCE(city_id,0),lead_type)
      DO UPDATE SET pricing=EXCLUDED.pricing,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,
      [scope.industry_id,scope.city_id,type,JSON.stringify({shares:[{shares:1,normal:100,pro:200}]})]);
    await client.query(`INSERT INTO lead_pricing_rules(industry_id,city_id,lead_type,pricing,is_active)
      VALUES($1,$2,$3,$4::jsonb,TRUE)
      ON CONFLICT (COALESCE(industry_id,0),COALESCE(city_id,0),lead_type)
      DO UPDATE SET pricing=EXCLUDED.pricing,is_active=TRUE,updated_at=CURRENT_TIMESTAMP`,
      [scope.industry_id,scope.city_id,type,JSON.stringify({shares:[{shares:1,normal:125,pro:250}]})]);

    assert.strictEqual((await count()).rows[0].count,1,'pricing scope must remain unique');
    const row=(await client.query(`SELECT pricing FROM lead_pricing_rules
      WHERE industry_id=$1 AND city_id=$2 AND lead_type=$3`,[scope.industry_id,scope.city_id,type])).rows[0];
    assert.deepStrictEqual(row.pricing.shares,[{shares:1,normal:125,pro:250}], 'upsert must update the existing rule rather than create a duplicate');

    await client.query(`INSERT INTO lead_pricing_rules(industry_id,city_id,lead_type,pricing,is_active)
      VALUES($1,$2,'premium',$3::jsonb,TRUE)
      ON CONFLICT (COALESCE(industry_id,0),COALESCE(city_id,0),lead_type) DO NOTHING`,
      [scope.industry_id,scope.city_id,JSON.stringify({shares:[{shares:1,normal:300,pro:600}]})]);
    assert.strictEqual((await client.query(`SELECT COUNT(*)::int count FROM lead_pricing_rules WHERE industry_id=$1 AND city_id=$2`,[scope.industry_id,scope.city_id])).rows[0].count,2,'Basic and Premium may coexist without duplicating a scope');

    await client.query('ROLLBACK');
    console.log('Lead pricing duplicate/integrity regression test passed.');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
  finally{client.release();await pool.end()}
}
main().catch(e=>{console.error(e.stack||e.message);process.exit(1)});
