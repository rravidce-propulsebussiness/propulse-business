const assert = require('node:assert/strict');
const pool = require('../src/config/database');
const customerFlowService = require('../src/services/customerFlowService');
const estimatorService = require('../src/services/estimatorService');

const KEY='ci-estimator-runtime';

async function cleanup(){
  const existing=(await pool.query('SELECT id FROM customer_flow_definitions WHERE key=$1',[KEY])).rows[0];
  if(!existing)return;
  await pool.query('DELETE FROM estimator_calculations WHERE definition_id=$1',[existing.id]);
  await pool.query('DELETE FROM customer_flow_definitions WHERE id=$1',[existing.id]);
}

async function main(){
  await cleanup();
  const scope=(await pool.query(
    `SELECT i.id industry_id,s.id service_id
       FROM industries i
       LEFT JOIN services s ON s.industry_id=i.id AND s.is_active=TRUE
      WHERE i.is_active=TRUE
      ORDER BY CASE WHEN i.slug='construction' THEN 0 ELSE 1 END,i.id,s.id
      LIMIT 1`
  )).rows[0];
  assert.ok(scope?.industry_id);

  const created=await customerFlowService.createDefinition({
    key:KEY,name:'CI Generic Estimator',flowType:'estimator',
    industryId:scope.industry_id,serviceId:scope.service_id||null,createdBy:null,
  });
  assert.equal(created.flow_type,'estimator');

  const draft=await customerFlowService.saveDraft(created.id,{
    name:'CI Generic Estimator',
    industryId:scope.industry_id,
    serviceId:scope.service_id||null,
    subserviceId:null,
    isActive:true,
    config:{headline:'CI estimate',resultTitle:'CI estimated range'},
    questions:[
      {questionKey:'area',questionType:'area',label:'Area',isRequired:true,displayOrder:10,validation:{min:1,max:100000},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[]},
      {questionKey:'quality',questionType:'single_select',label:'Quality',isRequired:true,displayOrder:20,validation:{},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[
        {value:'standard',label:'Standard',displayOrder:10,isActive:true},
        {value:'premium',label:'Premium',displayOrder:20,isActive:true},
      ]},
    ],
  },null);
  assert.equal(draft.editingVersion.status,'draft');

  const configured=await estimatorService.saveAdminConfig(created.id,{
    rates:[{
      rateKey:'base_area',label:'Base area rate',calculationType:'per_unit',unitQuestionKey:'area',
      amountMin:'100.00',amountMax:'120.00',showWhen:{},displayOrder:10,isActive:true,
    }],
    adjustments:[{
      adjustmentKey:'premium_finish',label:'Premium finish',adjustmentType:'percent',
      valueMin:'10.00',valueMax:'10.00',cityId:null,
      showWhen:{questionKey:'quality',equals:'premium'},displayOrder:10,isActive:true,
    }],
  });
  assert.equal(configured.rates.length,1);
  assert.equal(configured.adjustments.length,1);

  await customerFlowService.publish(created.id,null);
  const flow=await customerFlowService.getPublishedFlow(KEY);
  assert.equal(flow.flowType,'estimator');

  const result=await estimatorService.calculate({
    key:KEY,flowToken:flow.flowToken,answers:{area:'100',quality:'premium'},
  });
  assert.equal(result.minimum,11000);
  assert.equal(result.maximum,13200);
  assert.equal(result.currency,'INR');
  assert.ok(result.calculationId);

  const saved=await estimatorService.getCalculation(result.calculationId);
  assert.equal(saved.minimum,11000);
  assert.equal(saved.maximum,13200);
  assert.equal(saved.flowKey,KEY);

  const row=(await pool.query(
    'SELECT config_hash,config_snapshot,answers,result_min,result_max FROM estimator_calculations WHERE public_id=$1',
    [result.calculationId]
  )).rows[0];
  assert.equal(String(row.config_hash).length,64);
  assert.equal(row.config_snapshot.flow.key,KEY);
  assert.equal(row.answers.area,'100');
  assert.equal(Number(row.result_min),11000);
  assert.equal(Number(row.result_max),13200);

  console.log('Estimator runtime lifecycle checks passed.');
}

main()
  .catch(error=>{console.error(error);process.exitCode=1})
  .finally(async()=>{await cleanup().catch(()=>{});await pool.end()});
