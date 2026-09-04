const assert=require('assert');
const pool=require('../src/config/database');
async function main(){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const c=(await client.query(`SELECT i.id industry_id,s.id service_id,c.id city_id,c.state_id,st.name state_name,c.name city_name FROM industries i JOIN services s ON s.industry_id=i.id JOIN cities c ON c.is_active=TRUE JOIN states st ON st.id=c.state_id AND st.is_active=TRUE WHERE i.is_active=TRUE AND s.is_active=TRUE ORDER BY i.id,s.id,c.id LIMIT 1`)).rows[0];
    assert(c,'CI catalog must contain an industry/service/city');
    const pin='999991';
    await client.query(`INSERT INTO india_pincodes(pincode,state_id,state_name,district_name,office_count,source,is_active) VALUES($1,$2,$3,$4,1,'ci-test',TRUE) ON CONFLICT(pincode) DO UPDATE SET state_id=EXCLUDED.state_id,state_name=EXCLUDED.state_name,district_name=EXCLUDED.district_name,is_active=TRUE`,[pin,c.state_id,c.state_name,c.city_name]);
    const sc=(await client.query(`INSERT INTO subcities(city_id,name,slug,pincode,source) VALUES($1,'Mapping Test Area','mapping-test-area',NULL,'ci-test') ON CONFLICT(city_id,slug) DO UPDATE SET is_active=TRUE RETURNING id`,[c.city_id])).rows[0];
    const lead=(await client.query(`INSERT INTO leads(industry_id,service_id,state_id,city_id,customer_name,customer_phone,requirement,custom_fields) VALUES($1,$2,$3,$4,'PIN Mapping Test','9999999991','Mapping regression test','{"Zip Code":"999991","Area":"Mapping Test Area"}'::jsonb) RETURNING id,pincode,city_id,subcity_id`,[c.industry_id,c.service_id,c.state_id,c.city_id])).rows[0];
    assert.strictEqual(lead.pincode,pin); assert.strictEqual(Number(lead.city_id),Number(c.city_id)); assert.strictEqual(Number(lead.subcity_id),Number(sc.id));
    const cityPins=Number((await client.query(`SELECT COUNT(*)::int count FROM city_pincodes WHERE city_id=$1 AND pincode=$2 AND is_active=TRUE`,[c.city_id,pin])).rows[0].count); assert.strictEqual(cityPins,1);
    assert.strictEqual((await client.query(`SELECT pincode FROM subcities WHERE id=$1`,[sc.id])).rows[0].pincode,pin);
    await client.query(`INSERT INTO leads(industry_id,service_id,state_id,city_id,customer_name,customer_phone,requirement,pincode) VALUES($1,$2,$3,$4,'PIN Mapping Test 2','9999999992','Mapping regression test 2',$5)`,[c.industry_id,c.service_id,c.state_id,c.city_id,pin]);
    const duplicateCount=Number((await client.query(`SELECT COUNT(*)::int count FROM city_pincodes WHERE city_id=$1 AND pincode=$2`,[c.city_id,pin])).rows[0].count); assert.strictEqual(duplicateCount,1);
    await client.query('ROLLBACK'); console.log('Lead PIN location mapping regression test passed.');
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{client.release();await pool.end()}
}
main().catch(e=>{console.error(e.stack||e.message);process.exit(1)});
