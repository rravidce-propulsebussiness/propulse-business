require('dotenv').config({quiet:true});

const target=String(process.env.MIGRATION_TARGET_DATABASE_URL||'').trim();
if(!target)throw new Error('MIGRATION_TARGET_DATABASE_URL is required');

const parsed=new URL(target);
if(!/\.pooler\.supabase\.com$/i.test(parsed.hostname)){
  throw new Error('MIGRATION_TARGET_DATABASE_URL must point to a Supabase pooler host');
}

process.env.DATABASE_URL=target;

const {createDatabaseBackup}=require('./database-backup');
const {sourceDbConfig}=require('./backup-common');

createDatabaseBackup()
  .then(result=>{
    const source=sourceDbConfig();
    console.log('Supabase target backup created and checksummed.');
    console.log('Source:',source.host+'/'+source.database+' as '+source.user);
    console.log('Dump:',result.dumpPath);
    console.log('Manifest:',result.manifestPath);
    console.log('SHA-256:',result.manifest.artifact.sha256);
  })
  .catch(error=>{
    console.error(error.stack||error);
    process.exitCode=1;
  });
