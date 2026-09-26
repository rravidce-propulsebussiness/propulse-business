const fs=require('fs');
const path=require('path');

const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const defaults=read('../frontend/src/admin/pages/LeadImportDefaults.jsx');
const upload=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
const sheets=read('../frontend/src/admin/pages/GoogleSheetAutoSync.jsx');
const pricingUi=read('../frontend/src/admin/pages/AdminLeadPricing.jsx');
const leadService=read('src/services/leadService.js');

assert(defaults.includes("EMPTY_IMPORT_DEFAULTS=Object.freeze({leadType:'',exclusive:false,singleOnly:false})"),'Google Sheet defaults must include Single Only');
assert(defaults.includes("singleOnly:value?.singleOnly===true"),'Single Only must normalize as an independent optional override');
assert(defaults.includes("if(normalized.leadType&&!valueFor(next,['Lead Type']))"),'Basic/Premium default must apply only when Lead Type is blank');
assert(defaults.includes("if(normalized.exclusive&&!valueFor(next,['Pro Early Access','Exclusive','Is Exclusive','Early Access']))"),'Exclusive default must apply only when the row has no explicit early-access value');
assert(defaults.includes("if(normalized.singleOnly&&!valueFor(next,ACCESS_FIELDS))"),'Single Only must apply only when all sheet access/share fields are blank');
assert(defaults.includes("next['Access Strategy']='Permanent Single'")&&defaults.includes("next['Buyer Capacity']='1'"),'Single Only must map to Permanent Single with one buyer');
assert(defaults.includes("defaults.leadType===leadType?'':leadType"),'Basic/Premium defaults must remain mutually exclusive and toggle back to automatic');
assert(defaults.includes(">Basic</button>")&&defaults.includes(">Premium</button>")&&defaults.includes(">Single Only</button>")&&defaults.includes(">Exclusive</button>"),'Google Sheet defaults UI must expose Basic, Premium, Single Only and Exclusive');
assert(defaults.includes("labels.push('Single Only')"),'Connected sheet summary must display Single Only');

assert(!upload.includes('LeadImportDefaults'),'Manual CSV upload must not duplicate Google Sheet connection default buttons');
assert(!upload.includes('uploadDefaults'),'Manual CSV upload must not keep hidden connection-default state');
assert(upload.includes('const parsed=await enrichLocations(raw.map(make));'),'Manual CSV import must parse the uploaded row directly');
assert(upload.includes('Blank pricing and buyer-access fields fall back to Admin Lead Pricing and buyer-access configuration'),'Manual CSV upload must explain Admin fallback for blank values');
assert(upload.includes("strategyRaw==='singleonly'"),'Manual CSV must accept Single Only as an explicit sheet strategy');

assert(sheets.includes("LeadImportDefaults value={linkDefaults}"),'Google Sheet linking must expose optional connection defaults');
assert(sheets.includes("syncRows(csv,leads,cat,record.defaults)"),'Recurring Google Sheet sync must reuse each connection\'s saved defaults');
assert(sheets.includes("const next=[...sources,{url:value,defaults}]"),'Google Sheet defaults must persist with the linked source');
assert(sheets.includes("applyImportDefaults(original,defaults)"),'Google Sheet rows must pass through the shared precedence helper');
assert(sheets.includes("importDefaultsSummary(record.defaults)"),'Connected sheets must show their saved defaults');
assert(sheets.includes("typeof value==='string'"),'Existing URL-only Google Sheet connections must remain backward compatible');
assert(sheets.includes("n==='singleonly'"),'Google Sheet Access Strategy must accept Single Only wording');
assert(sheets.includes('Sheet Access Strategy / Max Buyers → Single Only override → Admin buyer-access configuration'),'Google Sheet UI must explain sharing precedence');
assert(sheets.includes('Sheet exact 1 / 2 / 3 buyer price → Admin exact-tier price'),'Google Sheet UI must explain pricing precedence');

assert(pricingUi.includes('<option value="permanent_single">Single Only</option>'),'Lead Pricing must expose Single Only while retaining permanent_single internally');
assert(leadService.includes("pricingSource==='sheet'?mergePricing(configured,pricing)"),'Sheet pricing must merge over Admin configured pricing');
assert(leadService.includes('function mergePricing(base,sheet)'),'Pricing must keep one field-level sheet-over-config merge path');

console.log('Lead import optional defaults regression test passed.');
