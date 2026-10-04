const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {businessProjectRoot}=require('../config/uploadStorage');
const s3=require('./s3PrivateObjectStorageService');

const MAX_PLAN_BYTES=15*1024*1024;
const MIME_EXTENSIONS={
  'application/pdf':'pdf',
  'image/jpeg':'jpg',
  'image/png':'png',
  'image/webp':'webp',
};

function planError(message,code){return Object.assign(new Error(message),{code});}
function normalizeMime(value){return String(value||'').split(';')[0].trim().toLowerCase();}
function validateSignature(buffer,mime){
  if(!Buffer.isBuffer(buffer)||!buffer.length)return false;
  if(mime==='application/pdf')return buffer.subarray(0,5).toString('ascii')==='%PDF-';
  if(mime==='image/png')return buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return buffer.length>=3&&buffer.subarray(0,3).equals(Buffer.from([255,216,255]));
  if(mime==='image/webp')return buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP';
  return false;
}
function assertPlanBuffer(buffer,mime){
  const normalized=normalizeMime(mime);
  if(!Object.hasOwn(MIME_EXTENSIONS,normalized))throw planError('Only PDF, JPG, PNG or WebP plan files are supported','INVALID_PROJECT_PLAN_TYPE');
  if(!Buffer.isBuffer(buffer)||!buffer.length)throw planError('Plan file is empty','INVALID_PROJECT_PLAN');
  if(buffer.length>MAX_PLAN_BYTES)throw planError('Plan file must be 15 MB or smaller','PROJECT_PLAN_TOO_LARGE');
  if(!validateSignature(buffer,normalized))throw planError('Plan file content does not match its declared type','INVALID_PROJECT_PLAN');
  return {mime:normalized,extension:MIME_EXTENSIONS[normalized]};
}
function parseFilename(userId,filename){
  const match=String(filename||'').match(new RegExp(`^${Number(userId)}-plan-(\\d{13})-[a-f0-9]{24}\\.(pdf|jpg|png|webp)$`));
  if(!match)throw planError('Uploaded project plan URL is invalid','INVALID_PROJECT_PLAN_URL');
  return{filename:String(filename),mimeExtension:match[2]};
}
function managedPlanInfo(userId,url){
  const value=String(url||'').trim();
  if(!value)return null;
  if(s3.isReference(value)){
    const key=s3.parseReference(value);
    const prefix=`business-projects/${Number(userId)}-plan-`;
    if(!key.startsWith(prefix)||path.posix.dirname(key)!=='business-projects')throw planError('Uploaded project plan does not belong to this business','PROJECT_PLAN_OWNERSHIP');
    return{url:value,key,...parseFilename(userId,path.posix.basename(key)),provider:'s3'};
  }
  if(!value.startsWith('/uploads/business-projects/'))return null;
  const prefix=`/uploads/business-projects/${Number(userId)}-plan-`;
  if(!value.startsWith(prefix))throw planError('Uploaded project plan does not belong to this business','PROJECT_PLAN_OWNERSHIP');
  return{url:value,...parseFilename(userId,path.posix.basename(value)),provider:'local'};
}
async function displayUrl(value){
  const stored=String(value||'').trim();
  if(!stored)return '';
  if(s3.isReference(stored))return s3.getMediaGetUrl(stored,{expiresSeconds:3600});
  return stored;
}
async function saveProjectPlan(userId,mime,buffer){
  const parsed=assertPlanBuffer(buffer,mime);
  const timestamp=Date.now();
  const filename=`${Number(userId)}-plan-${timestamp}-${crypto.randomBytes(12).toString('hex')}.${parsed.extension}`;
  let url;
  if(s3.isEnabled()){
    const key=`business-projects/${filename}`;
    await s3.putObject(key,buffer,{contentType:parsed.mime});
    url=s3.makeReference(key);
  }else{
    await fs.promises.mkdir(businessProjectRoot,{recursive:true,mode:0o700});
    const destination=path.join(businessProjectRoot,filename);
    await fs.promises.writeFile(destination,buffer,{flag:'wx',mode:0o600});
    url=`/uploads/business-projects/${filename}`;
  }
  return {
    url,
    displayUrl:await displayUrl(url),
    mimeType:parsed.mime,
    fileSize:buffer.length,
    uploadedAt:new Date(timestamp).toISOString(),
  };
}
async function removeManagedProjectPlans(userId,urls){
  const unique=[...new Set((urls||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  for(const url of unique){
    let info;
    try{info=managedPlanInfo(userId,url);}catch{continue}
    if(!info)continue;
    if(info.provider==='s3'){
      await s3.deleteObject(info.key).catch(error=>{if(error?.providerStatus!==404)throw error});
      continue;
    }
    const destination=path.join(businessProjectRoot,info.filename);
    await fs.promises.unlink(destination).catch(error=>{if(error?.code!=='ENOENT')throw error;});
  }
}
module.exports={
  MAX_PLAN_BYTES,
  MIME_EXTENSIONS,
  assertPlanBuffer,
  managedPlanInfo,
  displayUrl,
  saveProjectPlan,
  removeManagedProjectPlans,
};