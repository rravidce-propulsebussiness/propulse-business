require('dotenv').config({quiet:true});
const fs=require('fs/promises');
const path=require('path');
const pool=require('../src/config/database');
const privateProofStorage=require('../src/services/privateProofStorageService');
const companyProofStorage=require('../src/services/companyProofStorageService');
const s3=require('../src/services/s3PrivateObjectStorageService');
const {companyProofRoot}=require('../src/config/uploadStorage');

const APPLY=process.argv.includes('--apply');
const MAX_BYTES=6*1024*1024;
const targets=[
  {table:'payments',column:'proof_url'},
  {table:'wallet_topups',column:'proof_url'},
  {table:'lead_partner_payout_requests',column:'proof_url'},
  {table:'investor_payout_requests',column:'proof_url'},
  {table:'investments',column:'payout_proof_url'}
];

function localCategory(reference){
  const raw=String(reference||'');
  if(!raw.startsWith(privateProofStorage.PREFIX))return'proof';
  return String(raw.slice(privateProofStorage.PREFIX.length).split('/')[0]||'proof').replace(/[^a-z0-9_-]/gi,'-');
}
async function migrateProofReference(target,reference){
  const dataUrl=await privateProofStorage.materializeProof(reference,{maxBytes:MAX_BYTES});
  const next=await privateProofStorage.storeDataUrl(dataUrl,{category:localCategory(reference),maxBytes:MAX_BYTES});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const result=await client.query('UPDATE '+target.table+' SET '+target.column+'=$1 WHERE '+target.column+'=$2',[next,reference]);
    await client.query('COMMIT');
    await privateProofStorage.removeStoredProof(reference);
    return result.rowCount;
  }catch(error){
    await client.query('ROLLBACK');
    await privateProofStorage.removeStoredProof(next).catch(()=>{});
    throw error;
  }finally{client.release()}
}
async function migrateCompanyProof(row){
  const stored=String(row.stored_name||'');
  if(!stored||s3.isReference(stored))return 0;
  const safeName=path.basename(stored);
  if(safeName!==stored)throw new Error('Unsafe legacy company proof filename: '+stored);
  const filePath=path.join(companyProofRoot,safeName);
  const buffer=await fs.readFile(filePath);
  if(!buffer.length||buffer.length>5*1024*1024)throw new Error('Legacy company proof has invalid size: '+stored);
  const extension=path.extname(safeName)||((row.mime_type||'').includes('pdf')?'.pdf':(row.mime_type||'').includes('png')?'.png':'.jpg');
  const next=await companyProofStorage.storeBuffer({userId:row.user_id,buffer,mimeType:row.mime_type,extension});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const result=await client.query('UPDATE company_proof_documents SET stored_name=$1,file_url=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 AND stored_name=$4',[next,'/api/auth/company-proofs/'+row.id,row.id,stored]);
    if(result.rowCount!==1)throw new Error('Company proof changed while migrating: '+row.id);
    await client.query('COMMIT');
    await companyProofStorage.remove(stored);
    return 1;
  }catch(error){
    await client.query('ROLLBACK');
    await companyProofStorage.remove(next).catch(()=>{});
    throw error;
  }finally{client.release()}
}
async function run(){
  if(!s3.isEnabled())throw new Error('Set PRIVATE_OBJECT_STORAGE_DRIVER=s3 and configure the S3-compatible bucket before running this migration.');
  s3.config();
  let localProofRefs=0,companyFiles=0,migratedRows=0;

  for(const target of targets){
    const tableExists=(await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1) AS exists",
      [target.table]
    )).rows[0]?.exists;
    if(!tableExists){
      console.log(target.table+'.'+target.column+': skipped (table does not exist)');
      continue;
    }
    const columnExists=(await pool.query(
      "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2) AS exists",
      [target.table,target.column]
    )).rows[0]?.exists;
    if(!columnExists){
      console.log(target.table+'.'+target.column+': skipped (column does not exist)');
      continue;
    }
    const rows=(await pool.query("SELECT DISTINCT "+target.column+" AS reference FROM "+target.table+" WHERE "+target.column+" LIKE 'private-proof:%' ORDER BY "+target.column)).rows;
    localProofRefs+=rows.length;
    console.log(target.table+'.'+target.column+':',rows.length,'legacy private reference(s)');
    if(APPLY){
      for(const row of rows){
        const changed=await migrateProofReference(target,row.reference);
        migratedRows+=changed;
        console.log(' migrated',target.table,target.column,row.reference,'rows=',changed);
      }
    }
  }

  const companyRows=(await pool.query("SELECT id,user_id,stored_name,mime_type,file_size FROM company_proof_documents WHERE stored_name NOT LIKE 'private-object-s3:%' ORDER BY id")).rows;
  companyFiles=companyRows.length;
  console.log('company_proof_documents:',companyFiles,'legacy local file(s)');
  if(APPLY){
    for(const row of companyRows){
      migratedRows+=await migrateCompanyProof(row);
      console.log(' migrated company proof #'+row.id);
    }
  }

  console.log(APPLY?'Private upload migration completed.':'Dry run only. Re-run with --apply to migrate files.');
  console.log('Legacy private references:',localProofRefs,'Company files:',companyFiles,'Rows updated:',migratedRows);
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1}).finally(()=>pool.end());
