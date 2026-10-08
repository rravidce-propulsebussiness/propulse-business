const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'../src');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const base=read('services/leadPartnerInventoryService.js');
const compat=read('services/leadPartnerInventoryCompatService.js');
const controller=read('controllers/leadPartnerInventoryController.js');
const scheduler=read('services/leadPartnerSheetSyncScheduler.js');

for(const name of ['importGoogleSheet','getSheetConnections','connectGoogleSheet','syncGoogleSheet']){
  assert(!base.includes('async function '+name+'('),
    'Superseded legacy '+name+' must not remain in the inventory base');
  assert(compat.includes('async function '+name+'('),
    'The canonical partner inventory must retain '+name);
  assert(compat.slice(compat.lastIndexOf('module.exports')).includes(name),
    'The canonical partner inventory must export '+name);
}

for(const name of ['importCsv','previewCsv','disableSheetConnection','listInventory','summarizeFailures']){
  assert(base.slice(base.lastIndexOf('module.exports')).includes(name),
    'Shared importer primitive must remain exported: '+name);
}
assert(compat.includes('module.exports={...base,'),
  'Canonical service must retain shared primitives including disconnect');
assert(controller.includes("require('../services/leadPartnerInventoryCompatService')"),
  'Lead Partner API must use the canonical inventory service');
assert(scheduler.includes("require('./leadPartnerInventoryCompatService')"),
  'Automatic Lead Partner Sheet sync must use the canonical inventory service');
assert(compat.includes("sheetPreview.assertPreview"),
  'Sheet connection activation must still verify preview tokens');
assert(compat.includes("pg_try_advisory_lock"),
  'Concurrent Sheet sync protection must remain intact');
assert(compat.includes('lastFailed:connection.last_sync_failed'),
  'Unchanged Sheets with failed rows must continue to retry');
assert(base.includes('async function disableSheetConnection('),
  'Lead Partner Sheet disconnect must still function through the base primitive');

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):full.endsWith('.js')?[full]:[];
  });
}
const baseImports=[];
for(const file of walk(root)){
  const code=fs.readFileSync(file,'utf8');
  if(/require\(['"][^'"]*leadPartnerInventoryService['"]\)/.test(code)){
    baseImports.push(path.relative(root,file).replace(/\\/g,'/'));
  }
}
assert.deepEqual(baseImports,['services/leadPartnerInventoryCompatService.js'],
  'Only the canonical adapter should import the base inventory service directly');
console.log('Lead Partner legacy inventory cleanup regression tests passed.');
