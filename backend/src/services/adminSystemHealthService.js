const fs=require('fs');
const path=require('path');
const pool=require('../config/database');
const {checkUploadStorage}=require('../config/uploadStorage');
const workerHeartbeat=require('./backgroundWorkerHeartbeatService');
const financialReconciliationMonitor=require('./financialReconciliationMonitorService');
const backupVerificationService=require('./backupVerificationService');
const privateObjectStorage=require('./s3PrivateObjectStorageService');
const releaseIdentity=require('./releaseIdentityService');
const emailService=require('./emailService');

const migrationsDir=path.join(__dirname,'../database/migrations');
const workerHeartbeatMaxAgeSeconds=Math.min(600,Math.max(30,Math.floor(Number(process.env.WORKER_HEARTBEAT_MAX_AGE_SECONDS)||120)));
const financialReconciliationMaxAgeHours=Math.min(168,Math.max(2,Number(process.env.FINANCIAL_RECONCILIATION_MAX_AGE_HOURS)||30));
const backupVerificationMaxAgeHours=Math.min(720,Math.max(1,Number(process.env.BACKUP_VERIFICATION_MAX_AGE_HOURS)||30));
const backupVerificationRequired=/^(1|true|yes|on)$/i.test(String(process.env.REQUIRE_BACKUP_VERIFICATION||'').trim());
const persistentSheetFailureThreshold=Math.min(20,Math.max(2,Math.floor(Number(process.env.SYSTEM_HEALTH_SHEET_FAILURE_THRESHOLD)||3)));
const backgroundWorkerRequired=/^(1|true|yes|on)$/i.test(String(process.env.REQUIRE_BACKGROUND_WORKER||'').trim());

function safeNumber(value){const n=Number(value);return Number.isFinite(n)?n:0}
function safeMessage(value,fallback){return String(value||fallback||'Operational check failed').replace(/\s+/g,' ').slice(0,240)}
function maxStatus(left,right){
  const rank={healthy:0,attention:1,degraded:2};
  return (rank[right]||0)>(rank[left]||0)?right:left;
}
function createIssue({severity='attention',code,title,message,actionUrl=null,actionLabel=null,source=null,connectionId=null}){
  return{
    severity:severity==='degraded'?'degraded':'attention',
    code:String(code||'operational_issue').slice(0,80),
    title:safeMessage(title,'Operational issue'),
    message:safeMessage(message,'Review this operational signal.'),
    actionUrl:actionUrl||null,
    actionLabel:actionLabel||null,
    source:source||null,
    connectionId:connectionId==null?null:Number(connectionId)
  };
}
async function migrationHealth(){
  const files=fs.existsSync(migrationsDir)?fs.readdirSync(migrationsDir).filter(name=>name.endsWith('.sql')):[];
  const row=(await pool.query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0];
  const applied=safeNumber(row?.count);
  return{checked:files.length,applied,pending:Math.max(0,files.length-applied),status:applied>=files.length?'current':'pending'};
}
async function legacyUploadHealth(){
  const row=(await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM company_proof_documents
        WHERE COALESCE(stored_name,'')<>'' AND stored_name NOT LIKE 'private-object-s3:%') AS company_proofs,
      (
        SELECT
          (CASE WHEN hero_image_url LIKE '/uploads/%' THEN 1 ELSE 0 END)
          + COALESCE((SELECT COUNT(*) FROM jsonb_each_text(COALESCE(category_images,'{}'::jsonb)) entry WHERE entry.value LIKE '/uploads/%'),0)
        FROM homepage_media_settings WHERE id=1
      )::int AS homepage_media,
      (SELECT COUNT(*)::int FROM business_profile_projects
        WHERE video_url LIKE '/uploads/%' OR plan_url LIKE '/uploads/%' OR cover_image_url LIKE '/uploads/%') AS project_media,
      (
        (SELECT COUNT(*) FROM payments WHERE proof_url LIKE 'private-proof:%')
        +(SELECT COUNT(*) FROM wallet_topups WHERE proof_url LIKE 'private-proof:%')
        +(SELECT COUNT(*) FROM lead_partner_payout_requests WHERE proof_url LIKE 'private-proof:%')
        +(SELECT COUNT(*) FROM investor_payout_requests WHERE proof_url LIKE 'private-proof:%')
        +(SELECT COUNT(*) FROM investments WHERE payout_proof_url LIKE 'private-proof:%')
      )::int AS private_proofs
  `)).rows[0]||{};
  const result={
    companyProofs:safeNumber(row.company_proofs),
    homepageMedia:safeNumber(row.homepage_media),
    projectMedia:safeNumber(row.project_media),
    privateProofs:safeNumber(row.private_proofs)
  };
  result.total=result.companyProofs+result.homepageMedia+result.projectMedia+result.privateProofs;
  return result;
}
async function sheetHealth(tableName){
  const allowed=new Set(['lead_partner_sheet_connections','admin_google_sheet_connections']);
  if(!allowed.has(tableName))throw new Error('Unsupported sheet connection table');
  const row=(await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active')::int AS active,
      COUNT(*) FILTER (WHERE status='active' AND COALESCE(last_sync_failed,0)>0)::int AS failing,
      COUNT(*) FILTER (WHERE status='active' AND sync_failure_count>0)::int AS connection_errors,
      COUNT(*) FILTER (WHERE status='active' AND sync_failure_count>=$1)::int AS persistent_connection_errors,
      COALESCE(MAX(sync_failure_count) FILTER (WHERE status='active'),0)::int AS max_failure_count,
      MAX(last_synced_at) AS last_synced_at
    FROM ${tableName}
  `,[persistentSheetFailureThreshold])).rows[0]||{};
  const failures=(await pool.query(`
    SELECT id,last_sync_failed,sync_failure_count,last_sync_error,last_sync_error_at,last_synced_at,next_retry_at
      FROM ${tableName}
     WHERE status='active'
       AND (COALESCE(last_sync_failed,0)>0 OR sync_failure_count>0)
     ORDER BY COALESCE(last_sync_error_at,last_synced_at,updated_at) DESC
     LIMIT 8
  `)).rows;
  const persistentConnectionErrors=safeNumber(row.persistent_connection_errors);
  const connectionErrors=safeNumber(row.connection_errors);
  const failing=safeNumber(row.failing);
  const status=persistentConnectionErrors>0?'degraded':(connectionErrors>0||failing>0?'attention':'healthy');
  return{
    status,
    active:safeNumber(row.active),
    failing,
    connectionErrors,
    persistentConnectionErrors,
    maxFailureCount:safeNumber(row.max_failure_count),
    persistentFailureThreshold:persistentSheetFailureThreshold,
    lastSyncedAt:row.last_synced_at||null,
    recentProblems:failures.map(item=>({
      id:Number(item.id),
      failedRows:safeNumber(item.last_sync_failed),
      failureCount:safeNumber(item.sync_failure_count),
      persistent:safeNumber(item.sync_failure_count)>=persistentSheetFailureThreshold,
      error:item.last_sync_error?safeMessage(item.last_sync_error):null,
      errorAt:item.last_sync_error_at||null,
      lastSyncedAt:item.last_synced_at||null,
      nextRetryAt:item.next_retry_at||null
    }))
  };
}
async function leadPartnerSheetHealth(){return sheetHealth('lead_partner_sheet_connections')}
async function adminSheetHealth(){return sheetHealth('admin_google_sheet_connections')}

function addSheetIssues(issues,label,data,{source,actionUrl,actionLabel}){
  if(data.unavailable){
    issues.push(createIssue({severity:'degraded',code:`${source}_unavailable`,title:`${label} health unavailable`,message:'System Health could not read this sheet connection state from PostgreSQL.',actionUrl,actionLabel,source}));
    return;
  }
  for(const problem of data.recentProblems||[]){
    if(problem.failureCount>0){
      const severity=problem.failureCount>=persistentSheetFailureThreshold?'degraded':'attention';
      const retry=problem.nextRetryAt?' Automatic retry is scheduled.':'';
      issues.push(createIssue({
        severity,
        code:`${source}_connection_${problem.id}`,
        title:`${label} connection #${problem.id} cannot sync`,
        message:`${problem.error||'The Google Sheet connection failed.'}${retry}`,
        actionUrl,
        actionLabel,
        source,
        connectionId:problem.id
      }));
    }else if(problem.failedRows>0){
      issues.push(createIssue({
        severity:'attention',
        code:`${source}_rows_${problem.id}`,
        title:`${label} connection #${problem.id} has invalid rows`,
        message:`${problem.failedRows} row${problem.failedRows===1?' needs':'s need'} review. Valid rows can continue without treating the whole platform as degraded.`,
        actionUrl,
        actionLabel,
        source,
        connectionId:problem.id
      }));
    }
  }
}

async function getSystemHealth(){
  const [databaseProbe,storageProbe,privateObjectProbe,heartbeatResult,migrationsResult,legacyUploadsResult,partnerSheetsResult,adminSheetsResult,financialResult,backupResult]=await Promise.allSettled([
    pool.query('SELECT NOW() AS now'),
    checkUploadStorage(),
    privateObjectStorage.isEnabled()?privateObjectStorage.probe():Promise.resolve({provider:'local',configured:false,status:'ready'}),
    workerHeartbeat.latestHeartbeat(),
    migrationHealth(),
    legacyUploadHealth(),
    leadPartnerSheetHealth(),
    adminSheetHealth(),
    financialReconciliationMonitor.getHealthSummary({maxAgeHours:financialReconciliationMaxAgeHours}),
    backupVerificationService.getHealthSummary({maxAgeHours:backupVerificationMaxAgeHours,required:backupVerificationRequired})
  ]);

  const databaseOk=databaseProbe.status==='fulfilled';
  const storageOk=storageProbe.status==='fulfilled';
  const privateObjectHealth=privateObjectProbe.status==='fulfilled'?privateObjectProbe.value:(privateObjectProbe.reason?.health||{provider:'s3',configured:true,status:'unavailable',error:safeMessage(privateObjectProbe.reason?.message,'Object storage unavailable')});
  const privateObjectOk=privateObjectHealth.status==='ready';
  const heartbeat=heartbeatResult.status==='fulfilled'?heartbeatResult.value:null;
  const workerAgeSeconds=heartbeat?safeNumber(heartbeat.age_seconds):null;
  const workerFresh=Boolean(heartbeat)&&workerAgeSeconds<=workerHeartbeatMaxAgeSeconds;
  const migrations=migrationsResult.status==='fulfilled'?migrationsResult.value:{status:'unavailable',checked:0,applied:0,pending:null};
  const legacyUploads=legacyUploadsResult.status==='fulfilled'?legacyUploadsResult.value:{total:null,companyProofs:null,homepageMedia:null,projectMedia:null,privateProofs:null,unavailable:true};
  const leadPartnerSheets=partnerSheetsResult.status==='fulfilled'?partnerSheetsResult.value:{status:'degraded',active:0,failing:0,connectionErrors:0,persistentConnectionErrors:0,maxFailureCount:0,persistentFailureThreshold:persistentSheetFailureThreshold,lastSyncedAt:null,recentProblems:[],unavailable:true};
  const adminSheets=adminSheetsResult.status==='fulfilled'?adminSheetsResult.value:{status:'degraded',active:0,failing:0,connectionErrors:0,persistentConnectionErrors:0,maxFailureCount:0,persistentFailureThreshold:persistentSheetFailureThreshold,lastSyncedAt:null,recentProblems:[],unavailable:true};
  const financialIntegrity=financialResult.status==='fulfilled'?financialResult.value:{status:'unavailable',latestRunId:null,lastCompletedAt:null,ageHours:null,maxAgeHours:financialReconciliationMaxAgeHours,criticalAlerts:0,warningAlerts:0,totalIssues:null};
  const backups=backupResult.status==='fulfilled'?backupResult.value:{status:'unavailable',required:backupVerificationRequired,maxAgeHours:backupVerificationMaxAgeHours,database:{status:'unavailable'},privateStorage:{status:'unavailable'},verifiedCount:0};
  const poolMax=Math.max(1,Number(pool.options?.max)||5);
  const totalConnections=safeNumber(pool.totalCount);
  const idleConnections=Math.min(totalConnections,safeNumber(pool.idleCount));
  const busyConnections=Math.max(0,totalConnections-idleConnections);
  const waiting=safeNumber(pool.waitingCount);
  const memory=process.memoryUsage();
  const emailConfig=emailService.configurationHealth();
  const productionEmailRisk=releaseIdentity.deploymentEnvironment()==='production'&&emailConfig.senderMode==='resend_test';
  const email={...emailConfig,status:!emailConfig.configured?'unavailable':productionEmailRisk?'degraded':'ready'};
  const issues=[];

  if(!databaseOk)issues.push(createIssue({severity:'degraded',code:'database_unavailable',title:'Database unavailable',message:'The web process could not complete the PostgreSQL health probe.',actionUrl:'/admin/system-health',actionLabel:'Refresh health',source:'database'}));
  if(!email.configured)issues.push(createIssue({severity:'degraded',code:'email_delivery_unavailable',title:'Email delivery is not configured',message:'Password reset and notification emails cannot be delivered until the email provider is configured.',actionUrl:'/admin/system-health',actionLabel:'Review email configuration',source:'email'}));
  else if(productionEmailRisk)issues.push(createIssue({severity:'degraded',code:'email_test_sender_in_production',title:'Production is using the Resend test sender',message:'Configure RESEND_FROM_EMAIL on a verified sender domain. The Resend test sender is not suitable for customer password-reset delivery.',actionUrl:'/admin/system-health',actionLabel:'Review email configuration',source:'email'}));
  if(databaseOk&&waiting>0)issues.push(createIssue({severity:'attention',code:'database_pool_waiting',title:'Database requests are waiting',message:`${waiting} request${waiting===1?' is':'s are'} waiting for a PostgreSQL connection.`,actionUrl:'/admin/system-health',actionLabel:'Review runtime',source:'database'}));
  if(!storageOk)issues.push(createIssue({severity:'degraded',code:'upload_storage_unavailable',title:'Upload storage unavailable',message:'The configured upload storage health check failed.',actionUrl:'/admin/system-health',actionLabel:'Review storage',source:'storage'}));
  if(!privateObjectOk)issues.push(createIssue({severity:'degraded',code:'private_objects_unavailable',title:'Private object storage unavailable',message:privateObjectHealth.error||'Private proof/object storage could not be reached.',actionUrl:'/admin/system-health',actionLabel:'Review storage',source:'private_objects'}));
  if(legacyUploads.unavailable)issues.push(createIssue({severity:'attention',code:'legacy_upload_reference_check_unavailable',title:'Legacy upload reference check unavailable',message:'System Health could not count database references that still depend on application-local uploads.',actionUrl:'/admin/system-health',actionLabel:'Review storage',source:'legacy_uploads'}));
  else if(legacyUploads.total>0)issues.push(createIssue({severity:'attention',code:'legacy_upload_references',title:'Legacy local upload references remain',message:`${legacyUploads.total} stored reference${legacyUploads.total===1?' still depends':'s still depend'} on pre-R2 local upload storage. Migrate or replace these files before removing legacy Hostinger uploads.`,actionUrl:'/admin/system-health',actionLabel:'Review storage',source:'legacy_uploads'}));
  if(backgroundWorkerRequired&&!workerFresh)issues.push(createIssue({severity:'degraded',code:'worker_heartbeat_stale',title:heartbeat?'Background worker heartbeat is stale':'Background worker unavailable',message:heartbeat?`The latest worker heartbeat is ${workerAgeSeconds} seconds old; the freshness limit is ${workerHeartbeatMaxAgeSeconds} seconds.`:'No background worker heartbeat is available.',actionUrl:'/admin/jobs',actionLabel:'Open background jobs',source:'worker'}));
  if(migrations.status!=='current')issues.push(createIssue({severity:'degraded',code:'migrations_not_current',title:'Database migrations are not current',message:migrations.status==='pending'?`${migrations.pending} migration${migrations.pending===1?' is':'s are'} pending.`:'Migration state could not be read.',actionUrl:'/admin/system-health',actionLabel:'Review migrations',source:'migrations'}));

  addSheetIssues(issues,'Lead Partner sheet',leadPartnerSheets,{source:'lead_partner_sheets',actionUrl:'/admin/lead-partners',actionLabel:'Open Lead Partners'});
  addSheetIssues(issues,'Admin sheet',adminSheets,{source:'admin_sheets',actionUrl:'/admin/leads/sheets',actionLabel:'Open Google Sheets'});

  if(['failed','critical','unavailable'].includes(financialIntegrity.status)){
    issues.push(createIssue({severity:'degraded',code:'financial_reconciliation_critical',title:'Financial reconciliation needs immediate review',message:financialIntegrity.status==='unavailable'?'Financial reconciliation health could not be read.':`${financialIntegrity.criticalAlerts||0} critical alert${Number(financialIntegrity.criticalAlerts||0)===1?' is':'s are'} active.`,actionUrl:'/admin/financial-integrity',actionLabel:'Open Financial Integrity',source:'financial'}));
  }else if(['warning','stale','not_run'].includes(financialIntegrity.status)){
    issues.push(createIssue({severity:'attention',code:'financial_reconciliation_attention',title:'Financial reconciliation needs attention',message:financialIntegrity.status==='warning'?`${financialIntegrity.warningAlerts||0} warning${Number(financialIntegrity.warningAlerts||0)===1?' is':'s are'} active.`:financialIntegrity.status==='stale'?'The latest automated reconciliation is older than the configured freshness limit.':'No automated reconciliation has completed yet.',actionUrl:'/admin/financial-integrity',actionLabel:'Open Financial Integrity',source:'financial'}));
  }

  if(backups.required&&['failed','unavailable'].includes(backups.status)){
    issues.push(createIssue({severity:'degraded',code:'backup_verification_failed',title:'Backup verification failed',message:'A required backup/restore verification is failed or unavailable.',actionUrl:'/admin/jobs',actionLabel:'Open background jobs',source:'backups'}));
  }else if(backups.required&&['stale','not_run'].includes(backups.status)){
    issues.push(createIssue({severity:'attention',code:'backup_verification_attention',title:'Backup verification needs attention',message:backups.status==='stale'?'The latest restore verification is older than the configured freshness limit.':'Required backup verification has not completed yet.',actionUrl:'/admin/jobs',actionLabel:'Open background jobs',source:'backups'}));
  }

  let status='healthy';
  for(const issue of issues)status=maxStatus(status,issue.severity);
  const issueRank={degraded:0,attention:1};
  const sortedIssues=[...issues].sort((a,b)=>(issueRank[a.severity]??9)-(issueRank[b.severity]??9));

  return{
    status,
    checkedAt:new Date().toISOString(),
    summary:{
      degradedCount:sortedIssues.filter(item=>item.severity==='degraded').length,
      attentionCount:sortedIssues.filter(item=>item.severity==='attention').length,
      issueCount:sortedIssues.length
    },
    issues:sortedIssues,
    build:{
      commit:releaseIdentity.shortCommit(),
      environment:releaseIdentity.deploymentEnvironment(),
      nodeEnvironment:releaseIdentity.nodeEnvironment(),
      releaseId:releaseIdentity.releaseId(),
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
        idle:idleConnections,
        busy:busyConnections,
        waiting,
        utilizationPercent:Math.min(100,Math.round((busyConnections/poolMax)*100)),
        openPercent:Math.min(100,Math.round((totalConnections/poolMax)*100))
      }
    },
    email,
    storage:{
      status:storageOk?'ready':'unavailable',
      persistentConfigured:privateObjectStorage.isEnabled()||Boolean(String(process.env.UPLOAD_STORAGE_ROOT||'').trim()),
      privateObjects:{
        driver:privateObjectStorage.driver(),
        status:privateObjectHealth.status||'unavailable',
        configured:Boolean(privateObjectHealth.configured),
        provider:privateObjectHealth.provider||privateObjectStorage.driver(),
        error:privateObjectHealth.error||null
      },
      legacyReferences:legacyUploads
    },
    worker:{
      required:backgroundWorkerRequired,
      status:!backgroundWorkerRequired?'not_required':workerFresh?'fresh':heartbeat?'stale':'unavailable',
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
