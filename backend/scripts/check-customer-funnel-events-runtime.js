const assert=require('node:assert/strict');
const crypto=require('crypto');
const pool=require('../src/config/database');
const eventService=require('../src/services/customerFunnelEventService');
const analytics=require('../src/services/customerFunnelAnalyticsService');

const sessionIds=[];
const eventIds=[];

function opaque(prefix){
  return prefix+'_'+crypto.randomBytes(18).toString('base64url');
}

async function cleanup(){
  if(sessionIds.length)await pool.query('DELETE FROM customer_funnel_events WHERE session_id = ANY($1::text[])',[sessionIds]).catch(()=>{});
}

async function record(sessionId,eventType,{flowKey,flowType,calculationId=null,questionKey=null,questionIndex=null,questionCount=null,metadata={}}={}){
  const eventId=opaque('evt');
  eventIds.push(eventId);
  return eventService.recordEvent({
    eventId,sessionId,eventType,flowKey,flowType,calculationId,questionKey,questionIndex,questionCount,
    source:'ci_runtime',pagePath:'/ci-funnel-test',metadata
  });
}

async function main(){
  await cleanup();

  const estimator=(await pool.query(
    `SELECT id,key,name FROM customer_flow_definitions
      WHERE flow_type='estimator' AND is_active=TRUE
      ORDER BY CASE WHEN key='interior-cost-estimator' THEN 0 ELSE 1 END,id LIMIT 1`
  )).rows[0];
  const requirement=(await pool.query(
    `SELECT id,key,name FROM customer_flow_definitions
      WHERE flow_type='requirement' AND is_active=TRUE
      ORDER BY CASE WHEN key='build' THEN 0 WHEN key='design' THEN 1 ELSE 2 END,id LIMIT 1`
  )).rows[0];
  assert.ok(estimator?.id&&estimator?.key,'Published estimator definition is required');
  assert.ok(requirement?.id&&requirement?.key,'Requirement definition is required');

  const estimatorQuestions=(await pool.query(
    `SELECT q.question_key,q.label
       FROM customer_flow_questions q
       JOIN customer_flow_versions v ON v.id=q.version_id
      WHERE v.definition_id=$1 AND v.status='published' AND q.is_active=TRUE
      ORDER BY q.display_order,q.id`,
    [estimator.id]
  )).rows;
  const requirementQuestions=(await pool.query(
    `SELECT q.question_key,q.label
       FROM customer_flow_questions q
       JOIN customer_flow_versions v ON v.id=q.version_id
      WHERE v.definition_id=$1 AND v.status='published' AND q.is_active=TRUE
      ORDER BY q.display_order,q.id`,
    [requirement.id]
  )).rows;
  assert.ok(estimatorQuestions.length>=2,'Estimator needs at least two published questions for drop-off checks');
  assert.ok(requirementQuestions.length>=1,'Requirement needs at least one published question for drop-off checks');
  const estQ1=estimatorQuestions[0],estQ2=estimatorQuestions[1],reqQ1=requirementQuestions[0];


  const estSession=opaque('ses');
  const reqSession=opaque('ses');
  const abandonSession=opaque('ses');
  sessionIds.push(estSession,reqSession,abandonSession);

  await record(estSession,'home_cta_clicked',{flowKey:estimator.key,flowType:'estimator',metadata:{cta:'interior_estimator',position:'ci',name:'must_not_store',phone:'9999999999'}});
  await record(estSession,'flow_opened',{flowKey:estimator.key,flowType:'estimator'});
  await record(estSession,'flow_started',{flowKey:estimator.key,flowType:'estimator',metadata:{step:1,steps:12}});
  await record(estSession,'flow_question_viewed',{flowKey:estimator.key,flowType:'estimator',questionKey:estQ1.question_key,questionIndex:1,questionCount:estimatorQuestions.length});
  await record(estSession,'flow_question_completed',{flowKey:estimator.key,flowType:'estimator',questionKey:estQ1.question_key,questionIndex:1,questionCount:estimatorQuestions.length});
  await record(estSession,'flow_question_viewed',{flowKey:estimator.key,flowType:'estimator',questionKey:estQ2.question_key,questionIndex:2,questionCount:estimatorQuestions.length});
  const calculationId=crypto.randomBytes(18).toString('base64url');
  await record(estSession,'estimator_contact_opened',{flowKey:estimator.key,flowType:'estimator'});
  await record(estSession,'estimate_completed',{flowKey:estimator.key,flowType:'estimator',calculationId});
  await record(estSession,'quote_form_opened',{flowKey:estimator.key,flowType:'estimator',calculationId});
  await record(estSession,'quote_submitted',{flowKey:estimator.key,flowType:'estimator',calculationId});

  await record(reqSession,'home_cta_clicked',{flowKey:requirement.key,flowType:'requirement'});
  await record(reqSession,'flow_opened',{flowKey:requirement.key,flowType:'requirement'});
  await record(reqSession,'flow_started',{flowKey:requirement.key,flowType:'requirement'});
  await record(reqSession,'flow_question_viewed',{flowKey:requirement.key,flowType:'requirement',questionKey:reqQ1.question_key,questionIndex:1,questionCount:requirementQuestions.length});
  await record(reqSession,'flow_question_completed',{flowKey:requirement.key,flowType:'requirement',questionKey:reqQ1.question_key,questionIndex:1,questionCount:requirementQuestions.length});
  await record(reqSession,'requirement_contact_opened',{flowKey:requirement.key,flowType:'requirement'});
  await record(reqSession,'requirement_submitted',{flowKey:requirement.key,flowType:'requirement'});

  await record(abandonSession,'home_cta_clicked',{flowKey:estimator.key,flowType:'estimator'});
  await record(abandonSession,'flow_opened',{flowKey:estimator.key,flowType:'estimator'});
  await record(abandonSession,'flow_question_viewed',{flowKey:estimator.key,flowType:'estimator',questionKey:estQ1.question_key,questionIndex:1,questionCount:estimatorQuestions.length});

  const duplicateId=opaque('evt');
  eventIds.push(duplicateId);
  const first=await eventService.recordEvent({
    eventId:duplicateId,sessionId:estSession,eventType:'flow_opened',
    flowKey:estimator.key,flowType:'estimator',source:'ci_runtime',pagePath:'/ci-funnel-test'
  });
  const duplicate=await eventService.recordEvent({
    eventId:duplicateId,sessionId:estSession,eventType:'flow_opened',
    flowKey:estimator.key,flowType:'estimator',source:'ci_runtime',pagePath:'/ci-funnel-test'
  });
  assert.equal(first.accepted,true);
  assert.equal(first.duplicate,false);
  assert.equal(duplicate.duplicate,true);

  const stored=(await pool.query(
    `SELECT metadata FROM customer_funnel_events
      WHERE session_id=$1 AND event_type='home_cta_clicked'
      ORDER BY id LIMIT 1`,
    [estSession]
  )).rows[0];
  assert.equal(stored.metadata.cta,'interior_estimator');
  assert.equal(stored.metadata.position,'ci');
  assert.equal(stored.metadata.name,undefined,'Contact-like arbitrary metadata must not be persisted');
  assert.equal(stored.metadata.phone,undefined,'Phone metadata must not be persisted');

  const storedQuestion=(await pool.query(
    `SELECT question_key,question_index,question_count,metadata
       FROM customer_funnel_events
      WHERE session_id=$1 AND event_type='flow_question_viewed'
      ORDER BY id LIMIT 1`,
    [estSession]
  )).rows[0];
  assert.equal(storedQuestion.question_key,estQ1.question_key);
  assert.equal(Number(storedQuestion.question_index),1);
  assert.equal(Number(storedQuestion.question_count),estimatorQuestions.length);
  assert.deepEqual(storedQuestion.metadata,{},'Question events must not contain answer payloads');


  const report=await analytics.getCustomerFunnelAnalytics({period:'30'});
  const estFlow=report.journeyTracking.flows.find(flow=>flow.flowKey===estimator.key);
  const reqFlow=report.journeyTracking.flows.find(flow=>flow.flowKey===requirement.key);
  assert.ok(estFlow,'Estimator tracked journey must be returned');
  assert.ok(reqFlow,'Requirement tracked journey must be returned');
  assert.ok(estFlow.homepageCtaSessions>=2);
  assert.ok(estFlow.homepageHandoffSessions>=2);
  assert.ok(estFlow.openedSessions>=2);
  assert.ok(estFlow.startedSessions>=1);
  assert.ok(estFlow.stages.some(stage=>stage.key==='estimator_contact_opened'&&stage.sessions>=1));
  assert.ok(estFlow.stages.some(stage=>stage.key==='quote_submitted'&&stage.sessions>=1));
  assert.ok(estFlow.stages.some(stage=>stage.key==='flow_started'&&stage.dropOff>=1),'Estimator abandonment must be visible between open and start');
  assert.ok(reqFlow.stages.some(stage=>stage.key==='requirement_submitted'&&stage.sessions>=1));
  assert.ok(report.journeyTracking.uniqueSessions>=3);
  assert.ok(report.journeyTracking.events>=13);

  const estQuestionFlow=report.questionDropoff.find(flow=>flow.flowKey===estimator.key);
  const reqQuestionFlow=report.questionDropoff.find(flow=>flow.flowKey===requirement.key);
  assert.ok(estQuestionFlow,'Estimator question diagnostics must be returned');
  assert.ok(reqQuestionFlow,'Requirement question diagnostics must be returned');
  const estQuestionOne=estQuestionFlow.questions.find(question=>question.questionKey===estQ1.question_key);
  const estQuestionTwo=estQuestionFlow.questions.find(question=>question.questionKey===estQ2.question_key);
  assert.ok(estQuestionOne&&estQuestionOne.viewed>=2,'Estimator first question views must include both sessions');
  assert.ok(estQuestionOne.completed>=1,'Estimator first question completion must be counted');
  assert.ok(estQuestionOne.abandoned>=1,'Estimator first-question abandonment must be visible');
  assert.ok(estQuestionTwo&&estQuestionTwo.viewed>=1,'Estimator second question view must be counted');
  assert.equal(estQuestionTwo.completed,0,'Estimator second question should expose the simulated drop-off');
  assert.ok(reqQuestionFlow.questions.some(question=>question.questionKey===reqQ1.question_key&&question.completed>=1),'Requirement question completion must be counted');


  const filtered=await analytics.getCustomerFunnelAnalytics({period:'30',flowId:String(estimator.id)});
  assert.ok(filtered.journeyTracking.flows.every(flow=>flow.flowKey===estimator.key),'Flow filter must scope tracked event analytics');
  assert.ok(filtered.questionDropoff.every(flow=>flow.flowKey===estimator.key),'Flow filter must scope question diagnostics');

  await assert.rejects(
    ()=>eventService.recordEvent({
      eventId:opaque('evt'),sessionId:estSession,eventType:'contact_typed',
      flowKey:estimator.key,flowType:'estimator'
    }),
    error=>error?.code==='INVALID_FUNNEL_EVENT'
  );

  await assert.rejects(
    ()=>eventService.recordEvent({
      eventId:opaque('evt'),sessionId:reqSession,eventType:'quote_submitted',
      flowKey:requirement.key,flowType:'requirement'
    }),
    error=>error?.code==='INVALID_FUNNEL_EVENT'
  );
  await assert.rejects(
    ()=>eventService.recordEvent({
      eventId:opaque('evt'),sessionId:reqSession,eventType:'flow_opened',
      flowKey:'not-a-real-flow',flowType:'requirement'
    }),
    error=>error?.code==='INVALID_FUNNEL_EVENT'
  );

  await assert.rejects(
    ()=>eventService.recordEvent({
      eventId:opaque('evt'),sessionId:estSession,eventType:'flow_question_viewed',
      flowKey:estimator.key,flowType:'estimator',questionKey:'not_a_real_question',questionIndex:1,questionCount:2
    }),
    error=>error?.code==='INVALID_FUNNEL_EVENT'
  );
  await assert.rejects(
    ()=>eventService.recordEvent({
      eventId:opaque('evt'),sessionId:estSession,eventType:'flow_opened',
      flowKey:estimator.key,flowType:'estimator',questionKey:estQ1.question_key,questionIndex:1,questionCount:estimatorQuestions.length
    }),
    error=>error?.code==='INVALID_FUNNEL_EVENT'
  );

  const cleaned=eventService.cleanMetadata({cta:'x',position:'unknown',step:2,email:'secret@example.com',answers:{budget:'secret'}});
  assert.deepEqual(cleaned,{step:2});

  console.log('Customer funnel event tracking runtime checks passed.');
}

main()
  .catch(error=>{console.error(error);process.exitCode=1})
  .finally(async()=>{await cleanup().catch(()=>{});await pool.end()});
