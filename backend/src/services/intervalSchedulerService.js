// Background jobs run outside any request. If one rejects (for example a brief database
// connection timeout) and nothing catches it, server.js treats it as a fatal unhandled rejection
// and restarts the whole site. Every scheduled run therefore goes through runScheduled().
function runScheduled(label,run,options){
  let pending;
  try{pending=Promise.resolve(run(options))}
  catch(error){pending=Promise.reject(error)}
  return pending.catch(error=>{
    console.error(`${label||'Background job'} failed (${options?.source||'scheduled'}):`,error?.message||error);
    return{failed:true,error:error?.message||String(error)};
  });
}

function createIntervalScheduler({intervalMs,run,startMessage,label}) {
  const name=label||String(startMessage||'').split(':')[0]||'Background job';
  let timer=null;
  return function start({unref=true,runImmediately=false}={}) {
    if(timer)return()=>{};
    if(startMessage)console.log(startMessage);
    if(runImmediately)void runScheduled(name,run,{source:'startup'});
    timer=setInterval(()=>{void runScheduled(name,run,{source:'scheduled'})},intervalMs);
    if(unref)timer.unref?.();
    return()=>{
      if(timer){
        clearInterval(timer);
        timer=null;
      }
    };
  };
}

module.exports={createIntervalScheduler,runScheduled};
