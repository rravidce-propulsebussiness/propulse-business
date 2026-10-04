const assert=require('node:assert/strict');
const {getApiGlobalRateLimitConfig}=require('../src/config/apiRateLimitConfig');

const development=getApiGlobalRateLimitConfig({isProduction:false,env:{}});
assert.equal(development.max,10000,'development must have enough headroom for Vite/HMR and API-heavy local pages');
assert.equal(development.windowMs,15*60*1000);
assert.equal(development.shared,false);
assert.equal(development.sharedChunkSize,1);

const production=getApiGlobalRateLimitConfig({isProduction:true,env:{}});
assert.equal(production.max,600,'production default global API protection must remain strict');
assert.equal(production.shared,true);
assert.equal(production.sharedChunkSize,10);

const overridden=getApiGlobalRateLimitConfig({
  isProduction:false,
  env:{API_GLOBAL_RATE_LIMIT_MAX:'2500',API_GLOBAL_RATE_LIMIT_WINDOW_MS:'300000'}
});
assert.equal(overridden.max,2500);
assert.equal(overridden.windowMs,300000);

const bounded=getApiGlobalRateLimitConfig({
  isProduction:true,
  env:{API_GLOBAL_RATE_LIMIT_MAX:'999999',API_GLOBAL_RATE_LIMIT_WINDOW_MS:'1'}
});
assert.equal(bounded.max,100000);
assert.equal(bounded.windowMs,60000);

console.log('Global API rate-limit configuration regression test passed.');
