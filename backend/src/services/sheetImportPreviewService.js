const crypto=require('crypto');
const {parseCsvRecords}=require('../utils/csvRecords');
const pool=require('../config/database');

const PREVIEW_TTL_MINUTES=30;
const clean=value=>String(value??'').trim();
const norm=value=>clean(value).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');

const TARGETS=[
  {id:'leadId',label:'Lead ID',canonical:'Lead ID',group:'Identity',aliases:['id','lead id','lead_id','external id','external_id']},
  {id:'industry',label:'Industry',canonical:'Industry',group:'Classification',aliases:['industry','industry name','industry type','industry category','category']},
  {id:'service',label:'Service',canonical:'Service',group:'Classification',aliases:['service','service name','service type','service category']},
  {id:'subservice',label:'Subservice',canonical:'Subservice',group:'Classification',aliases:['subservice','subservice name']},
  {id:'state',label:'State',canonical:'State',group:'Location',aliases:['state','state name']},
  {id:'city',label:'City',canonical:'City',group:'Location',aliases:['city','city name']},
  {id:'pincode',label:'Pincode',canonical:'Pincode',group:'Location',aliases:['pincode','pin code','pin','zipcode','zip code','postal code','post code']},
  {id:'customerName',label:'Customer Name',canonical:'Customer Name',group:'Customer',aliases:['customer name','full name','name','customer']},
  {id:'customerPhone',label:'Customer Phone',canonical:'Customer Phone',group:'Customer',aliases:['customer phone','phone number','phone','mobile','mob no','whatsapp','whatsapp number','contact number']},
  {id:'customerEmail',label:'Customer Email',canonical:'Customer Email',group:'Customer',aliases:['customer email','email','email id']},
  {id:'requirement',label:'Requirement',canonical:'Requirement',group:'Lead',aliases:['requirement','requirements','requirement details','give more details','give more details and requirement','update']},
  {id:'propertyType',label:'Property Type',canonical:'Property Type',group:'Lead',aliases:['property type','property','interior type','falt size']},
  {id:'budget',label:'Budget',canonical:'Budget',group:'Lead',aliases:['budget']},
  {id:'source',label:'Source',canonical:'Source',group:'Lead',aliases:['source','lead source','platform']},
  {id:'notes',label:'Notes',canonical:'Notes',group:'Lead',aliases:['notes','remarks']},
  {id:'leadType',label:'Lead Type',canonical:'Lead Type',group:'Access',aliases:['lead type']},
  {id:'accessStrategy',label:'Access Strategy',canonical:'Access Strategy',group:'Access',aliases:['access strategy','buyer strategy']},
  {id:'buyerCapacity',label:'Buyer Capacity',canonical:'Buyer Capacity',group:'Access',aliases:['buyer capacity','buyer capacity limit','max buyers','capacity']},
  {id:'releaseToTwoHours',label:'Release to 2 Hours',canonical:'Release to 2 Hours',group:'Access',aliases:['release to 2 hours','release to two hours']},
  {id:'releaseToThreeHours',label:'Release to 3 Hours',canonical:'Release to 3 Hours',group:'Access',aliases:['release to 3 hours','release to three hours']},
  {id:'isExclusive',label:'Pro Early Access',canonical:'Pro Early Access',group:'Access',aliases:['pro early access','early access','exclusive','is exclusive']},
  {id:'exclusiveDelayDays',label:'Exclusive Delay Days',canonical:'Exclusive Delay Days',group:'Access',aliases:['exclusive delay days','early access delay days','pro early access delay days']},
  {id:'normal1BuyerPrice',label:'Normal 1 Buyer Price',canonical:'Normal 1 Buyer',group:'Pricing',aliases:['normal 1 buyer','normal 1 buyer price','normal 1 share','normal 1 share price'],scopes:['admin']},
  {id:'normal2BuyerPrice',label:'Normal 2 Buyer Price',canonical:'Normal 2 Buyer',group:'Pricing',aliases:['normal 2 buyer','normal 2 buyer price','normal 2 shares','normal 2 share price'],scopes:['admin']},
  {id:'normal3BuyerPrice',label:'Normal 3 Buyer Price',canonical:'Normal 3 Buyer',group:'Pricing',aliases:['normal 3 buyer','normal 3 buyer price','normal 3 shares','normal 3 share price'],scopes:['admin']},
  {id:'pro1BuyerPrice',label:'Pro 1 Buyer Price',canonical:'Pro 1 Buyer',group:'Pricing',aliases:['pro 1 buyer','pro 1 buyer price','pro 1 share','pro 1 share price']},
  {id:'pro2BuyerPrice',label:'Pro 2 Buyer Price',canonical:'Pro 2 Buyer',group:'Pricing',aliases:['pro 2 buyer','pro 2 buyer price','pro 2 shares','pro 2 share price'],scopes:['admin']},
  {id:'pro3BuyerPrice',label:'Pro 3 Buyer Price',canonical:'Pro 3 Buyer',group:'Pricing',aliases:['pro 3 buyer','pro 3 buyer price','pro 3 shares','pro 3 share price'],scopes:['admin']}
];

function targetsFor(scope='admin'){
  return TARGETS.filter(target=>!target.scopes||target.scopes.includes(scope));
}
function uniqueHeaders(rawHeaders){
  const used=new Map();
  return rawHeaders.map((value,index)=>{
    const base=clean(value)||`Column ${index+1}`;
    const key=norm(base)||`column${index+1}`;
    const count=(used.get(key)||0)+1;used.set(key,count);
    return count===1?base:`${base} (${count})`;
  });
}
function csvEscape(value){return `"${String(value??'').replace(/"/g,'""')}"`;}
function headerMatchesTarget(header,target){
  const key=norm(header.replace(/\s+\(\d+\)$/,''));
  return [target.canonical,target.label,...target.aliases].some(alias=>norm(alias)===key);
}
function analyzeCsv(csv,{columnMappings={},scope='admin'}={}){
  const matrix=parseCsvRecords(csv);
  if(!matrix.length)throw new Error('Google Sheet contains no rows');
  const headers=uniqueHeaders(matrix[0]);
  if(!headers.length)throw new Error('Google Sheet contains no columns');
  const targets=targetsFor(scope);
  const suggestions={};
  const mappingWarnings=[];
  for(const target of targets){
    const candidates=headers.filter(header=>headerMatchesTarget(header,target));
    if(candidates.length){
      suggestions[target.id]=candidates[0];
      if(candidates.length>1)mappingWarnings.push(`${target.label}: multiple possible columns found; using "${candidates[0]}" until you choose another mapping.`);
    }
  }
  const requested=columnMappings&&typeof columnMappings==='object'&&!Array.isArray(columnMappings)?columnMappings:{};
  const effective={};
  for(const target of targets){
    if(Object.prototype.hasOwnProperty.call(requested,target.id)){
      const sourceHeader=requested[target.id];
      if(sourceHeader===null||sourceHeader===undefined||clean(sourceHeader)===''){effective[target.id]=null;continue}
      const source=clean(sourceHeader);
      if(!headers.includes(source)){
        const error=new Error(`Mapped column "${source}" is no longer present in the sheet`);
        error.code='SHEET_MAPPING_COLUMN_MISSING';
        throw error;
      }
      effective[target.id]=source;
      continue;
    }
    if(suggestions[target.id])effective[target.id]=suggestions[target.id];
  }
  const usedSources=new Map();
  for(const [targetId,source] of Object.entries(effective)){
    if(!source)continue;
    if(usedSources.has(source)){
      const error=new Error(`Column "${source}" cannot map to both ${usedSources.get(source)} and ${targetId}`);
      error.code='SHEET_MAPPING_CONFLICT';
      throw error;
    }
    usedSources.set(source,targetId);
  }
  const selectedBySource=new Map(Object.entries(effective).filter(([,source])=>Boolean(source)).map(([targetId,source])=>[source,targetId]));
  const outputHeaders=headers.map(header=>{
    const targetId=selectedBySource.get(header);
    if(targetId)return targets.find(item=>item.id===targetId)?.canonical||header;
    const colliding=targets.find(target=>
      headerMatchesTarget(header,target)
      && Object.prototype.hasOwnProperty.call(effective,target.id)
      && effective[target.id]!==header
    );
    return colliding?`Unmapped ${header}`:header;
  });
  const width=headers.length;
  const outputRows=matrix.slice(1).filter(row=>row.some(value=>clean(value))).map(row=>{
    const values=[...row];while(values.length<width)values.push('');
    return values.slice(0,width);
  });
  const mappedCsv=[outputHeaders,...outputRows].map(row=>row.map(csvEscape).join(',')).join('\n');
  return{
    headers,
    rowCount:outputRows.length,
    effectiveMappings:effective,
    suggestedMappings:suggestions,
    mappingWarnings,
    mappingFields:targets.map(({id,label,group,canonical})=>({id,label,group,canonical})),
    mappedCsv,
    fingerprint:crypto.createHash('sha256').update(String(csv??'')).digest('hex')
  };
}
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.keys(value).sort().reduce((out,key)=>{out[key]=stable(value[key]);return out},{});
  return value;
}
function stableJson(value){return JSON.stringify(stable(value??{}));}
function tokenHash(token){return crypto.createHash('sha256').update(String(token||'')).digest('hex');}
async function createPreview({actorType,actorUserId,sourceUrl,spreadsheetId,gid,fingerprint,defaults={},columnMappings={},summary={}}){
  const token=crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO google_sheet_import_previews(
       token_hash,actor_type,actor_user_id,spreadsheet_id,gid,source_url,fingerprint,defaults,column_mappings,summary,expires_at
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,CURRENT_TIMESTAMP+($11 * INTERVAL '1 minute'))`,
    [tokenHash(token),actorType,Number(actorUserId),spreadsheetId,String(gid||'0'),sourceUrl,fingerprint,stableJson(defaults),stableJson(columnMappings),JSON.stringify(summary||{}),PREVIEW_TTL_MINUTES]
  );
  await pool.query(
    `DELETE FROM google_sheet_import_previews
      WHERE expires_at<CURRENT_TIMESTAMP-INTERVAL '1 day'
         OR consumed_at<CURRENT_TIMESTAMP-INTERVAL '1 day'`
  ).catch(()=>{});
  return{previewToken:token,expiresInMinutes:PREVIEW_TTL_MINUTES};
}
async function assertPreview({previewToken,actorType,actorUserId,spreadsheetId,gid,fingerprint,defaults={},columnMappings={}}){
  const token=clean(previewToken);
  if(!/^[a-f0-9]{64}$/i.test(token)){
    const error=new Error('Analyze this Google Sheet before activating automatic sync');
    error.code='SHEET_PREVIEW_REQUIRED';
    throw error;
  }
  const row=(await pool.query(
    `SELECT * FROM google_sheet_import_previews
      WHERE token_hash=$1 AND actor_type=$2 AND actor_user_id=$3
        AND consumed_at IS NULL AND expires_at>CURRENT_TIMESTAMP`,
    [tokenHash(token),actorType,Number(actorUserId)]
  )).rows[0];
  if(!row){
    const error=new Error('Google Sheet preview expired or is no longer valid. Analyze the sheet again.');
    error.code='SHEET_PREVIEW_EXPIRED';
    throw error;
  }
  const sameSheet=String(row.spreadsheet_id)===String(spreadsheetId)&&String(row.gid||'0')===String(gid||'0');
  const sameFingerprint=String(row.fingerprint)===String(fingerprint);
  const sameDefaults=stableJson(row.defaults||{})===stableJson(defaults||{});
  const sameMappings=stableJson(row.column_mappings||{})===stableJson(columnMappings||{});
  if(!sameSheet||!sameFingerprint||!sameDefaults||!sameMappings){
    const error=new Error('Google Sheet or import settings changed after preview. Analyze it again before activation.');
    error.code='SHEET_CHANGED_SINCE_PREVIEW';
    throw error;
  }
  const invalid=Number(row.summary?.invalid||0);
  if(invalid>0){
    const error=new Error(`${invalid} invalid row${invalid===1?'':'s'} must be fixed before automatic sync can be activated`);
    error.code='SHEET_PREVIEW_HAS_INVALID_ROWS';
    throw error;
  }
  return row;
}
async function consumePreview(previewToken){
  const token=clean(previewToken);
  if(!token)return;
  await pool.query(
    `UPDATE google_sheet_import_previews SET consumed_at=CURRENT_TIMESTAMP
      WHERE token_hash=$1 AND consumed_at IS NULL`,
    [tokenHash(token)]
  );
}

module.exports={
  PREVIEW_TTL_MINUTES,TARGETS,targetsFor,parseCsvMatrix:parseCsvRecords,analyzeCsv,stableJson,
  createPreview,assertPreview,consumePreview
};
