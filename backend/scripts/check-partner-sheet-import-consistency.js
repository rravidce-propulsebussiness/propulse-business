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
let directBaseCalls=0;
let importedCsv=null;
let importedBy=null;
let customFieldUpdates=[];
const sheet={
  spreadsheetId:'sheet_123',gid:'5',
  csv:'Full Name,Phone Number,Industry,Campaign Name,Notes\r\n"Ravi, R",9876543210,Construction,"Ad, Sept","Uses ""branded"" materials"'
};
const db={
 async query(sql,params=[]){
  if(sql.includes('FROM leads')&&sql.includes('WHERE created_by=$1')){
    assert.equal(params[0],21);
    return{rows:[{id:77,customer_phone:'9876543210',customer_email:'',
      customer_name:'Ravi, R',requirement:'',custom_fields:{Existing:'keep'}}]};
  }
  if(sql.includes('UPDATE leads l')&&sql.includes('FROM jsonb_to_recordset')){
    customFieldUpdates=JSON.parse(params[1]);
    return{rows:[]};
  }
  throw Error('Unexpected SQL: '+sql.slice(0,100));
 }
};
const base={
 importCsv:async ({userId,csv})=>{
  importedBy=userId;
  importedCsv=csv;
  return{total:1,created:1,duplicate:0,failed:0,failures:[]};
 },
 importGoogleSheet:async()=>{directBaseCalls++;throw Error('Legacy import must not be used');}
};
Module._load=function(request,parent,isMain){
 const from=parent?.filename||'';
 if(from.endsWith(path.sep+'leadPartnerInventoryCompatService.js')){
  if(request==='../config/database')return db;
  if(request==='./leadPartnerInventoryService')return base;
  if(request==='./googleSheetService')return {fetchGoogleSheetCsv:async url=>{
   assert.equal(url,'https://docs.google.com/spreadsheets/d/sheet_123/edit#gid=5');
   return sheet;
  }};
  if(request==='./sheetImportPreviewService')return{};
 }
 return originalLoad.apply(this,arguments);
};
(async()=>{
 try{
  const compat=require('../src/services/leadPartnerInventoryCompatService');
  const result=await compat.importGoogleSheet({
   userId:21,url:'https://docs.google.com/spreadsheets/d/sheet_123/edit#gid=5'
  });
  assert.equal(result.spreadsheetId,'sheet_123');
  assert.equal(result.gid,'5');
  assert.equal(result.created,1);
  assert.equal(directBaseCalls,0,'One-off Google Sheet import must not use legacy base importer directly');
  assert.equal(importedBy,21);
  assert(importedCsv.includes('Customer Phone')&&importedCsv.includes('Customer Name'),
    'One-off Sheet import must resolve canonical lead field aliases');
  assert(importedCsv.includes('Campaign Name'),'Unmapped campaign column must survive round trip to importer');
  assert.equal(customFieldUpdates.length,1);
  assert.equal(customFieldUpdates[0].id,77);
  assert.equal(customFieldUpdates[0].custom_fields['Campaign Name'],'Ad, Sept');
  assert.equal(customFieldUpdates[0].custom_fields.Notes,undefined,
    'Notes is a canonical field rather than custom data');
  assert.equal(customFieldUpdates[0].custom_fields.Existing,'keep');

  for(const file of ['leadPartnerInventoryService.js','leadPartnerInventoryCompatService.js']){
   const source=fs.readFileSync(path.join(__dirname,'../src/services',file),'utf8');
   assert(source.includes("require('../utils/csvRecords')"),
      file+' must use the shared CSV parser');
  }
  console.log('Lead partner Sheet import compatibility regression tests passed.');
 }finally{Module._load=originalLoad;}
})().catch(error=>{console.error(error);process.exitCode=1;});
