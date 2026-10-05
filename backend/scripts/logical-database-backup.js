const fs=require('fs');
const path=require('path');
const zlib=require('zlib');
const {promisify}=require('util');
const {Client}=require('pg');
const {
  sourceDbConfig,nodeClientConfig,timestamp,buildCommit,ensurePrivateDirectory,sha256File,snapshotMetrics,backupRoot
}=require('./backup-common');

const gzip=promisify(zlib.gzip);
const DEFAULT_MAX_RAW_BYTES=512*1024*1024;
const DEFAULT_MAX_TABLE_JSON_BYTES=128*1024*1024;
const FORMAT='propulse-logical-json-v1';

function optionValue(name){
  const prefix='--'+name+'=';
  const item=process.argv.slice(2).find(value=>value.startsWith(prefix));
  return item?item.slice(prefix.length):null;
}
function quoteIdentifier(value){return '"'+String(value).replace(/"/g,'""')+'"'}
function safeLimit(value,fallback,min,max){
  const n=Number(value);
  return Math.min(max,Math.max(min,Number.isFinite(n)?n:fallback));
}
function maxRawBytes(){return safeLimit(process.env.DATABASE_LOGICAL_BACKUP_MAX_RAW_BYTES,DEFAULT_MAX_RAW_BYTES,16*1024*1024,1024*1024*1024)}
function maxTableJsonBytes(){return safeLimit(process.env.DATABASE_LOGICAL_BACKUP_MAX_TABLE_JSON_BYTES,DEFAULT_MAX_TABLE_JSON_BYTES,8*1024*1024,512*1024*1024)}
async function listTables(client){
  return (await client.query(`
    SELECT table_name
      FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'
     ORDER BY table_name
  `)).rows.map(row=>String(row.table_name));
}
async function tableColumns(client,tableName){
  return (await client.query(`
    SELECT column_name,is_identity,identity_generation,is_generated
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1
     ORDER BY ordinal_position
  `,[tableName])).rows.map(row=>({
    name:String(row.column_name),
    identity:String(row.is_identity||'NO')==='YES',
    identityGeneration:row.identity_generation||null,
    generated:String(row.is_generated||'NEVER')!=='NEVER'
  }));
}
async function snapshotTable(client,tableName){
  const columns=await tableColumns(client,tableName);
  const writable=columns.filter(column=>!column.generated);
  const sql=`SELECT COUNT(*)::text AS row_count,
                    COALESCE(jsonb_agg(to_jsonb(t)),'[]'::jsonb)::text AS rows_json
               FROM public.${quoteIdentifier(tableName)} t`;
  const row=(await client.query(sql)).rows[0]||{row_count:'0',rows_json:'[]'};
  const rowsJson=String(row.rows_json||'[]');
  if(Buffer.byteLength(rowsJson,'utf8')>maxTableJsonBytes()){
    throw Object.assign(new Error(`Logical backup table public.${tableName} exceeds the configured per-table JSON limit`),{code:'DATABASE_LOGICAL_BACKUP_TABLE_TOO_LARGE'});
  }
  return{
    schema:'public',
    name:tableName,
    rowCount:String(row.row_count||'0'),
    columns:writable.map(column=>column.name),
    hasIdentity:writable.some(column=>column.identity),
    rowsJson
  };
}
async function listSequences(client){
  const sequences=(await client.query(`
    SELECT sequence_name
      FROM information_schema.sequences
     WHERE sequence_schema='public'
     ORDER BY sequence_name
  `)).rows.map(row=>String(row.sequence_name));
  const out=[];
  for(const name of sequences){
    const row=(await client.query(`SELECT last_value::text AS last_value,is_called FROM public.${quoteIdentifier(name)}`)).rows[0];
    out.push({schema:'public',name,lastValue:String(row?.last_value||'1'),isCalled:Boolean(row?.is_called)});
  }
  return out;
}
async function createLogicalDatabaseBackup({outputDirectory=null}={}){
  const config=sourceDbConfig();
  const root=await ensurePrivateDirectory(path.resolve(outputDirectory||optionValue('output-dir')||path.join(backupRoot(),'database-logical')));
  const stamp=timestamp();
  const commit=buildCommit().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,24);
  const base=`propulse-db-${stamp}-${commit}.logical`;
  const dumpPath=path.join(root,base+'.json.gz');
  const manifestPath=path.join(root,base+'.manifest.json');
  const client=new Client(nodeClientConfig(config));
  let inTransaction=false;
  try{
    await client.connect();
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    inTransaction=true;
    const tables=[];
    const tableNames=await listTables(client);
    let totalRows=0n;
    for(const tableName of tableNames){
      const snapshot=await snapshotTable(client,tableName);
      tables.push(snapshot);
      totalRows+=BigInt(snapshot.rowCount);
    }
    const sequences=await listSequences(client);
    const metrics=await snapshotMetrics(client);
    await client.query('COMMIT');
    inTransaction=false;
    await client.end();

    const snapshot={
      version:1,
      format:FORMAT,
      createdAt:new Date().toISOString(),
      buildCommit:buildCommit(),
      schema:'public',
      tables,
      sequences,
      metrics
    };
    const raw=Buffer.from(JSON.stringify(snapshot),'utf8');
    if(raw.length>maxRawBytes())throw Object.assign(new Error('Logical database backup exceeds the configured raw snapshot size limit'),{code:'DATABASE_LOGICAL_BACKUP_TOO_LARGE'});
    const compressed=await gzip(raw,{level:6});
    await fs.promises.writeFile(dumpPath,compressed,{mode:0o600});
    const sha256=await sha256File(dumpPath);
    const manifest={
      version:1,
      format:FORMAT,
      createdAt:snapshot.createdAt,
      buildCommit:snapshot.buildCommit,
      artifact:{file:path.basename(dumpPath),bytes:compressed.length,sha256,rawBytes:raw.length},
      snapshot:{schema:'public',tableCount:tables.length,totalRows:totalRows.toString(),sequenceCount:sequences.length},
      metrics
    };
    await fs.promises.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});
    return{dumpPath,manifestPath,manifest,format:FORMAT};
  }catch(error){
    if(inTransaction)await client.query('ROLLBACK').catch(()=>{});
    await client.end().catch(()=>{});
    await fs.promises.unlink(dumpPath).catch(()=>{});
    await fs.promises.unlink(manifestPath).catch(()=>{});
    throw error;
  }
}

if(require.main===module){
  createLogicalDatabaseBackup()
    .then(result=>{
      console.log('Logical database backup created and checksummed.');
      console.log('Dump:',result.dumpPath);
      console.log('Manifest:',result.manifestPath);
      console.log('SHA-256:',result.manifest.artifact.sha256);
      console.log('Tables:',result.manifest.snapshot.tableCount,'Rows:',result.manifest.snapshot.totalRows);
    })
    .catch(error=>{console.error(error.stack||error);process.exitCode=1});
}

module.exports={
  FORMAT,DEFAULT_MAX_RAW_BYTES,DEFAULT_MAX_TABLE_JSON_BYTES,maxRawBytes,maxTableJsonBytes,
  listTables,tableColumns,snapshotTable,listSequences,createLogicalDatabaseBackup
};
