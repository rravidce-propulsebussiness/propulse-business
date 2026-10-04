require('dotenv').config({quiet:true});
const {Client}=require('pg');

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
    application_name:'propulse-migration-audit-local'
  };
}
function targetConfig(){
  const raw=String(process.env.MIGRATION_TARGET_DATABASE_URL||'').trim();
  if(!raw)throw new Error('Set MIGRATION_TARGET_DATABASE_URL to the Supabase Session Pooler URL.');
  const u=new URL(raw);
  const isSupabase=/\.pooler\.supabase\.com$/i.test(u.hostname);
  return{
    host:u.hostname,
    port:Number(u.port)||5432,
    database:decodeURIComponent(u.pathname.replace(/^\//,'')),
    user:decodeURIComponent(u.username),
    password:decodeURIComponent(u.password),
    ssl:{rejectUnauthorized:isSupabase?false:true},
    application_name:'propulse-migration-audit-target'
  };
}
async function rows(client,sql,params=[]){return(await client.query(sql,params)).rows}
function key(v){return String(v??'').trim().toLowerCase()}
function compareByNaturalKey(name,localRows,targetRows,naturalKey){
  const targetByNatural=new Map(targetRows.map(r=>[naturalKey(r),r]));
  const targetById=new Map(targetRows.map(r=>[String(r.id),r]));
  let matches=0,missing=0,idCollisions=0;
  const collisionExamples=[];
  for(const row of localRows){
    const nk=naturalKey(row);
    if(targetByNatural.has(nk)){matches++;continue}
    missing++;
    const sameId=targetById.get(String(row.id));
    if(sameId){
      idCollisions++;
      if(collisionExamples.length<10)collisionExamples.push({local:row,target:sameId});
    }
  }
  return{name,local:localRows.length,target:targetRows.length,naturalKeyMatches:matches,missingInTarget:missing,idCollisions,collisionExamples};
}
async function main(){
  const local=new Client(localConfig());
  const target=new Client(targetConfig());
  await Promise.all([local.connect(),target.connect()]);
  try{
    const defs=[
      ['states',"SELECT id,name,code FROM states ORDER BY id",r=>key(r.code)||key(r.name)],
      ['industries',"SELECT id,name,slug FROM industries ORDER BY id",r=>key(r.slug)||key(r.name)],
      ['cities',"SELECT id,state_id,name,slug FROM cities ORDER BY id",r=>key(r.slug)||key(r.name)],
      ['services',"SELECT id,industry_id,name,slug FROM services ORDER BY id",r=>key(r.slug)||key(r.name)],
      ['subservices',"SELECT id,service_id,name,slug FROM subservices ORDER BY id",r=>key(r.slug)||key(r.name)],
      ['users',"SELECT id,name,email,role,supabase_user_id FROM users ORDER BY id",r=>key(r.email)]
    ];
    const summary=[];
    for(const [name,sql,naturalKey] of defs){
      const [l,t]=await Promise.all([rows(local,sql),rows(target,sql)]);
      summary.push(compareByNaturalKey(name,l,t,naturalKey));
    }
    console.log('\n=== Migration collision audit ===');
    for(const item of summary){
      console.log('\n'+item.name+': local='+item.local+' target='+item.target+' matches='+item.naturalKeyMatches+' missing='+item.missingInTarget+' idCollisions='+item.idCollisions);
      if(item.collisionExamples.length){
        console.log('ID collision examples:');
        console.table(item.collisionExamples.map(x=>({
          id:x.local.id,
          local:x.local.email||x.local.slug||x.local.code||x.local.name,
          target:x.target.email||x.target.slug||x.target.code||x.target.name
        })));
      }
    }
    const [localBusinesses,targetBusinesses,localPartners,targetPartners,localLeads,targetLeads]=await Promise.all([
      rows(local,"SELECT id,user_id,business_name FROM business_profiles ORDER BY id"),
      rows(target,"SELECT id,user_id,business_name FROM business_profiles ORDER BY id"),
      rows(local,"SELECT id,user_id,status FROM lead_partners ORDER BY id"),
      rows(target,"SELECT id,user_id,status FROM lead_partners ORDER BY id"),
      rows(local,"SELECT id,customer_name,customer_email,customer_phone,industry_id,service_id,subservice_id,state_id,city_id,subcity_id,lead_partner_id FROM leads ORDER BY id"),
      rows(target,"SELECT id,customer_name,customer_email,customer_phone,industry_id,service_id,subservice_id,state_id,city_id,subcity_id,lead_partner_id FROM leads ORDER BY id")
    ]);
    console.log('\n=== Identity-dependent rows (review only) ===');
    console.log('business_profiles local='+localBusinesses.length+' target='+targetBusinesses.length);
    console.table(localBusinesses);
    console.log('lead_partners local='+localPartners.length+' target='+targetPartners.length);
    console.table(localPartners);
    console.log('leads local='+localLeads.length+' target='+targetLeads.length);
    console.table(localLeads);
    console.log('\nAudit complete. No database rows were changed.');
  }finally{
    await Promise.allSettled([local.end(),target.end()]);
  }
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
