const pool = require('../config/database');
const base = require('./leadPartnerInventoryService');
const leadImportMapping = require('./leadImportMappingService');
const {parseCsvRecords}=require('../utils/csvRecords');

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

function parseCsv(text){
  const rows=parseCsvRecords(text);
  if(!rows.length)return[];
  const headers=rows[0].map(clean);
  return rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,clean(values[i])])))
    .filter(r=>Object.values(r).some(Boolean));
}

function first(raw,names){
  const keys=Object.keys(raw); const wanted=names.map(norm);
  const key=keys.find(k=>wanted.includes(norm(k))&&clean(raw[k]));
  return key?clean(raw[key]):'';
}

function buildCanonicalRows(rows){
  return rows.map(raw=>{
    const out={...raw};
    const industry=first(raw,['Industry','Industry Name','Category']);
    const service=first(raw,['Service','Service Name']);
    const subservice=first(raw,['Subservice','Subservice Name']);
    const phone=first(raw,['Customer Phone','Phone Number','Phone','Mobile','WhatsApp Number','WhatsApp']);
    const name=first(raw,['Customer Name','Full Name','First Name','Name','Customer']);
    const email=first(raw,['Customer Email','Email']);
    const requirement=first(raw,['Requirement','Requirements','Requirement Details','Give More Details','Give More Details and Requirement','Update']);
    const pincode=first(raw,['Pincode','Pin Code','PIN Code','Zipcode','Zip Code','Postal Code','ZIP']);
    const property=first(raw,['Property Type','Property','Interior Type','FALT SIZE']);
    const source=first(raw,['Source','Lead Source','Platform']);
    const notes=first(raw,['Notes','Remarks']);
    if(industry)out.Industry=industry;
    if(service)out.Service=service;
    if(subservice)out.Subservice=subservice;
    if(phone)out['Customer Phone']=phone;
    if(name)out['Customer Name']=name;
    if(email)out['Customer Email']=email;
    if(requirement)out.Requirement=requirement;
    if(pincode)out.Pincode=pincode;
    if(property)out['Property Type']=property;
    if(source)out.Source=source;
    if(notes)out.Notes=notes;
    return out;
  });
}

async function resolveDefaultIndustry(defaultIndustryId){
  if(defaultIndustryId===undefined||defaultIndustryId===null||defaultIndustryId==='')return null;
  const id=Number(defaultIndustryId);
  if(!Number.isInteger(id)||id<=0)throw Object.assign(new Error('Default Industry must be a valid active Industry'),{code:'INVALID_DEFAULT_INDUSTRY'});
  const row=(await pool.query('SELECT id,name FROM industries WHERE id=$1 AND is_active=TRUE',[id])).rows[0];
  if(!row)throw Object.assign(new Error('Default Industry must be a valid active Industry'),{code:'INVALID_DEFAULT_INDUSTRY'});
  return{id:Number(row.id),name:row.name};
}
function applyDefaultIndustry(rows,industry){
  if(!industry)return rows;
  return rows.map(row=>{
    const hasClassification=Boolean(first(row,['Industry','Industry Name','Category'])||first(row,['Service','Service Name'])||first(row,['Subservice','Subservice Name']));
    return hasClassification?row:{...row,Industry:industry.name};
  });
}

// The base importer attaches extra CSV columns to the exact newly-created
// lead through createLead({customFields}). Do not re-match imported rows by
// phone/email after import: duplicates and failed rows must never modify an
// unrelated existing lead's custom_fields.
async function importCsv({userId,csv,defaultIndustryId=null}){
  const rows=parseCsv(csv);
  const defaultIndustry=await resolveDefaultIndustry(defaultIndustryId);
  const prepared=applyDefaultIndustry(buildCanonicalRows(rows),defaultIndustry);
  return base.importCsv({userId,csv:toCsv(prepared)});
}

function csvEscape(v){return `"${clean(v).replace(/"/g,'""')}"`;}
function toCsv(rows){
  if(!rows.length)return'';
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  return [keys.map(csvEscape).join(','),...rows.map(r=>keys.map(k=>csvEscape(r[k])).join(','))].join('\n');
}

async function previewCsv({userId,csv,defaultIndustryId=null,columnMappings={}}){
  const defaultIndustry=await resolveDefaultIndustry(defaultIndustryId);
  const sourceCsv=String(csv||'');
  const analysis=leadImportMapping.analyzeCsv(sourceCsv,{columnMappings,scope:'lead_partner'});
  const rows=parseCsv(analysis.mappedCsv);
  const prepared=applyDefaultIndustry(buildCanonicalRows(rows),defaultIndustry);
  const preview=await base.previewCsv({userId,csv:toCsv(prepared)});
  const summary={...preview.summary,mappingWarnings:analysis.mappingWarnings};
  return{
    headers:analysis.headers,
    mappingFields:analysis.mappingFields,
    columnMappings:analysis.effectiveMappings,
    mappingWarnings:analysis.mappingWarnings,
    summary,
    rows:preview.rows
  };
}

async function listInventory(args){
  const result=await base.listInventory(args);
  const ids=(result.data||[]).map(x=>Number(x.id)).filter(Number.isInteger);
  if(!ids.length)return result;
  const details=(await pool.query('SELECT id,custom_fields FROM leads WHERE id=ANY($1::int[])',[ids])).rows;
  const map=new Map(details.map(x=>[Number(x.id),x.custom_fields||{}]));
  return{...result,data:(result.data||[]).map(row=>({...row,custom_fields:map.get(Number(row.id))||{}}))};
}
module.exports={...base,importCsv,previewCsv,listInventory};
