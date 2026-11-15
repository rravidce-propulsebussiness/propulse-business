const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const originalLoad=Module._load;
let duplicateQueries=[];
const pool={query:async(sql,params)=>{
  duplicateQueries.push({sql,params});
  return {rows:params[6]==='new 2bhk interiors'?[{id:101,customer_name:'Ravi'}]:[]};
}};
Module._load=function(request,parent,isMain){
  const owner=parent?.filename||'';
  if(owner.endsWith(path.sep+'leadService.js')){
    if(request==='../config/database')return pool;
    if(request==='./criticalActionAuditService')return{};
    if(request==='./leadReadService')return{};
    if(request==='./leadAccessStrategyService')return{};
    if(request==='./leadQualityGateService')return{};
  }
  return originalLoad.apply(this,arguments);
};
(async()=>{
  try{
    const service=require('../src/services/leadService');
    const base={industryId:1,serviceId:2,subserviceId:null,
      customerPhone:'9876543210',customerEmail:'r@example.com',customerName:'Ravi',pincode:'500039'};
    assert.equal(await service.findDuplicateLead({...base,requirement:''}),null);
    assert.equal(await service.findDuplicateLead({...base,requirement:'Lead requirement not provided'}),null);
    assert.equal(duplicateQueries.length,0,'Blank requirements must not query by contact alone');
    assert.equal(await service.findDuplicateLead({...base,requirement:'A new office renovation'}),null);
    assert.equal((await service.findDuplicateLead({...base,requirement:'New 2BHK interiors'}))?.id,101);
    assert(duplicateQueries.every(x=>x.params[6]),
      'Contact-based deduplication must require a nonblank requirement');
  }finally{Module._load=originalLoad;}

  console.log('Lead duplicate requirement matching regression test passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
