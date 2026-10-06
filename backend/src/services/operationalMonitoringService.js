const crypto=require('crypto');
const pool=require('../config/database');
const releaseIdentity=require('./releaseIdentityService');

const SOURCES=new Set(['backend','frontend','worker']);
const SEVERITIES=new Set(['warning','error']);
const SECRET_KEY=/(password|token|secret|cookie|authorization|credential|proof|account[_-]?number|utr|reference)/i;

function buildVersion(){return releaseIdentity.commit()}
function sanitizeText(value,max=500){
  let text=String(value||'').replace(/\r/g,' ').trim();
  text=text.replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [redacted]');
  text=text.replace(/([?&](?:token|key|secret|signature|password|code)=)[^&#\s]+/gi,'$1[redacted]');
  text=text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email]');
  text=text.replace(/\b(?:\+?91[-\s]?)?[6-9]\d{9}\b/g,'[phone]');
  text=text.replace(/\b\d{10,}\b/g,'[number]');
  return text.replace(/\s+/g,' ').slice(0,max)||'Operational error';
}
function sanitizeStack(value){
  if(!value)return null;
  return String(value).split(/\r?\n/).slice(0,12).map(line=>sanitizeText(line,320)).join('\n').slice(0,3000)||null;
}
function sanitizeMetadata(value,depth=0){
  if(value===null||value===undefined)return value;
  if(depth>3)return '[max-depth]';
  if(Array.isArray(value))return value.slice(0,30).map(item=>sanitizeMetadata(item,depth+1));
  if(typeof value==='object'){
    const out={};
    for(const [key,item] of Object.entries(value).slice(0,40)){
      if(SECRET_KEY.test(key)){out[key]='[redacted]';continue}
      out[key]=sanitizeMetadata(item,depth+1);
    }
    return out;
  }
  if(typeof value==='string')return sanitizeText(value,1000);
  if(['number','boolean'].includes(typeof value))return value;
  return sanitizeText(value,500);
}
function safeRoute(value){
  const raw=String(value||'').split('?')[0].split('#')[0];
  return raw.slice(0,300)||null;
}
function normalizedFingerprintMessage(value){
  return sanitizeText(value,500)
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,'{uuid}')
    .replace(/\b\d+\b/g,'#')
    .replace(/\s+/g,' ')
    .slice(0,300);
}
function eventFingerprint({source,eventType,route,method,statusCode,message}){
  const surface=[source,eventType,safeRoute(route)||'',String(method||'').toUpperCase(),statusCode||'',normalizedFingerprintMessage(message)].join('|');
  return crypto.createHash('sha256').update(surface).digest('hex');
}
function mapRow(row){
  return{
    id:Number(row.id),
    fingerprint:row.fingerprint,
    source:row.source,
    eventType:row.event_type,
    severity:row.severity,
    message:row.message,
    route:row.route||null,
    method:row.method||null,
    statusCode:row.status_code==null?null:Number(row.status_code),
    durationMs:row.duration_ms==null?null:Number(row.duration_ms),
    requestId:row.request_id||null,
    userId:row.user_id==null?null:Number(row.user_id),
    userRole:row.user_role||null,
    buildCommit:row.build_commit||null,
    environment:row.environment||null,
    metadata:row.metadata||{},
    occurrenceCount:Number(row.occurrence_count)||1,
    firstSeenAt:row.first_seen_at,
    lastSeenAt:row.last_seen_at,
    resolvedAt:row.resolved_at||null,
    resolvedBy:row.resolved_by==null?null:Number(row.resolved_by),
    resolutionNote:row.resolution_note||null
  };
}
async function recordEvent(input={}){
  const source=SOURCES.has(input.source)?input.source:'backend';
  const severity=SEVERITIES.has(input.severity)?input.severity:'error';
  const eventType=String(input.eventType||'runtime_error').replace(/[^a-z0-9_.:-]/gi,'_').slice(0,50)||'runtime_error';
  const message=sanitizeText(input.message||'Operational error');
  const route=safeRoute(input.route);
  const method=input.method?String(input.method).toUpperCase().slice(0,10):null;
  const statusCode=Number.isInteger(Number(input.statusCode))?Number(input.statusCode):null;
  const durationMs=Number.isFinite(Number(input.durationMs))?Math.max(0,Math.round(Number(input.durationMs))):null;
  const requestId=input.requestId?String(input.requestId).slice(0,100):null;
  const userId=Number.isInteger(Number(input.userId))&&Number(input.userId)>0?Number(input.userId):null;
  const userRole=input.userRole?String(input.userRole).slice(0,40):null;
  const metadata=sanitizeMetadata({...input.metadata,stack:sanitizeStack(input.stack)});
  const fingerprint=eventFingerprint({source,eventType,route,method,statusCode,message});
  const row=(await pool.query(
    `INSERT INTO operational_events(
       fingerprint,source,event_type,severity,message,route,method,status_code,duration_ms,
       request_id,user_id,user_role,build_commit,environment,metadata
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
     ON CONFLICT(fingerprint) DO UPDATE SET
       severity=EXCLUDED.severity,
       message=EXCLUDED.message,
       route=EXCLUDED.route,
       method=EXCLUDED.method,
       status_code=EXCLUDED.status_code,
       duration_ms=EXCLUDED.duration_ms,
       request_id=EXCLUDED.request_id,
       user_id=EXCLUDED.user_id,
       user_role=EXCLUDED.user_role,
       build_commit=EXCLUDED.build_commit,
       environment=EXCLUDED.environment,
       metadata=EXCLUDED.metadata,
       occurrence_count=operational_events.occurrence_count+1,
       last_seen_at=CURRENT_TIMESTAMP,
       resolved_at=NULL,
       resolved_by=NULL,
       resolution_note=NULL
     RETURNING *`,
    [fingerprint,source,eventType,severity,message,route,method,statusCode,durationMs,requestId,userId,userRole,buildVersion(),releaseIdentity.deploymentEnvironment().slice(0,30),JSON.stringify(metadata||{})]
  )).rows[0];
  return mapRow(row);
}
function requestRoute(req){
  const base=String(req.baseUrl||'');
  const routed=req.route?.path;
  if(typeof routed==='string')return safeRoute(base+routed);
  return safeRoute(req.path||req.originalUrl||'');
}
async function recordHttpRequest({req,res,durationMs,error=null,slowRequestMs=2000}){
  const statusCode=Number(res?.statusCode)||0;
  const slow=Number(durationMs)>=Number(slowRequestMs);
  const expectedTransition=statusCode===503&&Boolean(res?.locals?.expectedOperationalTransition);
  if(expectedTransition)return null;
  if(statusCode<500&&!slow)return null;
  const eventType=statusCode>=500?'http_5xx':'slow_request';
  return recordEvent({
    source:'backend',
    eventType,
    severity:statusCode>=500?'error':'warning',
    message:error?.message||(statusCode>=500?`HTTP ${statusCode} response`:`Request exceeded ${Math.round(Number(slowRequestMs))} ms`),
    stack:error?.stack||null,
    route:requestRoute(req),
    method:req?.method,
    statusCode,
    durationMs,
    requestId:req?.requestId,
    userId:req?.user?.id,
    userRole:req?.user?.role,
    metadata:{
      errorName:error?.name||null,
      errorCode:error?.code||null
    }
  });
}
async function recordClientError({payload={},req}){
  const kind=String(payload.kind||'client_error').toLowerCase().replace(/[^a-z0-9_.:-]/g,'_').slice(0,40);
  return recordEvent({
    source:'frontend',
    eventType:kind||'client_error',
    severity:'error',
    message:payload.message||'Browser error',
    stack:payload.stack,
    route:safeRoute(payload.route||req?.get?.('referer')||'/'),
    requestId:req?.requestId,
    userId:req?.user?.id,
    userRole:req?.user?.role,
    metadata:{
      componentStack:payload.componentStack?sanitizeStack(payload.componentStack):null,
      browser:String(req?.get?.('user-agent')||'').slice(0,300)
    }
  });
}
function supersededQuietHours(){
  const parsed=Number(process.env.OPERATIONAL_EVENT_SUPERSEDED_QUIET_HOURS);
  if(!Number.isFinite(parsed))return 3;
  return Math.min(168,Math.max(1,Math.floor(parsed)));
}
async function resolveSupersededBackendHttpEvents(){
  const currentBuild=buildVersion();
  const currentEnvironment=releaseIdentity.deploymentEnvironment().slice(0,30);
  if(!currentBuild||currentBuild==='local')return{resolved:0,quietHours:supersededQuietHours(),environment:currentEnvironment};
  const quietHours=supersededQuietHours();
  const result=await pool.query(
    `UPDATE operational_events
        SET resolved_at=CURRENT_TIMESTAMP,
            resolved_by=NULL,
            resolution_note='Auto-resolved after a newer build stayed active without this fingerprint recurring.'
      WHERE resolved_at IS NULL
        AND source='backend'
        AND event_type IN ('http_5xx','slow_request')
        AND environment=$2
        AND COALESCE(build_commit,'')<>''
        AND build_commit<>$1
        AND last_seen_at<CURRENT_TIMESTAMP-($3*INTERVAL '1 hour')`,
    [currentBuild,currentEnvironment,quietHours]
  );
  return{resolved:Number(result.rowCount)||0,quietHours,environment:currentEnvironment};
}

async function listEvents(query={}){
  await resolveSupersededBackendHttpEvents().catch(error=>console.error('Operational event reconciliation failed:',error.message));
  const page=Math.max(1,Number.parseInt(query.page,10)||1);
  const limit=Math.min(100,Math.max(10,Number.parseInt(query.limit,10)||30));
  const where=[];
  const params=[];
  const currentEnvironment=releaseIdentity.deploymentEnvironment().slice(0,30);
  const requestedEnvironment=String(query.environment||'').trim().slice(0,30);
  const environment=requestedEnvironment==='all'?'all':requestedEnvironment||currentEnvironment;
  if(environment!=='all'){params.push(environment);where.push(`environment=${params.length}`)}
  const status=String(query.status||'open').toLowerCase();
  if(status==='open')where.push('resolved_at IS NULL');
  else if(status==='resolved')where.push('resolved_at IS NOT NULL');
  if(SEVERITIES.has(query.severity)){params.push(query.severity);where.push(`severity=$${params.length}`)}
  if(SOURCES.has(query.source)){params.push(query.source);where.push(`source=$${params.length}`)}
  if(query.eventType){params.push(String(query.eventType).slice(0,50));where.push(`event_type=$${params.length}`)}
  const search=String(query.search||'').trim().slice(0,100);
  if(search){params.push(`%${search}%`);where.push(`(message ILIKE $${params.length} OR COALESCE(route,'') ILIKE $${params.length} OR COALESCE(request_id,'') ILIKE $${params.length})`)}
  const clause=where.length?'WHERE '+where.join(' AND '):'';
  const countParams=[...params];
  const count=(await pool.query(`SELECT COUNT(*)::int AS count FROM operational_events ${clause}`,countParams)).rows[0]?.count||0;
  params.push(limit,(page-1)*limit);
  const rows=(await pool.query(
    `SELECT * FROM operational_events ${clause}
      ORDER BY CASE severity WHEN 'error' THEN 0 ELSE 1 END,last_seen_at DESC,id DESC
      LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  )).rows;
  const summaryParams=[];
  const summaryWhere=[];
  if(environment!=='all'){summaryParams.push(environment);summaryWhere.push(`environment=${summaryParams.length}`)}
  const summaryClause=summaryWhere.length?'WHERE '+summaryWhere.join(' AND '):'';
  const summary=(await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE resolved_at IS NULL AND severity='error')::int AS open_errors,
       COUNT(*) FILTER (WHERE resolved_at IS NULL AND severity='warning')::int AS open_warnings,
       COUNT(*) FILTER (WHERE resolved_at IS NULL AND source='frontend')::int AS frontend_open,
       COUNT(*) FILTER (WHERE resolved_at IS NULL AND source='backend')::int AS backend_open,
       MAX(last_seen_at) AS last_seen_at
     FROM operational_events ${summaryClause}`,
    summaryParams
  )).rows[0]||{};
  return{
    data:rows.map(mapRow),
    page,
    limit,
    total:Number(count)||0,
    totalPages:Math.max(1,Math.ceil((Number(count)||0)/limit)),
    environment,
    summary:{
      openErrors:Number(summary.open_errors)||0,
      openWarnings:Number(summary.open_warnings)||0,
      frontendOpen:Number(summary.frontend_open)||0,
      backendOpen:Number(summary.backend_open)||0,
      lastSeenAt:summary.last_seen_at||null
    }
  };
}
async function setStatus({eventId,status,note,adminId}){
  const id=Number(eventId);
  if(!Number.isInteger(id)||id<=0){const error=new Error('Invalid operational event');error.code='INVALID_OPERATIONAL_EVENT';throw error}
  const next=String(status||'').toLowerCase();
  if(!['open','resolved'].includes(next)){const error=new Error('Status must be open or resolved');error.code='INVALID_OPERATIONAL_STATUS';throw error}
  const resolutionNote=String(note||'').trim().slice(0,500)||null;
  const row=(await pool.query(
    next==='resolved'
      ?`UPDATE operational_events SET resolved_at=CURRENT_TIMESTAMP,resolved_by=$2,resolution_note=$3 WHERE id=$1 RETURNING *`
      :`UPDATE operational_events SET resolved_at=NULL,resolved_by=NULL,resolution_note=NULL WHERE id=$1 RETURNING *`,
    next==='resolved'?[id,adminId||null,resolutionNote]:[id]
  )).rows[0];
  if(!row){const error=new Error('Operational event not found');error.code='OPERATIONAL_EVENT_NOT_FOUND';throw error}
  return mapRow(row);
}
async function pruneResolved({days=Number(process.env.OPERATIONAL_EVENT_RETENTION_DAYS)||90}={}){
  const safe=Math.min(730,Math.max(7,Math.floor(Number(days)||90)));
  const result=await pool.query(
    `DELETE FROM operational_events
      WHERE resolved_at IS NOT NULL
        AND last_seen_at<CURRENT_TIMESTAMP-($1*INTERVAL '1 day')`,
    [safe]
  );
  return{deleted:Number(result.rowCount)||0,days:safe};
}

module.exports={
  sanitizeText,sanitizeStack,sanitizeMetadata,eventFingerprint,recordEvent,recordHttpRequest,
  recordClientError,listEvents,setStatus,pruneResolved,buildVersion,resolveSupersededBackendHttpEvents
};
