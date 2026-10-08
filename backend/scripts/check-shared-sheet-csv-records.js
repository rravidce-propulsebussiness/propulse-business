const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {parseCsvRecords}=require('../src/utils/csvRecords');
const sheetPreview=require('../src/services/sheetImportPreviewService');

const source='Full Name,Phone Number,Notes,Campaign\r\n'
  +'"Ravi, R",9876543210,"First line\nSecond ""quoted"" line","October, Ads"\r\n'
  +'Other,9123456789,Regular,Organic\r\n';

assert.deepEqual(parseCsvRecords(source),[
  ['Full Name','Phone Number','Notes','Campaign'],
  ['Ravi, R','9876543210','First line\nSecond "quoted" line','October, Ads'],
  ['Other','9123456789','Regular','Organic']
]);
assert.equal(typeof sheetPreview.parseCsvMatrix,'function',
  'Existing preview CSV parser export must remain callable');
assert.deepEqual(sheetPreview.parseCsvMatrix(source),parseCsvRecords(source),
  'Legacy parser API must use the canonical record scanner');
const analysis=sheetPreview.analyzeCsv(source,{scope:'admin'});
assert.equal(analysis.rowCount,2);
assert.equal(analysis.effectiveMappings.customerName,'Full Name');
assert.equal(analysis.effectiveMappings.customerPhone,'Phone Number');
assert.equal(analysis.effectiveMappings.notes,'Notes');
const mapped=parseCsvRecords(analysis.mappedCsv);
assert.deepEqual(mapped[0],['Customer Name','Customer Phone','Notes','Campaign']);
assert.deepEqual(mapped[1],[
  'Ravi, R','9876543210','First line\nSecond "quoted" line','October, Ads'
]);
assert.equal(analysis.fingerprint.length,64);
assert.equal(sheetPreview.analyzeCsv(source,{scope:'lead_partner'}).rowCount,2);

const root=path.join(__dirname,'../src/services');
const admin=fs.readFileSync(path.join(root,'adminGoogleSheetSyncService.js'),'utf8');
const preview=fs.readFileSync(path.join(root,'sheetImportPreviewService.js'),'utf8');
for(const [name,s] of [['Admin',admin],['Preview',preview]]){
  assert(s.includes("require('../utils/csvRecords')"),name+' must import the shared CSV scanner');
  assert(s.includes('parseCsvRecords(csv)'),name+' must parse rows using shared scanner');
  assert(!s.includes('function parseCsv(text)')&&!s.includes('function parseCsvMatrix(text)'),
    name+' must not recreate a duplicate record parser');
}
assert(admin.includes('function parseRows(csv)'),
  'Admin-specific CSV header and field normalization must remain intact');
assert(preview.includes('function uniqueHeaders(')&&preview.includes('SHEET_MAPPING_CONFLICT'),
  'Preview-specific mapping and duplicate header safeguards must remain intact');
console.log('Shared Admin/Lead Partner Sheet CSV record regression tests passed.');
