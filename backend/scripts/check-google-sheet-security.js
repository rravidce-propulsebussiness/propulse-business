const fs=require('fs');
const path=require('path');
const service=require('../src/services/googleSheetService');

const source=fs.readFileSync(path.join(__dirname,'../src/services/googleSheetService.js'),'utf8');

if(!/SHEET_HOSTS=new Set\(\['docs\.google\.com'\]\)/.test(source))throw new Error('Google Sheet security regression: docs.google.com allowlist missing');
if(!/redirect:'manual'/.test(source))throw new Error('Google Sheet security regression: redirects must be handled manually');
if(!/validateGoogleSheetTarget/.test(source))throw new Error('Google Sheet security regression: redirect target validation missing');
if(!/MAX_REDIRECTS=3/.test(source))throw new Error('Google Sheet security regression: redirect limit missing');

function assertAllowed(label,value){
  try{const parsed=service.validateGoogleSheetTarget(value);if(parsed.hostname!=='docs.google.com'||parsed.protocol!=='https:')throw new Error(label+' returned unsafe target');}
  catch(error){throw new Error(label+' was rejected: '+error.message);}
}
function assertRejected(label,value){
  try{service.validateGoogleSheetTarget(value);throw new Error(label+' was accepted');}
  catch(error){if(error.message===label+' was accepted')throw error;}
}

assertAllowed('valid Google Sheet target','https://docs.google.com/spreadsheets/d/abc123/export?format=csv&gid=0');
assertAllowed('valid Google Sheet target with user path','https://docs.google.com/spreadsheets/u/1/d/abc123/gviz/tq?tqx=out:csv');
for(const [label,value] of [
  ['HTTP redirect','http://docs.google.com/spreadsheets/d/abc123/export'],
  ['external HTTPS redirect','https://evil.example/spreadsheets/d/abc123/export'],
  ['protocol-relative redirect','//evil.example/spreadsheets/d/abc123/export'],
  ['Google non-sheet redirect','https://docs.google.com/evil/path'],
  ['credentials redirect','https://user:pass@docs.google.com/spreadsheets/d/abc123/export']
])assertRejected(label,value);

const parsed=service.parseGoogleSheetUrl('https://docs.google.com/spreadsheets/d/abc123/edit#gid=42');
if(parsed.spreadsheetId!=='abc123'||parsed.gid!=='42')throw new Error('Google Sheet URL parser regression failed');

console.log('Google Sheet fetch redirect security regression test passed.');
