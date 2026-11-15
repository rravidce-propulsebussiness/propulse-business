const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const Module=require('node:module');
const {parseCsvRecords}=require('../src/utils/csvRecords');

assert.deepEqual(parseCsvRecords('Name,Notes\r\n"Ravi, R","Says ""hello""\nnext line"\r\n\r\n'),[
  ['Name','Notes'],['Ravi, R','Says "hello"\nnext line']
]);
assert.deepEqual(parseCsvRecords('  ,  \n A , B \n'),[[' A ',' B ']]);
assert.deepEqual(parseCsvRecords(''),[]);
assert.deepEqual(parseCsvRecords('First,Second\n1,2'),[['First','Second'],['1','2']]);

const originalLoad=Module._load;
let importedCsv=null;
let importedBy=null;
let importResult={total:1,created:1,duplicate:0,failed:0,failures:[]};
let unexpectedDbCalls=0;
const sheet={
  csv:'Full Name,Phone Number,Industry,Campaign Name,Notes\r\n"Ravi, R",9876543210,Construction,"Ad, Sept","Uses ""branded"" materials"'
};
const db={
 async query(sql){
  unexpectedDbCalls++;
  throw Error('Import must not re-query or update unrelated leads: '+sql.slice(0,100));
 }
};
const base={
 importCsv:async ({userId,csv})=>{
  importedBy=userId;
  importedCsv=csv;
  return importResult;
 }
};
Module._load=function(request,parent,isMain){
 const from=parent?.filename||'';
 if(from.endsWith(path.sep+'leadPartnerCsvImportService.js')){
  if(request==='../config/database')return db;
  if(request==='./leadPartnerInventoryService')return base;
  if(request==='./leadImportMappingService')return{};
 }
 return originalLoad.apply(this,arguments);
};
(async()=>{
 try{
  const compat=require('../src/services/leadPartnerCsvImportService');
  const result=await compat.importCsv({userId:21,csv:sheet.csv});
  assert.equal(result.created,1);
  assert.equal(importedBy,21);
  assert(importedCsv.includes('Customer Phone')&&importedCsv.includes('Customer Name'),
    'Partner CSV import must resolve canonical lead field aliases');
  assert(importedCsv.includes('Campaign Name'),'Unmapped campaign column must survive round trip to importer');
  const records=parseCsvRecords(importedCsv);
  const mapped=Object.fromEntries(records[0].map((name,i)=>[name,records[1][i]]));
  assert.equal(mapped['Campaign Name'],'Ad, Sept',
    'Extra campaign fields must reach base.createLead via the canonical CSV');
  assert.equal(mapped.Notes,'Uses "branded" materials',
    'Core Notes must retain quoted content');
  assert.equal(Object.prototype.hasOwnProperty.call(mapped,'Source'),false,
    'Campaign Name must not be silently mapped to the 80-character Source column');

  const longCampaign='Campaign '+('long-name-'.repeat(18));
  await compat.importCsv({userId:21,csv:[
    'Phone Number,Campaign Name,Platform',
    ['9876543210',longCampaign,'instagram'].join(',')
  ].join(String.fromCharCode(10))});
  const platformRows=parseCsvRecords(importedCsv);
  const platformFields=Object.fromEntries(platformRows[0].map((name,i)=>[name,platformRows[1][i]]));
  assert.equal(platformFields.Source,'instagram','Platform may explicitly supply a short Source value');
  assert.equal(platformFields['Campaign Name'],longCampaign,
    'Long campaign metadata must remain an extra field without truncation');

  await compat.importCsv({userId:21,csv:[
    'Phone Number,Campaign Name',
    ['9876543210',longCampaign].join(',')
  ].join(String.fromCharCode(10))});
  const rawRows=parseCsvRecords(importedCsv);
  assert.equal(rawRows[0].includes('Source'),false,'Campaign-only CSV files must not synthesize Source');


  assert.equal(unexpectedDbCalls,0,
    'Successful import must not fuzzy-match existing leads to persist custom fields');

  importResult={total:1,created:0,duplicate:1,failed:0,failures:[]};
  const duplicate=await compat.importCsv({userId:21,csv:sheet.csv});
  assert.equal(duplicate.duplicate,1);
  assert.equal(unexpectedDbCalls,0,
    'Duplicate row must not overwrite existing lead custom fields');

  importResult={total:1,created:0,duplicate:0,failed:1,failures:['invalid PIN']};
  const failed=await compat.importCsv({userId:21,csv:sheet.csv});
  assert.equal(failed.failed,1);
  assert.equal(unexpectedDbCalls,0,
    'Failed import rows must not modify previously saved leads');

  for(const file of ['leadPartnerInventoryService.js','leadPartnerCsvImportService.js']){
   const source=fs.readFileSync(path.join(__dirname,'../src/services',file),'utf8');
   assert(source.includes("require('../utils/csvRecords')"),
      file+' must use the shared CSV parser');
  }
  console.log('Lead partner CSV import consistency regression tests passed.');
 }finally{Module._load=originalLoad;}
})().catch(error=>{console.error(error);process.exitCode=1;});
