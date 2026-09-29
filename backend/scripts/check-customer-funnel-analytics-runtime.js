const assert = require('node:assert/strict');
const crypto = require('crypto');
const pool = require('../src/config/database');
const leadService = require('../src/services/leadService');
const funnel = require('../src/services/customerFunnelAnalyticsService');

let directLeadId=null;
let estimatorLeadId=null;
const publicIds=[];

async function cleanup(){
  if(publicIds.length) await pool.query('DELETE FROM estimator_calculations WHERE public_id = ANY($1::text[])',[publicIds]).catch(()=>{});
  const fixtureRows=(await pool.query(
    `SELECT id FROM leads WHERE customer_email IN ('ci-funnel-direct@example.com','ci-funnel-estimator@example.com')`
  ).catch(()=>({rows:[]}))).rows||[];
  const ids=new Set([...fixtureRows.map(row=>Number(row.id)),directLeadId,estimatorLeadId].filter(Boolean));
  if(ids.size){
    const values=[...ids];
    await pool.query('DELETE FROM estimator_calculations WHERE lead_id = ANY($1::int[])',[values]).catch(()=>{});
    await pool.query('DELETE FROM lead_purchases WHERE lead_id = ANY($1::int[])',[values]).catch(()=>{});
    await pool.query('DELETE FROM leads WHERE id = ANY($1::int[])',[values]).catch(()=>{});
  }
}

async function main(){
  await cleanup();
  const scope=(await pool.query(
    `SELECT d.id definition_id,d.key,d.industry_id,d.service_id,d.subservice_id,
            v.id version_id,c.id city_id,c.state_id,c.name city_name
       FROM customer_flow_definitions d
       JOIN customer_flow_versions v ON v.definition_id=d.id AND v.status='published'
       JOIN cities c ON c.is_active=TRUE
      WHERE d.flow_type='estimator' AND d.is_active=TRUE AND d.service_id IS NOT NULL
      ORDER BY CASE WHEN d.key='interior-cost-estimator' THEN 0 ELSE 1 END,v.version_no DESC,c.id
      LIMIT 1`
  )).rows[0];
  assert.ok(scope?.definition_id&&scope?.version_id&&scope?.industry_id&&scope?.service_id&&scope?.city_id&&scope?.state_id,'Estimator and location fixtures are required');

  const direct=await leadService.createLead({
    industryId:scope.industry_id,
    serviceId:scope.service_id,
    subserviceId:scope.subservice_id,
    stateId:scope.state_id,
    cityId:scope.city_id,
    customerName:'CI Funnel Direct',
    customerPhone:'+919812340101',
    customerEmail:'ci-funnel-direct@example.com',
    requirement:'CI funnel direct requirement fixture',
    propertyType:'Apartment',
    budget:null,
    source:'public_requirement',
    notes:null,
    customFields:{_intake:{flowKey:'build',definitionId:999991,versionId:999991,versionNo:1,answers:{}}},
    pincode:'500001',
    createdBy:null,
    deferQualityGate:true,
    qualityGateContext:'public_requirement'
  });
  directLeadId=Number(direct.id);

  const estimatorLead=await leadService.createLead({
    industryId:scope.industry_id,
    serviceId:scope.service_id,
    subserviceId:scope.subservice_id,
    stateId:scope.state_id,
    cityId:scope.city_id,
    customerName:'CI Funnel Estimator',
    customerPhone:'+919812340102',
    customerEmail:'ci-funnel-estimator@example.com',
    requirement:'CI funnel estimator requirement fixture',
    propertyType:'Apartment',
    budget:null,
    source:'public_estimator',
    notes:null,
    customFields:{_estimator:{calculationId:'fixture',contactPending:true,lifecycle:'estimate_completed'},_intake:{flowKey:scope.key,definitionId:scope.definition_id,versionId:scope.version_id,versionNo:1,answers:{}}},
    pincode:'500001',
    createdBy:null,
    deferQualityGate:true,
    qualityGateContext:'public_estimator'
  });
  estimatorLeadId=Number(estimatorLead.id);

  const convertedId='ci_funnel_'+crypto.randomBytes(12).toString('hex');
  const unconvertedId='ci_funnel_'+crypto.randomBytes(12).toString('hex');
  publicIds.push(convertedId,unconvertedId);
  const snapshot=JSON.stringify({flow:{definitionId:Number(scope.definition_id),key:scope.key,versionId:Number(scope.version_id),versionNo:1},rates:[],adjustments:[]});
  const hash=crypto.createHash('sha256').update(snapshot).digest('hex');

  await pool.query(
    `INSERT INTO estimator_calculations(public_id,definition_id,version_id,city_id,pincode,answers,config_snapshot,config_hash,result_min,result_max,currency,lead_id,converted_at)
     VALUES
       ($1,$3,$4,$5,'500001','{}'::jsonb,$6::jsonb,$7,100000.00,150000.00,'INR',$8,CURRENT_TIMESTAMP),
       ($2,$3,$4,$5,'500001','{}'::jsonb,$6::jsonb,$7,200000.00,260000.00,'INR',NULL,NULL)`,
    [convertedId,unconvertedId,scope.definition_id,scope.version_id,scope.city_id,snapshot,hash,estimatorLeadId]
  );

  const all=await funnel.getCustomerFunnelAnalytics({period:'30',limit:'25'});
  assert.ok(all.summary.calculations>=2,'Funnel summary must count estimator calculations');
  assert.ok(all.summary.converted>=1,'Funnel summary must count quote conversions');
  assert.ok(all.summary.directRequirementLeads>=1,'Funnel summary must count direct requirement leads');
  assert.ok(all.summary.estimatorCanonicalLeads>=1,'Funnel summary must count estimator canonical leads');
  assert.ok(all.sources.some(item=>item.source==='public_requirement'&&item.leads>=1),'Direct requirement source row is required');
  assert.ok(all.sources.some(item=>item.source==='public_estimator'&&item.leads>=1),'Estimator source row is required');
  assert.ok(all.requirements.some(item=>item.flowKey==='build'&&item.leads>=1),'Requirement flow attribution must use _intake.flowKey');
  assert.ok(all.cities.some(item=>Number(item.cityId)===Number(scope.city_id)&&item.calculations>=2),'City attribution must include estimator calculations');
  assert.ok(all.recent.items.some(item=>item.calculationId===convertedId&&Number(item.leadId)===estimatorLeadId),'Recent history must link converted calculation to canonical lead');
  assert.ok(all.recentCustomerLeads.some(item=>Number(item.leadId)===directLeadId&&item.source==='public_requirement'&&item.contactReady===true),'Operational queue must include direct requirement leads');
  const estimatorQueue=all.recentCustomerLeads.find(item=>Number(item.leadId)===estimatorLeadId);
  assert.ok(estimatorQueue,'Operational queue must include estimator leads');
  assert.equal(estimatorQueue.contactPending,true);
  assert.equal(estimatorQueue.contactReady,false);
  assert.equal(estimatorQueue.flowKey,scope.key);
  assert.equal(estimatorQueue.calculationId,convertedId);

  const directAdminPage=await leadService.getAdminLeadsPage({source:'public_requirement',leadId:String(directLeadId),limit:12});
  assert.equal(directAdminPage.data.length,1,'Admin source filter must isolate the direct customer lead');
  assert.equal(Number(directAdminPage.data[0].id),directLeadId);

  const waitingAdminPage=await leadService.getAdminLeadsPage({source:'public_estimator',contactState:'awaiting_contact',leadId:String(estimatorLeadId),limit:12});
  assert.equal(waitingAdminPage.data.length,1,'Admin contact filter must expose contact-pending estimator leads');
  assert.equal(Number(waitingAdminPage.data[0].id),estimatorLeadId);

  const readyAdminPage=await leadService.getAdminLeadsPage({source:'public_estimator',contactState:'contact_ready',leadId:String(estimatorLeadId),limit:12});
  assert.equal(readyAdminPage.data.length,0,'Contact-pending estimator leads must not appear in the contact-ready filter');

  const converted=await funnel.getCustomerFunnelAnalytics({
    period:'30',
    flowId:String(scope.definition_id),
    conversion:'converted',
    q:convertedId,
    limit:'10'
  });
  assert.equal(converted.recent.pagination.total,1,'Converted/search filter must isolate the converted calculation fixture');
  assert.equal(converted.recent.items[0].calculationId,convertedId);
  assert.equal(converted.recent.items[0].flowKey,scope.key);

  const onlyEstimate=await funnel.getCustomerFunnelAnalytics({
    period:'30',
    flowId:String(scope.definition_id),
    conversion:'unconverted',
    q:unconvertedId,
    limit:'10'
  });
  assert.equal(onlyEstimate.recent.pagination.total,1,'Unconverted filter must isolate estimate-only calculation fixture');
  assert.equal(onlyEstimate.recent.items[0].leadId,null);

  const parsed=funnel.parseFilters({period:'nonsense',page:'-1',limit:'9999',conversion:'bad'});
  assert.equal(parsed.periodKey,'30');
  assert.equal(parsed.page,1);
  assert.equal(parsed.limit,100);
  assert.equal(parsed.conversion,'all');

  console.log('Customer funnel analytics runtime checks passed.');
}

main()
  .catch(error=>{console.error(error);process.exitCode=1})
  .finally(async()=>{await cleanup().catch(()=>{});await pool.end()});
