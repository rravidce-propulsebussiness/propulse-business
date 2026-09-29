const assert = require('node:assert/strict');
const pool = require('../src/config/database');
const { calculateEstimateFromConfig } = require('../src/services/estimatorService');

async function main(){
  const flow=(await pool.query(
    `SELECT d.id,d.key,d.name,d.flow_type,d.industry_id,d.service_id,d.subservice_id,
            i.name industry_name,s.name service_name,
            v.id version_id,v.version_no,v.status,v.config
       FROM customer_flow_definitions d
       JOIN industries i ON i.id=d.industry_id
       LEFT JOIN services s ON s.id=d.service_id
       JOIN customer_flow_versions v ON v.definition_id=d.id
      WHERE d.key='construction-cost-estimator'
      ORDER BY v.version_no DESC LIMIT 1`
  )).rows[0];

  assert.ok(flow,'Construction estimator must be seeded');
  assert.equal(flow.flow_type,'estimator');
  assert.equal(flow.status,'published');
  assert.ok(Number(flow.version_no)>=4);
  assert.equal(flow.config.seedKey,'construction-cost-estimator-v4-single-estimate');
  assert.equal(flow.config.estimateExperience,'single');
  assert.equal(flow.config.estimateLabel,'Project Estimate');
  assert.match(String(flow.industry_name),/construction/i);
  assert.ok(/building|construction/i.test(String(flow.service_name)));

  const questions=(await pool.query(
    `SELECT question_key,question_type,is_required,show_when,lead_field,visibility,validation
       FROM customer_flow_questions WHERE version_id=$1 AND is_active=TRUE ORDER BY display_order,id`,
    [flow.version_id]
  )).rows;
  const keys=new Set(questions.map(q=>q.question_key));
  for(const key of ['estimate_mode','project_location','project_type','built_up_area','construction_package','quality','steel_spec','cement_spec','sand_spec','brick_spec','wire_spec','switch_spec','flooring_spec','basement','site_access']){
    assert.ok(keys.has(key),`Missing Construction estimator question: ${key}`);
  }
  assert.equal(questions.find(q=>q.question_key==='project_location').question_type,'location');
  assert.equal(questions.find(q=>q.question_key==='project_type').lead_field,'property_type');
  assert.equal(questions.find(q=>q.question_key==='built_up_area').question_type,'area');
  for(const removed of ['own_plot','plot_area','floors','timeline','additional_requirement']) assert.ok(!keys.has(removed),`Non-calculation Construction field should not be in the current estimate: ${removed}`);
  assert.deepEqual(questions.find(q=>q.question_key==='steel_spec').show_when,{questionKey:'estimate_mode',equals:'detailed'});
  const modeQuestion=questions.find(q=>q.question_key==='estimate_mode');
  assert.equal(modeQuestion.validation.systemHidden,true);
  assert.equal(modeQuestion.validation.systemDefault,'detailed');
  assert.equal(questions.find(q=>q.question_key==='steel_spec').is_required,false);
  assert.equal(questions.find(q=>q.question_key==='steel_spec').validation.advancedSection,true);
  assert.equal(questions.find(q=>q.question_key==='steel_spec').validation.systemDefault,'package_default');

  const options=(await pool.query(
    `SELECT q.question_key,o.value,o.label
       FROM customer_flow_question_options o
       JOIN customer_flow_questions q ON q.id=o.question_id
      WHERE q.version_id=$1 AND o.is_active=TRUE`,
    [flow.version_id]
  )).rows;
  const optionKey=new Set(options.map(o=>o.question_key+':'+o.value));
  for(const expected of [
    'project_type:house','project_type:villa','project_type:commercial','project_type:extension',
    'construction_package:turnkey','construction_package:structure_only','construction_package:finishing_only',
    'estimate_mode:rough','estimate_mode:detailed',
    'quality:standard','quality:premium','quality:luxury',
    'steel_spec:package_default','steel_spec:tata_550','cement_spec:ultratech_53','brick_spec:karimnagar_class_i','wire_spec:polycab_frls','switch_spec:gold_medal_air',
    'site_access:normal','site_access:restricted'
  ]) assert.ok(optionKey.has(expected),`Missing Construction estimator option: ${expected}`);

  const royalDetails=(await pool.query(
    `SELECT d.detail_key,d.section,d.label,d.value,d.note
       FROM estimator_packages p
       JOIN estimator_package_details d ON d.package_id=p.id AND d.is_active=TRUE
      WHERE p.version_id=$1 AND p.package_key='royal'
      ORDER BY d.display_order,d.id`,
    [flow.version_id]
  )).rows;
  const royalDetailKeys=new Set(royalDetails.map(item=>item.detail_key));
  for(const key of ['steel','cement','bricks','wire','switches','architecture_scope','aggregate','kitchen_platform','windows','bathroom_wall_tiles','electrical_pipes','railings','warranty']){
    assert.ok(royalDetailKeys.has(key),`Royal brochure package missing detail: ${key}`);
  }
  assert.match(String(royalDetails.find(item=>item.detail_key==='architecture_scope')?.value||''),/2D floor plans/i);
  assert.match(String(royalDetails.find(item=>item.detail_key==='warranty')?.value||''),/10-year structural warranty/i);

  const rateRows=(await pool.query(
    'SELECT * FROM estimator_rate_items WHERE version_id=$1 AND is_active=TRUE ORDER BY display_order,id',
    [flow.version_id]
  )).rows;
  assert.equal(rateRows.length,3);
  const rateKeys=new Set(rateRows.map(r=>r.rate_key));
  for(const key of ['turnkey_base','structure_base','finishing_base']) assert.ok(rateKeys.has(key));

  const adjustmentRows=(await pool.query(
    'SELECT * FROM estimator_adjustments WHERE version_id=$1 AND is_active=TRUE ORDER BY display_order,id',
    [flow.version_id]
  )).rows;
  const adjustmentKeys=new Set(adjustmentRows.map(r=>r.adjustment_key));
  for(const key of ['premium_spec','luxury_spec','commercial_complexity','extension_complexity','basement_complexity','restricted_access','hyderabad_market']) assert.ok(adjustmentKeys.has(key));

  const rates=rateRows.map(row=>({
    rateKey:row.rate_key,label:row.label,calculationType:row.calculation_type,unitQuestionKey:row.unit_question_key,
    amountMin:String(row.amount_min),amountMax:String(row.amount_max),showWhen:row.show_when||{},isActive:row.is_active
  }));
  const globalAdjustments=adjustmentRows.filter(row=>row.city_id===null).map(row=>({
    adjustmentKey:row.adjustment_key,label:row.label,adjustmentType:row.adjustment_type,
    valueMin:String(row.value_min),valueMax:String(row.value_max),cityId:null,showWhen:row.show_when||{},isActive:row.is_active
  }));

  const standardTurnkey=calculateEstimateFromConfig({
    answers:{built_up_area:'1000',construction_package:'turnkey',quality:'standard',project_type:'house',basement:false,site_access:'normal'},
    rateItems:rates,adjustments:globalAdjustments,cityId:null
  });
  assert.equal(standardTurnkey.minimum,1800000);
  assert.equal(standardTurnkey.maximum,2300000);

  const premiumTurnkey=calculateEstimateFromConfig({
    answers:{built_up_area:'1000',construction_package:'turnkey',quality:'premium',project_type:'house',basement:false,site_access:'normal'},
    rateItems:rates,adjustments:globalAdjustments,cityId:null
  });
  assert.equal(premiumTurnkey.minimum,2124000);
  assert.equal(premiumTurnkey.maximum,2944000);

  const structureOnly=calculateEstimateFromConfig({
    answers:{built_up_area:'1000',construction_package:'structure_only',quality:'standard',project_type:'house',basement:false,site_access:'normal'},
    rateItems:rates,adjustments:globalAdjustments,cityId:null
  });
  assert.equal(structureOnly.minimum,950000);
  assert.equal(structureOnly.maximum,1300000);

  const finishingOnly=calculateEstimateFromConfig({
    answers:{built_up_area:'1000',construction_package:'finishing_only',quality:'standard',project_type:'house',basement:false,site_access:'normal'},
    rateItems:rates,adjustments:globalAdjustments,cityId:null
  });
  assert.equal(finishingOnly.minimum,750000);
  assert.equal(finishingOnly.maximum,1150000);

  console.log('Construction estimator seed and pricing checks passed.');
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
