const pool = require('../config/database');
const {shouldSkipUnchangedSheet}=require('../utils/sheetSyncRetryPolicy');
const base = require('./leadPartnerInventoryService');
const { fetchGoogleSheetCsv } = require('./googleSheetService');
const sheetPreview = require('./sheetImportPreviewService');
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

// The base importer attaches extra Sheet columns to the exact newly-created
// lead through createLead({customFields}). Do not re-match imported rows by
// phone/email after import: duplicates and failed rows must never modify an
// unrelated existing lead's custom_fields.
async function importCsv({userId,csv,defaultIndustryId=null}){
  const rows=parseCsv(csv);
  const defaultIndustry=await resolveDefaultIndustry(defaultIndustryId);
  const prepared=applyDefaultIndustry(buildCanonicalRows(rows),defaultIndustry);
  return base.importCsv({userId,csv:toCsv(prepared)});
}

// Keep the one-time Google Sheet import on the same canonical/custom-field
// processing path as CSV uploads and connected sheet syncs. It intentionally
// does not create a persistent sheet connection or require an activation token.
async function importGoogleSheet({userId,url,defaultIndustryId=null}){
  const result=await fetchGoogleSheetCsv(url);
  const imported=await importCsv({userId,csv:result.csv,defaultIndustryId});
  return{...imported,spreadsheetId:result.spreadsheetId,gid:result.gid};
}

function csvEscape(v){return `"${clean(v).replace(/"/g,'""')}"`;}
function toCsv(rows){
  if(!rows.length)return'';
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  return [keys.map(csvEscape).join(','),...rows.map(r=>keys.map(k=>csvEscape(r[k])).join(','))].join('\n');
}

async function previewGoogleSheet({userId,url,defaultIndustryId=null,columnMappings={}}){
  const defaultIndustry=await resolveDefaultIndustry(defaultIndustryId);
  const result=await fetchGoogleSheetCsv(url);
  const analysis=sheetPreview.analyzeCsv(result.csv||'',{columnMappings,scope:'lead_partner'});
  const rows=parseCsv(analysis.mappedCsv);
  const prepared=applyDefaultIndustry(buildCanonicalRows(rows),defaultIndustry);
  const preview=await base.previewCsv({userId,csv:toCsv(prepared)});
  const summary={...preview.summary,mappingWarnings:analysis.mappingWarnings};
  const token=await sheetPreview.createPreview({
    actorType:'lead_partner',actorUserId:userId,sourceUrl:url,spreadsheetId:result.spreadsheetId,gid:result.gid,
    fingerprint:analysis.fingerprint,defaults:{defaultIndustryId:defaultIndustry?.id||null},columnMappings:analysis.effectiveMappings,summary
  });
  return{
    spreadsheetId:result.spreadsheetId,
    gid:result.gid,
    headers:analysis.headers,
    mappingFields:analysis.mappingFields,
    columnMappings:analysis.effectiveMappings,
    mappingWarnings:analysis.mappingWarnings,
    summary,
    rows:preview.rows,
    ...token
  };
}

async function connectGoogleSheet({userId,url,defaultIndustryId=null,columnMappings={},previewToken}){
  const defaultIndustry=await resolveDefaultIndustry(defaultIndustryId);
  const result=await fetchGoogleSheetCsv(url);
  const analysis=sheetPreview.analyzeCsv(result.csv||'',{columnMappings,scope:'lead_partner'});
  const preview=await sheetPreview.assertPreview({
    previewToken,actorType:'lead_partner',actorUserId:userId,spreadsheetId:result.spreadsheetId,gid:result.gid,
    fingerprint:analysis.fingerprint,defaults:{defaultIndustryId:defaultIndustry?.id||null},columnMappings:analysis.effectiveMappings
  });
  const imported=await importCsv({userId,csv:analysis.mappedCsv,defaultIndustryId:defaultIndustry?.id||null});
  const connection=(await pool.query(
    `INSERT INTO lead_partner_sheet_connections(
       user_id,spreadsheet_id,gid,source_url,default_industry_id,column_mappings,last_preview_summary,last_previewed_at,fingerprint,
       last_synced_at,last_sync_created,last_sync_duplicate,last_sync_failed,last_sync_failures
     ) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,CURRENT_TIMESTAMP,$8,CURRENT_TIMESTAMP,$9,$10,$11,$12::jsonb)
     ON CONFLICT(user_id,spreadsheet_id,gid) DO UPDATE SET
       source_url=EXCLUDED.source_url,default_industry_id=EXCLUDED.default_industry_id,column_mappings=EXCLUDED.column_mappings,
       last_preview_summary=EXCLUDED.last_preview_summary,last_previewed_at=CURRENT_TIMESTAMP,fingerprint=EXCLUDED.fingerprint,status='active',
       last_synced_at=EXCLUDED.last_synced_at,last_sync_created=EXCLUDED.last_sync_created,last_sync_duplicate=EXCLUDED.last_sync_duplicate,
       last_sync_failed=EXCLUDED.last_sync_failed,last_sync_failures=EXCLUDED.last_sync_failures,
       sync_failure_count=0,last_sync_error_at=NULL,last_sync_error=NULL,next_retry_at=NULL,updated_at=CURRENT_TIMESTAMP
     RETURNING *`,
    [userId,result.spreadsheetId,result.gid||'0',url,defaultIndustry?.id||null,JSON.stringify(analysis.effectiveMappings),JSON.stringify(preview.summary||{}),analysis.fingerprint,imported.created,imported.duplicate,imported.failed,JSON.stringify(imported.failures)]
  )).rows[0];
  await sheetPreview.consumePreview(previewToken);
  return{connection,import:imported};
}

async function syncGoogleSheet({userId,connectionId,force=false}){
  const id=Number(connectionId);
  if(!Number.isInteger(id)||id<=0){const e=new Error('Active Google Sheet connection not found');e.code='SHEET_CONNECTION_NOT_FOUND';throw e;}
  const lockClient=await pool.connect();
  let locked=false;
  try{
    const lock=(await lockClient.query('SELECT pg_try_advisory_lock($1,$2) AS acquired',[73190521,id])).rows[0];
    locked=Boolean(lock?.acquired);
    if(!locked){const e=new Error('Google Sheet sync is already in progress');e.code='SYNC_IN_PROGRESS';throw e;}
    const connection=(await pool.query(`SELECT * FROM lead_partner_sheet_connections WHERE id=$1 AND user_id=$2 AND status='active'`,[id,userId])).rows[0];
    if(!connection){const e=new Error('Active Google Sheet connection not found');e.code='SHEET_CONNECTION_NOT_FOUND';throw e;}
    const result=await fetchGoogleSheetCsv(connection.source_url);
    if(result.spreadsheetId!==connection.spreadsheet_id||String(result.gid||'0')!==String(connection.gid||'0'))throw new Error('Google Sheet URL no longer matches the connected sheet');
    const analysis=sheetPreview.analyzeCsv(result.csv||'',{columnMappings:connection.column_mappings||{},scope:'lead_partner'});
    if(shouldSkipUnchangedSheet({force,previousFingerprint:connection.fingerprint,nextFingerprint:analysis.fingerprint,lastFailed:connection.last_sync_failed})){
      const saved=(await pool.query(
        `UPDATE lead_partner_sheet_connections
            SET last_synced_at=CURRENT_TIMESTAMP,
                last_sync_created=0,last_sync_duplicate=0,last_sync_failed=0,last_sync_failures='[]'::jsonb,
                sync_failure_count=0,last_sync_error_at=NULL,last_sync_error=NULL,next_retry_at=NULL,updated_at=CURRENT_TIMESTAMP
          WHERE id=$1 AND user_id=$2
          RETURNING *`,
        [id,userId]
      )).rows[0];
      return{connection:saved,import:{total:0,created:0,duplicate:0,failed:0,failures:[],duplicateSamples:[],failureSummary:[],skipped:true,reason:'unchanged'}};
    }
    const imported=await importCsv({userId,csv:analysis.mappedCsv,defaultIndustryId:connection.default_industry_id});
    const saved=(await pool.query(
      `UPDATE lead_partner_sheet_connections
          SET fingerprint=$1,last_synced_at=CURRENT_TIMESTAMP,last_sync_created=$2,last_sync_duplicate=$3,last_sync_failed=$4,last_sync_failures=$5::jsonb,
              sync_failure_count=0,last_sync_error_at=NULL,last_sync_error=NULL,next_retry_at=NULL,updated_at=CURRENT_TIMESTAMP
        WHERE id=$6 AND user_id=$7
        RETURNING *`,
      [analysis.fingerprint,imported.created,imported.duplicate,imported.failed,JSON.stringify(imported.failures),id,userId]
    )).rows[0];
    return{connection:saved,import:imported};
  }finally{
    if(locked)await lockClient.query('SELECT pg_advisory_unlock($1,$2)',[73190521,id]).catch(()=>{});
    lockClient.release();
  }
}
async function listInventory(args){
  const result=await base.listInventory(args);
  const ids=(result.data||[]).map(x=>Number(x.id)).filter(Number.isInteger);
  if(!ids.length)return result;
  const details=(await pool.query('SELECT id,custom_fields FROM leads WHERE id=ANY($1::int[])',[ids])).rows;
  const map=new Map(details.map(x=>[Number(x.id),x.custom_fields||{}]));
  return{...result,data:(result.data||[]).map(row=>({...row,custom_fields:map.get(Number(row.id))||{}}))};
}


async function getSheetConnections({userId}){
  const rows=(await pool.query(`SELECT c.id,c.spreadsheet_id,c.gid,c.source_url,c.status,c.default_industry_id,i.name AS default_industry_name,c.column_mappings,c.last_preview_summary,c.last_previewed_at,c.fingerprint,c.last_synced_at,c.last_sync_created,c.last_sync_duplicate,c.last_sync_failed,c.last_sync_failures,c.created_at,c.updated_at
    FROM lead_partner_sheet_connections c
    LEFT JOIN industries i ON i.id=c.default_industry_id
    WHERE c.user_id=$1
    ORDER BY c.updated_at DESC,c.id DESC`,[userId])).rows;
  return rows.map(row=>({...row,last_sync_failure_summary:base.summarizeFailures(Array.isArray(row.last_sync_failures)?row.last_sync_failures:[])}));
}
async function updateSheetDefaultIndustry({userId,connectionId,defaultIndustryId=null}){
  const id=Number(connectionId);
  if(!Number.isInteger(id)||id<=0)throw Object.assign(new Error('Sheet connection not found'),{code:'SHEET_CONNECTION_NOT_FOUND'});
  const industry=await resolveDefaultIndustry(defaultIndustryId);
  const row=(await pool.query(`UPDATE lead_partner_sheet_connections SET default_industry_id=$1,fingerprint=NULL,last_synced_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND user_id=$3 RETURNING *`,[industry?.id||null,id,userId])).rows[0];
  if(!row)throw Object.assign(new Error('Sheet connection not found'),{code:'SHEET_CONNECTION_NOT_FOUND'});
  return{...row,default_industry_name:industry?.name||null};
}

module.exports={...base,importCsv,importGoogleSheet,previewGoogleSheet,connectGoogleSheet,syncGoogleSheet,listInventory,getSheetConnections,updateSheetDefaultIndustry};
