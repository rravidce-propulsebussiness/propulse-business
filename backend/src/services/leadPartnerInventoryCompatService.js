const pool = require('../config/database');
const base = require('./leadPartnerInventoryService');
const { fetchGoogleSheetCsv } = require('./googleSheetService');

const clean = v => String(v ?? '').trim();
const norm = v => clean(v).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

// Fields that become first-class lead columns. Every other non-empty Google
// Sheet column is retained in custom_fields so Admin can render it dynamically.
const canonical = new Set([
  'id','leadid','lead_id','externalid','external_id',
  'industry','industryname','industrytype','industrycategory','category',
  'service','servicename','servicetype','servicecategory',
  'subservice','subservicename',
  'state','statename','city','cityname',
  'pincode','pincode','pin','zipcode','postalcode','postal',
  'customername','name','customer','fullname','full_name',
  'customerphone','phone','mobile','phonenumber','phone_number',
  'customeremail','email',
  'requirement','requirements','requirementdetails',
  'propertytype','property','interiortype',
  'budget','source','notes',
  'buyercapacity','buyercapacitylimit','maxbuyers','capacity',
  'leadtype','exclusive','isexclusive',
  'investor','investorname','investoremail',
  'pricing','leadpricing','leadprice','price',
  'exclusivedelaydays','exclusivedelayhours'
]);

function parseCsv(text) {
  const rows=[]; let row=[]; let cell=''; let quoted=false;
  for(let i=0;i<text.length;i+=1){
    const c=text[i];
    if(c==='"'){ if(quoted&&text[i+1]==='"'){cell+='"';i+=1;} else quoted=!quoted; }
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i+=1;row.push(cell);if(row.some(v=>clean(v)))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  row.push(cell); if(row.some(v=>clean(v)))rows.push(row);
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
    const source=first(raw,['Source','Campaign Name']);
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

function buildCustomFields(raw){
  const fields={};
  for(const [key,value] of Object.entries(raw)){
    if(!clean(value))continue;
    if(canonical.has(norm(key)))continue;
    fields[key]=value;
  }
  return fields;
}

async function persistDetails({userId,rows}){
  const normalized=buildCanonicalRows(rows);
  for(const raw of normalized){
    const phone=first(raw,['Customer Phone']);
    const email=first(raw,['Customer Email']);
    const name=first(raw,['Customer Name']);
    const requirement=first(raw,['Requirement']);
    const industry=first(raw,['Industry']);
    const matches=[];
    if(phone){
      const r=await pool.query(`SELECT l.id,l.custom_fields FROM leads l WHERE l.created_by=$1 AND regexp_replace(COALESCE(l.customer_phone,''),'[^0-9]','','g')=regexp_replace($2,'[^0-9]','','g') AND ($3='' OR l.customer_name=$3) ORDER BY l.id DESC LIMIT 1`,[userId,phone,name||'']);
      matches.push(...r.rows);
    }
    if(!matches.length&&email){
      const r=await pool.query(`SELECT l.id,l.custom_fields FROM leads l WHERE l.created_by=$1 AND LOWER(TRIM(COALESCE(l.customer_email,'')))=LOWER(TRIM($2)) ORDER BY l.id DESC LIMIT 1`,[userId,email]);
      matches.push(...r.rows);
    }
    if(!matches.length&&name&&requirement){
      const r=await pool.query(`SELECT l.id,l.custom_fields FROM leads l WHERE l.created_by=$1 AND LOWER(TRIM(COALESCE(l.customer_name,'')))=LOWER(TRIM($2)) AND LOWER(TRIM(COALESCE(l.requirement,'')))=LOWER(TRIM($3)) ORDER BY l.id DESC LIMIT 1`,[userId,name,requirement]);
      matches.push(...r.rows);
    }
    const lead=matches[0];
    if(!lead)continue;
    const existing=lead.custom_fields&&typeof lead.custom_fields==='object'&&!Array.isArray(lead.custom_fields)?lead.custom_fields:{};
    const merged={...existing,...buildCustomFields(raw)};
    await pool.query('UPDATE leads SET custom_fields=$1::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND created_by=$3',[JSON.stringify(merged),lead.id,userId]);
  }
}

async function importCsv({userId,csv}){
  const rows=parseCsv(csv);
  const prepared=buildCanonicalRows(rows);
  const result=await base.importCsv({userId,csv:toCsv(prepared)});
  if(rows.length)await persistDetails({userId,rows});
  return result;
}

function csvEscape(v){return `"${clean(v).replace(/"/g,'""')}"`;}
function toCsv(rows){
  if(!rows.length)return'';
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  return [keys.map(csvEscape).join(','),...rows.map(r=>keys.map(k=>csvEscape(r[k])).join(','))].join('\n');
}

async function connectGoogleSheet({userId,url}){
  const result=await fetchGoogleSheetCsv(url);
  const imported=await importCsv({userId,csv:result.csv});
  const connection=(await pool.query(`INSERT INTO lead_partner_sheet_connections(user_id,spreadsheet_id,gid,source_url,last_synced_at,last_sync_created,last_sync_duplicate,last_sync_failed,last_sync_failures) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP,$5,$6,$7,$8::jsonb) ON CONFLICT(user_id,spreadsheet_id,gid) DO UPDATE SET source_url=EXCLUDED.source_url,status='active',last_synced_at=EXCLUDED.last_synced_at,last_sync_created=EXCLUDED.last_sync_created,last_sync_duplicate=EXCLUDED.last_sync_duplicate,last_sync_failed=EXCLUDED.last_sync_failed,last_sync_failures=EXCLUDED.last_sync_failures,updated_at=CURRENT_TIMESTAMP RETURNING *`,[userId,result.spreadsheetId,result.gid||'0',url,imported.created,imported.duplicate,imported.failed,JSON.stringify(imported.failures)])).rows[0];
  return{connection,import:imported};
}

async function syncGoogleSheet({userId,connectionId}){
  const connection=(await pool.query(`SELECT * FROM lead_partner_sheet_connections WHERE id=$1 AND user_id=$2 AND status='active'`,[connectionId,userId])).rows[0];
  if(!connection){const e=new Error('Active Google Sheet connection not found');e.code='SHEET_CONNECTION_NOT_FOUND';throw e;}
  const result=await fetchGoogleSheetCsv(connection.source_url);
  if(result.spreadsheetId!==connection.spreadsheet_id||String(result.gid||'0')!==String(connection.gid||'0'))throw new Error('Google Sheet URL no longer matches the connected sheet');
  const imported=await importCsv({userId,csv:result.csv});
  const saved=(await pool.query(`UPDATE lead_partner_sheet_connections SET last_synced_at=CURRENT_TIMESTAMP,last_sync_created=$1,last_sync_duplicate=$2,last_sync_failed=$3,last_sync_failures=$4::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND user_id=$6 RETURNING *`,[imported.created,imported.duplicate,imported.failed,JSON.stringify(imported.failures),connectionId,userId])).rows[0];
  return{connection:saved,import:imported};
}

async function listInventory(args){
  const result=await base.listInventory(args);
  const ids=(result.data||[]).map(x=>Number(x.id)).filter(Number.isInteger);
  if(!ids.length)return result;
  const details=(await pool.query('SELECT id,custom_fields FROM leads WHERE id=ANY($1::int[])',[ids])).rows;
  const map=new Map(details.map(x=>[Number(x.id),x.custom_fields||{}]));
  return{...result,data:(result.data||[]).map(row=>({...row,custom_fields:map.get(Number(row.id))||{}}))};
}

module.exports={...base,importCsv,connectGoogleSheet,syncGoogleSheet,listInventory};
