const fs=require('fs/promises');
const path=require('path');
const pool=require('../config/database');
const {companyProofRoot}=require('../config/uploadStorage');
const companyProofStorage=require('./companyProofStorageService');
const s3=require('./s3PrivateObjectStorageService');

const MAX_COMPANY_PROOF_BYTES=5*1024*1024;
const legacyDefaultCompanyProofRoot=path.resolve(__dirname,'../../uploads/company-proofs');

async function readLegacyCompanyProof(name){
  const roots=[...new Set([path.resolve(companyProofRoot),legacyDefaultCompanyProofRoot])];
  for(const root of roots){
    const candidate=path.join(root,name);
    try{return{buffer:await fs.readFile(candidate),filePath:candidate}}
    catch(error){if(error?.code!=='ENOENT')throw error}
  }
  return null;
}


function safeLegacyName(value){
  const raw=String(value||'');
  const name=path.basename(raw);
  if(!name||name!==raw)return null;
  return name;
}

async function migrateLegacyCompanyProofsToObjectStorage({limit=50}={}){
  if(!s3.isEnabled())return{enabled:false,found:0,migrated:0,missing:0,failed:0};

  const safeLimit=Math.min(200,Math.max(1,Number(limit)||50));
  const rows=(await pool.query(
    "SELECT id,user_id,stored_name,mime_type,file_size FROM company_proof_documents WHERE stored_name NOT LIKE 'private-object-s3:%' ORDER BY id LIMIT $1",
    [safeLimit]
  )).rows;

  const summary={enabled:true,found:rows.length,migrated:0,missing:0,failed:0};
  for(const row of rows){
    const legacyName=safeLegacyName(row.stored_name);
    if(!legacyName){summary.failed+=1;continue}
    let legacyFile;
    try{legacyFile=await readLegacyCompanyProof(legacyName)}catch{summary.failed+=1;continue}
    if(!legacyFile){summary.missing+=1;continue}
    const {buffer,filePath}=legacyFile;
    if(!buffer.length||buffer.length>MAX_COMPANY_PROOF_BYTES){summary.failed+=1;continue}

    const extension=path.extname(legacyName)||((row.mime_type||'').includes('pdf')?'.pdf':(row.mime_type||'').includes('png')?'.png':'.jpg');
    let nextReference=null;
    let committed=false;
    try{
      nextReference=await companyProofStorage.storeBuffer({
        userId:row.user_id,
        buffer,
        mimeType:row.mime_type,
        extension
      });
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        const result=await client.query(
          'UPDATE company_proof_documents SET stored_name=$1,file_url=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 AND stored_name=$4',
          [nextReference,'/api/auth/company-proofs/'+row.id,row.id,row.stored_name]
        );
        if(result.rowCount!==1)throw new Error('Legacy company proof changed during migration');
        await client.query('COMMIT');
        committed=true;
      }catch(error){
        await client.query('ROLLBACK').catch(()=>{});
        throw error;
      }finally{
        client.release();
      }
    }catch(error){
      summary.failed+=1;
      if(nextReference&&!committed)await companyProofStorage.remove(nextReference).catch(()=>{});
      continue;
    }

    summary.migrated+=1;
    await fs.unlink(filePath).catch(()=>{});
  }
  return summary;
}

module.exports={migrateLegacyCompanyProofsToObjectStorage};
