// Regression: an India Post outage must give users a "try again" message (never a 500), retry once,
// and fail fast afterwards so CSV imports with many new PINs do not hang.
const assert=require('node:assert/strict');
const service=require('../src/services/pincodeDetectionService');

const originalFetch=global.fetch;
const originalWarn=console.warn;
console.warn=()=>{};
let calls=0;
function respond(status,body){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
}

(async()=>{
  // Outage: 503 twice -> friendly retryable error after exactly one retry.
  global.fetch=async()=>{calls+=1;return respond(503,{error:'down'})};
  await assert.rejects(service.fetchIndiaPost('500001'),error=>error.code==='PIN_LOOKUP_TIMEOUT'&&error.retryable===true&&/temporarily unavailable/i.test(error.message));
  assert.equal(calls,2,'India Post is retried once');

  // While down: fail fast without calling India Post again.
  const started=Date.now();
  await assert.rejects(service.fetchIndiaPost('500002'),{code:'PIN_LOOKUP_TIMEOUT'});
  assert.equal(calls,2,'lookups fail fast during the outage cooldown');
  assert(Date.now()-started<200,'fail-fast does not wait for a timeout');

  // Recovery after the cooldown; one blip is absorbed by the retry.
  service.resetIndiaPostOutage();
  calls=0;
  global.fetch=async()=>{calls+=1;return calls===1?respond(503,{}):respond(200,[{PostOffice:[{Name:'Test GPO',State:'Telangana',District:'Hyderabad'}]}])};
  const offices=await service.fetchIndiaPost('500001');
  assert.equal(offices.length,1,'a single 503 is absorbed by the retry');
  assert.equal(calls,2);

  // Real "PIN not found" is not treated as an outage and not retried.
  calls=0;
  global.fetch=async()=>{calls+=1;return respond(200,[{Status:'Error',PostOffice:null}])};
  await assert.rejects(service.fetchIndiaPost('999999'),{code:'PIN_NOT_FOUND'});
  assert.equal(calls,1,'unknown PINs are not retried');

  global.fetch=originalFetch;
  console.warn=originalWarn;
  console.log('India Post outage handling regression passed.');
  process.exit(0);
})().catch(error=>{global.fetch=originalFetch;console.warn=originalWarn;console.error(error);process.exit(1)});
