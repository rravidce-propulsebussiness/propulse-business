const monitor=require('./financialReconciliationMonitorService');

const DEFAULT_INTERVAL_MS=24*60*60*1000;
let timer=null;
let cyclePromise=null;

function configuredIntervalMs(){
  return Math.min(7*24*60*60*1000,Math.max(60*60*1000,Number(process.env.FINANCIAL_RECONCILIATION_INTERVAL_MS)||DEFAULT_INTERVAL_MS));
}
async function runFinancialReconciliation(){
  if(cyclePromise)return cyclePromise;
  const intervalMs=configuredIntervalMs();
  const skipMinutes=Math.max(1,Math.floor((intervalMs/60000)*0.95));
  cyclePromise=(async()=>{
    try{
      const result=await monitor.runReconciliation({source:'scheduled',skipIfCompletedWithinMinutes:skipMinutes});
      if(result.busy)console.log('Financial reconciliation skipped: another process holds the reconciliation lock.');
      else if(result.skipped)console.log(`Financial reconciliation skipped: recent run #${result.lastRunId} is still within the schedule window.`);
      else console.log(`Financial reconciliation completed: run=${result.runId}, status=${result.status}, critical=${result.critical}, warnings=${result.warnings}.`);
      return result;
    }catch(error){
      console.error('Financial reconciliation cycle failed:',error?.stack||error);
      return{failed:true,error:error?.message||'Financial reconciliation failed'};
    }finally{
      cyclePromise=null;
    }
  })();
  return cyclePromise;
}
function startFinancialReconciliationScheduler({unref=true,runImmediately=false}={}){
  if(timer)return async()=>{};
  const intervalMs=configuredIntervalMs();
  console.log(`Financial reconciliation scheduler enabled: every ${Math.round(intervalMs/3600000)} hour(s).`);
  if(runImmediately)void runFinancialReconciliation();
  timer=setInterval(()=>{void runFinancialReconciliation()},intervalMs);
  if(unref)timer.unref?.();
  return async()=>{
    if(timer){clearInterval(timer);timer=null}
    if(cyclePromise)await cyclePromise;
  };
}

module.exports={DEFAULT_INTERVAL_MS,configuredIntervalMs,runFinancialReconciliation,startFinancialReconciliationScheduler};
