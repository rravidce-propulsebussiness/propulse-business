require('dotenv').config({quiet:true});
const fs=require('fs');
const path=require('path');
const {
  sourceDbConfig,cliEnv,pgArgs,runCommand,timestamp,buildCommit,
  ensurePrivateDirectory,sha256File,backupRoot
}=require('./backup-common');

async function main(){
  const target=String(process.env.MIGRATION_TARGET_DATABASE_URL||'').trim();
  if(!target)throw new Error('MIGRATION_TARGET_DATABASE_URL is required');

  const parsed=new URL(target);
  if(!/\.pooler\.supabase\.com$/i.test(parsed.hostname)){
    throw new Error('MIGRATION_TARGET_DATABASE_URL must point to a Supabase pooler host');
  }

  process.env.DATABASE_URL=target;
  const source=sourceDbConfig();
  if(source.host!==parsed.hostname){
    throw new Error('Backup source mismatch: expected '+parsed.hostname+' but resolved '+source.host);
  }

  const root=await ensurePrivateDirectory(path.resolve(path.join(backupRoot(),'database')));
  const stamp=timestamp();
  const commit=buildCommit().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,24);
  const base='propulse-supabase-pre-migration-'+stamp+'-'+commit;
  const dumpPath=path.join(root,base+'.dump');
  const partialPath=dumpPath+'.partial';

  console.log('Backup target confirmed:',source.host+'/'+source.database+' as '+source.user);
  console.log('Running pg_dump...');

  try{
    const pgDump=String(process.env.PG_DUMP_BIN||'pg_dump').trim();
    await runCommand(pgDump,[
      ...pgArgs(source),
      '--format=custom',
      '--compress=6',
      '--no-owner',
      '--no-privileges',
      '--file',partialPath
    ],{env:cliEnv(source)});

    const stat=await fs.promises.stat(partialPath);
    if(stat.size<=0)throw new Error('Supabase backup file is empty');
    await fs.promises.rename(partialPath,dumpPath);
    await fs.promises.chmod(dumpPath,0o600).catch(()=>{});
    const sha256=await sha256File(dumpPath);

    console.log('Supabase target backup created and checksummed.');
    console.log('Source:',source.host+'/'+source.database+' as '+source.user);
    console.log('Dump:',dumpPath);
    console.log('Bytes:',stat.size);
    console.log('SHA-256:',sha256);
  }catch(error){
    await fs.promises.unlink(partialPath).catch(()=>{});
    throw error;
  }
}

main().catch(error=>{
  console.error(error.stack||error);
  process.exitCode=1;
});
