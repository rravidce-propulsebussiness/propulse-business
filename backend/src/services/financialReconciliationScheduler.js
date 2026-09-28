const monitor=require('./financialReconciliationMonitorService');
const notificationService=require('./notificationService');
const jobControl=require('./backgroundJobControlService');

const DEFAULT_INTERVAL_MS=24*60*60*1000;
let timer=null;
let cyclePromise=null;

function configuredIntervalMs(){
  return Math.min(7*24*60*60*1000,Math.max(60*60*1000,Number(process.env.FINANCIAL_RECONCILIATION_INTERVAL_MS)||DEFAULT_INTERVAL_MS));
}
async function runFinancialReconciliationCore(source='scheduled'){
  if(cyclePromise)return cyclePromise;
  const intervalMs=configuredIntervalMs();
  const skipMinutes=Math.max(1,Math.floor((intervalMs/60000)*0.95));
  cyclePromise=(async()=>{
    try{
      const result=await monitor.runReconciliation({source,skipIfCompletedWithinMinutes:source==='manual'?0:skipMinutes});
      if(result.busy)console.log('Financial reconciliation skipped: another process holds the reconciliation lock.');
      else if(result.skipped)console.log(`Financial reconciliation skipped: recent run #${result.lastRunId} is still within the schedule window.`);
      else{
        console.log(`Financial reconciliation completed: run=${result.runId}, status=${result.status}, critical=${result.critical}, warnings=${result.warnings}.`);
        if(['warning','critical'].includes(String(result.status))){
          await notificationService.notifyAdmins({
            type:'financial_reconciliation_issue',category:'system',severity:result.status==='critical'?'critical':'warning',
            title:result.status==='critical'?'Critical financial reconciliation issues':'Financial reconciliation needs review',
            message:`Run #${result.runId} found ${Number(result.critical||0)} critical and ${Number(result.warnings||0)} warning issue(s).`,
            actionUrl:'/admin/financial-integrity',relatedType:'financial_reconciliation_run',relatedId:result.runId,
            dedupeKey:`financial-reconciliation:${result.runId}`,
            metadata:{status:result.status,critical:Number(result.critical||0),warnings:Number(result.warnings||0)}
          }).catch(error=>console.error('Financial reconciliation notification failed:',error.message));
        }
      }
      return result;
    }catch(error){
      console.error('Financial reconciliation cycle failed:',error?.stack||error);
      await notificationService.notifyAdmins({
        type:'financial_reconciliation_failed',category:'system',severity:'critical',
        title:'Financial reconciliation failed',
        message:'Automated financial reconciliation could not complete. Review Financial Integrity and System Health.',
        actionUrl:'/admin/financial-integrity',relatedType:'financial_reconciliation',relatedId:'scheduled',
        dedupeKey:`financial-reconciliation-failed:${new Date().toISOString().slice(0,10)}`
      }).catch(notifyError=>console.error('Financial reconciliation failure notification failed:',notifyError.message));
      return{failed:true,error:error?.message||'Financial reconciliation failed'};
    }finally{
      cyclePromise=null;
    }
  })();
  return cyclePromise;
}
async function runFinancialReconciliation({source='scheduled',triggeredBy=null}={}){
  return jobControl.execute({jobKey:'financial_reconciliation',source,triggeredBy,task:()=>runFinancialReconciliationCore(source)});
}
function startFinancialReconciliationScheduler({unref=true,runImmediately=false}={}){
  if(timer)return async()=>{};
  const intervalMs=configuredIntervalMs();
  console.log(`Financial reconciliation scheduler enabled: every ${Math.round(intervalMs/3600000)} hour(s).`);
  if(runImmediately)void runFinancialReconciliation({source:'startup'});
  timer=setInterval(()=>{void runFinancialReconciliation({source:'scheduled'})},intervalMs);
  if(unref)timer.unref?.();
  return async()=>{
    if(timer){clearInterval(timer);timer=null}
    if(cyclePromise)await cyclePromise;
  };
}

module.exports={DEFAULT_INTERVAL_MS,configuredIntervalMs,runFinancialReconciliation,runFinancialReconciliationCore,startFinancialReconciliationScheduler};
