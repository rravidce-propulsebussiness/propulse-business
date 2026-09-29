const pool = require('../config/database');

const PERIODS = new Map([
  ['7',7],
  ['30',30],
  ['90',90],
  ['365',365],
  ['all',null],
]);
const CONVERSION_FILTERS = new Set(['all','converted','unconverted']);

function positiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed,max);
}

function parseFilters(query = {}) {
  const periodKey = PERIODS.has(String(query.period || '30')) ? String(query.period || '30') : '30';
  const days = PERIODS.get(periodKey);
  const flowIdRaw = Number(query.flowId);
  const flowId = Number.isInteger(flowIdRaw) && flowIdRaw > 0 ? flowIdRaw : null;
  const conversion = CONVERSION_FILTERS.has(String(query.conversion || 'all')) ? String(query.conversion || 'all') : 'all';
  const page = positiveInt(query.page,1,1000000);
  const limit = positiveInt(query.limit,25,100);
  const search = String(query.q || '').trim().slice(0,100);
  const fromDate = days === null ? null : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { periodKey,days,fromDate,flowId,conversion,page,limit,search };
}

function periodClause(alias, values, fromDate) {
  if (!fromDate) return '';
  values.push(fromDate);
  return ` AND ${alias}.created_at >= $${values.length}`;
}

function flowClause(alias, values, flowId) {
  if (!flowId) return '';
  values.push(flowId);
  return ` AND ${alias}.definition_id = $${values.length}`;
}

function percent(part,total) {
  const numerator = Number(part || 0);
  const denominator = Number(total || 0);
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getEstimatorDefinitions() {
  const rows = (await pool.query(
    `SELECT id,key,name,is_active
       FROM customer_flow_definitions
      WHERE flow_type='estimator'
      ORDER BY is_active DESC,name,id`
  )).rows;
  return rows.map(row => ({
    id:Number(row.id),
    key:row.key,
    name:row.name,
    isActive:row.is_active !== false,
  }));
}

async function getEstimatorSummary(filters) {
  const values = [];
  let where = ' WHERE 1=1';
  where += periodClause('ec',values,filters.fromDate);
  where += flowClause('ec',values,filters.flowId);
  const row = (await pool.query(
    `SELECT COUNT(*)::int calculations,
            COUNT(*) FILTER (WHERE ec.converted_at IS NOT NULL)::int converted,
            COALESCE(AVG(ec.result_min),0)::numeric(14,2) average_min,
            COALESCE(AVG(ec.result_max),0)::numeric(14,2) average_max,
            MAX(ec.created_at) latest_calculation_at,
            MAX(ec.converted_at) latest_conversion_at
       FROM estimator_calculations ec${where}`,
    values
  )).rows[0] || {};
  return {
    calculations:number(row.calculations),
    converted:number(row.converted),
    conversionRate:percent(row.converted,row.calculations),
    averageMinimum:number(row.average_min),
    averageMaximum:number(row.average_max),
    latestCalculationAt:row.latest_calculation_at || null,
    latestConversionAt:row.latest_conversion_at || null,
  };
}

async function getEstimatorBreakdown(filters) {
  const values = [];
  let where = ` WHERE d.flow_type='estimator'`;
  where += periodClause('ec',values,filters.fromDate);
  where += flowClause('ec',values,filters.flowId);
  const rows = (await pool.query(
    `SELECT d.id definition_id,d.key,d.name,
            COUNT(ec.id)::int calculations,
            COUNT(ec.id) FILTER (WHERE ec.converted_at IS NOT NULL)::int converted,
            COALESCE(AVG(ec.result_min),0)::numeric(14,2) average_min,
            COALESCE(AVG(ec.result_max),0)::numeric(14,2) average_max,
            MAX(ec.created_at) latest_calculation_at
       FROM customer_flow_definitions d
       LEFT JOIN estimator_calculations ec ON ec.definition_id=d.id
       ${where}
       GROUP BY d.id,d.key,d.name
       ORDER BY calculations DESC,d.name`,
    values
  )).rows;
  return rows.map(row => ({
    definitionId:Number(row.definition_id),
    key:row.key,
    name:row.name,
    calculations:number(row.calculations),
    converted:number(row.converted),
    conversionRate:percent(row.converted,row.calculations),
    averageMinimum:number(row.average_min),
    averageMaximum:number(row.average_max),
    latestCalculationAt:row.latest_calculation_at || null,
  }));
}

async function getLeadSourceBreakdown(filters) {
  const values = ['public_requirement','public_estimator'];
  let where = ` WHERE l.source IN ($1,$2)`;
  where += periodClause('l',values,filters.fromDate);
  const rows = (await pool.query(
    `WITH funnel_leads AS (
       SELECT l.id,l.source,l.status
         FROM leads l
         ${where}
     ),
     paid AS (
       SELECT lp.lead_id,
              COUNT(*) FILTER (WHERE lp.status='paid')::int paid_purchases,
              COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric(14,2) paid_sales
         FROM lead_purchases lp
         JOIN funnel_leads fl ON fl.id=lp.lead_id
        GROUP BY lp.lead_id
     )
     SELECT fl.source,fl.status,COUNT(*)::int leads,
            COUNT(*) FILTER (WHERE COALESCE(p.paid_purchases,0)>0)::int monetized_leads,
            COALESCE(SUM(p.paid_sales),0)::numeric(14,2) paid_sales
       FROM funnel_leads fl
       LEFT JOIN paid p ON p.lead_id=fl.id
       GROUP BY fl.source,fl.status
       ORDER BY fl.source,fl.status`,
    values
  )).rows;

  const bySource = new Map();
  for (const row of rows) {
    const current = bySource.get(row.source) || {
      source:row.source,
      leads:0,
      monetizedLeads:0,
      paidSales:0,
      statuses:{},
    };
    current.leads += number(row.leads);
    current.monetizedLeads += number(row.monetized_leads);
    current.paidSales += number(row.paid_sales);
    current.statuses[row.status] = number(row.leads);
    bySource.set(row.source,current);
  }
  return ['public_requirement','public_estimator'].map(source => bySource.get(source) || {
    source,leads:0,monetizedLeads:0,paidSales:0,statuses:{},
  });
}

async function getRequirementFlowBreakdown(filters) {
  const values = ['public_requirement'];
  let where = ` WHERE l.source=$1`;
  where += periodClause('l',values,filters.fromDate);
  const rows = (await pool.query(
    `SELECT COALESCE(NULLIF(l.custom_fields->'_intake'->>'flowKey',''),'unknown') flow_key,
            COUNT(*)::int leads,
            COUNT(*) FILTER (WHERE l.status='sold')::int sold,
            MAX(l.created_at) latest_lead_at
       FROM leads l
       ${where}
       GROUP BY 1
       ORDER BY leads DESC,flow_key`,
    values
  )).rows;
  return rows.map(row => ({
    flowKey:row.flow_key,
    leads:number(row.leads),
    sold:number(row.sold),
    latestLeadAt:row.latest_lead_at || null,
  }));
}

async function getCityBreakdown(filters) {
  const values = [];
  let where = ' WHERE ec.city_id IS NOT NULL';
  where += periodClause('ec',values,filters.fromDate);
  where += flowClause('ec',values,filters.flowId);
  const rows = (await pool.query(
    `SELECT c.id city_id,c.name city_name,s.name state_name,
            COUNT(ec.id)::int calculations,
            COUNT(ec.id) FILTER (WHERE ec.converted_at IS NOT NULL)::int converted,
            COALESCE(AVG(ec.result_min),0)::numeric(14,2) average_min,
            COALESCE(AVG(ec.result_max),0)::numeric(14,2) average_max
       FROM estimator_calculations ec
       JOIN cities c ON c.id=ec.city_id
       LEFT JOIN states s ON s.id=c.state_id
       ${where}
       GROUP BY c.id,c.name,s.name
       ORDER BY calculations DESC,converted DESC,c.name
       LIMIT 12`,
    values
  )).rows;
  return rows.map(row => ({
    cityId:Number(row.city_id),
    cityName:row.city_name,
    stateName:row.state_name || null,
    calculations:number(row.calculations),
    converted:number(row.converted),
    conversionRate:percent(row.converted,row.calculations),
    averageMinimum:number(row.average_min),
    averageMaximum:number(row.average_max),
  }));
}

const TRACKED_STAGE_CONFIG={
  estimator:[
    ['flow_opened','Wizard opened'],
    ['flow_started','Project started'],
    ['estimator_contact_opened','Contact step reached'],
    ['estimate_completed','Estimate & lead completed'],
  ],
  requirement:[
    ['flow_opened','Wizard opened'],
    ['flow_started','Project started'],
    ['requirement_contact_opened','Contact step reached'],
    ['requirement_submitted','Requirement submitted'],
  ],
};

function stageRate(value,base){
  return percent(value,base);
}

function sqlParam(index){
  return String.fromCharCode(36)+index;
}

async function getTrackedJourneyAnalytics(filters){
  const values=[];
  const clauses=['1=1'];
  if(filters.fromDate){
    values.push(filters.fromDate);
    clauses.push('e.created_at >= '+sqlParam(values.length));
  }
  if(filters.flowId){
    values.push(filters.flowId);
    clauses.push('d.id = '+sqlParam(values.length));
  }
  const where=' WHERE '+clauses.join(' AND ');
  const rows=(await pool.query(
    `SELECT e.flow_key,
            COALESCE(e.flow_type,d.flow_type) flow_type,
            COALESCE(d.name,e.flow_key,'Unknown flow') flow_name,
            e.event_type,
            COUNT(DISTINCT e.session_id)::int sessions,
            COUNT(*)::int events,
            MIN(e.created_at) first_event_at,
            MAX(e.created_at) latest_event_at
       FROM customer_funnel_events e
       LEFT JOIN customer_flow_definitions d ON d.key=e.flow_key
       ${where}
      GROUP BY e.flow_key,COALESCE(e.flow_type,d.flow_type),COALESCE(d.name,e.flow_key,'Unknown flow'),e.event_type
      ORDER BY flow_name,e.event_type`,
    values
  )).rows;

  const handoffValues=[];
  const handoffClauses=['1=1'];
  if(filters.fromDate){
    handoffValues.push(filters.fromDate);
    handoffClauses.push('e.created_at >= '+sqlParam(handoffValues.length));
  }
  if(filters.flowId){
    handoffValues.push(filters.flowId);
    handoffClauses.push('d.id = '+sqlParam(handoffValues.length));
  }
  const handoffWhere=' WHERE '+handoffClauses.join(' AND ');
  const handoffRows=(await pool.query(
    `WITH base AS (
       SELECT e.session_id,e.flow_key,e.event_type,e.created_at
         FROM customer_funnel_events e
         LEFT JOIN customer_flow_definitions d ON d.key=e.flow_key
         ${handoffWhere}
     ),
     cta AS (
       SELECT session_id,flow_key,MIN(created_at) clicked_at
         FROM base
        WHERE event_type='home_cta_clicked' AND flow_key IS NOT NULL
        GROUP BY session_id,flow_key
     ),
     opened AS (
       SELECT session_id,flow_key,MIN(created_at) opened_at
         FROM base
        WHERE event_type='flow_opened' AND flow_key IS NOT NULL
        GROUP BY session_id,flow_key
     )
     SELECT cta.flow_key,
            COUNT(*)::int cta_sessions,
            COUNT(*) FILTER (WHERE opened.opened_at IS NOT NULL)::int handoff_sessions
       FROM cta
       LEFT JOIN opened ON opened.session_id=cta.session_id AND opened.flow_key=cta.flow_key
      GROUP BY cta.flow_key`,
    handoffValues
  )).rows;
  const handoff=new Map(handoffRows.map(row=>[row.flow_key,{
    ctaSessions:number(row.cta_sessions),
    handoffSessions:number(row.handoff_sessions),
  }]));

  const flows=new Map();
  let trackingStartedAt=null;
  let latestEventAt=null;
  for(const row of rows){
    const key=row.flow_key||'unknown';
    const current=flows.get(key)||{
      flowKey:row.flow_key||null,
      flowType:row.flow_type||null,
      flowName:row.flow_name,
      counts:{},
      rawEvents:0,
      firstEventAt:null,
      latestEventAt:null,
    };
    current.counts[row.event_type]=number(row.sessions);
    current.rawEvents+=number(row.events);
    const first=row.first_event_at?new Date(row.first_event_at):null;
    const latest=row.latest_event_at?new Date(row.latest_event_at):null;
    if(first&&(!current.firstEventAt||first<new Date(current.firstEventAt)))current.firstEventAt=row.first_event_at;
    if(latest&&(!current.latestEventAt||latest>new Date(current.latestEventAt)))current.latestEventAt=row.latest_event_at;
    if(first&&(!trackingStartedAt||first<new Date(trackingStartedAt)))trackingStartedAt=row.first_event_at;
    if(latest&&(!latestEventAt||latest>new Date(latestEventAt)))latestEventAt=row.latest_event_at;
    flows.set(key,current);
  }

  const result=[...flows.values()].map(flow=>{
    const config=TRACKED_STAGE_CONFIG[flow.flowType]||[];
    const opened=number(flow.counts.flow_opened);
    let previous=null;
    const stages=config.map(([key,label],index)=>{
      const sessions=number(flow.counts[key]);
      const dropOff=previous===null?0:Math.max(0,previous-sessions);
      const item={
        key,label,sessions,
        retentionRate:index===0?(sessions?100:0):stageRate(sessions,opened),
        stepRate:previous===null?(sessions?100:0):stageRate(sessions,previous),
        dropOff,
        dropOffRate:previous===null?0:percent(dropOff,previous),
      };
      previous=sessions;
      return item;
    });
    const last=stages.at(-1)?.sessions||0;
    const home=handoff.get(flow.flowKey)||{ctaSessions:number(flow.counts.home_cta_clicked),handoffSessions:0};
    return {
      flowKey:flow.flowKey,
      flowType:flow.flowType,
      flowName:flow.flowName,
      homepageCtaSessions:home.ctaSessions,
      homepageHandoffSessions:home.handoffSessions,
      homepageHandoffRate:percent(home.handoffSessions,home.ctaSessions),
      openedSessions:opened,
      startedSessions:number(flow.counts.flow_started),
      completedSessions:last,
      completionRate:percent(last,opened),
      rawEvents:flow.rawEvents,
      firstEventAt:flow.firstEventAt,
      latestEventAt:flow.latestEventAt,
      stages,
    };
  }).sort((a,b)=>b.openedSessions-a.openedSessions||String(a.flowName).localeCompare(String(b.flowName)));

  const uniqueValues=[];
  const uniqueClauses=['1=1'];
  if(filters.fromDate){
    uniqueValues.push(filters.fromDate);
    uniqueClauses.push('e.created_at >= '+sqlParam(uniqueValues.length));
  }
  if(filters.flowId){
    uniqueValues.push(filters.flowId);
    uniqueClauses.push('d.id = '+sqlParam(uniqueValues.length));
  }
  const unique=(await pool.query(
    `SELECT COUNT(DISTINCT e.session_id)::int unique_sessions,
            COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type='home_cta_clicked')::int homepage_cta_sessions,
            COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type='flow_opened')::int wizard_open_sessions,
            COUNT(*)::int events
       FROM customer_funnel_events e
       LEFT JOIN customer_flow_definitions d ON d.key=e.flow_key
      WHERE ${uniqueClauses.join(' AND ')}`,
    uniqueValues
  )).rows[0]||{};

  return {
    trackingStartedAt,
    latestEventAt,
    uniqueSessions:number(unique.unique_sessions),
    homepageCtaSessions:number(unique.homepage_cta_sessions),
    wizardOpenSessions:number(unique.wizard_open_sessions),
    events:number(unique.events),
    flows:result,
  };
}

async function getQuestionDropoffAnalytics(filters){
  const values=[];
  const clauses=[
    "e.event_type IN ('flow_question_viewed','flow_question_completed')",
    'e.question_key IS NOT NULL',
  ];
  if(filters.fromDate){
    values.push(filters.fromDate);
    clauses.push('e.created_at >= '+sqlParam(values.length));
  }
  if(filters.flowId){
    values.push(filters.flowId);
    clauses.push('d.id = '+sqlParam(values.length));
  }
  const rows=(await pool.query(
    `WITH question_events AS (
       SELECT e.flow_key,
              COALESCE(e.flow_type,d.flow_type) flow_type,
              COALESCE(d.name,e.flow_key,'Unknown flow') flow_name,
              d.id definition_id,
              e.question_key,
              MIN(e.question_index)::int first_position,
              MAX(e.question_index)::int last_position,
              MAX(e.question_count)::int max_question_count,
              COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type='flow_question_viewed')::int viewed,
              COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_type='flow_question_completed')::int completed,
              COUNT(*)::int events,
              MAX(e.created_at) latest_event_at
         FROM customer_funnel_events e
         LEFT JOIN customer_flow_definitions d ON d.key=e.flow_key
        WHERE ${clauses.join(' AND ')}
        GROUP BY e.flow_key,COALESCE(e.flow_type,d.flow_type),COALESCE(d.name,e.flow_key,'Unknown flow'),d.id,e.question_key
     )
     SELECT qe.*,
            q.label question_label,
            q.question_type,
            q.display_order
       FROM question_events qe
       LEFT JOIN LATERAL (
         SELECT cq.label,cq.question_type,cq.display_order
           FROM customer_flow_questions cq
           JOIN customer_flow_versions cv ON cv.id=cq.version_id
          WHERE cv.definition_id=qe.definition_id
            AND cq.question_key=qe.question_key
          ORDER BY CASE cv.status WHEN 'published' THEN 0 WHEN 'retired' THEN 1 ELSE 2 END,
                   cv.version_no DESC,cq.id DESC
          LIMIT 1
       ) q ON TRUE
      ORDER BY qe.flow_name,COALESCE(q.display_order,qe.first_position*10),qe.question_key`,
    values
  )).rows;

  const flows=new Map();
  for(const row of rows){
    const key=row.flow_key||'unknown';
    const viewed=number(row.viewed);
    const completed=number(row.completed);
    const abandoned=Math.max(0,viewed-completed);
    const question={
      questionKey:row.question_key,
      label:row.question_label||row.question_key,
      questionType:row.question_type||null,
      displayOrder:row.display_order==null?null:Number(row.display_order),
      firstPosition:number(row.first_position),
      lastPosition:number(row.last_position),
      maxQuestionCount:number(row.max_question_count),
      viewed,
      completed,
      completionRate:percent(completed,viewed),
      abandoned,
      dropOffRate:percent(abandoned,viewed),
      events:number(row.events),
      latestEventAt:row.latest_event_at||null,
    };
    const current=flows.get(key)||{
      flowKey:row.flow_key||null,
      flowType:row.flow_type||null,
      flowName:row.flow_name,
      questions:[],
      events:0,
      latestEventAt:null,
    };
    current.questions.push(question);
    current.events+=question.events;
    if(question.latestEventAt&&(!current.latestEventAt||new Date(question.latestEventAt)>new Date(current.latestEventAt)))current.latestEventAt=question.latestEventAt;
    flows.set(key,current);
  }

  return [...flows.values()].map(flow=>{
    const withViews=flow.questions.filter(question=>question.viewed>0);
    const highestDrop=withViews.slice().sort((a,b)=>b.dropOffRate-a.dropOffRate||b.viewed-a.viewed)[0]||null;
    return {
      ...flow,
      questionsTracked:flow.questions.length,
      highestDropOff:highestDrop?{
        questionKey:highestDrop.questionKey,
        label:highestDrop.label,
        dropOffRate:highestDrop.dropOffRate,
        abandoned:highestDrop.abandoned,
        viewed:highestDrop.viewed,
      }:null,
    };
  }).sort((a,b)=>b.events-a.events||String(a.flowName).localeCompare(String(b.flowName)));
}

async function getRecentCustomerLeads(filters) {
  const values = ['public_requirement','public_estimator'];
  const clauses = ['l.source IN ($1,$2)'];
  if (filters.fromDate) {
    values.push(filters.fromDate);
    clauses.push('l.created_at >= '+sqlParam(values.length));
  }
  if (filters.flowId) {
    values.push(String(filters.flowId));
    clauses.push("COALESCE(l.custom_fields->'_intake'->>'definitionId','') = "+sqlParam(values.length));
  }
  if (filters.search) {
    values.push(`%${filters.search}%`);
    const index=values.length;
    const ref=sqlParam(index);
    clauses.push(`(
      CAST(l.id AS TEXT) ILIKE ${ref}
      OR COALESCE(l.customer_name,'') ILIKE ${ref}
      OR COALESCE(l.customer_phone,'') ILIKE ${ref}
      OR COALESCE(l.customer_email,'') ILIKE ${ref}
      OR COALESCE(l.pincode,'') ILIKE ${ref}
      OR COALESCE(l.custom_fields->'_intake'->>'flowKey','') ILIKE ${ref}
      OR COALESCE(d.name,'') ILIKE ${ref}
      OR COALESCE(c.name,'') ILIKE ${ref}
      OR COALESCE(i.name,'') ILIKE ${ref}
      OR COALESCE(s.name,'') ILIKE ${ref}
    )`);
  }
  const rows=(await pool.query(
    `SELECT l.id,l.source,l.status,l.created_at,l.updated_at,l.customer_name,l.customer_phone,l.customer_email,
            l.pincode,l.quality_gate_status,l.quality_gate_score,
            COALESCE(l.custom_fields->'_intake'->>'flowKey','unknown') flow_key,
            COALESCE(d.name,l.custom_fields->'_intake'->>'flowKey','Unknown flow') flow_name,
            CASE WHEN LOWER(COALESCE(l.custom_fields->'_estimator'->>'contactPending',''))='true' THEN TRUE ELSE FALSE END contact_pending,
            c.name city_name,st.name state_name,i.name industry_name,s.name service_name,
            calc.public_id calculation_id,calc.converted_at,calc.result_min,calc.result_max,
            COALESCE(sales.paid_purchases,0)::int paid_purchases,
            COALESCE(sales.paid_sales,0)::numeric(14,2) paid_sales
       FROM leads l
       LEFT JOIN customer_flow_definitions d ON d.key=COALESCE(l.custom_fields->'_intake'->>'flowKey','')
       LEFT JOIN cities c ON c.id=l.city_id
       LEFT JOIN states st ON st.id=l.state_id
       LEFT JOIN industries i ON i.id=l.industry_id
       LEFT JOIN services s ON s.id=l.service_id
       LEFT JOIN LATERAL (
         SELECT ec.public_id,ec.converted_at,ec.result_min,ec.result_max
           FROM estimator_calculations ec
          WHERE ec.lead_id=l.id
          ORDER BY ec.created_at DESC,ec.id DESC
          LIMIT 1
       ) calc ON TRUE
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (WHERE lp.status='paid')::int paid_purchases,
                COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric(14,2) paid_sales
           FROM lead_purchases lp
          WHERE lp.lead_id=l.id
       ) sales ON TRUE
      WHERE ${clauses.join(' AND ')}
      ORDER BY l.created_at DESC,l.id DESC
      LIMIT 25`,
    values
  )).rows;

  return rows.map(row=>({
    leadId:Number(row.id),
    source:row.source,
    status:row.status,
    flowKey:row.flow_key,
    flowName:row.flow_name,
    customerName:row.customer_name || null,
    contactPending:Boolean(row.contact_pending),
    contactReady:row.source!=='public_estimator' || !row.contact_pending,
    hasName:Boolean(String(row.customer_name||'').trim()),
    hasPhone:Boolean(String(row.customer_phone||'').trim()),
    hasEmail:Boolean(String(row.customer_email||'').trim()),
    pincode:row.pincode || null,
    cityName:row.city_name || null,
    stateName:row.state_name || null,
    industryName:row.industry_name || null,
    serviceName:row.service_name || null,
    qualityGateStatus:row.quality_gate_status || null,
    qualityGateScore:row.quality_gate_score==null?null:number(row.quality_gate_score),
    calculationId:row.calculation_id || null,
    convertedAt:row.converted_at || null,
    estimateMinimum:row.result_min==null?null:number(row.result_min),
    estimateMaximum:row.result_max==null?null:number(row.result_max),
    paidPurchases:number(row.paid_purchases),
    paidSales:number(row.paid_sales),
    createdAt:row.created_at,
    updatedAt:row.updated_at,
  }));
}

async function getRecentCalculations(filters) {
  const values = [];
  const clauses = ['1=1'];
  if (filters.fromDate) {
    values.push(filters.fromDate);
    clauses.push(`ec.created_at >= $${values.length}`);
  }
  if (filters.flowId) {
    values.push(filters.flowId);
    clauses.push(`ec.definition_id = $${values.length}`);
  }
  if (filters.conversion === 'converted') clauses.push('ec.converted_at IS NOT NULL');
  if (filters.conversion === 'unconverted') clauses.push('ec.converted_at IS NULL');
  if (filters.search) {
    values.push(`%${filters.search}%`);
    const index = values.length;
    clauses.push(`(ec.public_id ILIKE $${index} OR COALESCE(ec.pincode,'') ILIKE $${index} OR d.name ILIKE $${index} OR COALESCE(c.name,'') ILIKE $${index} OR COALESCE(s.name,'') ILIKE $${index})`);
  }
  const where = ` WHERE ${clauses.join(' AND ')}`;
  const count = number((await pool.query(
    `SELECT COUNT(*)::int count
       FROM estimator_calculations ec
       JOIN customer_flow_definitions d ON d.id=ec.definition_id
       LEFT JOIN cities c ON c.id=ec.city_id
       LEFT JOIN states s ON s.id=c.state_id
       ${where}`,
    values
  )).rows[0]?.count);

  const pageCount = Math.max(1,Math.ceil(count / filters.limit));
  const page = Math.min(filters.page,pageCount);
  const offset = (page - 1) * filters.limit;
  const listValues = [...values,filters.limit,offset];
  const limitIndex = listValues.length - 1;
  const offsetIndex = listValues.length;
  const rows = (await pool.query(
    `SELECT ec.public_id,ec.result_min,ec.result_max,ec.currency,ec.pincode,ec.created_at,ec.converted_at,
            d.id definition_id,d.key flow_key,d.name flow_name,v.version_no,
            c.name city_name,s.name state_name,
            l.id lead_id,l.status lead_status,l.source lead_source,
            COALESCE(sales.paid_purchases,0)::int paid_purchases,
            COALESCE(sales.paid_sales,0)::numeric(14,2) paid_sales
       FROM estimator_calculations ec
       JOIN customer_flow_definitions d ON d.id=ec.definition_id
       JOIN customer_flow_versions v ON v.id=ec.version_id
       LEFT JOIN cities c ON c.id=ec.city_id
       LEFT JOIN states s ON s.id=c.state_id
       LEFT JOIN leads l ON l.id=ec.lead_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) FILTER (WHERE lp.status='paid')::int paid_purchases,
                COALESCE(SUM(lp.amount) FILTER (WHERE lp.status='paid'),0)::numeric(14,2) paid_sales
           FROM lead_purchases lp
          WHERE lp.lead_id=ec.lead_id
       ) sales ON TRUE
       ${where}
       ORDER BY ec.created_at DESC,ec.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    listValues
  )).rows;

  return {
    items:rows.map(row => ({
      calculationId:row.public_id,
      definitionId:Number(row.definition_id),
      flowKey:row.flow_key,
      flowName:row.flow_name,
      versionNo:Number(row.version_no),
      minimum:number(row.result_min),
      maximum:number(row.result_max),
      currency:row.currency,
      pincode:row.pincode || null,
      cityName:row.city_name || null,
      stateName:row.state_name || null,
      createdAt:row.created_at,
      convertedAt:row.converted_at || null,
      leadId:row.lead_id ? Number(row.lead_id) : null,
      leadStatus:row.lead_status || null,
      leadSource:row.lead_source || null,
      paidPurchases:number(row.paid_purchases),
      paidSales:number(row.paid_sales),
    })),
    pagination:{page,limit:filters.limit,total:count,pages:pageCount},
  };
}

async function getCustomerFunnelAnalytics(query = {}) {
  const filters = parseFilters(query);
  const [definitions,estimator,estimators,sources,requirements,cities,recent,recentCustomerLeads,journeyTracking,questionDropoff] = await Promise.all([
    getEstimatorDefinitions(),
    getEstimatorSummary(filters),
    getEstimatorBreakdown(filters),
    getLeadSourceBreakdown(filters),
    getRequirementFlowBreakdown(filters),
    getCityBreakdown(filters),
    getRecentCalculations(filters),
    getRecentCustomerLeads(filters),
    getTrackedJourneyAnalytics(filters),
    getQuestionDropoffAnalytics(filters),
  ]);
  const direct = sources.find(item => item.source === 'public_requirement') || {leads:0,monetizedLeads:0,paidSales:0,statuses:{}};
  const estimatorLeads = sources.find(item => item.source === 'public_estimator') || {leads:0,monetizedLeads:0,paidSales:0,statuses:{}};
  return {
    filters:{
      period:filters.periodKey,
      days:filters.days,
      from:filters.fromDate,
      flowId:filters.flowId,
      conversion:filters.conversion,
      q:filters.search,
    },
    estimatorDefinitions:definitions,
    journeyTracking,
    questionDropoff,
    summary:{
      ...estimator,
      directRequirementLeads:direct.leads,
      estimatorCanonicalLeads:estimatorLeads.leads,
      customerFunnelLeads:direct.leads + estimatorLeads.leads,
      monetizedLeads:direct.monetizedLeads + estimatorLeads.monetizedLeads,
      paidLeadSales:Number((direct.paidSales + estimatorLeads.paidSales).toFixed(2)),
    },
    estimators,
    sources,
    requirements,
    cities,
    recent,
    recentCustomerLeads,
  };
}

module.exports = {
  getCustomerFunnelAnalytics,
  parseFilters,
};
