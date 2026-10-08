const assert = require('node:assert/strict');
const crypto = require('crypto');
const pool = require('../src/config/database');
const customerFlowService = require('../src/services/customerFlowService');
const estimatorService = require('../src/services/estimatorService');

const KEY='ci-estimator-conversion';
let definitionId=null;
let calculationId=null;
let leadId=null;
let pricingRuleId=null;

async function cleanup(){
  if(!definitionId){
    const row=(await pool.query('SELECT id FROM customer_flow_definitions WHERE key=$1',[KEY])).rows[0];
    definitionId=row?.id||null;
  }
  if(definitionId){
    const leads=(await pool.query(
      `SELECT DISTINCT lead_id FROM estimator_calculations WHERE definition_id=$1 AND lead_id IS NOT NULL`,
      [definitionId]
    )).rows.map(row=>Number(row.lead_id)).filter(Boolean);
    await pool.query('DELETE FROM estimator_calculations WHERE definition_id=$1',[definitionId]);
    for(const id of leads) await pool.query('DELETE FROM leads WHERE id=$1',[id]).catch(()=>{});
    await pool.query('DELETE FROM customer_flow_definitions WHERE id=$1',[definitionId]).catch(()=>{});
  }
  if(leadId) await pool.query('DELETE FROM leads WHERE id=$1',[leadId]).catch(()=>{});
  if(pricingRuleId) await pool.query('DELETE FROM lead_pricing_rules WHERE id=$1',[pricingRuleId]).catch(()=>{});
}

async function main(){
  await cleanup();
  const scope=(await pool.query(
    `SELECT i.id industry_id,s.id service_id,ss.id subservice_id
       FROM industries i
       JOIN services s ON s.industry_id=i.id AND s.is_active=TRUE
       LEFT JOIN subservices ss ON ss.service_id=s.id AND ss.is_active=TRUE
      WHERE i.is_active=TRUE
      ORDER BY CASE WHEN i.slug='interior-design-home-improvement' THEN 0 ELSE 1 END,
               CASE WHEN s.slug='interior-design' THEN 0 ELSE 1 END,i.id,s.id,ss.id NULLS LAST
      LIMIT 1`
  )).rows[0];
  const location=(await pool.query(
    `SELECT c.id city_id,c.state_id FROM cities c JOIN states s ON s.id=c.state_id
      WHERE c.is_active=TRUE AND s.is_active=TRUE
      ORDER BY CASE WHEN LOWER(c.name)='hyderabad' AND LOWER(s.name)='telangana' THEN 0 ELSE 1 END,c.id LIMIT 1`
  )).rows[0];
  assert.ok(scope?.industry_id&&scope?.service_id&&location?.city_id&&location?.state_id);

  pricingRuleId=(await pool.query(`INSERT INTO lead_pricing_rules(industry_id,city_id,lead_type,pricing,is_active) VALUES($1,$2,'basic',$3::jsonb,TRUE) RETURNING id`,[scope.industry_id,location.city_id,JSON.stringify({shares:[{shares:1,normal:1000,pro:900},{shares:2,normal:700,pro:600},{shares:3,normal:500,pro:400}]})])).rows[0].id;

  const created=await customerFlowService.createDefinition({
    key:KEY,name:'CI Estimator Conversion',flowType:'estimator',
    industryId:scope.industry_id,serviceId:scope.service_id,subserviceId:scope.subservice_id||null,createdBy:null
  });
  definitionId=created.id;

  const draft=await customerFlowService.saveDraft(created.id,{
    name:'CI Estimator Conversion',industryId:scope.industry_id,serviceId:scope.service_id,subserviceId:scope.subservice_id||null,isActive:true,
    config:{headline:'CI conversion'},
    questions:[
      {questionKey:'property_type',questionType:'single_select',label:'Property type',isRequired:true,displayOrder:10,validation:{},showWhen:{},leadField:'property_type',visibility:'marketplace',isActive:true,options:[{value:'apartment',label:'Apartment',displayOrder:10,isActive:true}]},
      {questionKey:'area',questionType:'area',label:'Area',isRequired:true,displayOrder:20,validation:{min:1,max:10000},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[]},
      {questionKey:'timeline',questionType:'timeline',label:'Timeline',isRequired:true,displayOrder:30,validation:{},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[{value:'soon',label:'Soon',displayOrder:10,isActive:true}]}
    ]
  },null);

  await estimatorService.saveAdminConfig(created.id,{
    rates:[{rateKey:'base',label:'Base',calculationType:'per_unit',unitQuestionKey:'area',amountMin:'100.00',amountMax:'120.00',showWhen:{},displayOrder:10,isActive:true}],
    adjustments:[]
  });
  await customerFlowService.publish(created.id,null);
  const flow=await customerFlowService.getPublishedFlow(KEY);

  const publicId=crypto.randomBytes(18).toString('base64url');
  calculationId=publicId;
  const answers={property_type:'apartment',area:'1000',timeline:'soon'};
  const snapshot={flow:{definitionId:flow.definitionId,key:flow.key,versionId:flow.versionId,versionNo:flow.versionNo},rates:[],adjustments:[]};
  const snapshotJson=JSON.stringify(snapshot);
  const hash=crypto.createHash('sha256').update(snapshotJson).digest('hex');
  await pool.query(
    `INSERT INTO estimator_calculations(public_id,definition_id,version_id,city_id,pincode,answers,config_snapshot,config_hash,result_min,result_max,currency)
     VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,100000.00,120000.00,'INR')`,
    [publicId,flow.definitionId,flow.versionId,location.city_id,'500001',JSON.stringify(answers),snapshotJson,hash]
  );

  const first=await estimatorService.convertCalculation({
    publicId,
    contact:{name:'CI Estimator Customer',phone:'9123456789',email:'ci-estimator@example.com'},
    consent:true,
    submissionKey:'ci_estimator_conversion_001',
    website:''
  });
  assert.equal(first.accepted,true);
  assert.equal(first.duplicate,false);
  assert.ok(first.leadId);
  leadId=Number(first.leadId);

  const lead=(await pool.query(
    `SELECT * FROM leads WHERE id=$1`,
    [leadId]
  )).rows[0];
  assert.ok(lead);
  assert.equal(lead.source,'public_estimator');
  assert.equal(Number(lead.industry_id),Number(scope.industry_id));
  assert.equal(Number(lead.service_id),Number(scope.service_id));
  assert.equal(Number(lead.city_id),Number(location.city_id));
  assert.equal(Number(lead.state_id),Number(location.state_id));
  assert.equal(lead.customer_phone,'+919123456789');
  assert.equal(lead.property_type,'Apartment');
  assert.equal(lead.contact_consent_version,'estimator-quote-contact-v1');
  assert.equal(lead.custom_fields?._estimator?.calculationId,publicId);
  assert.equal(lead.custom_fields?._estimator?.minimum,100000);
  assert.equal(lead.requirement,null,'Estimator submissions without a typed requirement must keep Requirement empty');
  assert.equal(lead.custom_fields?._intake?.writtenRequirement,null);

  const linked=(await pool.query(
    'SELECT lead_id,converted_at FROM estimator_calculations WHERE public_id=$1',
    [publicId]
  )).rows[0];
  assert.equal(Number(linked.lead_id),leadId);
  assert.ok(linked.converted_at);

  const second=await estimatorService.convertCalculation({
    publicId,
    contact:{name:'Different Name',phone:'9876543210',email:''},
    consent:true,
    submissionKey:'ci_estimator_conversion_002',
    website:''
  });
  assert.equal(second.accepted,true);
  assert.equal(second.duplicate,true);
  assert.equal(Number(second.leadId),leadId);

  const count=Number((await pool.query(
    `SELECT COUNT(*)::int count FROM leads WHERE source='public_estimator' AND custom_fields->'_estimator'->>'calculationId'=$1`,
    [publicId]
  )).rows[0].count);
  assert.equal(count,1);

  console.log('Estimator quote conversion runtime checks passed.');
}

main()
  .catch(error=>{console.error(error);process.exitCode=1})
  .finally(async()=>{await cleanup().catch(()=>{});await pool.end()});
