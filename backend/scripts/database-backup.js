const fs=require('fs');
const path=require('path');
const {
  sourceDbConfig,nodeClientConfig,cliEnv,pgArgs,runCommand,timestamp,buildCommit,
  ensurePrivateDirectory,sha256File,snapshotMetrics,backupRoot
}=require('./backup-common');
const {Client}=require('pg');

function optionValue(name){
  const prefix='--'+name+'=';
  const item=process.argv.slice(2).find(value=>value.startsWith(prefix));
  return item?item.slice(prefix.length):null;
}
async function createDatabaseBackup({outputDirectory=null}={}){
  const config=sourceDbConfig();
  const root=await ensurePrivateDirectory(path.resolve(outputDirectory||optionValue('output-dir')||path.join(backupRoot(),'database')));
  const stamp=timestamp();
  const commit=buildCommit().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,24);
  const base=`propulse-db-${stamp}-${commit}`;
  const dumpPath=path.join(root,base+'.dump');
  const partialDump=dumpPath+'.partial';
  const manifestPath=path.join(root,base+'.json');
  const client=new Client(nodeClientConfig(config));
  let inTransaction=false;
  try{
    await client.connect();
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    inTransaction=true;
    const snapshot=(await client.query('SELECT pg_export_snapshot() AS snapshot')).rows[0]?.snapshot;
    if(!snapshot)throw new Error('PostgreSQL did not provide an exportable backup snapshot');

    const pgDump=String(process.env.PG_DUMP_BIN||'pg_dump').trim();
    await runCommand(pgDump,[
      ...pgArgs(config),
      '--format=custom',
      '--compress=6',
      '--no-owner',
      '--no-privileges',
      '--snapshot',snapshot,
      '--file',partialDump
    ],{env:cliEnv(config)});

    const metrics=await snapshotMetrics(client);
    await client.query('COMMIT');
    inTransaction=false;
    await client.end();

    await fs.promises.rename(partialDump,dumpPath);
    await fs.promises.chmod(dumpPath,0o600).catch(()=>{});
    const stat=await fs.promises.stat(dumpPath);
    if(stat.size<=0)throw new Error('Database backup file is empty');
    const sha256=await sha256File(dumpPath);
    const manifest={
      version:1,
      createdAt:new Date().toISOString(),
      buildCommit:buildCommit(),
      artifact:{file:path.basename(dumpPath),bytes:stat.size,sha256},
      metrics
    };
    const partialManifest=manifestPath+'.partial';
    await fs.promises.writeFile(partialManifest,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
    await fs.promises.rename(partialManifest,manifestPath);
    return{dumpPath,manifestPath,manifest};
  }catch(error){
    if(inTransaction)await client.query('ROLLBACK').catch(()=>{});
    await client.end().catch(()=>{});
    await fs.promises.unlink(partialDump).catch(()=>{});
    throw error;
  }
}

if(require.main===module){
  createDatabaseBackup()
    .then(result=>{
      const source=sourceDbConfig();
      console.log('Database backup created and checksummed.');
      console.log('Source:',source.host+'/'+source.database+' as '+source.user);
      console.log('Dump:',result.dumpPath);
      console.log('Manifest:',result.manifestPath);
      console.log('SHA-256:',result.manifest.artifact.sha256);
    })
    .catch(error=>{console.error(error.stack||error);process.exitCode=1});
}

module.exports={createDatabaseBackup};
