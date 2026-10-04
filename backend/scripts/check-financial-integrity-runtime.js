const pool=require('../src/config/database');
const service=require('../src/services/adminFinancialIntegrityService');
const monitor=require('../src/services/financialReconciliationMonitorService');

(async()=>{
  const result=await service.getFinancialIntegrity({force:true});
  if(!result||!Array.isArray(result.checks))throw new Error('Financial integrity result is invalid');
  if(result.checks.length<10)throw new Error('Financial integrity scan did not run all expected checks');
  if(!['clean','warning','critical'].includes(result.status))throw new Error('Financial integrity status is invalid');

  const monitored=await monitor.runReconciliation({source:'ci'});
  if(monitored.busy||monitored.skipped)throw new Error('CI financial reconciliation monitoring run did not execute');
  if(!Number.isInteger(Number(monitored.runId)))throw new Error('Financial reconciliation run history was not persisted');

  const summary=await monitor.getMonitoringSummary({historyLimit:3});
  if(Number(summary.latestRun?.id)!==Number(monitored.runId))throw new Error('Latest financial reconciliation run does not match persisted monitoring run');
  if(summary.latestRun?.status!==monitored.status)throw new Error('Persisted financial reconciliation status does not match scan result');

  const health=await monitor.getHealthSummary({maxAgeHours:30});
  if(!['healthy','warning','critical'].includes(health.status))throw new Error('Financial reconciliation health summary is invalid after a successful run');

  console.log('Financial integrity PostgreSQL runtime smoke passed:',result.status,'issues='+result.totalIssues,'run='+monitored.runId);
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
