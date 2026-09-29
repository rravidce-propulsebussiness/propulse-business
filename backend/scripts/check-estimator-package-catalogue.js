const assert=require('node:assert/strict');
const pool=require('../src/config/database');

async function packagesFor(flowKey){
  return (await pool.query(
    `SELECT p.*,COALESCE(jsonb_agg(jsonb_build_object(
        'detailKey',d.detail_key,'section',d.section,'label',d.label,'value',d.value
      ) ORDER BY d.display_order,d.id) FILTER (WHERE d.id IS NOT NULL),'[]'::jsonb) details
       FROM customer_flow_definitions f
       JOIN customer_flow_versions v ON v.definition_id=f.id AND v.status='published'
       JOIN estimator_packages p ON p.version_id=v.id
       LEFT JOIN estimator_package_details d ON d.package_id=p.id AND d.is_active=TRUE
      WHERE f.key=$1 AND p.is_active=TRUE
      GROUP BY p.id
      ORDER BY p.display_order,p.id`,
    [flowKey]
  )).rows;
}

async function main(){
  for(const table of ['estimator_packages','estimator_package_details']){
    const exists=Number((await pool.query(
      `SELECT COUNT(*)::int count FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [table]
    )).rows[0].count);
    assert.equal(exists,1,`${table} must exist`);
  }

  const construction=await packagesFor('construction-cost-estimator');
  assert.ok(construction.length>=3,'Construction estimator must expose at least three configurable package catalogues');
  const byKey=new Map(construction.map(item=>[item.package_key,item]));
  for(const key of ['standard','premium','royal'])assert.ok(byKey.has(key),`Missing Construction package ${key}`);
  assert.equal(byKey.get('royal').selector_question_key,'quality');
  assert.equal(byKey.get('royal').selector_value,'luxury');
  const royalDetails=new Set(byKey.get('royal').details.map(item=>item.detailKey));
  for(const key of ['steel','cement','bricks','wire','switches'])assert.ok(royalDetails.has(key),`Royal package missing ${key}`);

  const interior=await packagesFor('interior-cost-estimator');
  assert.ok(interior.length>=2,'Interior estimator must expose configurable Standard and Premium package catalogues');
  const interiorKeys=new Set(interior.map(item=>item.package_key));
  assert.ok(interiorKeys.has('standard')&&interiorKeys.has('premium'));
  assert.ok(interior.every(item=>item.selector_question_key==='finish_quality'));

  console.log('Estimator package catalogue checks passed.');
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
