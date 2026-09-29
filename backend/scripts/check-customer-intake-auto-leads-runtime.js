const assert=require('node:assert/strict');
const pool=require('../src/config/database');
const customerFlowService=require('../src/services/customerFlowService');
const publicLeadIntakeService=require('../src/services/publicLeadIntakeService');

const FLOW_KEY='ci-auto-lead-requirement';
let pincode=null;
let definitionId=null;
let leadId=null;
let cityId=null;

async function cleanup(){
  if(leadId)await pool.query('DELETE FROM leads WHERE id=$1',[leadId]).catch(()=>{});
  const existing=(await pool.query('SELECT id FROM customer_flow_definitions WHERE key=$1',[FLOW_KEY])).rows[0];
  if(existing)await pool.query('DELETE FROM customer_flow_definitions WHERE id=$1',[existing.id]).catch(()=>{});
  if(cityId&&pincode)await pool.query('DELETE FROM city_pincodes WHERE city_id=$1 AND pincode=$2',[cityId,pincode]).catch(()=>{});
  if(pincode)await pool.query("DELETE FROM india_pincodes WHERE pincode=$1 AND source='ci-auto-lead'",[pincode]).catch(()=>{});
}

async function main(){
  await cleanup();
  const scope=(await pool.query(
    `SELECT i.id industry_id,c.id city_id,c.name city_name,c.state_id,s.name state_name
       FROM industries i
       CROSS JOIN LATERAL (
         SELECT c.id,c.name,c.state_id
           FROM cities c
          WHERE c.is_active=TRUE
          ORDER BY c.id LIMIT 1
       ) c
       JOIN states s ON s.id=c.state_id AND s.is_active=TRUE
      WHERE i.is_active=TRUE
      ORDER BY i.id LIMIT 1`
  )).rows[0];
  assert.ok(scope?.industry_id&&scope?.city_id&&scope?.state_id);
  cityId=Number(scope.city_id);

  pincode=(await pool.query(
    `SELECT candidate::text pincode
       FROM generate_series(699900,699999) candidate
      WHERE NOT EXISTS(SELECT 1 FROM india_pincodes p WHERE p.pincode=candidate::text)
        AND NOT EXISTS(SELECT 1 FROM city_pincodes cp WHERE cp.pincode=candidate::text)
      ORDER BY candidate DESC LIMIT 1`
  )).rows[0]?.pincode;
  assert.ok(pincode,'CI test needs one unused six-digit PIN');

  await pool.query(
    `INSERT INTO india_pincodes(pincode,state_id,state_name,district_name,office_count,source,synced_at,postal_areas,postal_data,detected_at,is_active)
     VALUES($1,$2,$3,$4,1,'ci-auto-lead',CURRENT_TIMESTAMP,$5::jsonb,'[]'::jsonb,CURRENT_TIMESTAMP,TRUE)`,
    [pincode,scope.state_id,scope.state_name,scope.city_name,JSON.stringify([scope.city_name])]
  );
  const mapped=(await pool.query(
    'SELECT 1 FROM city_pincodes WHERE city_id=$1 AND pincode=$2 AND is_active=TRUE LIMIT 1',
    [scope.city_id,pincode]
  )).rowCount;
  assert.equal(mapped,1,'India PIN directory trigger must create the canonical city mapping');

  const created=await customerFlowService.createDefinition({
    key:FLOW_KEY,name:'CI Automatic Requirement Lead',flowType:'requirement',
    industryId:scope.industry_id,serviceId:null,subserviceId:null,createdBy:null,
  });
  definitionId=created.id;
  await customerFlowService.saveDraft(created.id,{
    name:'CI Automatic Requirement Lead',industryId:scope.industry_id,serviceId:null,subserviceId:null,isActive:true,
    config:{headline:'CI automatic lead'},
    questions:[
      {questionKey:'location',questionType:'location',label:'Project location',isRequired:true,displayOrder:10,validation:{},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[]},
      {questionKey:'requirement',questionType:'text',label:'Requirement',isRequired:true,displayOrder:20,validation:{maxLength:500},showWhen:{},leadField:'requirement',visibility:'marketplace',isActive:true,options:[]},
    ],
  },null);
  await customerFlowService.publish(created.id,null);
  const flow=await customerFlowService.getPublishedFlow(FLOW_KEY);
  const submissionKey='ci_requirement_auto_lead_001';

  const first=await publicLeadIntakeService.submitRequirement({
    key:FLOW_KEY,flowToken:flow.flowToken,
    answers:{location:pincode,requirement:'CI customer submitted requirement'},
    contact:{name:'CI Requirement Customer',phone:'9234567890',email:'ci-requirement@example.com'},
    consent:true,submissionKey,website:'',
  });
  assert.equal(first.accepted,true);
  assert.equal(first.duplicate,false);
  assert.ok(first.leadId);
  leadId=Number(first.leadId);

  const lead=(await pool.query('SELECT * FROM leads WHERE id=$1',[leadId])).rows[0];
  assert.ok(lead);
  assert.equal(lead.source,'public_requirement');
  assert.equal(lead.customer_name,'CI Requirement Customer');
  assert.equal(lead.customer_phone,'+919234567890');
  assert.equal(lead.pincode,pincode);
  assert.equal(Number(lead.city_id),Number(scope.city_id));
  assert.equal(Number(lead.state_id),Number(scope.state_id));
  assert.equal(lead.intake_submission_key,submissionKey);
  assert.equal(lead.custom_fields?._intake?.flowKey,FLOW_KEY);

  const retry=await publicLeadIntakeService.submitRequirement({
    key:FLOW_KEY,flowToken:flow.flowToken,
    answers:{location:pincode,requirement:'CI customer submitted requirement'},
    contact:{name:'CI Requirement Customer',phone:'9234567890',email:'ci-requirement@example.com'},
    consent:true,submissionKey,website:'',
  });
  assert.equal(retry.accepted,true);
  assert.equal(retry.duplicate,true);
  assert.equal(Number(retry.leadId),leadId);

  const count=Number((await pool.query('SELECT COUNT(*)::int count FROM leads WHERE intake_submission_key=$1',[submissionKey])).rows[0].count);
  assert.equal(count,1);
  console.log('Customer requirement automatic lead checks passed.');
}

main()
  .catch(error=>{console.error(error);process.exitCode=1})
  .finally(async()=>{await cleanup().catch(()=>{});await pool.end()});
