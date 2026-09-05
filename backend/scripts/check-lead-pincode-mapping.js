const assert = require('assert');
const pool = require('../src/config/database');
const cityService = require('../src/services/cityService');

async function main() {
  const client = await pool.connect();
  let cityId;
  let subcityId;
  const pin = '999991';

  try {
    const c = (await client.query(`
      SELECT i.id industry_id, s.id service_id, c.id city_id, c.state_id
      FROM industries i
      JOIN services s ON s.industry_id=i.id
      JOIN cities c ON c.is_active=TRUE
      JOIN states st ON st.id=c.state_id AND st.is_active=TRUE
      WHERE i.is_active=TRUE AND s.is_active=TRUE
      ORDER BY i.id,s.id,c.id LIMIT 1
    `)).rows[0];
    assert(c, 'CI catalog must contain an industry/service/city');
    cityId = c.city_id;

    // Exercise the application service so the same city_pincodes synchronization
    // path used by the API is covered by the regression test.
    const subcity = await cityService.createSubcity({
      cityId,
      name: 'Mapping Test Area',
      slug: 'mapping-test-area',
      pincode: pin,
      source: 'ci-test'
    });
    subcityId = subcity.id;

    assert.strictEqual(subcity.pincode, pin);

    const cityPins = Number((await client.query(`
      SELECT COUNT(*)::int count
      FROM city_pincodes
      WHERE city_id=$1 AND pincode=$2 AND is_active=TRUE
    `, [cityId, pin])).rows[0].count);
    assert.strictEqual(cityPins, 1);

    const lead = (await client.query(`
      INSERT INTO leads(
        industry_id,service_id,state_id,city_id,subcity_id,customer_name,
        customer_phone,requirement,pincode,custom_fields
      ) VALUES(
        $1,$2,$3,$4,$5,'PIN Mapping Test','9999999991',
        'Mapping regression test',$6,
        '{"Zip Code":"999991","Area":"Mapping Test Area"}'::jsonb
      )
      RETURNING id,pincode,city_id,subcity_id
    `, [c.industry_id,c.service_id,c.state_id,cityId,subcityId,pin])).rows[0];

    assert.strictEqual(lead.pincode, pin);
    assert.strictEqual(Number(lead.city_id), Number(cityId));
    assert.strictEqual(Number(lead.subcity_id), Number(subcityId));

    const subcityPin = (await client.query(
      `SELECT pincode FROM subcities WHERE id=$1`, [subcityId]
    )).rows[0].pincode;
    assert.strictEqual(subcityPin, pin);

    await client.query(`
      INSERT INTO leads(
        industry_id,service_id,state_id,city_id,customer_name,
        customer_phone,requirement,pincode
      ) VALUES($1,$2,$3,$4,'PIN Mapping Test 2','9999999992','Mapping regression test 2',$5)
    `, [c.industry_id,c.service_id,c.state_id,cityId,pin]);

    const duplicateCount = Number((await client.query(`
      SELECT COUNT(*)::int count
      FROM city_pincodes
      WHERE city_id=$1 AND pincode=$2
    `, [cityId,pin])).rows[0].count);
    assert.strictEqual(duplicateCount, 1);

    console.log('Lead PIN location mapping regression test passed.');
  } catch (e) {
    console.error(e.stack || e.message);
    process.exitCode = 1;
  } finally {
    try {
      if (subcityId) {
        await client.query('DELETE FROM leads WHERE subcity_id=$1 OR (city_id=$2 AND pincode=$3 AND customer_name LIKE $4)', [subcityId, cityId, pin, 'PIN Mapping Test%']);
        await client.query('DELETE FROM subcities WHERE id=$1', [subcityId]);
      }
      if (cityId) {
        await client.query('DELETE FROM city_pincodes WHERE city_id=$1 AND pincode=$2 AND office_name=\'Mapping Test Area\'', [cityId, pin]);
      }
    } finally {
      client.release();
      await pool.end();
    }
  }
}

main();
