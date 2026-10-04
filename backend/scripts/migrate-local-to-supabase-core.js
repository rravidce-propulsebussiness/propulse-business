require('dotenv').config({quiet:true});
const {Client}=require('pg');

const APPLY=process.argv.includes('--apply');
const stats=new Map();
const warnings=[];

function bump(table,kind){const s=stats.get(table)||{matched:0,inserted:0};s[kind]+=1;stats.set(table,s)}
function norm(v){return String(v??'').trim().toLowerCase()}
function qid(v){return '"'+String(v).replace(/"/g,'""')+'"'}
function localConfig(){
  return{
    host:String(process.env.DB_HOST||'localhost').trim(),
    port:Number(process.env.DB_PORT)||5432,
    database:String(process.env.DB_NAME||'propulse_business').trim(),
    user:String(process.env.DB_USER||'postgres').trim(),
    password:process.env.DB_PASSWORD||'',
    ssl:/^(1|true|require)$/i.test(String(process.env.DB_SSL||'').trim())
      ? {rejectUnauthorized:!/^(0|false)$/i.test(String(process.env.DB_SSL_REJECT_UNAUTHORIZED||'true').trim())}
      : false,
    application_name:'propulse-local-source'
  };
}
function targetConfig(){
  const raw=String(process.env.MIGRATION_TARGET_DATABASE_URL||'').trim();
  if(!raw)throw new Error('Set MIGRATION_TARGET_DATABASE_URL to the Supabase Session Pooler URL.');
  const u=new URL(raw);
  if(!/\.pooler\.supabase\.com$/i.test(u.hostname))throw new Error('MIGRATION_TARGET_DATABASE_URL must point to a Supabase pooler host.');
  return{
    host:u.hostname,
    port:Number(u.port)||5432,
    database:decodeURIComponent(u.pathname.replace(/^\//,'')),
    user:decodeURIComponent(u.username),
    password:decodeURIComponent(u.password),
    ssl:{rejectUnauthorized:false},
    application_name:'propulse-supabase-target'
  };
}
async function all(client,table,order='id'){
  const columns=(await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,[table])).rows;
  if(!columns.length)return[];
  const orderClause=columns.some(x=>x.column_name===order)?' ORDER BY '+qid(order):'';
  return(await client.query('SELECT * FROM '+qid(table)+orderClause)).rows;
}
async function columnSet(client,table){
  const rows=(await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,[table])).rows;
  return new Set(rows.map(r=>r.column_name));
}
const commonCache=new Map();
async function commonColumns(local,target,table){
  if(commonCache.has(table))return commonCache.get(table);
  const [l,t]=await Promise.all([columnSet(local,table),columnSet(target,table)]);
  const common=[...l].filter(x=>t.has(x));
  commonCache.set(table,common);
  return common;
}
async function insertCommon(local,target,table,row,{exclude=[],overrides={},returning='id'}={}){
  const common=await commonColumns(local,target,table);
  const excluded=new Set(['id',...exclude]);
  const values={};
  for(const col of common){
    if(excluded.has(col))continue;
    if(Object.prototype.hasOwnProperty.call(row,col))values[col]=row[col];
  }
  for(const [col,val] of Object.entries(overrides)){
    if((await columnSet(target,table)).has(col))values[col]=val;
  }
  const cols=Object.keys(values);
  if(!cols.length)throw new Error('No insertable columns for '+table);
  const params=cols.map((_,i)=>'$'+(i+1)).join(',');
  const sql='INSERT INTO '+qid(table)+' ('+cols.map(qid).join(',')+') VALUES ('+params+')'+(returning?' RETURNING '+qid(returning):'');
  const res=await target.query(sql,cols.map(c=>values[c]));
  return returning?res.rows[0]?.[returning]:null;
}
function resolveTwo(rows,a,b){
  const x=rows.find(a)||null;
  const y=rows.find(b)||null;
  if(x&&y&&x.id!==y.id)throw new Error('Natural-key ambiguity detected');
  return x||y;
}
function need(map,id,label,nullable=false){
  if(id==null&&nullable)return null;
  const value=map.get(Number(id));
  if(value==null){
    if(nullable){warnings.push(label+' local id '+id+' could not be mapped; using NULL');return null}
    throw new Error(label+' local id '+id+' could not be mapped');
  }
  return value;
}
function fakeId(id){return -(1000000+Number(id))}
async function upsertHierarchy({local,target,table,parentMap=null,parentColumn=null,keyColumns=[]}){
  const localRows=await all(local,table);
  const targetRows=await all(target,table);
  const map=new Map();
  for(const row of localRows){
    const parentId=parentColumn?need(parentMap,row[parentColumn],table+'.'+parentColumn):null;
    const candidates=targetRows.filter(t=>!parentColumn||t[parentColumn]===parentId);
    let existing=null;
    for(const key of keyColumns){
      if(row[key]==null||String(row[key]).trim()==='')continue;
      const match=candidates.find(t=>norm(t[key])===norm(row[key]));
      if(match){
        if(existing&&existing.id!==match.id)throw new Error(table+' natural-key ambiguity for local id '+row.id);
        existing=match;
      }
    }
    if(existing){map.set(Number(row.id),Number(existing.id));bump(table,'matched');continue}
    if(!APPLY){map.set(Number(row.id),fakeId(row.id));bump(table,'inserted');continue}
    const overrides=parentColumn?{[parentColumn]:parentId}:{};
    const id=await insertCommon(local,target,table,row,{exclude:parentColumn?[parentColumn]:[],overrides});
    map.set(Number(row.id),Number(id));targetRows.push({...row,id,...overrides});bump(table,'inserted');
  }
  return map;
}
async function migrate(){
  const local=new Client(localConfig());
  const target=new Client(targetConfig());
  await local.connect();await target.connect();
  let inTx=false;
  try{
    const localDb=(await local.query('select current_database() db,inet_server_addr()::text host')).rows[0];
    const targetDb=(await target.query('select current_database() db,inet_server_addr()::text host')).rows[0];
    console.log('Source:',localConfig().host+'/'+localDb.db);
    console.log('Target:',targetConfig().host+'/'+targetDb.db);
    console.log(APPLY?'MODE: APPLY':'MODE: DRY RUN (no writes)');
    if(APPLY){await target.query('BEGIN');inTx=true}

    const stateMap=await upsertHierarchy({local,target,table:'states',keyColumns:['code','name']});
    const industryMap=await upsertHierarchy({local,target,table:'industries',keyColumns:['slug','name']});
    const cityMap=await upsertHierarchy({local,target,table:'cities',parentMap:stateMap,parentColumn:'state_id',keyColumns:['slug','name']});
    const serviceMap=await upsertHierarchy({local,target,table:'services',parentMap:industryMap,parentColumn:'industry_id',keyColumns:['slug','name']});
    const subserviceMap=await upsertHierarchy({local,target,table:'subservices',parentMap:serviceMap,parentColumn:'service_id',keyColumns:['slug','name']});
    const subcityMap=await upsertHierarchy({local,target,table:'subcities',parentMap:cityMap,parentColumn:'city_id',keyColumns:['slug','name']});

    const localCityPins=await all(local,'city_pincodes');
    const targetCityPins=await all(target,'city_pincodes');
    for(const row of localCityPins){
      const cityId=need(cityMap,row.city_id,'city_pincodes.city_id');
      const found=cityId>0&&targetCityPins.find(t=>t.city_id===cityId&&String(t.pincode)===String(row.pincode)&&norm(t.office_name)===norm(row.office_name));
      if(found){bump('city_pincodes','matched');continue}
      bump('city_pincodes','inserted');
      if(APPLY)await insertCommon(local,target,'city_pincodes',row,{exclude:['city_id'],overrides:{city_id:cityId}});
    }

    const localIndiaPins=await all(local,'india_pincodes','pincode');
    const targetIndiaPins=await all(target,'india_pincodes','pincode');
    const targetPinSet=new Set(targetIndiaPins.map(r=>String(r.pincode)));
    for(const row of localIndiaPins){
      if(targetPinSet.has(String(row.pincode))){bump('india_pincodes','matched');continue}
      const stateId=row.state_id==null?null:need(stateMap,row.state_id,'india_pincodes.state_id',true);
      bump('india_pincodes','inserted');
      if(APPLY)await insertCommon(local,target,'india_pincodes',row,{exclude:['state_id'],overrides:{state_id:stateId},returning:null});
    }

    const localUsers=await all(local,'users');
    const targetUsers=await all(target,'users');
    const userMap=new Map();
    for(const row of localUsers){
      const existing=targetUsers.find(t=>norm(t.email)===norm(row.email));
      if(existing){userMap.set(Number(row.id),Number(existing.id));bump('users','matched');continue}
      bump('users','inserted');
      if(!APPLY){userMap.set(Number(row.id),fakeId(row.id));continue}
      const id=await insertCommon(local,target,'users',row,{exclude:['supabase_user_id']});
      userMap.set(Number(row.id),Number(id));targetUsers.push({...row,id});
    }

    const localProfiles=await all(local,'business_profiles');
    const targetProfiles=await all(target,'business_profiles');
    const profileMap=new Map();
    for(const row of localProfiles){
      const userId=need(userMap,row.user_id,'business_profiles.user_id');
      const existing=userId>0?targetProfiles.find(t=>t.user_id===userId):null;
      if(existing){profileMap.set(Number(row.id),Number(existing.id));bump('business_profiles','matched');continue}
      bump('business_profiles','inserted');
      if(!APPLY){profileMap.set(Number(row.id),fakeId(row.id));continue}
      const id=await insertCommon(local,target,'business_profiles',row,{exclude:['user_id'],overrides:{user_id:userId}});
      profileMap.set(Number(row.id),Number(id));targetProfiles.push({...row,id,user_id:userId});
    }

    const localBps=await all(local,'business_profile_services');
    const targetBps=await all(target,'business_profile_services');
    for(const row of localBps){
      const ids={
        business_profile_id:need(profileMap,row.business_profile_id,'business_profile_services.business_profile_id'),
        industry_id:need(industryMap,row.industry_id,'business_profile_services.industry_id'),
        service_id:need(serviceMap,row.service_id,'business_profile_services.service_id'),
        subservice_id:need(subserviceMap,row.subservice_id,'business_profile_services.subservice_id',true)
      };
      const found=Object.values(ids).every(v=>v==null||v>0)&&targetBps.find(t=>t.business_profile_id===ids.business_profile_id&&t.industry_id===ids.industry_id&&t.service_id===ids.service_id&&(t.subservice_id??null)===(ids.subservice_id??null));
      if(found){bump('business_profile_services','matched');continue}
      bump('business_profile_services','inserted');
      if(APPLY)await insertCommon(local,target,'business_profile_services',row,{exclude:Object.keys(ids),overrides:ids});
    }

    const localBpl=await all(local,'business_profile_locations');
    const targetBpl=await all(target,'business_profile_locations');
    for(const row of localBpl){
      const ids={
        business_profile_id:need(profileMap,row.business_profile_id,'business_profile_locations.business_profile_id'),
        state_id:need(stateMap,row.state_id,'business_profile_locations.state_id'),
        city_id:need(cityMap,row.city_id,'business_profile_locations.city_id'),
        subcity_id:need(subcityMap,row.subcity_id,'business_profile_locations.subcity_id',true)
      };
      const found=ids.business_profile_id>0&&ids.state_id>0&&ids.city_id>0&&targetBpl.find(t=>t.business_profile_id===ids.business_profile_id&&t.state_id===ids.state_id&&t.city_id===ids.city_id);
      if(found){bump('business_profile_locations','matched');continue}
      bump('business_profile_locations','inserted');
      if(APPLY)await insertCommon(local,target,'business_profile_locations',row,{exclude:Object.keys(ids),overrides:ids});
    }

    const localPartners=await all(local,'lead_partners');
    const targetPartners=await all(target,'lead_partners');
    const partnerMap=new Map();
    for(const row of localPartners){
      const userId=need(userMap,row.user_id,'lead_partners.user_id');
      const existing=userId>0?targetPartners.find(t=>t.user_id===userId):null;
      if(existing){partnerMap.set(Number(row.id),Number(existing.id));bump('lead_partners','matched');continue}
      bump('lead_partners','inserted');
      if(!APPLY){partnerMap.set(Number(row.id),fakeId(row.id));continue}
      const id=await insertCommon(local,target,'lead_partners',row,{exclude:['user_id'],overrides:{user_id:userId}});
      partnerMap.set(Number(row.id),Number(id));targetPartners.push({...row,id,user_id:userId});
    }

    const localAdminSheets=await all(local,'admin_google_sheet_connections');
    const targetAdminSheets=await all(target,'admin_google_sheet_connections');
    for(const row of localAdminSheets){
      const existing=targetAdminSheets.find(t=>String(t.spreadsheet_id)===String(row.spreadsheet_id)&&String(t.gid)===String(row.gid));
      if(existing){bump('admin_google_sheet_connections','matched');continue}
      const createdBy=need(userMap,row.created_by,'admin_google_sheet_connections.created_by',true);
      bump('admin_google_sheet_connections','inserted');
      if(APPLY)await insertCommon(local,target,'admin_google_sheet_connections',row,{exclude:['created_by'],overrides:{created_by:createdBy}});
    }

    const localPartnerSheets=await all(local,'lead_partner_sheet_connections');
    const targetPartnerSheets=await all(target,'lead_partner_sheet_connections');
    for(const row of localPartnerSheets){
      const userId=need(userMap,row.user_id,'lead_partner_sheet_connections.user_id');
      const existing=userId>0&&targetPartnerSheets.find(t=>t.user_id===userId&&String(t.spreadsheet_id)===String(row.spreadsheet_id)&&String(t.gid)===String(row.gid));
      if(existing){bump('lead_partner_sheet_connections','matched');continue}
      const defaultIndustryId=need(industryMap,row.default_industry_id,'lead_partner_sheet_connections.default_industry_id',true);
      bump('lead_partner_sheet_connections','inserted');
      if(APPLY)await insertCommon(local,target,'lead_partner_sheet_connections',row,{exclude:['user_id','default_industry_id'],overrides:{user_id:userId,default_industry_id:defaultIndustryId}});
    }

    const localLeads=await all(local,'leads');
    const targetLeads=await all(target,'leads');
    for(const row of localLeads){
      const existing=targetLeads.find(t=>{
        if(row.intake_submission_key&&t.intake_submission_key)return String(t.intake_submission_key)===String(row.intake_submission_key);
        return norm(t.customer_email)===norm(row.customer_email)&&String(t.customer_phone||'')===String(row.customer_phone||'')&&String(t.created_at||'')===String(row.created_at||'');
      });
      if(existing){bump('leads','matched');continue}
      const ids={
        industry_id:need(industryMap,row.industry_id,'leads.industry_id'),
        service_id:need(serviceMap,row.service_id,'leads.service_id'),
        subservice_id:need(subserviceMap,row.subservice_id,'leads.subservice_id',true),
        state_id:need(stateMap,row.state_id,'leads.state_id'),
        city_id:need(cityMap,row.city_id,'leads.city_id'),
        subcity_id:need(subcityMap,row.subcity_id,'leads.subcity_id',true),
        created_by:need(userMap,row.created_by,'leads.created_by',true),
        investor_user_id:need(userMap,row.investor_user_id,'leads.investor_user_id',true),
        lead_partner_id:need(partnerMap,row.lead_partner_id,'leads.lead_partner_id',true),
        quality_gate_reviewed_by:need(userMap,row.quality_gate_reviewed_by,'leads.quality_gate_reviewed_by',true),
        cycle_id:null
      };
      if(row.cycle_id!=null)warnings.push('Lead '+row.id+' has cycle_id '+row.cycle_id+'; investment cycles are not part of core migration, so cycle_id will be NULL.');
      bump('leads','inserted');
      if(APPLY)await insertCommon(local,target,'leads',row,{exclude:Object.keys(ids),overrides:ids});
    }

    if(APPLY){await target.query('COMMIT');inTx=false}
    console.log('\n=== Core migration summary ===');
    for(const [table,s] of stats)console.log(table+': matched='+s.matched+' '+(APPLY?'inserted=':'would_insert=')+s.inserted);
    if(warnings.length){console.log('\nWarnings:');for(const w of warnings)console.log('- '+w)}
    console.log(APPLY?'\nCore migration committed successfully.':'\nDry run complete. No database rows were changed. Re-run with --apply only after a verified target backup.');
  }catch(error){
    if(inTx)await target.query('ROLLBACK').catch(()=>{});
    throw error;
  }finally{
    await Promise.allSettled([local.end(),target.end()]);
  }
}
migrate().catch(error=>{console.error(error.stack||error);process.exitCode=1});
