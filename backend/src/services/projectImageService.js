const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {businessProjectRoot}=require('../config/uploadStorage');
const s3=require('./s3PrivateObjectStorageService');
const {normalizeMime,displayUrl}=require('./projectMediaStorageUtils');

const MAX_IMAGE_BYTES=12*1024*1024;
const EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
function imageError(message,code){return Object.assign(new Error(message),{code});}
function validSignature(b,m){
  if(!Buffer.isBuffer(b)||!b.length)return false;
  if(m==='image/jpeg')return b.length>=3&&b.subarray(0,3).equals(Buffer.from([255,216,255]));
  if(m==='image/png')return b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(m==='image/webp')return b.length>=12&&b.subarray(0,4).toString('ascii')==='RIFF'&&b.subarray(8,12).toString('ascii')==='WEBP';
  return false;
}
function managedImageInfo(userId,value){
  const url=String(value||'').trim();
  if(!url)return null;
  let filename,key,provider;
  if(s3.isReference(url)){
    key=s3.parseReference(url);
    if(!key.startsWith(`business-projects/${Number(userId)}-image-`)||path.posix.dirname(key)!=='business-projects')throw imageError('Gallery photo belongs to another business','PROJECT_IMAGE_OWNERSHIP');
    filename=path.posix.basename(key);provider='s3';
  }else if(url.startsWith('/uploads/business-projects/')){
    filename=path.posix.basename(url);
    if(url!==`/uploads/business-projects/${filename}`)throw imageError('Invalid project photo URL','INVALID_PROJECT_IMAGE_URL');
    provider='local';
  }else return null;
  if(!new RegExp(`^${Number(userId)}-image-\\d{13}-[a-f0-9]{24}\\.(jpg|png|webp)$`).test(filename))throw imageError('Invalid or unowned project photo','PROJECT_IMAGE_OWNERSHIP');
  return{url,key,filename,provider};
}
async function saveProjectImage(userId,mime,buffer){
  const type=normalizeMime(mime);
  if(!Object.hasOwn(EXT,type))throw imageError('Upload a JPG, PNG or WebP image','INVALID_PROJECT_IMAGE_TYPE');
  if(!Buffer.isBuffer(buffer)||!buffer.length||!validSignature(buffer,type))throw imageError('Invalid photo file','INVALID_PROJECT_IMAGE');
  if(buffer.length>MAX_IMAGE_BYTES)throw imageError('Gallery photos must be at most 12 MB','PROJECT_IMAGE_TOO_LARGE');
  const timestamp=Date.now();
  const filename=`${Number(userId)}-image-${timestamp}-${crypto.randomBytes(12).toString('hex')}.${EXT[type]}`;
  let url;
  if(s3.assertWriteStorage()){
    const key=`business-projects/${filename}`;
    await s3.putObject(key,buffer,{contentType:type});
    url=s3.makeReference(key);
  }else{
    await fs.promises.mkdir(businessProjectRoot,{recursive:true,mode:0o700});
    await fs.promises.writeFile(path.join(businessProjectRoot,filename),buffer,{flag:'wx',mode:0o600});
    url=`/uploads/business-projects/${filename}`;
  }
  return{url,displayUrl:await displayUrl(url),uploadedAt:new Date(timestamp).toISOString()};
}
async function removeManagedProjectImages(userId,urls){
  for(const value of new Set(urls||[])){
    let item;
    try{item=managedImageInfo(userId,value)}catch{continue}
    if(!item)continue;
    if(item.provider==='s3')await s3.deleteObject(item.key).catch(error=>{if(error?.providerStatus!==404)throw error});
    else await fs.promises.unlink(path.join(businessProjectRoot,item.filename)).catch(error=>{if(error?.code!=='ENOENT')throw error});
  }
}
module.exports={MAX_IMAGE_BYTES,managedImageInfo,saveProjectImage,removeManagedProjectImages,displayUrl};
