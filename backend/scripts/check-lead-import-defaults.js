const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const upload=read('../frontend/src/admin/pages/AdminLeadsV9.jsx');
assert(!upload.includes('LeadImportDefaults'),'Manual CSV upload must not show unused import defaults');
assert(!upload.includes('uploadDefaults'),'Manual CSV upload must not keep unused defaults state');
assert(upload.includes('const parsed=await enrichLocations(raw.map(make));'),'Manual CSV import must parse the uploaded rows directly');
assert(upload.includes('Blank pricing and buyer-access fields use your Admin Lead Pricing configuration'),'Manual CSV upload must explain Admin pricing fallback');
assert(upload.includes("strategyRaw==='singleonly'"),'Manual CSV upload must accept Single Only access strategy');
console.log('Manual CSV import regression test passed.');
