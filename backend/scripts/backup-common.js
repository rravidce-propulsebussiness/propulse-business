require('dotenv').config();
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {spawn}=require('child_process');
const {Client}=require('pg');
const releaseIdentity=require('../src/services/releaseIdentityService');

function envFlag(name,fallback=false){
  const value=String(process.env[name]??'').trim().toLowerCase();
  if(!value)return Boolean(fallback);
  if(['1','true','yes','on'].includes(value))return true;
  if(['0','false','no','off'].includes(value))return false;
  return Boolean(fallback);
}
function dbConfig(prefix='',fallback=null){
  const get=(name,defaultValue)=>{
    const value=String(process.env[prefix+name]??'').trim();
    if(value)return value;
    if(fallback)return fallback[name.toLowerCase()]??defaultValue;
    return defaultValue;
  };
  const sslRaw=get('SSL',fallback?.ssl?'true':'false');
  return{
    host:get('HOST','localhost'),
    port:Number(get('PORT','5432'))||5432,
    database:get('NAME','propulse'),
    user:get('USER','postgres'),
    password:get('PASSWORD',''),
    ssl:/^(1|true|require)$/i.test(sslRaw),
    sslRejectUnauthorized:! /^(0|false)$/i.test(get('SSL_REJECT_UNAUTHORIZED','true'))
  };
}
function sourceDbConfig(){
  const databaseUrl=String(process.env.DATABASE_URL||'').trim();
  if(databaseUrl&&!/(YOUR_|\[YOUR|CHANGE_ME|PLACEHOLDER)/i.test(databaseUrl)){
    const parsed=new URL(databaseUrl);
    if(!['postgres:','postgresql:'].includes(parsed.protocol)||!parsed.hostname||!parsed.username||!parsed.pathname||parsed.pathname==='/'){
      throw new Error('DATABASE_URL is not a complete PostgreSQL URL');
    }
    const host=parsed.hostname;
    const sslMode=String(parsed.searchParams.get('sslmode')||'').trim().toLowerCase();
    const isSupabasePooler=/\.pooler\.supabase\.com$/i.test(host);
    const ssl=isSupabasePooler||['require','verify-ca','verify-full'].includes(sslMode)||/^(1|true|require)$/i.test(String(process.env.DB_SSL||'').trim());
    return{
      host,
      port:Number(parsed.port)||5432,
      database:decodeURIComponent(parsed.pathname.replace(/^\//,'')),
      user:decodeURIComponent(parsed.username),
      password:decodeURIComponent(parsed.password),
      ssl,
      sslRejectUnauthorized:isSupabasePooler?false:! /^(0|false)$/i.test(String(process.env.DB_SSL_REJECT_UNAUTHORIZED||'true').trim())
    };
  }
  return dbConfig('DB_');
}
function restoreDbConfig(){
  const source=sourceDbConfig();
  return dbConfig('RESTORE_VERIFY_DB_',source);
}
function nodeClientConfig(config,database=config.database){
  return{
    host:config.host,
    port:config.port,
    database,
    user:config.user,
    password:config.password,
    ssl:config.ssl?{rejectUnauthorized:config.sslRejectUnauthorized}:false,
    application_name:'propulse-backup-verifier'
  };
}
function cliEnv(config){
  return{
    ...process.env,
    PGPASSWORD:config.password||'',
    PGSSLMODE:config.ssl?'require':'disable',
    PGAPPNAME:'propulse-backup-verifier'
  };
}
function pgArgs(config,database=config.database){
  return['--host',config.host,'--port',String(config.port),'--username',config.user,'--dbname',database];
}
function runCommand(binary,args,{env=process.env,cwd=process.cwd()}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{env,cwd,stdio:['ignore','pipe','pipe'],windowsHide:true});
    let stdout='',stderr='';
    child.stdout.on('data',chunk=>{stdout+=String(chunk);if(stdout.length>20000)stdout=stdout.slice(-20000)});
    child.stderr.on('data',chunk=>{stderr+=String(chunk);if(stderr.length>40000)stderr=stderr.slice(-40000)});
    child.once('error',error=>{
      if(error.code==='ENOENT')return reject(new Error(`${binary} was not found. Install PostgreSQL client tools or configure the matching *_BIN environment variable.`));
      reject(error);
    });
    child.once('close',code=>{
      if(code===0)return resolve({stdout,stderr});
      reject(new Error(`${binary} exited with code ${code}${stderr.trim()?': '+stderr.trim():''}`));
    });
  });
}
function timestamp(){
  return new Date().toISOString().replace(/[:.]/g,'-');
}
function buildCommit(){
  return String(releaseIdentity.commit()||'local').trim().slice(0,64)||'local';
}
async function ensurePrivateDirectory(dir){
  await fs.promises.mkdir(dir,{recursive:true,mode:0o700});
  await fs.promises.chmod(dir,0o700).catch(()=>{});
  return dir;
}
async function sha256File(file){
  return new Promise((resolve,reject)=>{
    const hash=crypto.createHash('sha256');
    const input=fs.createReadStream(file);
    input.on('error',reject);
    input.on('data',chunk=>hash.update(chunk));
    input.on('end',()=>resolve(hash.digest('hex')));
  });
}
async function snapshotMetrics(client){
  const row=(await client.query(`
    SELECT
      (SELECT COUNT(*) FROM schema_migrations)::text AS schema_migrations,
      (SELECT COUNT(*) FROM users)::text AS users,
      (SELECT COUNT(*) FROM wallets)::text AS wallets,
      (SELECT COALESCE(SUM(balance),0)::numeric FROM wallets)::text AS wallet_balance,
      (SELECT COUNT(*) FROM wallet_transactions)::text AS wallet_transactions,
      (SELECT COUNT(*) FROM wallet_topups)::text AS wallet_topups,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM wallet_topups WHERE status='approved')::text AS approved_topups,
      (SELECT COUNT(*) FROM payments)::text AS payments,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM payments WHERE status='paid')::text AS paid_payments,
      (SELECT COUNT(*) FROM lead_purchases)::text AS lead_purchases,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM lead_purchases)::text AS lead_purchase_amount,
      (SELECT COUNT(*) FROM memberships)::text AS memberships,
      (SELECT COUNT(*) FROM lead_partner_earnings)::text AS partner_earnings,
      (SELECT COALESCE(SUM(earning_amount),0)::numeric FROM lead_partner_earnings WHERE status<>'reversed')::text AS partner_earning_amount,
      (SELECT COUNT(*) FROM lead_partner_payout_requests)::text AS partner_payouts,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM lead_partner_payout_requests WHERE status='paid')::text AS partner_paid_amount,
      (SELECT COUNT(*) FROM investments)::text AS investments,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM investments)::text AS investment_amount,
      (SELECT COUNT(*) FROM investor_payout_requests)::text AS investor_payouts,
      (SELECT COALESCE(SUM(amount),0)::numeric FROM investor_payout_requests WHERE status='paid')::text AS investor_paid_amount
  `)).rows[0]||{};
  return row;
}
function compareMetrics(expected,actual){
  const mismatches=[];
  for(const key of Object.keys(expected||{})){
    if(String(expected[key]??'')!==String(actual?.[key]??''))mismatches.push(key);
  }
  return mismatches;
}
async function ensureBackupVerificationSchema(){
  const config=sourceDbConfig();
  const client=new Client(nodeClientConfig(config));
  await client.connect();
  try{
    const row=(await client.query("SELECT to_regclass('public.backup_verification_runs') AS table_name")).rows[0];
    if(!row?.table_name){
      const error=new Error('Backup verification schema is not ready. Run "npm run db:migrate" from backend before running backup verification.');
      error.code='BACKUP_SCHEMA_NOT_READY';
      throw error;
    }
  }finally{
    await client.end();
  }
}
async function recordVerification({backupType,status,artifactName=null,artifactSha256=null,artifactSizeBytes=null,metrics={},errorMessage=null,startedAt=null}){
  const config=sourceDbConfig();
  const client=new Client(nodeClientConfig(config));
  await client.connect();
  try{
    const row=(await client.query(
      `INSERT INTO backup_verification_runs(
         backup_type,status,artifact_name,artifact_sha256,artifact_size_bytes,build_commit,metrics,error_message,started_at,completed_at
       ) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,COALESCE($9::timestamptz,CURRENT_TIMESTAMP),CURRENT_TIMESTAMP)
       RETURNING id,completed_at`,
      [backupType,status,artifactName,artifactSha256,artifactSizeBytes,buildCommit(),JSON.stringify(metrics||{}),errorMessage?String(errorMessage).slice(0,1000):null,startedAt]
    )).rows[0];
    return{id:Number(row.id),completedAt:row.completed_at};
  }catch(error){
    if(error?.code==='42P01'){
      const schemaError=new Error('Backup verification schema is not ready. Run "npm run db:migrate" from backend before running backup verification.');
      schemaError.code='BACKUP_SCHEMA_NOT_READY';
      throw schemaError;
    }
    throw error;
  }finally{
    await client.end();
  }
}
function backupRoot(){
  return path.resolve(String(process.env.BACKUP_DIRECTORY||path.resolve(__dirname,'../../backups')));
}

module.exports={
  envFlag,sourceDbConfig,restoreDbConfig,nodeClientConfig,cliEnv,pgArgs,runCommand,timestamp,
  buildCommit,ensurePrivateDirectory,sha256File,snapshotMetrics,compareMetrics,ensureBackupVerificationSchema,recordVerification,backupRoot
};
