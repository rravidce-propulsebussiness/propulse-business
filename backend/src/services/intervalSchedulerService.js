function createIntervalScheduler({intervalMs,run,startMessage}) {
  let timer=null;
  return function start({unref=true,runImmediately=false}={}) {
    if(timer)return()=>{};
    if(startMessage)console.log(startMessage);
    if(runImmediately)void run({source:'startup'});
    timer=setInterval(()=>{void run({source:'scheduled'})},intervalMs);
    if(unref)timer.unref?.();
    return()=>{
      if(timer){
        clearInterval(timer);
        timer=null;
      }
    };
  };
}

module.exports={createIntervalScheduler};
