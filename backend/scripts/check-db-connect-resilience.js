// Regression: a brief database outage must never restart the site.
// 1) Scheduled background jobs that reject are logged, not left as unhandled rejections
//    (server.js treats those as fatal and shuts the process down).
// 2) Opening a pool connection is retried on transient pooler errors and then fails cleanly.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

process.env.DATABASE_URL='postgresql://resilience:check@127.0.0.1:1/resilience';
process.env.DB_CONNECT_RETRIES='2';
process.env.DB_CONNECTION_TIMEOUT_MS='1000';

const unhandled=[];
process.on('unhandledRejection',reason=>unhandled.push(reason));
const warnings=[];
const originalWarn=console.warn;
const originalError=console.error;
console.warn=(...args)=>warnings.push(args.join(' '));
console.error=()=>{};

const {createIntervalScheduler,runScheduled}=require('../src/services/intervalSchedulerService');
const pool=require('../src/config/database');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  // Scheduler: async rejection, sync throw, every tick.
  let calls=0;
  const stop=createIntervalScheduler({intervalMs:15,label:'Check job',run:async()=>{calls+=1;throw new Error('Connection terminated due to connection timeout')}})({runImmediately:true});
  await sleep(80);
  stop();
  assert(calls>=2,'scheduler keeps running after a failed run');
  const syncResult=await runScheduled('Sync throw',()=>{throw new Error('boom')},{source:'scheduled'});
  assert.equal(syncResult.failed,true,'a synchronous throw is reported as a failed run');

  // Every scheduler file routes its timers through runScheduled.
  const servicesDir=path.join(__dirname,'../src/services');
  for(const file of ['intervalSchedulerService.js','financialReconciliationScheduler.js','notificationScheduler.js']){
    const source=fs.readFileSync(path.join(servicesDir,file),'utf8');
    const bare=source.match(/void run[A-Za-z]*\(\{source/g)||[];
    assert.equal(bare.length,0,`${file} must not fire a scheduled job without runScheduled(): ${bare.join(', ')}`);
  }

  // Pool: refused connection is retried (2 retries), then rejects instead of hanging or crashing.
  const started=Date.now();
  await assert.rejects(pool.query('SELECT 1'),error=>/ECONNREFUSED|connect/i.test(`${error.code} ${error.message}`));
  const retryWarnings=warnings.filter(line=>line.includes('PostgreSQL connect failed')).length;
  assert.equal(retryWarnings,2,'pool.query retries the connection twice before failing');
  assert(Date.now()-started>=600,'retries back off before trying again');
  await assert.rejects(pool.connect(),/ECONNREFUSED|connect/i,'pool.connect() also fails cleanly after retries');
  assert.equal(pool.isTransientConnectError(new Error('(EMAXCONNSESSION) max clients reached in session mode')),true);
  assert.equal(pool.isTransientConnectError(new Error('password authentication failed for user "x"')),false,'auth errors are not retried');

  await sleep(20);
  assert.equal(unhandled.length,0,'no unhandled rejections: '+unhandled.map(String).join('; '));
  await pool.end().catch(()=>{});
  console.warn=originalWarn;
  console.error=originalError;
  console.log('Database connect resilience and scheduler rejection regression passed.');
})().catch(error=>{
  console.warn=originalWarn;
  console.error=originalError;
  console.error(error);
  process.exit(1);
});
