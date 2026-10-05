const fs=require('fs');
const os=require('os');
const path=require('path');
const crypto=require('crypto');
const pool=require('../config/database');
const s3=require('./s3PrivateObjectStorageService');
const {chooseBackupTarget}=require('./privateStorageBackupScheduler');
const notificationService=require('./notificationService');
const jobControl=require('./backgroundJobControlService');
const {createDatabaseBackup}=require('../../scripts/database-backup');
const {recordVerification}=require('../../scripts/backup-common');

const DEFAULT_INTERVAL_MS=24*60*60*1000;
const DEFAULT_RECENT_HOURS=20;
const DEFAULT_MAX_BYTES=256*1024*1024;
let timer=null;
let startupRetryTimer=null;
let cyclePromise=null;

function configuredIntervalMs(){
  return Math.min(7*24*60*60*1000,Math.max(6*60*60*1000,Number(process.env.DATABASE_BACKUP_INTERVAL_MS)||DEFAULT_INTERVAL_MS));
}
function configuredRecentHours(){
  return Math.min(168,Math.max(1,Number(process.env.DATABASE_BACKUP_RECENT_HOURS)||DEFAULT_RECENT_HOURS));
}
function configuredMaxBytes(){
  return Math.min(1024*1024*1024,Math.max(16*1024*1024,Number(process.env.DATABASE_BACKUP_MAX_BYTES)||DEFAULT_MAX_BYTES));
}
function configuredStartupRetryMs(){
  return Math.min(10*60*1000,Math.max(30*1000,Number(process.env.DATABASE_BACKUP_STARTUP_RETRY_MS)||90*1000));
}
function configuredStartupRetryAttempts(){
  return Math.min(8,Math.max(1,Math.floor(Number(process.env.DATABASE_BACKUP_STARTUP_RETRY_ATTEMPTS)||5)));
}
function sha256(buffer){return crypto.createHash('sha256').update(buffer).digest('hex')}
async function latestVerifiedAgeHours(){
  const row=(await pool.query(
    `SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-completed_at))/3600.0 AS age_hours
       FROM backup_verification_runs
      WHERE backup_type='database' AND status='verified'
      ORDER BY completed_at DESC,id DESC
      LIMIT 1`
  )).rows[0];
  const value=Number(row?.age_hours);
  return Number.isFinite(value)?value:null;
}
async function readArtifact(file,maxBytes){
  const stat=await fs.promises.stat(file);
  if(!stat.isFile()||stat.size<=0)throw Object.assign(new Error('Database backup artifact is empty'),{code:'DATABASE_BACKUP_EMPTY'});
  if(stat.size>maxBytes)throw Object.assign(new Error(`Database backup artifact exceeds ${maxBytes} bytes`),{code:'DATABASE_BACKUP_TOO_LARGE'});
  return{buffer:await fs.promises.readFile(file),size:stat.size};
}
async function verifyRemoteObject(key,expected,{configOverride,maxBytes}){
  const head=await s3.headObject(key,{configOverride,timeoutMs:120000});
  if(!head||head.size!==expected.length)throw Object.assign(new Error('Remote database backup size verification failed'),{code:'DATABASE_BACKUP_REMOTE_SIZE_MISMATCH'});
  const restored=await s3.getObjectBuffer(key,{configOverride,maxBytes,timeoutMs:120000});
  if(restored.buffer.length!==expected.length||sha256(restored.buffer)!==sha256(expected)){
    throw Object.assign(new Error('Remote database backup checksum verification failed'),{code:'DATABASE_BACKUP_REMOTE_HASH_MISMATCH'});
  }
  return head;
}
async function runDatabaseBackupCore({force=false}={}){
  if(!s3.isEnabled())return{skipped:true,reason:'object_storage_disabled'};
  if(!force){
    const age=await latestVerifiedAgeHours();
    if(age!==null&&age<configuredRecentHours())return{skipped:true,reason:'recent_verified_backup',ageHours:Number(age.toFixed(1))};
  }

  const startedAt=new Date().toISOString();
  const maxBytes=configuredMaxBytes();
  const tempRoot=await fs.promises.mkdtemp(path.join(os.tmpdir(),'propulse-db-backup-'));
  let backup=null;
  let artifactName=null;
  try{
    backup=await createDatabaseBackup({outputDirectory:tempRoot});
    const dump=await readArtifact(backup.dumpPath,maxBytes);
    const localHash=sha256(dump.buffer);
    if(localHash!==String(backup.manifest?.artifact?.sha256||'')){
      throw Object.assign(new Error('Database backup hash changed before upload'),{code:'DATABASE_BACKUP_LOCAL_HASH_MISMATCH'});
    }

    const sourceCfg=s3.config();
    const target=await chooseBackupTarget(sourceCfg);
    const day=new Date().toISOString().slice(0,10);
    const targetKey=relative=>target.prefix+relative;
    const dumpKey=targetKey(`database/${day}/${path.basename(backup.dumpPath)}`);
    const manifestKey=targetKey(`database/${day}/${path.basename(backup.manifestPath)}`);
    artifactName=`s3://${target.config.bucket}/${dumpKey}`;

    await s3.putObject(dumpKey,dump.buffer,{
      contentType:'application/octet-stream',configOverride:target.config,timeoutMs:120000
    });
    await verifyRemoteObject(dumpKey,dump.buffer,{configOverride:target.config,maxBytes});

    const storedManifest={
      ...backup.manifest,
      remote:{
        provider:'r2',
        sourceBucket:sourceCfg.bucket,
        backupBucket:target.config.bucket,
        backupMode:target.mode,
        backupPrefix:target.prefix,
        dumpKey,
        manifestKey,
        protection:'30_day_bucket_lock'
      }
    };
    const manifestBuffer=Buffer.from(JSON.stringify(storedManifest,null,2)+'\n');
    await s3.putObject(manifestKey,manifestBuffer,{
      contentType:'application/json',configOverride:target.config,timeoutMs:120000
    });
    await verifyRemoteObject(manifestKey,manifestBuffer,{configOverride:target.config,maxBytes:1024*1024});

    const verification=await recordVerification({
      backupType:'database',
      status:'verified',
      artifactName,
      artifactSha256:localHash,
      artifactSizeBytes:dump.size,
      metrics:{
        provider:'r2',
        verification:'full_readback_sha256',
        backupBucket:target.config.bucket,
        backupMode:target.mode,
        backupPrefix:target.prefix,
        dumpKey,
        manifestKey,
        snapshot:backup.manifest.metrics
      },
      startedAt
    });
    console.log(`Database R2 backup verified: run #${verification.id}, bytes=${dump.size}, sha256=${localHash.slice(0,12)}....`);
    return{
      verified:true,
      verificationId:Number(verification.id),
      bytes:dump.size,
      sha256:localHash,
      backupBucket:target.config.bucket,
      backupMode:target.mode,
      backupPrefix:target.prefix,
      dumpKey,
      manifestKey
    };
  }catch(error){
    await recordVerification({
      backupType:'database',
      status:'failed',
      artifactName,
      artifactSha256:backup?.manifest?.artifact?.sha256||null,
      artifactSizeBytes:backup?.manifest?.artifact?.bytes||null,
      metrics:{provider:'r2'},
      errorMessage:error?.message||String(error),
      startedAt
    }).catch(()=>{});
    await notificationService.notifyAdmins({
      type:'database_backup_failed',category:'system',severity:'critical',
      title:'Database backup failed',
      message:'The automated PostgreSQL backup could not be created or verified in Cloudflare R2. Review System Health and database backup tooling.',
      actionUrl:'/admin/system-health',relatedType:'database_backup',relatedId:new Date().toISOString().slice(0,10),
      dedupeKey:`database-backup-failed:${new Date().toISOString().slice(0,10)}`
    }).catch(()=>{});
    throw error;
  }finally{
    await fs.promises.rm(tempRoot,{recursive:true,force:true}).catch(()=>{});
  }
}
async function runDatabaseBackup({source='scheduled',triggeredBy=null,force=false}={}){
  if(cyclePromise)return cyclePromise;
  cyclePromise=jobControl.execute({
    jobKey:'database_backup',source,triggeredBy,
    task:()=>runDatabaseBackupCore({force})
  }).finally(()=>{cyclePromise=null});
  return cyclePromise;
}
function startDatabaseBackupScheduler({unref=true,runImmediately=true}={}){
  if(timer)return async()=>{};
  if(!s3.isEnabled()){
    console.log('Database backup scheduler disabled because object storage is not enabled.');
    return async()=>{};
  }
  const intervalMs=configuredIntervalMs();
  const retryMs=configuredStartupRetryMs();
  const retryAttempts=configuredStartupRetryAttempts();
  console.log(`Database R2 backup scheduler enabled: every ${Math.round(intervalMs/3600000)} hour(s).`);

  const startupAttempt=async attempt=>{
    try{
      const result=await runDatabaseBackup({source:'startup'});
      if(result?.busy&&attempt<retryAttempts){
        console.log(`Database startup backup is busy; retrying in ${Math.round(retryMs/1000)}s (attempt ${attempt+1}/${retryAttempts}).`);
        startupRetryTimer=setTimeout(()=>{startupRetryTimer=null;void startupAttempt(attempt+1)},retryMs);
        if(unref)startupRetryTimer.unref?.();
      }
    }catch(error){
      console.error('Database R2 backup cycle failed:',error.message);
    }
  };

  if(runImmediately){
    startupRetryTimer=setTimeout(()=>{startupRetryTimer=null;void startupAttempt(1)},30000);
    if(unref)startupRetryTimer.unref?.();
  }
  timer=setInterval(()=>{void runDatabaseBackup({source:'scheduled'}).catch(error=>console.error('Database R2 backup cycle failed:',error.message))},intervalMs);
  if(unref)timer.unref?.();
  return async()=>{
    if(timer){clearInterval(timer);timer=null}
    if(startupRetryTimer){clearTimeout(startupRetryTimer);startupRetryTimer=null}
    if(cyclePromise)await cyclePromise.catch(()=>{});
  };
}

module.exports={
  DEFAULT_INTERVAL_MS,DEFAULT_MAX_BYTES,
  configuredIntervalMs,configuredRecentHours,configuredMaxBytes,configuredStartupRetryMs,configuredStartupRetryAttempts,
  runDatabaseBackup,runDatabaseBackupCore,startDatabaseBackupScheduler,verifyRemoteObject
};
