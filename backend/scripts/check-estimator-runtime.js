const assert = require('node:assert/strict');
const pool = require('../src/config/database');
const customerFlowService = require('../src/services/customerFlowService');
const estimatorService = require('../src/services/estimatorService');

const KEY='ci-estimator-runtime';

async function cleanup(){
  const existing=(await pool.query('SELECT id FROM customer_flow_definitions WHERE key=$1',[KEY])).rows[0];
  if(!existing)return;
  const leadIds=(await pool.query('SELECT DISTINCT lead_id FROM estimator_calculations WHERE definition_id=$1 AND lead_id IS NOT NULL',[existing.id])).rows.map(row=>Number(row.lead_id)).filter(Boolean);
  await pool.query('DELETE FROM estimator_calculations WHERE definition_id=$1',[existing.id]);
  for(const leadId of leadIds)await pool.query('DELETE FROM leads WHERE id=$1',[leadId]).catch(()=>{});
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

  await assert.rejects(
    ()=>estimatorService.calculate({
      key:KEY,flowToken:flow.flowToken,answers:{area:'100',quality:'premium'},submissionKey:'ci_estimator_missing_contact_001',
      contact:{name:'',phone:'',email:''},consent:true,website:'',
    }),
    error=>error.code==='INVALID_CONTACT'
  );
  await assert.rejects(
    ()=>estimatorService.calculate({
      key:KEY,flowToken:flow.flowToken,answers:{area:'100',quality:'premium'},submissionKey:'ci_estimator_invalid_phone_001',
      contact:{name:'CI Customer',phone:'123',email:''},consent:true,website:'',
    }),
    error=>error.code==='INVALID_PHONE'
  );
  await assert.rejects(
    ()=>estimatorService.calculate({
      key:KEY,flowToken:flow.flowToken,answers:{area:'100',quality:'premium'},submissionKey:'ci_estimator_missing_consent_001',
      contact:{name:'CI Customer',phone:'9345678901',email:''},consent:false,website:'',
    }),
    error=>error.code==='CONSENT_REQUIRED'
  );

  const submissionKey='ci_estimator_runtime_submission_001';
  const result=await estimatorService.calculate({
    key:KEY,flowToken:flow.flowToken,answers:{area:'100',quality:'premium'},submissionKey,
    contact:{name:'CI Estimate Customer',phone:'9345678901',email:'ci-estimate@example.com'},consent:true,website:'',
  });
  assert.equal(result.minimum,11000);
  assert.equal(result.maximum,13200);
  assert.equal(result.currency,'INR');
  assert.ok(result.calculationId);
  assert.ok(result.leadId,'Completing an estimate must immediately create a canonical lead');
  assert.ok(result.leadStatus,'Estimator lead status must be returned after the normal quality gate');

  const intentLead=(await pool.query('SELECT * FROM leads WHERE id=$1',[result.leadId])).rows[0];
  assert.ok(intentLead);
  assert.equal(intentLead.source,'public_estimator');
  assert.ok(intentLead.status);
  assert.equal(intentLead.customer_name,'CI Estimate Customer');
  assert.equal(intentLead.customer_phone,'+919345678901');
  assert.equal(intentLead.intake_submission_key,submissionKey);
  assert.equal(intentLead.custom_fields?._estimator?.calculationId,result.calculationId);
  assert.equal(intentLead.custom_fields?._estimator?.lifecycle,'estimate_completed');
  assert.equal(intentLead.contact_consent_version,'estimator-contact-v1');


  const saved=await estimatorService.getCalculation(result.calculationId);
  assert.equal(saved.minimum,11000);
  assert.equal(saved.maximum,13200);
  assert.equal(saved.flowKey,KEY);

  const row=(await pool.query(
    'SELECT config_hash,config_snapshot,answers,breakdown,result_min,result_max,lead_id,intake_submission_key FROM estimator_calculations WHERE public_id=$1',
    [result.calculationId]
  )).rows[0];
  assert.equal(String(row.config_hash).length,64);
  assert.equal(row.config_snapshot.flow.key,KEY);
  assert.equal(row.answers.area,'100');
  assert.equal(Number(row.result_min),11000);
  assert.equal(Number(row.result_max),13200);
  assert.ok(Array.isArray(row.breakdown));
  assert.equal(row.breakdown.length,result.breakdown.length);
  assert.equal(row.breakdown[0].key,result.breakdown[0].key);
  assert.equal(Number(row.lead_id),Number(result.leadId));
  assert.equal(row.intake_submission_key,submissionKey);

  const retry=await estimatorService.calculate({
    key:KEY,flowToken:flow.flowToken,answers:{area:'100',quality:'premium'},submissionKey,
    contact:{name:'Different Name',phone:'9876543210',email:''},consent:true,website:'',
  });
  assert.equal(retry.duplicate,true);
  assert.equal(retry.calculationId,result.calculationId);
  assert.equal(Number(retry.leadId),Number(result.leadId));
  const counts=(await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM estimator_calculations WHERE intake_submission_key=$1) calculations,
       (SELECT COUNT(*)::int FROM leads WHERE intake_submission_key=$1) leads`,
    [submissionKey]
  )).rows[0];
  assert.equal(Number(counts.calculations),1);
  assert.equal(Number(counts.leads),1);

  const versionTwoDraft=await customerFlowService.saveDraft(created.id,{
    name:'CI Generic Estimator',
    industryId:scope.industry_id,
    serviceId:scope.service_id||null,
    subserviceId:null,
    isActive:true,
    config:{headline:'CI estimate v2',resultTitle:'CI estimated range'},
    questions:[
      {questionKey:'area',questionType:'area',label:'Area',isRequired:true,displayOrder:10,validation:{min:1,max:100000},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[]},
      {questionKey:'quality',questionType:'single_select',label:'Quality',isRequired:true,displayOrder:20,validation:{},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[
        {value:'standard',label:'Standard',displayOrder:10,isActive:true},
        {value:'premium',label:'Premium',displayOrder:20,isActive:true},
      ]},
    ],
  },null);
  assert.equal(versionTwoDraft.editingVersion.status,'draft');
  await estimatorService.saveAdminConfig(created.id,{
    rates:[{
      rateKey:'base_area',label:'Base area rate v2',calculationType:'per_unit',unitQuestionKey:'area',
      amountMin:'200.00',amountMax:'220.00',showWhen:{},displayOrder:10,isActive:true,
    }],
    adjustments:[],
  });
  await customerFlowService.publish(created.id,null);
  const flowV2=await customerFlowService.getPublishedFlow(KEY);
  assert.ok(Number(flowV2.versionNo)>Number(flow.versionNo));

  const historicalRetry=await estimatorService.calculate({
    key:KEY,flowToken:flowV2.flowToken,answers:{area:'100',quality:'premium'},submissionKey,
    contact:{name:'Ignored Retry Name',phone:'9123456789',email:''},consent:true,website:'',
  });
  assert.equal(historicalRetry.duplicate,true);
  assert.equal(historicalRetry.calculationId,result.calculationId);
  assert.equal(historicalRetry.minimum,11000);
  assert.equal(historicalRetry.maximum,13200);
  assert.equal(Number(historicalRetry.versionNo),Number(flow.versionNo));

  const freshAfterPublish=await estimatorService.calculate({
    key:KEY,flowToken:flowV2.flowToken,answers:{area:'100',quality:'standard'},submissionKey:'ci_estimator_runtime_submission_002',
    contact:{name:'CI Estimate Customer Two',phone:'9345678902',email:''},consent:true,website:'',
  });
  assert.equal(freshAfterPublish.minimum,20000);
  assert.equal(freshAfterPublish.maximum,22000);
  assert.equal(Number(freshAfterPublish.versionNo),Number(flowV2.versionNo));

  console.log('Estimator runtime lifecycle checks passed.');
}

main()
  .catch(error=>{console.error(error);process.exitCode=1})
  .finally(async()=>{await cleanup().catch(()=>{});await pool.end()});
