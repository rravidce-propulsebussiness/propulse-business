const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {Client}=require('pg');
const {createDatabaseBackup}=require('./database-backup');
const {
  restoreDbConfig,nodeClientConfig,cliEnv,pgArgs,runCommand,sha256File,snapshotMetrics,
  compareMetrics,ensureBackupVerificationSchema,recordVerification
}=require('./backup-common');

function optionValue(name){
  const prefix='--'+name+'=';
  const item=process.argv.slice(2).find(value=>value.startsWith(prefix));
  return item?item.slice(prefix.length):null;
}
function quoteIdentifier(value){
  return '"'+String(value).replace(/"/g,'""')+'"';
}
function tempDatabaseName(){
  const suffix=crypto.randomBytes(6).toString('hex');
  const stamp=Date.now().toString(36);
  return `propulse_restore_verify_${stamp}_${suffix}`.slice(0,63);
}
async function loadBackup(){
  const explicit=optionValue('manifest')||String(process.env.BACKUP_MANIFEST||'').trim();
  if(!explicit)return createDatabaseBackup();
  const manifestPath=path.resolve(explicit);
  const manifest=JSON.parse(await fs.promises.readFile(manifestPath,'utf8'));
  const dumpPath=path.resolve(path.dirname(manifestPath),String(manifest?.artifact?.file||''));
  if(!manifest?.artifact?.sha256||!manifest?.metrics)throw new Error('Backup manifest is incomplete');
  return{manifestPath,dumpPath,manifest};
}
async function verifyDatabaseBackup(){
  const startedAt=new Date().toISOString();
  let backup=null;
  let tempDb=null;
  let maintenance=null;
  let artifactName=null;
  try{
    await ensureBackupVerificationSchema();
    backup=await loadBackup();
    artifactName=path.basename(backup.dumpPath);
    const stat=await fs.promises.stat(backup.dumpPath);
    if(stat.size<=0)throw new Error('Database backup file is empty');
    const actualHash=await sha256File(backup.dumpPath);
    if(actualHash!==backup.manifest.artifact.sha256)throw new Error('Database backup SHA-256 does not match its manifest');

    const target=restoreDbConfig();
    const maintenanceDb=String(process.env.RESTORE_VERIFY_MAINTENANCE_DB||'postgres').trim()||'postgres';
    tempDb=tempDatabaseName();
    if(!tempDb.startsWith('propulse_restore_verify_'))throw new Error('Unsafe restore verification database name');

    maintenance=new Client(nodeClientConfig(target,maintenanceDb));
    await maintenance.connect();
    try{
      await maintenance.query(`CREATE DATABASE ${quoteIdentifier(tempDb)} TEMPLATE template0`);
    }catch(error){
      if(error?.code==='42501')throw new Error('Restore verification credentials need CREATEDB permission on the isolated verification PostgreSQL server');
      throw error;
    }

    const pgRestore=String(process.env.PG_RESTORE_BIN||'pg_restore').trim();
    await runCommand(pgRestore,[
      ...pgArgs(target,tempDb),
      '--exit-on-error',
      '--no-owner',
      '--no-privileges',
      backup.dumpPath
    ],{env:cliEnv(target)});

    const restoredClient=new Client(nodeClientConfig(target,tempDb));
    await restoredClient.connect();
    const restoredMetrics=await snapshotMetrics(restoredClient);
    await restoredClient.end();

    const mismatches=compareMetrics(backup.manifest.metrics,restoredMetrics);
    if(mismatches.length)throw new Error('Restored database metrics differ from the backup snapshot: '+mismatches.join(', '));

    await maintenance.query(`DROP DATABASE ${quoteIdentifier(tempDb)} WITH (FORCE)`);
    tempDb=null;
    await maintenance.end();
    maintenance=null;

    const verification=await recordVerification({
      backupType:'database',
      status:'verified',
      artifactName,
      artifactSha256:actualHash,
      artifactSizeBytes:stat.size,
      metrics:{snapshot:backup.manifest.metrics,restored:restoredMetrics,mismatches:[]},
      startedAt
    });
    console.log(`Database restore verification passed: run #${verification.id}.`);
    console.log('Verified artifact:',backup.dumpPath);
    return{...verification,artifact:backup.dumpPath,metrics:restoredMetrics};
  }catch(error){
    if(maintenance&&tempDb){
      await maintenance.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(tempDb)} WITH (FORCE)`).catch(()=>{});
    }
    if(maintenance)await maintenance.end().catch(()=>{});
    await recordVerification({
      backupType:'database',
      status:'failed',
      artifactName,
      artifactSha256:backup?.manifest?.artifact?.sha256||null,
      artifactSizeBytes:backup?.manifest?.artifact?.bytes||null,
      metrics:{},
      errorMessage:error.message,
      startedAt
    }).catch(()=>{});
    throw error;
  }
}

if(require.main===module){
  verifyDatabaseBackup().catch(error=>{console.error(error.stack||error);process.exitCode=1});
}

module.exports={verifyDatabaseBackup};
