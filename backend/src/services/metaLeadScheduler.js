const metaLeads=require('./metaLeadService');
const {createIntervalScheduler}=require('./intervalSchedulerService');
let busy=false;
async function run({source='scheduled'}={}){
  if(busy)return {busy:true};
  busy=true;
  try {
    const result=await metaLeads.processPending(5);
    if(result.failed)console.warn('Meta Lead Ads retrieval needs retry: count='+result.failed);
    return result;
  }catch(error){
    console.error('Meta Lead Ads worker failed:',error?.code||'DATABASE_ERROR');
    return {failed:true};
  }finally{busy=false;}
}
const startMetaLeadSync=createIntervalScheduler({
  intervalMs:30000,run,startMessage:'Direct Meta Lead Ads intake worker enabled'
});
module.exports={startMetaLeadSync,run};
