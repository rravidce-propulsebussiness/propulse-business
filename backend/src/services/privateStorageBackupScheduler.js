const crypto=require('crypto');
const pool=require('../config/database');
const s3=require('./s3PrivateObjectStorageService');
const notificationService=require('./notificationService');
const jobControl=require('./backgroundJobControlService');

const DEFAULT_INTERVAL_MS=24*60*60*1000;
const DEFAULT_RECENT_HOURS=20;
const MAX_BACKUP_OBJECT_BYTES=64*1024*1024;
const LOCK_KEY=78134921652731;
let timer=null;
let startupRetryTimer=null;
let cyclePromise=null;

function configuredIntervalMs(){
  return Math.min(7*24*60*60*1000,Math.max(6*60*60*1000,Number(process.env.PRIVATE_STORAGE_BACKUP_INTERVAL_MS)||DEFAULT_INTERVAL_MS));
}
function configuredStartupRetryMs(){
  return Math.min(10*60*1000,Math.max(30*1000,Number(process.env.PRIVATE_STORAGE_BACKUP_STARTUP_RETRY_MS)||90*1000));
}
function configuredStartupRetryAttempts(){
  return Math.min(8,Math.max(1,Math.floor(Number(process.env.PRIVATE_STORAGE_BACKUP_STARTUP_RETRY_ATTEMPTS)||5)));
}
function clean(value){return String(value??'').trim()}
function backupConfigOverride(){
  const source=s3.config();
  const bucket=clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_BUCKET)||`${source.bucket}-backup`;
  if(bucket===source.bucket)throw Object.assign(new Error('Private storage backup bucket must differ from the primary bucket'),{code:'PRIVATE_STORAGE_BACKUP_BUCKET_INVALID'});
  return{
    endpoint:clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_ENDPOINT)||source.endpointUrl.toString(),
    region:clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_REGION)||source.region,
    bucket,
    accessKeyId:clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_ACCESS_KEY_ID)||source.accessKeyId,
    secretAccessKey:clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_SECRET_ACCESS_KEY)||source.secretAccessKey,
    sessionToken:clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_SESSION_TOKEN)||source.sessionToken,
    forcePathStyle:source.forcePathStyle,
    signedUrlSeconds:60,
  };
}

function hasExplicitBackupCredentials(){
  return Boolean(
    clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_ACCESS_KEY_ID)
    || clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_SECRET_ACCESS_KEY)
    || clean(process.env.PRIVATE_OBJECT_STORAGE_BACKUP_SESSION_TOKEN)
  );
}
function sourceConfigOverride(source){
  return{
    endpoint:source.endpointUrl.toString(),
    region:source.region,
    bucket:source.bucket,
    accessKeyId:source.accessKeyId,
    secretAccessKey:source.secretAccessKey,
    sessionToken:source.sessionToken,
    forcePathStyle:source.forcePathStyle,
    signedUrlSeconds:60,
  };
}
async function chooseBackupTarget(source){
  const preferred=backupConfigOverride();
  const probeKey=`_health/backup-target-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
  try{
    await s3.putObject(probeKey,Buffer.from('ok'),{contentType:'text/plain',configOverride:preferred});
    await s3.deleteObject(probeKey,{configOverride:preferred}).catch(()=>{});
    return{config:preferred,prefix:'',mode:'separate_bucket'};
  }catch(error){
    await s3.deleteObject(probeKey,{configOverride:preferred}).catch(()=>{});
    if(error?.providerStatus!==403||hasExplicitBackupCredentials())throw error;
    // Cloudflare bucket-scoped S3 credentials cannot reach a second bucket. The backups/ prefix is object-locked in production.
    console.warn('Backup bucket credentials are scoped to the primary bucket; using the locked backups/ prefix in the primary R2 bucket.');
    return{config:sourceConfigOverride(source),prefix:'backups/',mode:'locked_primary_prefix'};
  }
}
async function referencedObjects(){
  const rows=(await pool.query(`
    WITH refs AS (
      SELECT stored_name AS ref FROM company_proof_documents
      UNION ALL SELECT proof_url FROM payments
      UNION ALL SELECT proof_url FROM wallet_topups
      UNION ALL SELECT proof_url FROM lead_partner_payout_requests
      UNION ALL SELECT proof_url FROM investor_payout_requests
      UNION ALL SELECT payout_proof_url FROM investments
      UNION ALL SELECT hero_image_url FROM homepage_media_settings
      UNION ALL
      SELECT images.value
        FROM homepage_media_settings h
        CROSS JOIN LATERAL jsonb_each_text(
          CASE WHEN jsonb_typeof(COALESCE(h.category_images,'{}'::jsonb))='object'
               THEN COALESCE(h.category_images,'{}'::jsonb)
               ELSE '{}'::jsonb END
        ) AS images(key,value)
      UNION ALL SELECT cover_image_url FROM business_profile_projects
      UNION ALL SELECT video_url FROM business_profile_projects
      UNION ALL SELECT plan_url FROM business_profile_projects
      UNION ALL
      SELECT item->>'storageKey'
        FROM leads l
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(COALESCE(l.custom_fields->'_reference_files','[]'::jsonb))='array'
               THEN COALESCE(l.custom_fields->'_reference_files','[]'::jsonb)
               ELSE '[]'::jsonb END
        ) AS item
    )
    SELECT DISTINCT ref
      FROM refs
     WHERE ref LIKE 'private-object-s3:%'
     ORDER BY ref
  `)).rows;
  return rows.map(row=>s3.parseReference(row.ref)).filter(Boolean);
}
function sha256(buffer){return crypto.createHash('sha256').update(buffer).digest('hex')}
async function latestVerifiedAgeHours(){
  const row=(await pool.query(
    `SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-completed_at))/3600.0 AS age_hours
       FROM backup_verification_runs
      WHERE backup_type='private_storage' AND status='verified'
      ORDER BY completed_at DESC,id DESC
      LIMIT 1`
  )).rows[0];
  const value=Number(row?.age_hours);
  return Number.isFinite(value)?value:null;
}
async function recordVerification({status,artifactName,sizeBytes=null,metrics={},errorMessage=null,startedAt}){
  return (await pool.query(
    `INSERT INTO backup_verification_runs(
       backup_type,status,artifact_name,artifact_size_bytes,build_commit,metrics,error_message,started_at,completed_at
     ) VALUES('private_storage',$1,$2,$3,$4,$5::jsonb,$6,$7::timestamptz,CURRENT_TIMESTAMP)
     RETURNING id,completed_at`,
    [
      status,artifactName,sizeBytes,
      clean(process.env.GIT_COMMIT_SHA||process.env.COMMIT_SHA||'')||null,
      JSON.stringify(metrics||{}),
      errorMessage?String(errorMessage).slice(0,1000):null,
      startedAt
    ]
  )).rows[0];
}
async function acquireLock(client){
  const row=(await client.query('SELECT pg_try_advisory_lock($1::bigint) AS locked',[LOCK_KEY])).rows[0];
  return Boolean(row?.locked);
}
async function releaseLock(client){
  await client.query('SELECT pg_advisory_unlock($1::bigint)',[LOCK_KEY]).catch(()=>{});
}
async function runPrivateStorageBackupCore({force=false}={}){
  if(!s3.isEnabled())return{skipped:true,reason:'object_storage_disabled'};
  const recentHours=Math.min(168,Math.max(1,Number(process.env.PRIVATE_STORAGE_BACKUP_RECENT_HOURS)||DEFAULT_RECENT_HOURS));
  if(!force){
    const age=await latestVerifiedAgeHours();
    if(age!==null&&age<recentHours)return{skipped:true,reason:'recent_verified_backup',ageHours:Number(age.toFixed(1))};
  }

  const lockClient=await pool.connect();
  const startedAt=new Date().toISOString();
  let locked=false;
  let artifactName=null;
  try{
    locked=await acquireLock(lockClient);
    if(!locked)return{skipped:true,reason:'backup_already_running'};

    const sourceCfg=s3.config();
    const target=await chooseBackupTarget(sourceCfg);
    const backupCfg=target.config;
    const day=new Date().toISOString().slice(0,10);
    const targetKey=relative=>target.prefix+relative;
    artifactName=`s3://${backupCfg.bucket}/${targetKey(`snapshots/${day}`)}`;
    const keys=await referencedObjects();
    const manifest=[];
    let copied=0,reused=0,totalBytes=0;

    for(const key of keys){
      const sourceHead=await s3.headObject(key);
      if(!sourceHead)throw Object.assign(new Error('Primary R2 object is missing: '+key),{code:'PRIVATE_STORAGE_SOURCE_MISSING'});
      if(sourceHead.size<=0||sourceHead.size>MAX_BACKUP_OBJECT_BYTES)throw Object.assign(new Error('Primary R2 object has an invalid backup size: '+key),{code:'PRIVATE_STORAGE_SOURCE_SIZE_INVALID'});
      const backupKey=targetKey(`snapshots/${day}/${key}`);
      let backupHead=await s3.headObject(backupKey,{configOverride:backupCfg});
      if(backupHead&&backupHead.size===sourceHead.size&&backupHead.etag&&sourceHead.etag&&backupHead.etag===sourceHead.etag){
        reused+=1;
      }else{
        if(backupHead)throw Object.assign(new Error('Existing backup object does not match primary R2 object: '+key),{code:'PRIVATE_STORAGE_BACKUP_MISMATCH'});
        const source=await s3.getObjectBuffer(key,{maxBytes:MAX_BACKUP_OBJECT_BYTES});
        if(source.buffer.length!==sourceHead.size)throw Object.assign(new Error('Primary R2 object size changed during backup: '+key),{code:'PRIVATE_STORAGE_SOURCE_CHANGED'});
        await s3.putObject(backupKey,source.buffer,{contentType:source.contentType||sourceHead.contentType||'application/octet-stream',configOverride:backupCfg});
        backupHead=await s3.headObject(backupKey,{configOverride:backupCfg});
        if(!backupHead||backupHead.size!==sourceHead.size)throw Object.assign(new Error('Backup object size verification failed: '+key),{code:'PRIVATE_STORAGE_BACKUP_VERIFY_FAILED'});
        if(sourceHead.etag&&backupHead.etag&&sourceHead.etag!==backupHead.etag){
          const restored=await s3.getObjectBuffer(backupKey,{maxBytes:MAX_BACKUP_OBJECT_BYTES,configOverride:backupCfg});
          if(restored.buffer.length!==source.buffer.length||sha256(restored.buffer)!==sha256(source.buffer)){
            throw Object.assign(new Error('Backup object checksum verification failed: '+key),{code:'PRIVATE_STORAGE_BACKUP_VERIFY_FAILED'});
          }
        }
        copied+=1;
      }
      totalBytes+=sourceHead.size;
      manifest.push({key,backupKey,size:sourceHead.size,etag:sourceHead.etag||null});
    }

    const completedAt=new Date().toISOString();
    const manifestKey=targetKey(`manifests/${day}-${Date.now()}.json`);
    const manifestBody=Buffer.from(JSON.stringify({
      version:1,startedAt,completedAt,
      sourceBucket:sourceCfg.bucket,backupBucket:backupCfg.bucket,backupMode:target.mode,backupPrefix:target.prefix,
      objectCount:keys.length,totalBytes,copied,reused,objects:manifest
    },null,2)+'\n');
    await s3.putObject(manifestKey,manifestBody,{contentType:'application/json',configOverride:backupCfg});
    const manifestHead=await s3.headObject(manifestKey,{configOverride:backupCfg});
    // Some R2/S3 gateways can report unexpected HEAD metadata immediately after a write; verify bytes before declaring failure.
    let manifestVerified=Boolean(manifestHead&&manifestHead.size===manifestBody.length);
    if(!manifestVerified){
      const restoredManifest=await s3.getObjectBuffer(manifestKey,{maxBytes:1024*1024,configOverride:backupCfg});
      manifestVerified=restoredManifest.buffer.length===manifestBody.length&&sha256(restoredManifest.buffer)===sha256(manifestBody);
    }
    if(!manifestVerified)throw Object.assign(new Error('Backup manifest verification failed'),{code:'PRIVATE_STORAGE_BACKUP_MANIFEST_FAILED'});

    const verification=await recordVerification({
      status:'verified',artifactName,sizeBytes:totalBytes,startedAt,
      metrics:{provider:'r2',sourceBucket:sourceCfg.bucket,backupBucket:backupCfg.bucket,backupMode:target.mode,backupPrefix:target.prefix,objectCount:keys.length,copied,reused,totalBytes,manifestKey,protection:'30_day_bucket_lock'}
    });
    console.log(`Private R2 backup verified: run #${verification.id}, objects=${keys.length}, copied=${copied}, reused=${reused}, bytes=${totalBytes}.`);
    return{verified:true,runId:Number(verification.id),objectCount:keys.length,copied,reused,totalBytes,backupBucket:backupCfg.bucket,backupMode:target.mode,backupPrefix:target.prefix,manifestKey};
  }catch(error){
    await recordVerification({
      status:'failed',artifactName,sizeBytes:null,startedAt,
      metrics:{provider:'r2'},errorMessage:error?.message||String(error)
    }).catch(()=>{});
    await notificationService.notifyAdmins({
      type:'private_storage_backup_failed',category:'system',severity:'critical',
      title:'Private file backup failed',
      message:'The automated Cloudflare R2 backup could not be verified. Review System Health and object-storage credentials.',
      actionUrl:'/admin/system-health',relatedType:'private_storage_backup',relatedId:new Date().toISOString().slice(0,10),
      dedupeKey:`private-storage-backup-failed:${new Date().toISOString().slice(0,10)}`
    }).catch(()=>{});
    throw error;
  }finally{
    if(locked)await releaseLock(lockClient);
    lockClient.release();
  }
}
async function runPrivateStorageBackup({source='scheduled',triggeredBy=null,force=false}={}){
  if(cyclePromise)return cyclePromise;
  cyclePromise=jobControl.execute({
    jobKey:'private_storage_backup',source,triggeredBy,
    task:()=>runPrivateStorageBackupCore({force})
  }).finally(()=>{cyclePromise=null});
  return cyclePromise;
}
function startPrivateStorageBackupScheduler({unref=true,runImmediately=true}={}){
  if(timer)return async()=>{};
  if(!s3.isEnabled()){
    console.log('Private storage backup scheduler disabled because object storage is not enabled.');
    return async()=>{};
  }
  const intervalMs=configuredIntervalMs();
  const retryMs=configuredStartupRetryMs();
  const retryAttempts=configuredStartupRetryAttempts();
  console.log(`Private R2 backup scheduler enabled: every ${Math.round(intervalMs/3600000)} hour(s).`);

  const startupAttempt=async attempt=>{
    try{
      const result=await runPrivateStorageBackup({source:'startup'});
      if(result?.busy&&attempt<retryAttempts){
        console.log(`Private R2 startup backup is busy; retrying in ${Math.round(retryMs/1000)}s (attempt ${attempt+1}/${retryAttempts}).`);
        startupRetryTimer=setTimeout(()=>{startupRetryTimer=null;void startupAttempt(attempt+1)},retryMs);
        if(unref)startupRetryTimer.unref?.();
      }
    }catch(error){
      console.error('Private R2 backup cycle failed:',error.message);
    }
  };

  if(runImmediately){
    startupRetryTimer=setTimeout(()=>{startupRetryTimer=null;void startupAttempt(1)},15000);
    if(unref)startupRetryTimer.unref?.();
  }
  timer=setInterval(()=>{void runPrivateStorageBackup({source:'scheduled'}).catch(error=>console.error('Private R2 backup cycle failed:',error.message))},intervalMs);
  if(unref)timer.unref?.();
  return async()=>{
    if(timer){clearInterval(timer);timer=null}
    if(startupRetryTimer){clearTimeout(startupRetryTimer);startupRetryTimer=null}
    if(cyclePromise)await cyclePromise.catch(()=>{});
  };
}

module.exports={
  DEFAULT_INTERVAL_MS,MAX_BACKUP_OBJECT_BYTES,configuredIntervalMs,configuredStartupRetryMs,configuredStartupRetryAttempts,backupConfigOverride,chooseBackupTarget,
  referencedObjects,runPrivateStorageBackup,runPrivateStorageBackupCore,startPrivateStorageBackupScheduler
};
