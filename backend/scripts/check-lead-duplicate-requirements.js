const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {sheetRowIdentity,candidateMaps,matchLead}=require('../src/utils/sheetLeadIdentity');

const a={id:101,customer_name:'Ravi',customer_phone:'98765 43210',customer_email:'r@example.com',
  requirement:'New 2BHK interiors',pincode:'500039',custom_fields:{id:'sheet-A-11'}};
const b={id:102,customer_name:'Ravi',customer_phone:'98765 43210',customer_email:'r@example.com',
  requirement:'Terrace extension',pincode:'500039',custom_fields:{id:'sheet-A-12'}};
const maps=candidateMaps([b,a]);
const row=(requirement,others={})=>({'Customer Phone':'9876543210','Customer Email':'r@example.com',
  Requirement:requirement,Pincode:'500039',...others});

assert.notEqual(sheetRowIdentity(row('New 2BHK interiors')),
  sheetRowIdentity(row('Terrace extension')),'Same customer with distinct requirements must not collapse to one row');
assert.equal(sheetRowIdentity(row('New 2BHK interiors')),sheetRowIdentity(row('New 2BHK interiors')),
  'Identical requirement and contact should deduplicate inside the sheet');
assert.notEqual(sheetRowIdentity(row('New 2BHK interiors',{Industry:'Interior'})),
  sheetRowIdentity(row('New 2BHK interiors',{Industry:'Construction'})),
  'Different project classification must not be combined in the sheet');
assert.notEqual(sheetRowIdentity({'Customer Name':'A',Requirement:'Build home'}),
  sheetRowIdentity({'Customer Name':'B',Requirement:'Build home'}),
  'Rows without contacts must not deduplicate different customers');

assert.equal(matchLead(row('New 2BHK interiors'),maps)?.id,101);
assert.equal(matchLead(row('Terrace extension'),maps)?.id,102);
assert.equal(matchLead(row('New commercial office'),maps),null,
  'A new requirement must create a new lead, not overwrite the latest matching phone');
assert.equal(matchLead(row(''),maps),null,'Empty requirement cannot identify a project');
assert.equal(matchLead(row('Lead requirement not provided'),maps),null);
assert.equal(matchLead(row('New 2BHK interiors',{Pincode:'500090'}),maps),null,
  'Different PIN must not overwrite another project');
assert.equal(matchLead({'Lead ID':'sheet-A-11',Requirement:'Renovated scope'},maps)?.id,101,
  'Explicit unique external ID may update requirement details');
assert.equal(matchLead({'Lead ID':'unknown',...row('New 2BHK interiors')},maps),null,
  'An unknown explicit ID must not fall back to a phone collision');
assert.equal(matchLead(row('New 2BHK interiors'),candidateMaps([a,{...a,id:103}])),null,
  'Ambiguous duplicate candidates must not arbitrarily overwrite the latest lead');
assert.equal(matchLead({'Lead ID':'sheet-A-11'},candidateMaps([a,{...a,id:103}])),null,
  'Ambiguous external IDs must not arbitrarily select a lead');

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
    assert.equal(await service.findDuplicateLead({...base,requirement:'New 2BHK interiors'})?.id,101);
    assert(duplicateQueries.every(x=>x.params[6]),
      'Contact-based deduplication must require a nonblank requirement');
  }finally{Module._load=originalLoad;}

  const admin=fs.readFileSync(path.join(__dirname,'../src/services/adminGoogleSheetSyncService.js'),'utf8');
  const partner=fs.readFileSync(path.join(__dirname,'../src/services/leadPartnerInventoryService.js'),'utf8');
  assert(admin.includes("require('../utils/sheetLeadIdentity')"));
  assert(admin.includes('sheetRowIdentity(row)')&&admin.includes('matchLead(row,maps)'));
  assert(admin.includes('lead_partner_id IS NULL AND investor_user_id IS NULL'),
    'Admin Sheet matcher must exclude partner- and investor-owned leads');
  assert(partner.includes('requirement_key')&&partner.includes('requirementKey'),
    'Partner preview should warn about duplicate requirements rather than shared contacts');
  console.log('Lead duplicate requirement matching regression tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
