const assert = require('node:assert/strict');
const pool = require('../src/config/database');
const { calculateEstimateFromConfig } = require('../src/services/estimatorService');
const { isVisible } = require('../src/services/customerFlowValidationService');

async function main(){
  const flow=(await pool.query(
    `SELECT d.id,d.key,d.name,d.flow_type,d.industry_id,d.service_id,d.subservice_id,
            i.name industry_name,s.name service_name,ss.name subservice_name,
            v.id version_id,v.version_no,v.status,v.config
       FROM customer_flow_definitions d
       JOIN industries i ON i.id=d.industry_id
       LEFT JOIN services s ON s.id=d.service_id
       LEFT JOIN subservices ss ON ss.id=d.subservice_id
       JOIN customer_flow_versions v ON v.definition_id=d.id
      WHERE d.key='interior-cost-estimator'
      ORDER BY v.version_no DESC LIMIT 1`
  )).rows[0];

  assert.ok(flow,'Interior estimator must be seeded');
  assert.equal(flow.flow_type,'estimator');
  assert.equal(flow.status,'published');
  assert.equal(flow.version_no,1);
  assert.equal(flow.config.seedKey,'interior-cost-estimator-v1');
  assert.match(String(flow.industry_name),/interior/i);
  assert.match(String(flow.service_name),/interior/i);

  const questions=(await pool.query(
    `SELECT question_key,question_type,is_required,show_when,lead_field,visibility
       FROM customer_flow_questions WHERE version_id=$1 AND is_active=TRUE ORDER BY display_order,id`,
    [flow.version_id]
  )).rows;
  const keys=new Set(questions.map(q=>q.question_key));
  for(const key of ['project_location','property_type','bhk','area','property_status','scope_mode','selected_work','kitchen_package','wardrobe_units','false_ceiling_area','furniture_package','finish_quality','timeline','additional_requirement']){
    assert.ok(keys.has(key),`Missing Interior estimator question: ${key}`);
  }
  assert.equal(questions.find(q=>q.question_key==='project_location').question_type,'location');
  assert.equal(questions.find(q=>q.question_key==='property_type').lead_field,'property_type');
  assert.equal(questions.find(q=>q.question_key==='additional_requirement').visibility,'protected');

  const options=(await pool.query(
    `SELECT q.question_key,o.value,o.label
       FROM customer_flow_question_options o
       JOIN customer_flow_questions q ON q.id=o.question_id
      WHERE q.version_id=$1 AND o.is_active=TRUE`,
    [flow.version_id]
  )).rows;
  const optionKey=new Set(options.map(o=>o.question_key+':'+o.value));
  for(const expected of ['property_type:apartment','property_type:villa','bhk:3bhk','scope_mode:full_home','scope_mode:selected_work','selected_work:kitchen','selected_work:wardrobes','finish_quality:premium','finish_quality:luxury']){
    assert.ok(optionKey.has(expected),`Missing Interior estimator option: ${expected}`);
  }

  const rateRows=(await pool.query(
    'SELECT * FROM estimator_rate_items WHERE version_id=$1 AND is_active=TRUE ORDER BY display_order,id',
    [flow.version_id]
  )).rows;
  assert.equal(rateRows.length,9);
  const rateKeys=new Set(rateRows.map(r=>r.rate_key));
  for(const key of ['full_home_base','kitchen_compact','kitchen_full','wardrobe_units','false_ceiling','furniture_essential','furniture_full','painting','lighting']) assert.ok(rateKeys.has(key));

  const adjustmentRows=(await pool.query(
    'SELECT * FROM estimator_adjustments WHERE version_id=$1 AND is_active=TRUE ORDER BY display_order,id',
    [flow.version_id]
  )).rows;
  const adjustmentKeys=new Set(adjustmentRows.map(r=>r.adjustment_key));
  for(const key of ['premium_finish','luxury_finish','existing_home','villa_scope','independent_house_scope','hyderabad_market']) assert.ok(adjustmentKeys.has(key));

  assert.equal(isVisible({showWhen:{questionKey:'selected_work',equals:'kitchen'}},{selected_work:['kitchen','painting']}),true);
  assert.equal(isVisible({showWhen:{questionKey:'selected_work',equals:'wardrobes'}},{selected_work:['kitchen','painting']}),false);

  const rates=rateRows.map(row=>({
    rateKey:row.rate_key,label:row.label,calculationType:row.calculation_type,unitQuestionKey:row.unit_question_key,
    amountMin:String(row.amount_min),amountMax:String(row.amount_max),showWhen:row.show_when||{},isActive:row.is_active
  }));
  const adjustments=adjustmentRows.filter(row=>row.city_id===null).map(row=>({
    adjustmentKey:row.adjustment_key,label:row.label,adjustmentType:row.adjustment_type,
    valueMin:String(row.value_min),valueMax:String(row.value_max),cityId:null,showWhen:row.show_when||{},isActive:row.is_active
  }));

  const fullHome=calculateEstimateFromConfig({
    answers:{area:'1000',scope_mode:'full_home',finish_quality:'premium',property_status:'new_property',property_type:'apartment'},
    rateItems:rates,adjustments,cityId:null
  });
  assert.equal(fullHome.minimum,1375000);
  assert.equal(fullHome.maximum,2025000);

  const selected=calculateEstimateFromConfig({
    answers:{scope_mode:'selected_work',selected_work:['kitchen','wardrobes','painting'],kitchen_package:'compact',wardrobe_units:'2',finish_quality:'standard',property_status:'new_property',property_type:'apartment'},
    rateItems:rates,adjustments,cityId:null
  });
  assert.equal(selected.minimum,240000);
  assert.equal(selected.maximum,470000);

  console.log('Interior estimator seed and pricing checks passed.');
}

main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
