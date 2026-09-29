const pool = require('../config/database');

const EVENT_TYPES = new Set([
  'home_cta_clicked',
  'flow_opened',
  'flow_started',
  'flow_question_viewed',
  'flow_question_completed',
  'estimate_completed',
  'quote_form_opened',
  'quote_submitted',
  'requirement_contact_opened',
  'requirement_submitted',
]);
const FLOW_TYPES = new Set(['estimator','requirement']);
const QUESTION_EVENTS = new Set(['flow_question_viewed','flow_question_completed']);
const ESTIMATOR_ONLY = new Set(['estimate_completed','quote_form_opened','quote_submitted']);
const REQUIREMENT_ONLY = new Set(['requirement_contact_opened','requirement_submitted']);
const META_KEYS = new Set(['cta','position','step','steps','entry']);
const SOURCES = new Set(['homepage','wizard','ci_runtime']);
const CTA_VALUES = new Set([
  'build_property','plan_interiors','construction_estimate','interior_estimate',
  'build','design','construction-estimator','interior-estimator',
  'construction_estimator','interior_estimator','start_construction','start_interiors','start_project',
]);
const POSITION_VALUES = new Set(['hero_panel','project_grid','estimator_section','how_it_works','contact','ci']);
const ENTRY_VALUES = new Set(['homepage']);
const OPAQUE_RE = /^[A-Za-z0-9_-]{12,80}$/;
const FLOW_KEY_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;
const CALC_RE = /^[A-Za-z0-9_-]{20,64}$/;
const QUESTION_KEY_RE = /^[a-z][a-z0-9_]{1,79}$/;

function cleanText(value,max=120){
  return String(value||'').trim().replace(/[\r\n\t]/g,' ').slice(0,max);
}

function cleanMetadata(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const result={};
  for(const [key,raw] of Object.entries(value)){
    if(!META_KEYS.has(key))continue;
    if(['step','steps'].includes(key)&&typeof raw==='number'&&Number.isFinite(raw)){
      result[key]=Math.max(0,Math.min(1000,Math.floor(raw)));
      continue;
    }
    if(typeof raw!=='string')continue;
    const token=cleanText(raw,80).toLowerCase();
    if(key==='cta'&&CTA_VALUES.has(token))result[key]=token;
    if(key==='position'&&POSITION_VALUES.has(token))result[key]=token;
    if(key==='entry'&&ENTRY_VALUES.has(token))result[key]=token;
  }
  return result;
}

function cleanPagePath(value){
  const path=cleanText(value,240);
  if(!path)return '';
  if(['/','/build','/design','/construction-estimator','/interior-estimator','/construction-cost-estimator','/interior-cost-estimator','/ci-funnel-test'].includes(path))return path;
  if(/^\/(?:estimate|requirements)\/[a-z0-9][a-z0-9-]{0,119}$/.test(path))return path;
  return '';
}

function invalid(message,code='INVALID_FUNNEL_EVENT'){
  const error=new Error(message);
  error.code=code;
  error.status=400;
  throw error;
}

async function recordEvent(payload={}){
  const eventId=cleanText(payload.eventId,80);
  const sessionId=cleanText(payload.sessionId,80);
  const eventType=cleanText(payload.eventType,40);
  const flowKey=payload.flowKey==null?'':cleanText(payload.flowKey,120).toLowerCase();
  const flowType=payload.flowType==null?'':cleanText(payload.flowType,20).toLowerCase();
  const calculationId=payload.calculationId==null?'':cleanText(payload.calculationId,64);
  const questionKey=payload.questionKey==null?'':cleanText(payload.questionKey,80).toLowerCase();
  const questionIndex=payload.questionIndex==null?null:Number(payload.questionIndex);
  const questionCount=payload.questionCount==null?null:Number(payload.questionCount);
  const rawSource=payload.source==null?'':cleanText(payload.source,80).toLowerCase();
  const source=SOURCES.has(rawSource)?rawSource:'';
  const pagePath=cleanPagePath(payload.pagePath);

  if(!OPAQUE_RE.test(eventId)||!OPAQUE_RE.test(sessionId))invalid('Invalid funnel event identifier');
  if(!EVENT_TYPES.has(eventType))invalid('Unsupported funnel event type');
  if(flowKey&&!FLOW_KEY_RE.test(flowKey))invalid('Invalid funnel flow key');
  if(flowType&&!FLOW_TYPES.has(flowType))invalid('Invalid funnel flow type');
  if(calculationId&&!CALC_RE.test(calculationId))invalid('Invalid calculation reference');
  if(QUESTION_EVENTS.has(eventType)){
    if(!flowKey||!flowType)invalid('Question funnel events require a flow');
    if(!QUESTION_KEY_RE.test(questionKey))invalid('Invalid funnel question key');
    if(!Number.isInteger(questionIndex)||questionIndex<1||questionIndex>1000)invalid('Invalid funnel question position');
    if(!Number.isInteger(questionCount)||questionCount<1||questionCount>1000||questionIndex>questionCount)invalid('Invalid funnel question count');
  }else if(questionKey||questionIndex!==null||questionCount!==null)invalid('Question fields are only allowed for question funnel events');
  if(flowType==='requirement'&&ESTIMATOR_ONLY.has(eventType))invalid('Estimator event cannot be recorded for a requirement flow');
  if(flowType==='estimator'&&REQUIREMENT_ONLY.has(eventType))invalid('Requirement event cannot be recorded for an estimator flow');

  if(flowKey){
    const definition=(await pool.query(
      'SELECT id,flow_type FROM customer_flow_definitions WHERE key=$1 LIMIT 1',
      [flowKey]
    )).rows[0];
    if(!definition)invalid('Unknown funnel flow key');
    if(flowType&&definition.flow_type!==flowType)invalid('Funnel flow type does not match the configured flow');
    if(QUESTION_EVENTS.has(eventType)){
      const knownQuestion=(await pool.query(
        `SELECT 1
           FROM customer_flow_questions q
           JOIN customer_flow_versions v ON v.id=q.version_id
          WHERE v.definition_id=$1
            AND v.status IN ('published','retired')
            AND q.question_key=$2
            AND q.is_active=TRUE
          LIMIT 1`,
        [definition.id,questionKey]
      )).rows[0];
      if(!knownQuestion)invalid('Question does not belong to this published flow');
    }
  }

  const metadata=cleanMetadata(payload.metadata);
  const row=(await pool.query(
    `INSERT INTO customer_funnel_events
      (event_id,session_id,event_type,flow_key,flow_type,calculation_public_id,question_key,question_index,question_count,source,page_path,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
     ON CONFLICT(event_id) DO NOTHING
     RETURNING id,created_at`,
    [
      eventId,sessionId,eventType,flowKey||null,flowType||null,calculationId||null,
      questionKey||null,questionIndex,questionCount,source||null,pagePath||null,JSON.stringify(metadata)
    ]
  )).rows[0];

  return {accepted:true,duplicate:!row,createdAt:row?.created_at||null};
}

module.exports={recordEvent,cleanMetadata,EVENT_TYPES};
