const pool=require('../src/config/database');
const control=require('../src/services/backgroundJobControlService');
const registry=require('../src/services/backgroundJobRegistryService');
const assert=(v,m)=>{if(!v)throw new Error(m)};

(async()=>{
  const suffix=Date.now();
  const admin=(await pool.query(
    "INSERT INTO users(name,email,password_hash,role,is_active) VALUES($1,$2,'x','admin',TRUE) RETURNING id",
    ['Jobs CI','jobs-ci-'+suffix+'@example.test']
  )).rows[0];

  const recorded=await control.execute({
    jobKey:'ci_secret_job',source:'manual',triggeredBy:admin.id,
    task:async()=>({processed:2,token:'should-not-be-visible',nested:{password:'hidden',safe:'ok'}})
  });
  assert(recorded.jobStatus==='succeeded','Successful job must be recorded as succeeded');
  const row=(await pool.query('SELECT status,summary,duration_ms FROM background_job_runs WHERE id=$1',[recorded.runId])).rows[0];
  assert(row.status==='succeeded'&&row.summary.token==='[redacted]'&&row.summary.nested.password==='[redacted]'&&row.summary.nested.safe==='ok','Job summary redaction failed');
  assert(Number(row.duration_ms)>=0,'Completed job must record duration');

  await pool.query(
    `INSERT INTO background_job_leases(job_key,owner_token,locked_until)
     VALUES('ci_locked_job','00000000-0000-4000-8000-000000000001',CURRENT_TIMESTAMP+INTERVAL '10 minutes')
     ON CONFLICT(job_key) DO UPDATE SET owner_token=EXCLUDED.owner_token,locked_until=EXCLUDED.locked_until,updated_at=CURRENT_TIMESTAMP`
  );
  const busy=await control.execute({jobKey:'ci_locked_job',source:'manual',triggeredBy:admin.id,task:async()=>({unexpected:true})});
  assert(busy.busy===true&&busy.skipped===true,'Concurrent job must be skipped while an unexpired database lease is held');
  const busyRow=(await pool.query('SELECT status,summary FROM background_job_runs WHERE id=$1',[busy.runId])).rows[0];
  assert(busyRow.status==='skipped'&&busyRow.summary.reason==='busy','Busy run must be persisted as skipped');
  await pool.query("DELETE FROM background_job_leases WHERE job_key='ci_locked_job'");

  const manual=await registry.retry('notification_email_delivery',{adminId:admin.id});
  assert(manual.runId&&['succeeded','skipped'].includes(manual.jobStatus),'Manual notification retry must create a recorded run');
  const manualRow=(await pool.query('SELECT trigger_source,status,triggered_by FROM background_job_runs WHERE id=$1',[manual.runId])).rows[0];
  assert(manualRow.trigger_source==='manual'&&Number(manualRow.triggered_by)===Number(admin.id),'Manual retry metadata is incorrect');

  const auditCount=Number((await pool.query(
    "SELECT COUNT(*)::int AS count FROM critical_action_audit WHERE actor_user_id=$1 AND action='background_job.retry' AND entity_id='notification_email_delivery'",
    [admin.id]
  )).rows[0].count);
  assert(auditCount===1,'Manual retry must create one critical-action audit record');

  const listed=await registry.list({historyLimit:3});
  const notificationJob=listed.jobs.find(job=>job.key==='notification_email_delivery');
  assert(notificationJob&&notificationJob.recentRuns.some(run=>Number(run.id)===Number(manual.runId)),'Admin registry must expose recent recorded runs');
  assert(listed.externalJobs.some(job=>job.key==='database_backup_verification'&&job.retrySupported===false),'Backup verification must be monitor-only');

  await pool.query("DELETE FROM critical_action_audit WHERE actor_user_id=$1",[admin.id]);
  await pool.query("DELETE FROM background_job_leases WHERE job_key IN ('ci_secret_job','ci_locked_job','notification_email_delivery')");
  await pool.query("DELETE FROM background_job_runs WHERE triggered_by=$1 OR job_key IN ('ci_secret_job','ci_locked_job')",[admin.id]);
  await pool.query('DELETE FROM users WHERE id=$1',[admin.id]);
  console.log('Background job control center PostgreSQL runtime smoke passed.');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
