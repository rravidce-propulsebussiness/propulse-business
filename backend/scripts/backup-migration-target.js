require('dotenv').config({quiet:true});
const {Client}=require('pg');

async function main(){
  const target=String(process.env.MIGRATION_TARGET_DATABASE_URL||'').trim();
  if(!target)throw new Error('MIGRATION_TARGET_DATABASE_URL is required');

  const parsed=new URL(target);
  if(!/\.pooler\.supabase\.com$/i.test(parsed.hostname)){
    throw new Error('MIGRATION_TARGET_DATABASE_URL must point to a Supabase pooler host');
  }

  process.env.DATABASE_URL=target;

  const probe=new Client({
    connectionString:target,
    ssl:{rejectUnauthorized:false},
    application_name:'propulse-target-backup-probe'
  });
  await probe.connect();
  try{
    const row=(await probe.query('select current_database() as db,current_user as db_user')).rows[0];
    console.log('Backup target confirmed:',parsed.hostname+'/'+row.db+' as '+row.db_user);
  }finally{
    await probe.end();
  }

  const {createDatabaseBackup}=require('./database-backup');
  const {sourceDbConfig}=require('./backup-common');
  const source=sourceDbConfig();
  if(source.host!==parsed.hostname)throw new Error('Backup source mismatch: expected '+parsed.hostname+' but resolved '+source.host);

  const result=await createDatabaseBackup();
  console.log('Supabase target backup created and checksummed.');
  console.log('Source:',source.host+'/'+source.database+' as '+source.user);
  console.log('Dump:',result.dumpPath);
  console.log('Manifest:',result.manifestPath);
  console.log('SHA-256:',result.manifest.artifact.sha256);
}

main().catch(error=>{
  console.error(error.stack||error);
  process.exitCode=1;
});
