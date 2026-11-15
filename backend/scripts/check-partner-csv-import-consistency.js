const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parseCsvRecords}=require('../src/utils/csvRecords');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const source='Full Name,Phone Number,Campaign Name,Notes\r\n"Ravi, R",9876543210,"Ad, Sept","Uses ""branded"" materials"';
assert.deepEqual(parseCsvRecords(source),[
 ['Full Name','Phone Number','Campaign Name','Notes'],
 ['Ravi, R','9876543210','Ad, Sept','Uses "branded" materials']
]);
assert.deepEqual(parseCsvRecords(''),[]);
assert.deepEqual(parseCsvRecords('First,Second\n1,2'),[['First','Second'],['1','2']]);

const service=read('src/services/leadPartnerCsvImportService.js');
const controller=read('src/controllers/leadPartnerInventoryController.js');
assert(service.includes("require('../utils/csvRecords')"),'Lead Partner upload must use the shared CSV parser');
assert(service.includes('function buildCanonicalRows(rows)'),'Lead Partner upload must canonicalize submitted columns');
assert(service.includes('async function importCsv({userId,csv})'),'Lead Partner CSV import service is missing');
assert(controller.includes("require('../services/leadPartnerCsvImportService')"),'Lead Partner controller must use the CSV import service');
assert(controller.includes('service.importCsv({ userId: req.user.id, csv })'),'Lead Partner upload endpoint must call CSV import');
console.log('Lead Partner CSV import regression tests passed.');
