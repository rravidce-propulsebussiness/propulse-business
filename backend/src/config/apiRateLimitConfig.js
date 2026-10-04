function integer(value,fallback,min,max){
  const parsed=Number(value);
  if(!Number.isFinite(parsed))return fallback;
  return Math.min(max,Math.max(min,Math.floor(parsed)));
}

function getApiGlobalRateLimitConfig({
  isProduction=process.env.NODE_ENV==='production',
  env=process.env,
}={}){
  const windowMs=integer(env.API_GLOBAL_RATE_LIMIT_WINDOW_MS,15*60*1000,60*1000,60*60*1000);
  const defaultMax=isProduction?600:10000;
  const max=integer(env.API_GLOBAL_RATE_LIMIT_MAX,defaultMax,100,100000);
  return {
    windowMs,
    max,
    shared:Boolean(isProduction),
    sharedChunkSize:isProduction?Math.min(10,max):1,
  };
}

module.exports={getApiGlobalRateLimitConfig};
