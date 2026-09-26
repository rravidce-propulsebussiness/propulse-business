const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const defaults=read('../frontend/src/admin/pages/LeadImportDefaults.jsx');
const upload=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const sheets=read('../frontend/src/admin/pages/GoogleSheetAutoSync.jsx');

assert(defaults.includes("leadType:['basic','premium']"),'Import defaults must support Basic and Premium only as mutually exclusive grades');
assert(defaults.includes("exclusive:value?.exclusive===true"),'Import defaults must support an independent optional Exclusive toggle');
assert(defaults.includes("if(normalized.leadType&&!valueFor(next,['Lead Type']))"),'Lead Type default must apply only when the row value is blank');
assert(defaults.includes("if(normalized.exclusive&&!valueFor(next,['Pro Early Access','Exclusive','Is Exclusive','Early Access']))"),'Exclusive default must apply only when the row has no explicit early-access value');
assert(defaults.includes("defaults.leadType===leadType?'':leadType"),'Clicking an active Basic/Premium default must return to automatic mode');
assert(defaults.includes(">Basic</button>")&&defaults.includes(">Premium</button>")&&defaults.includes(">Exclusive</button>"),'Shared UI must expose Basic, Premium and Exclusive buttons');

assert(upload.includes("LeadImportDefaults value={uploadDefaults}"),'CSV upload must expose the shared optional default controls');
assert(upload.includes("make(applyImportDefaults(row,uploadDefaults),index)"),'CSV upload must apply shared defaults before parsing each row');

assert(sheets.includes("LeadImportDefaults value={linkDefaults}"),'Google Sheet linking must expose the shared optional default controls');
assert(sheets.includes("syncRows(csv,leads,cat,record.defaults)"),'Recurring Google Sheet sync must reuse each connection\'s saved defaults');
assert(sheets.includes("const next=[...sources,{url:value,defaults}]"),'Google Sheet defaults must persist with the linked source');
assert(sheets.includes("applyImportDefaults(original,defaults)"),'Google Sheet rows must apply defaults through the shared precedence helper');
assert(sheets.includes("importDefaultsSummary(record.defaults)"),'Connected sheets must show their saved defaults');
assert(sheets.includes("typeof value==='string'"),'Existing URL-only Google Sheet connections must remain backward compatible');

console.log('Lead import optional defaults regression test passed.');
