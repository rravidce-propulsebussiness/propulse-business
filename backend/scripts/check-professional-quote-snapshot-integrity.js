const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const servicePath=path.resolve(__dirname,'../src/services/professionalProjectQuoteService.js');
const migration=fs.readFileSync(path.resolve(__dirname,'../src/database/migrations/20261028_zzzzz_professional_quote_snapshot_integrity.sql'),'utf8');
assert.match(migration,/package_description_snapshot/);
assert.match(migration,/package_duration_snapshot/);
assert.match(migration,/package_inclusions_snapshot/);

const oldPackage={
  id:51,created_at:'2026-10-28T10:00:00Z',preferred_package:'Standard',
  area_text:'1200 sq ft',package_price_from_snapshot:1650,package_price_unit_snapshot:'sqft',
  package_description_snapshot:'Old owner-published description',package_duration_snapshot:'8 weeks',
  package_inclusions_snapshot:['Steel - Tata','Cement - Ultratech'],
  package_spec_sections_snapshot:[{title:'Steel',brand:'Tata',grade:'Fe550D',pricingTreatment:'included'}],
};
const livePackage={
  title:'Standard',industry:'construction',description:'Newly edited owner details',
  price_from:1900,price_unit:'sqft',duration_label:'10 weeks',inclusions:['Changed materials'],
  spec_sections:[{title:'Steel',brand:'JSW'}],
};
const log=[];
let mode='duplicate';
const fakePool={
  async query(sql,params){
    log.push({sql,params});
    if(sql.includes('FROM business_profile_projects p'))return {rows:[{id:23,title:'Completed villa',project_type:'construction',owner_id:14,business_profile_id:9}]};
    if(sql.includes('FROM business_profile_service_plans'))return {rows:[{...livePackage,title:params[1]}]};
    if(sql.includes('INSERT INTO professional_project_quote_requests')){
      if(mode==='new')return {rowCount:1,rows:[{id:52,created_at:'2026-10-28T11:00:00Z'}]};
      return {rowCount:0,rows:[]};
    }
    if(sql.includes('FROM professional_project_quote_requests')&&sql.includes('ORDER BY created_at DESC'))return {rows:[oldPackage]};
    throw Error('Unexpected query: '+sql.slice(0,100));
  },
};
const mocks={
  '../config/database':fakePool,
  './expertDirectoryService':{getSettings:async()=>({directoryEnabled:true,showProjects:true,showPlans:true}),getUserDirectoryStatus:async()=>({eligible:true})},
  './notificationService':{notifyUser:async()=>{},notifyAdmins:async()=>{}},
  './projectMarketplaceLeadService':{flagPending:async()=>{},sync:async()=>({leadId:321,status:'linked'})},
  './publicContactValidationService':{normalizeName:x=>String(x),normalizePhone:x=>String(x),normalizeEmail:x=>String(x)},
  './projectQuoteRequirementDetails':{splitProjectQuoteRequirement:()=>({requirement:'',fields:{}})},
};
const orig=Module._load;
Module._load=function(request,parent,isMain){
  if(parent?.filename===servicePath&&Object.prototype.hasOwnProperty.call(mocks,request))return mocks[request];
  return orig.apply(this,arguments);
};
let service;
try{delete require.cache[require.resolve(servicePath)];service=require(servicePath);}
finally{Module._load=orig;}
const input=(preferredPackage='Standard',area='1200 sq ft')=>({
  name:'Sample Customer',phone:'9876543210',email:'sample@example.com',requirement:'Construction package quote',
  siteLocation:'Hyderabad',area,preferredPackage,pincode:'500081',consent:true,marketplaceConsent:true,
});
(async()=>{
  const same=await service.submit(23,input());
  assert.equal(same.duplicate,true);
  assert.equal(same.requestId,51);
  assert.equal(same.quotePackage.price_from,1650,'Must use saved price, not live edited rate 1900');
  assert.equal(same.quotePackage.description,'Old owner-published description');
  assert.equal(same.quotePackage.duration_label,'8 weeks');
  assert.deepEqual(same.quotePackage.inclusions,['Steel - Tata','Cement - Ultratech']);
  assert.equal(same.quotePackage.spec_sections[0].brand,'Tata');
  assert.equal(new Date(same.quoteIssuedAt).toISOString(),'2026-10-28T10:00:00.000Z');

  const changedPackage=await service.submit(23,input('Premium'));
  assert.equal(changedPackage.duplicate,true);
  assert.equal(changedPackage.quotePackage,null,'Changing package must not reuse the previous request ID');
  assert.match(changedPackage.quoteNotice,/earlier request remains recorded/i);

  const changedArea=await service.submit(23,input('Standard','1400 sq ft'));
  assert.equal(changedArea.duplicate,true);
  assert.equal(changedArea.quotePackage,null,'Changed area must not imply that the previous quote was repriced');

  mode='new';
  const fresh=await service.submit(23,input());
  assert.equal(fresh.duplicate,undefined);
  assert.equal(fresh.quotePackage.price_from,1900);
  assert.equal(fresh.requestId,52);
  assert.equal(new Date(fresh.quoteIssuedAt).toISOString(),'2026-10-28T11:00:00.000Z');
  const insert=log.findLast(e=>e.sql.includes('INSERT INTO professional_project_quote_requests'));
  assert.match(insert.sql,/package_description_snapshot,package_duration_snapshot,package_inclusions_snapshot/);
  assert.equal(insert.params[14],'Newly edited owner details');
  assert.equal(insert.params[15],'10 weeks');
  assert.deepEqual(JSON.parse(insert.params[16]),['Changed materials']);
  console.log('Professional quote snapshot/retry integrity regression passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
