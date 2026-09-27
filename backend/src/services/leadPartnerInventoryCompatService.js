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

function normalizedPhone(value){return clean(value).replace(/\D/g,'')}
function normalizedText(value){return clean(value).toLowerCase()}

async function persistDetails({userId,rows}){
  const normalized=buildCanonicalRows(rows);
  if(!normalized.length)return;

  const descriptors=normalized.map(raw=>{
    const phone=first(raw,['Customer Phone']);
    const email=first(raw,['Customer Email']);
    const name=first(raw,['Customer Name']);
    const requirement=first(raw,['Requirement']);
    return{
      raw,
      phone,
      phoneKey:normalizedPhone(phone),
      emailKey:normalizedText(email),
      name,
      nameKey:normalizedText(name),
      requirementKey:normalizedText(requirement)
    };
  });

  const phones=[...new Set(descriptors.map(x=>x.phoneKey).filter(Boolean))];
  const emails=[...new Set(descriptors.map(x=>x.emailKey).filter(Boolean))];
  const names=[...new Set(descriptors.map(x=>x.nameKey).filter(Boolean))];
  const requirements=[...new Set(descriptors.map(x=>x.requirementKey).filter(Boolean))];

  const candidates=(await pool.query(`
    SELECT id,customer_phone,customer_email,customer_name,requirement,custom_fields
    FROM leads
    WHERE created_by=$1
      AND (
        regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=ANY($2::text[])
        OR LOWER(TRIM(COALESCE(customer_email,'')))=ANY($3::text[])
        OR (
          LOWER(TRIM(COALESCE(customer_name,'')))=ANY($4::text[])
          AND LOWER(TRIM(COALESCE(requirement,'')))=ANY($5::text[])
        )
      )
    ORDER BY id DESC
  `,[userId,phones,emails,names,requirements])).rows;

  const byPhone=new Map();
  const byPhoneAndExactName=new Map();
  const byEmail=new Map();
  const byNameRequirement=new Map();

  for(const lead of candidates){
    const phoneKey=normalizedPhone(lead.customer_phone);
    const emailKey=normalizedText(lead.customer_email);
    const nameKey=normalizedText(lead.customer_name);
    const requirementKey=normalizedText(lead.requirement);
    if(phoneKey&&!byPhone.has(phoneKey))byPhone.set(phoneKey,lead);
    if(phoneKey&&!byPhoneAndExactName.has(`${phoneKey}\u0000${String(lead.customer_name||'')}`)){
      byPhoneAndExactName.set(`${phoneKey}\u0000${String(lead.customer_name||'')}`,lead);
    }
    if(emailKey&&!byEmail.has(emailKey))byEmail.set(emailKey,lead);
    if(nameKey&&requirementKey&&!byNameRequirement.has(`${nameKey}\u0000${requirementKey}`)){
      byNameRequirement.set(`${nameKey}\u0000${requirementKey}`,lead);
    }
  }

  const mergedByLead=new Map();
  for(const descriptor of descriptors){
    let lead=null;
    if(descriptor.phoneKey){
      lead=descriptor.name
        ?byPhoneAndExactName.get(`${descriptor.phoneKey}\u0000${descriptor.name}`)||null
        :byPhone.get(descriptor.phoneKey)||null;
    }
    if(!lead&&descriptor.emailKey)lead=byEmail.get(descriptor.emailKey)||null;
    if(!lead&&descriptor.nameKey&&descriptor.requirementKey){
      lead=byNameRequirement.get(`${descriptor.nameKey}\u0000${descriptor.requirementKey}`)||null;
    }
    if(!lead)continue;

    const current=mergedByLead.get(Number(lead.id))
      ||(lead.custom_fields&&typeof lead.custom_fields==='object'&&!Array.isArray(lead.custom_fields)?lead.custom_fields:{});
    mergedByLead.set(Number(lead.id),{...current,...buildCustomFields(descriptor.raw)});
  }

  if(!mergedByLead.size)return;
  const payload=[...mergedByLead.entries()].map(([id,custom_fields])=>({id,custom_fields}));
  await pool.query(`
    UPDATE leads l
    SET custom_fields=u.custom_fields,updated_at=CURRENT_TIMESTAMP
    FROM jsonb_to_recordset($2::jsonb) AS u(id int,custom_fields jsonb)
    WHERE l.created_by=$1 AND l.id=u.id
  `,[userId,JSON.stringify(payload)]);
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
  const connection=(await pool.query(`INSERT INTO lead_partner_sheet_connections(user_id,spreadsheet_id,gid,source_url,last_synced_at,last_sync_created,last_sync_duplicate,last_sync_failed,last_sync_failures) VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP,$5,$6,$7,$8::jsonb) ON CONFLICT(user_id,spreadsheet_id,gid) DO UPDATE SET source_url=EXCLUDED.source_url,status='active',last_synced_at=EXCLUDED.last_synced_at,last_sync_created=EXCLUDED.last_sync_created,last_sync_duplicate=EXCLUDED.last_sync_duplicate,last_sync_failed=EXCLUDED.last_sync_failed,last_sync_failures=EXCLUDED.last_sync_failures,sync_failure_count=0,last_sync_error_at=NULL,last_sync_error=NULL,next_retry_at=NULL,updated_at=CURRENT_TIMESTAMP RETURNING *`,[userId,result.spreadsheetId,result.gid||'0',url,imported.created,imported.duplicate,imported.failed,JSON.stringify(imported.failures)])).rows[0];
  return{connection,import:imported};
}

async function syncGoogleSheet({userId,connectionId}){
  const connection=(await pool.query(`SELECT * FROM lead_partner_sheet_connections WHERE id=$1 AND user_id=$2 AND status='active'`,[connectionId,userId])).rows[0];
  if(!connection){const e=new Error('Active Google Sheet connection not found');e.code='SHEET_CONNECTION_NOT_FOUND';throw e;}
  const result=await fetchGoogleSheetCsv(connection.source_url);
  if(result.spreadsheetId!==connection.spreadsheet_id||String(result.gid||'0')!==String(connection.gid||'0'))throw new Error('Google Sheet URL no longer matches the connected sheet');
  const imported=await importCsv({userId,csv:result.csv});
  const saved=(await pool.query(`UPDATE lead_partner_sheet_connections SET last_synced_at=CURRENT_TIMESTAMP,last_sync_created=$1,last_sync_duplicate=$2,last_sync_failed=$3,last_sync_failures=$4::jsonb,sync_failure_count=0,last_sync_error_at=NULL,last_sync_error=NULL,next_retry_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$5 AND user_id=$6 RETURNING *`,[imported.created,imported.duplicate,imported.failed,JSON.stringify(imported.failures),connectionId,userId])).rows[0];
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
