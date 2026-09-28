const crypto=require('crypto');
const os=require('os');
const pool=require('../config/database');

const WORKER_NAME='sheet-sync';
const instanceId=crypto.randomUUID();
const hostname=String(os.hostname()||'unknown').slice(0,255);
let beatCount=0;

async function beat(){
  await pool.query(
    `INSERT INTO background_worker_heartbeats(worker_name,instance_id,hostname,pid,started_at,last_seen_at,status)
     VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'running')
     ON CONFLICT(worker_name,instance_id) DO UPDATE
       SET hostname=EXCLUDED.hostname,
           pid=EXCLUDED.pid,
           last_seen_at=CURRENT_TIMESTAMP,
           status='running',
           updated_at=CURRENT_TIMESTAMP`,
    [WORKER_NAME,instanceId,hostname,process.pid]
  );
  beatCount+=1;
  if(beatCount%120===1){
    await pool.query(
      `DELETE FROM background_worker_heartbeats
        WHERE worker_name=$1
          AND last_seen_at<CURRENT_TIMESTAMP-INTERVAL '24 hours'`,
      [WORKER_NAME]
    );
  }
}

async function markStopped(){
  await pool.query(
    `UPDATE background_worker_heartbeats
        SET status='stopped',last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
      WHERE worker_name=$1 AND instance_id=$2`,
    [WORKER_NAME,instanceId]
  );
}

async function latestHeartbeat(){
  const row=(await pool.query(
    `SELECT worker_name,instance_id,hostname,pid,status,started_at,last_seen_at,
            GREATEST(0,EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-last_seen_at)))::int AS age_seconds
       FROM background_worker_heartbeats
      WHERE worker_name=$1 AND status='running'
      ORDER BY last_seen_at DESC
      LIMIT 1`,
    [WORKER_NAME]
  )).rows[0];
  return row||null;
}

function startHeartbeat({intervalMs=30000,unref=false,runImmediately=true}={}){
  let timer=null;
  let stopped=false;
  const safeInterval=Math.min(300000,Math.max(5000,Number(intervalMs)||30000));
  const run=async()=>{
    if(stopped)return;
    try{await beat()}catch(error){console.error('Background worker heartbeat failed:',error.message)}
  };
  if(runImmediately)void run();
  timer=setInterval(run,safeInterval);
  if(unref)timer.unref?.();
  return async()=>{
    stopped=true;
    if(timer)clearInterval(timer);
    timer=null;
    await markStopped().catch(error=>console.error('Background worker stop heartbeat failed:',error.message));
  };
}

module.exports={WORKER_NAME,instanceId,beat,markStopped,latestHeartbeat,startHeartbeat};
