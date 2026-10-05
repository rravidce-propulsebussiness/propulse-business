const pool=require('../config/database');
const backupVerification=require('./backupVerificationService');
const heartbeat=require('./backgroundWorkerHeartbeatService');
const audit=require('./criticalActionAuditService');
const sheetSyncSettings=require('./sheetSyncSettingsService');

function defs({sheetIntervalMs=5*60*1000,adminEnabled=true,partnerEnabled=true}={}){
  const adminSheets=require('./adminGoogleSheetSyncScheduler');
  const partnerSheets=require('./leadPartnerSheetSyncScheduler');
  const financial=require('./financialReconciliationScheduler');
  const notifications=require('./notificationScheduler');
  const privateStorageBackup=require('./privateStorageBackupScheduler');
  return[
    {key:'admin_google_sheet_sync',name:'Admin Google Sheet Sync',group:'Google Sheets',description:'Imports and updates leads from Admin-managed Google Sheet connections.',intervalMs:sheetIntervalMs||adminSheets.AUTO_SYNC_INTERVAL_MS||300000,retrySupported:true,scheduleEnabled:adminEnabled},
    {key:'lead_partner_google_sheet_sync',name:'Lead Partner Google Sheet Sync',group:'Google Sheets',description:'Imports Lead Partner inventory from connected Google Sheets.',intervalMs:sheetIntervalMs||partnerSheets.AUTO_SYNC_INTERVAL_MS||300000,retrySupported:true,scheduleEnabled:partnerEnabled},
    {key:'notification_email_delivery',name:'Notification Email Delivery',group:'Notifications',description:'Delivers queued transactional notification emails with retry/backoff.',intervalMs:notifications.DELIVERY_INTERVAL_MS,retrySupported:true},
    {key:'membership_expiry_reminders',name:'Membership Expiry Reminders',group:'Notifications',description:'Creates deduplicated membership-expiry reminders for customers.',intervalMs:notifications.REMINDER_INTERVAL_MS,retrySupported:true},
    {key:'financial_reconciliation',name:'Financial Reconciliation',group:'Finance',description:'Reconciles wallet, payment, payout and investment financial integrity.',intervalMs:financial.configuredIntervalMs(),retrySupported:true},
    {key:'private_storage_backup',name:'Cloudflare R2 Backup',group:'Backups',description:'Copies every database-referenced private R2 object into the locked backup bucket and verifies the copy.',intervalMs:privateStorageBackup.configuredIntervalMs(),retrySupported:true}
  ];
}
function compactRun(row){
  if(!row)return null;
  return{
    id:Number(row.id),jobKey:row.job_key,source:row.trigger_source,status:row.status,
    triggeredBy:row.triggered_by?Number(row.triggered_by):null,summary:row.summary||{},error:row.error_message||null,
    startedAt:row.started_at||null,completedAt:row.completed_at||null,durationMs:row.duration_ms==null?null:Number(row.duration_ms)
  };
}
function isoPlus(value,ms){
  if(!value)return null;
  const time=new Date(value).getTime();
  return Number.isFinite(time)?new Date(time+ms).toISOString():null;
}
async function list({historyLimit=6}={}){
  const syncConfig=await sheetSyncSettings.getConfig().catch(()=>({autoSyncEnabled:true,adminSourcesEnabled:true,leadPartnerSourcesEnabled:true,intervalMinutes:5}));
  const definitions=defs({
    sheetIntervalMs:Math.max(60000,Number(syncConfig.intervalMinutes||5)*60*1000),
    adminEnabled:Boolean(syncConfig.autoSyncEnabled&&syncConfig.adminSourcesEnabled),
    partnerEnabled:Boolean(syncConfig.autoSyncEnabled&&syncConfig.leadPartnerSourcesEnabled)
  });
  const keys=definitions.map(item=>item.key);
  const limit=Math.min(20,Math.max(1,Number(historyLimit)||6));
  const rows=(await pool.query(
    `SELECT id,job_key,trigger_source,status,triggered_by,summary,error_message,started_at,completed_at,duration_ms
       FROM (
         SELECT r.*,ROW_NUMBER() OVER(PARTITION BY job_key ORDER BY started_at DESC,id DESC) AS rn
           FROM background_job_runs r
          WHERE job_key=ANY($1::text[])
       ) ranked
      WHERE rn<=$2
      ORDER BY started_at DESC,id DESC`,
    [keys,limit]
  )).rows;
  const scheduledRows=(await pool.query(
    `SELECT DISTINCT ON(job_key) job_key,started_at,status
       FROM background_job_runs
      WHERE job_key=ANY($1::text[]) AND trigger_source IN ('scheduled','startup')
      ORDER BY job_key,started_at DESC,id DESC`,
    [keys]
  )).rows;
  const scheduledByJob=new Map(scheduledRows.map(row=>[row.job_key,row]));
  const grouped=new Map();
  for(const row of rows){
    const list=grouped.get(row.job_key)||[];
    if(list.length<limit)list.push(compactRun(row));
    grouped.set(row.job_key,list);
  }
  const now=Date.now();
  const jobs=definitions.map(def=>{
    const history=grouped.get(def.key)||[];
    const latest=history[0]||null;
    const lastSuccess=history.find(run=>run.status==='succeeded')||null;
    const lastScheduled=scheduledByJob.get(def.key)||null;
    const nextExpectedAt=def.scheduleEnabled===false?null:(lastScheduled?isoPlus(lastScheduled.started_at,def.intervalMs):null);
    const overdue=Boolean(def.scheduleEnabled!==false&&nextExpectedAt&&now>new Date(nextExpectedAt).getTime()+Math.max(60000,def.intervalMs*0.35));
    const staleRunning=Boolean(latest?.status==='running'&&now-new Date(latest.startedAt).getTime()>Math.max(15*60*1000,def.intervalMs*3));
    return{...def,latestRun:latest,lastSuccess,lastScheduledRun:lastScheduled?{startedAt:lastScheduled.started_at,status:lastScheduled.status}:null,nextExpectedAt,overdue,staleRunning,recentRuns:history};
  });
  const [worker,backups]=await Promise.all([
    heartbeat.getHealthSummary?heartbeat.getHealthSummary().catch(()=>null):heartbeat.latestHeartbeat().catch(()=>null),
    backupVerification.getHealthSummary({maxAgeHours:30,required:String(process.env.NODE_ENV||'')==='production'}).catch(()=>null)
  ]);
  const externalJobs=[
    {key:'database_backup_verification',name:'Database Backup Restore Verification',group:'Backups',description:'External database backup/restore drill executed by the production backup command or OS scheduler.',retrySupported:false,executionMode:'external',status:backups?.database?.status||'unknown',lastCompletedAt:backups?.database?.lastVerifiedAt||null,error:backups?.database?.error||null},
    {key:'private_storage_backup_verification',name:'R2 Backup Verification',group:'Backups',description:'Latest verified copy status for private Cloudflare R2 objects.',retrySupported:false,executionMode:'automated',status:backups?.privateStorage?.status||'unknown',lastCompletedAt:backups?.privateStorage?.lastVerifiedAt||null,error:backups?.privateStorage?.error||null}
  ];
  return{checkedAt:new Date().toISOString(),worker,jobs,externalJobs};
}
async function retry(jobKey,{adminId}={}){
  const key=String(jobKey||'');
  const def=defs().find(item=>item.key===key);
  if(!def)throw Object.assign(new Error('Background job not found'),{code:'JOB_NOT_FOUND'});
  if(!def.retrySupported)throw Object.assign(new Error('This job can only be run by the production scheduler/backup command'),{code:'JOB_RETRY_UNSUPPORTED'});
  let result;
  if(key==='admin_google_sheet_sync')result=await require('./adminGoogleSheetSyncScheduler').runAutoSync({source:'manual',triggeredBy:adminId});
  else if(key==='lead_partner_google_sheet_sync')result=await require('./leadPartnerSheetSyncScheduler').runAutoSync({source:'manual',triggeredBy:adminId});
  else if(key==='notification_email_delivery')result=await require('./notificationScheduler').runNotificationDelivery({source:'manual',triggeredBy:adminId});
  else if(key==='membership_expiry_reminders')result=await require('./notificationScheduler').runMembershipReminders({source:'manual',triggeredBy:adminId});
  else if(key==='financial_reconciliation')result=await require('./financialReconciliationScheduler').runFinancialReconciliation({source:'manual',triggeredBy:adminId});
  else if(key==='private_storage_backup')result=await require('./privateStorageBackupScheduler').runPrivateStorageBackup({source:'manual',triggeredBy:adminId,force:true});
  else throw Object.assign(new Error('Background job is not retryable'),{code:'JOB_RETRY_UNSUPPORTED'});
  await audit.record(pool,{
    actorId:adminId,category:'system',action:'background_job.retry',entityType:'background_job',entityId:key,
    beforeData:null,afterData:{runId:result?.runId||null,status:result?.jobStatus||null},
    metadata:{jobKey:key},source:'background_job_control'
  });
  return result;
}
module.exports={defs,list,retry,compactRun};
