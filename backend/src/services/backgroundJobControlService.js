const crypto=require('crypto');
const pool=require('../config/database');

const SECRET_KEY=/(password|token|secret|cookie|authorization|credential|proof|account_number|utr|reference)/i;

function sanitize(value,depth=0){
  if(value===null||value===undefined)return value;
  if(depth>4)return '[max-depth]';
  if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString():null;
  if(typeof value==='bigint')return value.toString();
  if(Array.isArray(value))return value.slice(0,100).map(item=>sanitize(item,depth+1));
  if(typeof value==='object'){
    const out={};
    for(const [key,item] of Object.entries(value)){
      if(SECRET_KEY.test(key)){out[key]='[redacted]';continue}
      out[key]=sanitize(item,depth+1);
    }
    return out;
  }
  if(typeof value==='string')return value.slice(0,1000);
  if(['number','boolean'].includes(typeof value))return value;
  return String(value);
}
function classify(result){
  if(result?.failed)return'failed';
  if(result?.busy||result?.skipped)return'skipped';
  return'succeeded';
}
function leaseMinutes(){return Math.min(720,Math.max(15,Number(process.env.BACKGROUND_JOB_LEASE_MINUTES)||120))}
function leaseStaleSeconds(){return Math.min(1800,Math.max(120,Number(process.env.BACKGROUND_JOB_LEASE_STALE_SECONDS)||300))}
function leaseHeartbeatMs(){return Math.min(120000,Math.max(30000,Math.floor(leaseStaleSeconds()*1000/3)))}
async function acquireLease(jobKey){
  const ownerToken=crypto.randomUUID();
  const row=(await pool.query(
    `INSERT INTO background_job_leases(job_key,owner_token,locked_until,updated_at)
     VALUES($1,$2,CURRENT_TIMESTAMP+($3*INTERVAL '1 minute'),CURRENT_TIMESTAMP)
     ON CONFLICT(job_key) DO UPDATE
       SET owner_token=EXCLUDED.owner_token,locked_until=EXCLUDED.locked_until,updated_at=CURRENT_TIMESTAMP
       WHERE background_job_leases.locked_until<=CURRENT_TIMESTAMP
          OR background_job_leases.updated_at<=CURRENT_TIMESTAMP-($4*INTERVAL '1 second')
     RETURNING owner_token`,
    [String(jobKey).slice(0,100),ownerToken,leaseMinutes(),leaseStaleSeconds()]
  )).rows[0];
  return row?ownerToken:null;
}
async function renewLease(jobKey,ownerToken){
  if(!ownerToken)return false;
  const result=await pool.query(
    `UPDATE background_job_leases
        SET locked_until=CURRENT_TIMESTAMP+($3*INTERVAL '1 minute'),updated_at=CURRENT_TIMESTAMP
      WHERE job_key=$1 AND owner_token=$2
      RETURNING owner_token`,
    [String(jobKey).slice(0,100),ownerToken,leaseMinutes()]
  );
  return result.rowCount===1;
}
async function recoverStaleRuns(jobKey){
  await pool.query(
    `UPDATE background_job_runs
        SET status='failed',
            error_message=COALESCE(error_message,'Previous worker stopped before completing this job'),
            completed_at=CURRENT_TIMESTAMP,
            duration_ms=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-started_at))*1000))::bigint
      WHERE job_key=$1
        AND status='running'
        AND started_at<=CURRENT_TIMESTAMP-($2*INTERVAL '1 second')`,
    [String(jobKey).slice(0,100),leaseStaleSeconds()]
  );
}
async function releaseLease(jobKey,ownerToken){
  if(!ownerToken)return;
  await pool.query('DELETE FROM background_job_leases WHERE job_key=$1 AND owner_token=$2',[String(jobKey).slice(0,100),ownerToken]);
}
async function insertRun({jobKey,source,triggeredBy,status='running',summary={}},db=pool){
  return (await db.query(
    `INSERT INTO background_job_runs(job_key,trigger_source,status,triggered_by,summary)
     VALUES($1,$2,$3,$4,$5::jsonb) RETURNING *`,
    [String(jobKey).slice(0,100),source||'scheduled',status,triggeredBy||null,JSON.stringify(sanitize(summary||{}))]
  )).rows[0];
}
async function finishRun(runId,{status,summary={},errorMessage=null},db=pool){
  return (await db.query(
    `UPDATE background_job_runs
        SET status=$2,summary=$3::jsonb,error_message=$4,completed_at=CURRENT_TIMESTAMP,
            duration_ms=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-started_at))*1000))::bigint
      WHERE id=$1 RETURNING *`,
    [runId,status,JSON.stringify(sanitize(summary||{})),errorMessage?String(errorMessage).slice(0,1000):null]
  )).rows[0];
}
async function execute({jobKey,source='scheduled',triggeredBy=null,task}){
  const ownerToken=await acquireLease(jobKey);
  if(!ownerToken){
    const run=await insertRun({jobKey,source,triggeredBy,status:'skipped',summary:{reason:'busy'}});
    await finishRun(run.id,{status:'skipped',summary:{reason:'busy'}});
    return{busy:true,skipped:true,runId:Number(run.id),jobStatus:'skipped'};
  }
  await recoverStaleRuns(jobKey);
  const run=await insertRun({jobKey,source,triggeredBy,status:'running'});
  let heartbeatTimer=setInterval(()=>{
    renewLease(jobKey,ownerToken).catch(error=>console.error('Background job lease heartbeat failed:',error.message));
  },leaseHeartbeatMs());
  heartbeatTimer.unref?.();
  try{
    const result=await task();
    const status=classify(result);
    await finishRun(run.id,{status,summary:result||{}});
    return{...(result||{}),runId:Number(run.id),jobStatus:status};
  }catch(error){
    await finishRun(run.id,{status:'failed',summary:{code:error?.code||null},errorMessage:error?.message||'Background job failed'}).catch(()=>{});
    throw error;
  }finally{
    if(heartbeatTimer)clearInterval(heartbeatTimer);
    heartbeatTimer=null;
    await releaseLease(jobKey,ownerToken).catch(error=>console.error('Background job lease release failed:',error.message));
  }
}
async function recentRuns(jobKey,{limit=8}={}){
  const safe=Math.min(30,Math.max(1,Number(limit)||8));
  return (await pool.query(
    `SELECT id,job_key,trigger_source,status,triggered_by,summary,error_message,started_at,completed_at,duration_ms
       FROM background_job_runs WHERE job_key=$1 ORDER BY started_at DESC,id DESC LIMIT $2`,
    [jobKey,safe]
  )).rows.map(row=>({
    id:Number(row.id),jobKey:row.job_key,source:row.trigger_source,status:row.status,
    triggeredBy:row.triggered_by?Number(row.triggered_by):null,summary:row.summary||{},error:row.error_message||null,
    startedAt:row.started_at||null,completedAt:row.completed_at||null,durationMs:row.duration_ms==null?null:Number(row.duration_ms)
  }));
}
module.exports={sanitize,classify,leaseMinutes,leaseStaleSeconds,leaseHeartbeatMs,acquireLease,renewLease,recoverStaleRuns,releaseLease,execute,recentRuns,insertRun,finishRun};
