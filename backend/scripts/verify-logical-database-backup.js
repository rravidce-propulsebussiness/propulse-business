const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const crypto=require('crypto');
const {promisify}=require('util');
const {spawnSync}=require('child_process');
const {Client}=require('pg');
const {createLogicalDatabaseBackup,FORMAT}=require('./logical-database-backup');
const {
  restoreDbConfig,nodeClientConfig,sha256File,snapshotMetrics,compareMetrics
}=require('./backup-common');

const gunzip=promisify(zlib.gunzip);

function optionValue(name){
  const prefix='--'+name+'=';
  const item=process.argv.slice(2).find(value=>value.startsWith(prefix));
  return item?item.slice(prefix.length):null;
}
function quoteIdentifier(value){return '"'+String(value).replace(/"/g,'""')+'"'}
function assertIdentifier(value,label){
  const text=String(value||'');
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(text))throw new Error(`Invalid ${label} in logical backup`);
  return text;
}
function tempDatabaseName(){
  return `propulse_logical_restore_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`.slice(0,63);
}
async function loadLogicalBackup(){
  const explicit=optionValue('manifest')||String(process.env.LOGICAL_BACKUP_MANIFEST||'').trim();
  if(!explicit)return createLogicalDatabaseBackup();
  const manifestPath=path.resolve(explicit);
  const manifest=JSON.parse(await fs.promises.readFile(manifestPath,'utf8'));
  const dumpPath=path.resolve(path.dirname(manifestPath),String(manifest?.artifact?.file||''));
  return{manifestPath,dumpPath,manifest,format:manifest?.format};
}
async function readSnapshot(backup){
  if(backup.manifest?.format!==FORMAT)throw new Error('Logical backup manifest format is unsupported');
  const stat=await fs.promises.stat(backup.dumpPath);
  if(!stat.isFile()||stat.size<=0)throw new Error('Logical backup artifact is empty');
  if(Number(backup.manifest?.artifact?.bytes)!==stat.size)throw new Error('Logical backup artifact size does not match its manifest');
  const hash=await sha256File(backup.dumpPath);
  if(hash!==backup.manifest?.artifact?.sha256)throw new Error('Logical backup SHA-256 does not match its manifest');
  const compressed=await fs.promises.readFile(backup.dumpPath);
  const raw=await gunzip(compressed);
  if(backup.manifest?.artifact?.rawBytes!=null&&Number(backup.manifest.artifact.rawBytes)!==raw.length){
    throw new Error('Logical backup raw byte size does not match its manifest');
  }
  const snapshot=JSON.parse(raw.toString('utf8'));
  if(snapshot?.format!==FORMAT||snapshot?.version!==1||!Array.isArray(snapshot?.tables)||!Array.isArray(snapshot?.sequences)){
    throw new Error('Logical backup snapshot is invalid');
  }
  return{snapshot,hash,size:stat.size};
}
function targetEnv(target,tempDb){
  return{
    ...process.env,
    DATABASE_URL:'',
    DB_HOST:target.host,
    DB_PORT:String(target.port),
    DB_NAME:tempDb,
    DB_USER:target.user,
    DB_PASSWORD:target.password,
    DB_SSL:target.ssl?'true':'false',
    DB_SSL_REJECT_UNAUTHORIZED:target.sslRejectUnauthorized?'true':'false',
    RUN_MIGRATIONS_ON_STARTUP:'false'
  };
}
function bootstrapTarget(target,tempDb){
  const script=path.resolve(__dirname,'../src/database/bootstrapDatabase.js');
  const result=spawnSync(process.execPath,[script],{
    env:targetEnv(target,tempDb),
    encoding:'utf8',
    maxBuffer:10*1024*1024
  });
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error('Logical restore target bootstrap failed: '+String(result.stderr||result.stdout||'').slice(-4000));
}
async function restoreTable(client,table){
  const schema=assertIdentifier(table.schema||'public','schema');
  const name=assertIdentifier(table.name,'table');
  const columns=(table.columns||[]).map(column=>assertIdentifier(column,'column'));
  if(!columns.length||String(table.rowCount||'0')==='0')return;
  const qcols=columns.map(quoteIdentifier).join(',');
  const override=table.hasIdentity?' OVERRIDING SYSTEM VALUE':'';
  const sql=`INSERT INTO ${quoteIdentifier(schema)}.${quoteIdentifier(name)} (${qcols})${override}
             SELECT ${qcols}
               FROM jsonb_populate_recordset(NULL::${quoteIdentifier(schema)}.${quoteIdentifier(name)},$1::jsonb)`;
  await client.query(sql,[String(table.rowsJson||'[]')]);
}
async function restoreLogicalSnapshot(client,snapshot){
  const tableNames=snapshot.tables.map(table=>{
    const schema=assertIdentifier(table.schema||'public','schema');
    const name=assertIdentifier(table.name,'table');
    return `${quoteIdentifier(schema)}.${quoteIdentifier(name)}`;
  });
  await client.query('BEGIN');
  try{
    await client.query("SET LOCAL session_replication_role='replica'");
    if(tableNames.length)await client.query(`TRUNCATE TABLE ${tableNames.join(',')} RESTART IDENTITY CASCADE`);
    for(const table of snapshot.tables)await restoreTable(client,table);
    for(const sequence of snapshot.sequences){
      const schema=assertIdentifier(sequence.schema||'public','sequence schema');
      const name=assertIdentifier(sequence.name,'sequence');
      await client.query('SELECT setval($1::regclass,$2::bigint,$3::boolean)',[
        `${schema}.${name}`,String(sequence.lastValue||'1'),Boolean(sequence.isCalled)
      ]);
    }
    await client.query('COMMIT');
  }catch(error){
    await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }
}
async function verifyTableCounts(client,snapshot){
  const mismatches=[];
  for(const table of snapshot.tables){
    const schema=assertIdentifier(table.schema||'public','schema');
    const name=assertIdentifier(table.name,'table');
    const actual=(await client.query(`SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier(name)}`)).rows[0]?.count||'0';
    if(String(actual)!==String(table.rowCount||'0'))mismatches.push(`${schema}.${name}`);
  }
  return mismatches;
}
async function verifyLogicalDatabaseBackup(){
  let backup=null;
  let maintenance=null;
  let tempDb=null;
  try{
    backup=await loadLogicalBackup();
    const loaded=await readSnapshot(backup);
    const target=restoreDbConfig();
    const maintenanceDb=String(process.env.RESTORE_VERIFY_MAINTENANCE_DB||'postgres').trim()||'postgres';
    tempDb=tempDatabaseName();
    maintenance=new Client(nodeClientConfig(target,maintenanceDb));
    await maintenance.connect();
    await maintenance.query(`CREATE DATABASE ${quoteIdentifier(tempDb)} TEMPLATE template0`);
    bootstrapTarget(target,tempDb);

    const restored=new Client(nodeClientConfig(target,tempDb));
    await restored.connect();
    try{
      await restoreLogicalSnapshot(restored,loaded.snapshot);
      const rowMismatches=await verifyTableCounts(restored,loaded.snapshot);
      const restoredMetrics=await snapshotMetrics(restored);
      const metricMismatches=compareMetrics(loaded.snapshot.metrics,restoredMetrics);
      if(rowMismatches.length||metricMismatches.length){
        throw new Error('Logical restore verification mismatch: tables='+rowMismatches.join(',')+' metrics='+metricMismatches.join(','));
      }
    }finally{
      await restored.end().catch(()=>{});
    }

    await maintenance.query(`DROP DATABASE ${quoteIdentifier(tempDb)} WITH (FORCE)`);
    tempDb=null;
    console.log('Logical database backup restore verification passed.');
    console.log('Verified artifact:',backup.dumpPath);
    console.log('Tables:',loaded.snapshot.tables.length,'Sequences:',loaded.snapshot.sequences.length);
    return{verified:true,artifact:backup.dumpPath,sha256:loaded.hash,size:loaded.size};
  }finally{
    if(maintenance&&tempDb)await maintenance.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(tempDb)} WITH (FORCE)`).catch(()=>{});
    if(maintenance)await maintenance.end().catch(()=>{});
  }
}

if(require.main===module){
  verifyLogicalDatabaseBackup().catch(error=>{console.error(error.stack||error);process.exitCode=1});
}

module.exports={
  loadLogicalBackup,readSnapshot,restoreLogicalSnapshot,restoreTable,verifyTableCounts,verifyLogicalDatabaseBackup
};
