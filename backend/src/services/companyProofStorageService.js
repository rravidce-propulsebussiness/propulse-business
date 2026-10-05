const crypto=require('crypto');
const path=require('path');
const fsp=require('fs/promises');
const {companyProofRoot}=require('../config/uploadStorage');
const s3=require('./s3PrivateObjectStorageService');

function safeName(value){
  const name=String(value||'document').replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);
  return name||'document';
}
function safeStoredName(value){
  const name=path.basename(String(value||''));
  if(!name||name!==String(value||''))throw new Error('Invalid company proof reference');
  return name;
}
async function storeBuffer({userId,buffer,mimeType,extension}){
  const data=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer||'');
  if(!data.length)throw new Error('Company proof is empty');
  const suffix=String(extension||'').replace(/[^.A-Za-z0-9]/g,'').slice(0,8);
  const filename=String(userId)+'-'+Date.now()+'-'+crypto.randomBytes(8).toString('hex')+suffix;
  const useObjectStorage=s3.assertWriteStorage();
  if(useObjectStorage){
    const key='company-proofs/'+filename;
    await s3.putObject(key,data,{contentType:mimeType||'application/octet-stream'});
    return s3.makeReference(key);
  }
  await fsp.mkdir(companyProofRoot,{recursive:true,mode:0o700});
  await fsp.writeFile(path.join(companyProofRoot,filename),data,{flag:'wx',mode:0o600});
  return filename;
}
async function remove(reference){
  if(!reference)return;
  if(s3.isReference(reference)){await s3.deleteObject(s3.parseReference(reference));return}
  let name;
  try{name=safeStoredName(reference)}catch{return}
  await fsp.unlink(path.join(companyProofRoot,name)).catch(error=>{if(error?.code!=='ENOENT')throw error});
}
async function descriptor(reference,{mimeType,size}={}){
  if(!reference)return null;
  if(s3.isReference(reference))return{externalUrl:await s3.getSignedGetUrl(reference),mime:mimeType||null,size:Number(size)||undefined};
  const name=safeStoredName(reference);
  const filePath=path.resolve(companyProofRoot,name);
  if(!filePath.startsWith(path.resolve(companyProofRoot)+path.sep))throw new Error('Invalid company proof path');
  const stat=await fsp.stat(filePath);
  if(!stat.isFile())return null;
  return{filePath,mime:mimeType||null,size:Number(size)||stat.size};
}
module.exports={safeName,storeBuffer,remove,descriptor};
