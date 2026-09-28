const fs=require('fs');
const path=require('path');
const pool=require('../config/database');
const {checkUploadStorage}=require('../config/uploadStorage');
const workerHeartbeat=require('./backgroundWorkerHeartbeatService');
const financialReconciliationMonitor=require('./financialReconciliationMonitorService');
const backupVerificationService=require('./backupVerificationService');
const privateObjectStorage=require('./s3PrivateObjectStorageService');

const migrationsDir=path.join(__dirname,'../database/migrations');
const workerHeartbeatMaxAgeSeconds=Math.min(600,Math.max(30,Math.floor(Number(process.env.WORKER_HEARTBEAT_MAX_AGE_SECONDS)||120)));
const financialReconciliationMaxAgeHours=Math.min(168,Math.max(2,Number(process.env.FINANCIAL_RECONCILIATION_MAX_AGE_HOURS)||30));
const backupVerificationMaxAgeHours=Math.min(720,Math.max(1,Number(process.env.BACKUP_VERIFICATION_MAX_AGE_HOURS)||30));
const backupVerificationRequired=/^(1|true|yes|on)$/i.test(String(process.env.REQUIRE_BACKUP_VERIFICATION||'').trim());

function buildVersion(){
  const raw=String(process.env.GIT_COMMIT_SHA||process.env.RENDER_GIT_COMMIT||process.env.VERCEL_GIT_COMMIT_SHA||process.env.COMMIT_SHA||'').trim();
  return raw?raw.slice(0,12):'local';
}
function safeNumber(value){const n=Number(value);return Number.isFinite(n)?n:0}
async function migrationHealth(){
  const files=fs.existsSync(migrationsDir)?fs.readdirSync(migrationsDir).filter(name=>name.endsWith('.sql')):[];
  const row=(await pool.query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0];
  const applied=safeNumber(row?.count);
  return{checked:files.length,applied,pending:Math.max(0,files.length-applied),status:applied>=files.length?'current':'pending'};
}
async function leadPartnerSheetHealth(){
  const row=(await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active')::int AS active,
      COUNT(*) FILTER (WHERE status='active' AND COALESCE(last_sync_failed,0)>0)::int AS failing,
      COUNT(*) FILTER (WHERE status='active' AND sync_failure_count>0)::int AS connection_errors,
      MAX(last_synced_at) AS last_synced_at
    FROM lead_partner_sheet_connections
  `)).rows[0]||{};
  const failures=(await pool.query(`
    SELECT id,last_sync_failed,sync_failure_count,last_sync_error,last_synced_at
      FROM lead_partner_sheet_connections
     WHERE status='active'
       AND (COALESCE(last_sync_failed,0)>0 OR sync_failure_count>0)
     ORDER BY COALESCE(last_sync_error_at,last_synced_at,updated_at) DESC
     LIMIT 8
  `)).rows;
  return{
    active:safeNumber(row.active),
    failing:safeNumber(row.failing),
    connectionErrors:safeNumber(row.connection_errors),
    lastSyncedAt:row.last_synced_at||null,
    recentProblems:failures.map(item=>({
      id:Number(item.id),
      failedRows:safeNumber(item.last_sync_failed),
      failureCount:safeNumber(item.sync_failure_count),
      error:item.last_sync_error?String(item.last_sync_error).slice(0,240):null,
      lastSyncedAt:item.last_synced_at||null
    }))
  };
}
async function adminSheetHealth(){
  const row=(await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active')::int AS active,
      COUNT(*) FILTER (WHERE status='active' AND COALESCE(last_sync_failed,0)>0)::int AS failing,
      COUNT(*) FILTER (WHERE status='active' AND sync_failure_count>0)::int AS connection_errors,
      MAX(last_synced_at) AS last_synced_at
    FROM admin_google_sheet_connections
  `)).rows[0]||{};
  const failures=(await pool.query(`
    SELECT id,last_sync_failed,sync_failure_count,last_sync_error,last_synced_at
      FROM admin_google_sheet_connections
     WHERE status='active'
       AND (COALESCE(last_sync_failed,0)>0 OR sync_failure_count>0)
     ORDER BY COALESCE(last_sync_error_at,last_synced_at,updated_at) DESC
     LIMIT 8
  `)).rows;
  return{
    active:safeNumber(row.active),
    failing:safeNumber(row.failing),
    connectionErrors:safeNumber(row.connection_errors),
    lastSyncedAt:row.last_synced_at||null,
    recentProblems:failures.map(item=>({
      id:Number(item.id),
      failedRows:safeNumber(item.last_sync_failed),
      failureCount:safeNumber(item.sync_failure_count),
      error:item.last_sync_error?String(item.last_sync_error).slice(0,240):null,
      lastSyncedAt:item.last_synced_at||null
    }))
  };
}
async function getSystemHealth(){
  const [databaseProbe,storageProbe,privateObjectProbe,heartbeatResult,migrationsResult,partnerSheetsResult,adminSheetsResult,financialResult,backupResult]=await Promise.allSettled([
    pool.query('SELECT NOW() AS now'),
    checkUploadStorage(),
    privateObjectStorage.isEnabled()?privateObjectStorage.probe():Promise.resolve({provider:'local',configured:false,status:'ready'}),
    workerHeartbeat.latestHeartbeat(),
    migrationHealth(),
    leadPartnerSheetHealth(),
    adminSheetHealth(),
    financialReconciliationMonitor.getHealthSummary({maxAgeHours:financialReconciliationMaxAgeHours}),
    backupVerificationService.getHealthSummary({maxAgeHours:backupVerificationMaxAgeHours,required:backupVerificationRequired})
  ]);

  const databaseOk=databaseProbe.status==='fulfilled';
  const storageOk=storageProbe.status==='fulfilled';
  const privateObjectHealth=privateObjectProbe.status==='fulfilled'?privateObjectProbe.value:(privateObjectProbe.reason?.health||{provider:'s3',configured:true,status:'unavailable',error:String(privateObjectProbe.reason?.message||'Object storage unavailable').slice(0,240)});
  const privateObjectOk=privateObjectHealth.status==='ready';
  const heartbeat=heartbeatResult.status==='fulfilled'?heartbeatResult.value:null;
  const workerAgeSeconds=heartbeat?safeNumber(heartbeat.age_seconds):null;
  const workerFresh=Boolean(heartbeat)&&workerAgeSeconds<=workerHeartbeatMaxAgeSeconds;
  const migrations=migrationsResult.status==='fulfilled'?migrationsResult.value:{status:'unavailable',checked:0,applied:0,pending:null};
  const leadPartnerSheets=partnerSheetsResult.status==='fulfilled'?partnerSheetsResult.value:{active:0,failing:0,connectionErrors:0,lastSyncedAt:null,recentProblems:[],unavailable:true};
  const adminSheets=adminSheetsResult.status==='fulfilled'?adminSheetsResult.value:{active:0,failing:0,connectionErrors:0,lastSyncedAt:null,recentProblems:[],unavailable:true};
  const financialIntegrity=financialResult.status==='fulfilled'?financialResult.value:{status:'unavailable',latestRunId:null,lastCompletedAt:null,ageHours:null,maxAgeHours:financialReconciliationMaxAgeHours,criticalAlerts:0,warningAlerts:0,totalIssues:null};
  const backups=backupResult.status==='fulfilled'?backupResult.value:{status:'unavailable',required:backupVerificationRequired,maxAgeHours:backupVerificationMaxAgeHours,database:{status:'unavailable'},privateStorage:{status:'unavailable'},verifiedCount:0};
  const poolMax=Math.max(1,Number(pool.options?.max)||5);
  const totalConnections=safeNumber(pool.totalCount);
  const waiting=safeNumber(pool.waitingCount);
  const memory=process.memoryUsage();

  const degraded=!databaseOk||!storageOk||!privateObjectOk||!workerFresh||migrations.status!=='current'||leadPartnerSheets.failing>0||leadPartnerSheets.connectionErrors>0||adminSheets.failing>0||adminSheets.connectionErrors>0||financialIntegrity.status!=='healthy'||(backups.required&&backups.status!=='healthy');
  return{
    status:degraded?'degraded':'healthy',
    checkedAt:new Date().toISOString(),
    build:{
      commit:buildVersion(),
      environment:String(process.env.NODE_ENV||'development'),
      node:process.version
    },
    runtime:{
      uptimeSeconds:Math.floor(process.uptime()),
      memoryMb:{
        rss:Math.round(memory.rss/1024/1024),
        heapUsed:Math.round(memory.heapUsed/1024/1024),
        heapTotal:Math.round(memory.heapTotal/1024/1024)
      }
    },
    database:{
      status:databaseOk?'connected':'unavailable',
      pool:{
        max:poolMax,
        total:totalConnections,
        idle:safeNumber(pool.idleCount),
        waiting,
        utilizationPercent:Math.min(100,Math.round((totalConnections/poolMax)*100))
      }
    },
    storage:{
      status:storageOk?'ready':'unavailable',
      persistentConfigured:Boolean(String(process.env.UPLOAD_STORAGE_ROOT||'').trim()),
      privateObjects:{
        driver:privateObjectStorage.driver(),
        status:privateObjectHealth.status||'unavailable',
        configured:Boolean(privateObjectHealth.configured),
        provider:privateObjectHealth.provider||privateObjectStorage.driver(),
        error:privateObjectHealth.error||null
      }
    },
    worker:{
      status:workerFresh?'fresh':heartbeat?'stale':'unavailable',
      ageSeconds:workerAgeSeconds,
      maxAgeSeconds:workerHeartbeatMaxAgeSeconds,
      lastSeenAt:heartbeat?.last_seen_at||null,
      startedAt:heartbeat?.started_at||null
    },
    migrations,
    financialIntegrity,
    backups,
    sheets:{
      leadPartner:leadPartnerSheets,
      admin:adminSheets
    }
  };
}

module.exports={getSystemHealth};
