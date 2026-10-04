const path=require('path');
const {spawn}=require('child_process');
const pool=require('../src/config/database');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(fn,timeoutMs=15000){
  const deadline=Date.now()+timeoutMs;
  let lastError;
  while(Date.now()<deadline){
    try{const value=await fn();if(value)return value}catch(error){lastError=error}
    await sleep(250);
  }
  if(lastError)throw lastError;
  throw new Error('Timed out waiting for worker heartbeat');
}

(async()=>{
  await pool.query("DELETE FROM background_worker_heartbeats WHERE worker_name='sheet-sync'");
  const child=spawn(process.execPath,['src/worker.js'],{
    cwd:path.join(__dirname,'..'),
    env:{...process.env,RUN_MIGRATIONS_ON_WORKER_STARTUP:'false',WORKER_HEARTBEAT_INTERVAL_MS:'5000'},
    stdio:['ignore','pipe','pipe']
  });
  let logs='';
  child.stdout.on('data',chunk=>{logs+=chunk});
  child.stderr.on('data',chunk=>{logs+=chunk});
  try{
    const running=await waitFor(async()=>{
      const row=(await pool.query("SELECT instance_id,status,last_seen_at FROM background_worker_heartbeats WHERE worker_name='sheet-sync' AND status='running' ORDER BY last_seen_at DESC LIMIT 1")).rows[0];
      return row||null;
    });
    child.kill('SIGTERM');
    const exitCode=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Worker did not stop after SIGTERM'))},10000);
      child.once('exit',code=>{clearTimeout(timer);resolve(code)});
    });
    if(exitCode!==0)throw new Error(`Worker exited with code ${exitCode}: ${logs}`);
    await waitFor(async()=>{
      const row=(await pool.query('SELECT status FROM background_worker_heartbeats WHERE worker_name=$1 AND instance_id=$2',['sheet-sync',running.instance_id])).rows[0];
      return row?.status==='stopped';
    },5000);
    console.log('Background worker heartbeat runtime smoke test passed.');
  }finally{
    if(child.exitCode===null)child.kill('SIGKILL');
    await pool.end();
  }
})().catch(async error=>{console.error(error.stack||error);await pool.end().catch(()=>{});process.exit(1)});
