// Regression: partner CSV preview/import call catalogs(); it was removed once
// (#317) and every partner CSV upload failed with "catalogs is not defined".
const fs=require('fs');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','src','services','leadPartnerInventoryService.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
assert(/async function catalogs\s*\(/.test(source),'leadPartnerInventoryService must define catalogs() used by previewCsv/importCsv');
assert(/async function previewCsv[\s\S]*?await catalogs\(\)/.test(source)&&/async function importCsv[\s\S]*?await catalogs\(\)/.test(source),'Partner CSV preview and import must load the active catalog');
console.log('Lead Partner CSV catalog regression test passed.');
