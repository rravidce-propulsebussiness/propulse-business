const pool=require('../src/config/database');
const service=require('../src/services/adminFinancialIntegrityService');

(async()=>{
  const result=await service.getFinancialIntegrity({force:true});
  if(!result||!Array.isArray(result.checks))throw new Error('Financial integrity result is invalid');
  if(result.checks.length<10)throw new Error('Financial integrity scan did not run all expected checks');
  if(!['clean','warning','critical'].includes(result.status))throw new Error('Financial integrity status is invalid');
  console.log('Financial integrity PostgreSQL runtime smoke passed:',result.status,'issues='+result.totalIssues);
})().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
