const pool=require('../src/config/database');
const risk=require('../src/services/securityRiskService');

const assert=(condition,message)=>{if(!condition)throw new Error(message)};

(async()=>{
  const eventType='ci_security_risk_signal';
  const eventKey='ci:dedupe';
  const loginEmail='ci-risk-center@example.test';
  const loginKey=risk.hmac('login:'+loginEmail);

  await pool.query("DELETE FROM security_risk_events WHERE event_type=$1 OR event_key=$2",[eventType,loginKey]);
  await pool.query("DELETE FROM security_auth_attempts WHERE subject_hash=$1",[loginKey]);

  const first=await risk.upsertEvent({
    eventType,eventKey,severity:'medium',title:'CI risk signal',summary:'First occurrence',metadata:{phase:1}
  });
  const second=await risk.upsertEvent({
    eventType,eventKey,severity:'high',title:'CI risk signal',summary:'Second occurrence',metadata:{phase:2}
  });
  assert(Number(first.id)===Number(second.id),'Open risk events with the same key must deduplicate');
  assert(Number(second.occurrence_count)===2,'Deduplicated event occurrence count must increment');
  assert(second.severity==='high','Risk event severity must escalate but not downgrade');

  for(let i=0;i<6;i+=1)await risk.recordFailedLogin({email:loginEmail,source:'ci-runner'});
  const loginEvent=(await pool.query(
    "SELECT * FROM security_risk_events WHERE event_type='repeated_failed_login' AND event_key=$1 AND status='open'",
    [loginKey]
  )).rows[0];
  assert(loginEvent,'Five or more failed logins must create a Risk Center event');
  assert(Number(loginEvent.occurrence_count)>=2,'Repeated failed-login threshold crossings must aggregate');

  const listed=await risk.listEvents({status:'open',type:eventType,page:1,limit:10});
  assert(listed.items.some(item=>Number(item.id)===Number(second.id)),'Risk Center list API must return the open event');

  const reviewed=await risk.reviewEvent({eventId:second.id,status:'resolved',note:'CI verified the signal',adminId:null});
  assert(reviewed.status==='resolved'&&reviewed.review_note==='CI verified the signal','Risk review must persist state and note');

  let noteRequired=false;
  try{await risk.reviewEvent({eventId:loginEvent.id,status:'dismissed',note:'',adminId:null})}
  catch(error){noteRequired=error.code==='RISK_REVIEW_NOTE_REQUIRED'}
  assert(noteRequired,'Risk review must reject empty notes');

  await pool.query("DELETE FROM security_risk_events WHERE event_type=$1 OR event_key=$2",[eventType,loginKey]);
  await pool.query("DELETE FROM security_auth_attempts WHERE subject_hash=$1",[loginKey]);
  console.log('Security Risk Center PostgreSQL runtime smoke passed.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
