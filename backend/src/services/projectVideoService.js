const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {businessProjectRoot}=require('../config/uploadStorage');
const s3=require('./s3PrivateObjectStorageService');
const {normalizeMime,displayUrl}=require('./projectMediaStorageUtils');

const MAX_VIDEO_BYTES=50*1024*1024;
const MIME_EXTENSIONS={
  'video/mp4':'mp4',
  'video/quicktime':'mov',
  'video/webm':'webm',
};

function videoError(message,code){
  return Object.assign(new Error(message),{code});
}
function validateSignature(buffer,mime){
  if(!Buffer.isBuffer(buffer)||buffer.length<12)return false;
  if(mime==='video/webm')return buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if(mime==='video/mp4'||mime==='video/quicktime')return buffer.subarray(4,8).toString('ascii')==='ftyp';
  return false;
}
function assertVideoBuffer(buffer,mime){
  const normalized=normalizeMime(mime);
  if(!Object.hasOwn(MIME_EXTENSIONS,normalized))throw videoError('Only MP4, MOV or WebM videos are supported','INVALID_PROJECT_VIDEO_TYPE');
  if(!Buffer.isBuffer(buffer)||!buffer.length)throw videoError('Video file is empty','INVALID_PROJECT_VIDEO');
  if(buffer.length>MAX_VIDEO_BYTES)throw videoError('Video must be 50 MB or smaller','PROJECT_VIDEO_TOO_LARGE');
  if(!validateSignature(buffer,normalized))throw videoError('Video content does not match its declared file type','INVALID_PROJECT_VIDEO');
  return {mime:normalized,extension:MIME_EXTENSIONS[normalized]};
}
function parseFilename(userId,filename){
  const match=String(filename||'').match(new RegExp(`^${Number(userId)}-(\\d{13})-[a-f0-9]{24}\\.(mp4|mov|webm)$`));
  if(!match)throw videoError('Uploaded project video URL is invalid','INVALID_PROJECT_VIDEO_URL');
  const timestamp=Number(match[1]);
  if(!Number.isFinite(timestamp)||timestamp<1577836800000||timestamp>Date.now()+300000)throw videoError('Uploaded project video timestamp is invalid','INVALID_PROJECT_VIDEO_URL');
  return{filename:String(filename),uploadedAt:new Date(timestamp)};
}
function managedVideoInfo(userId,url){
  const value=String(url||'').trim();
  if(!value)return null;
  if(s3.isReference(value)){
    const key=s3.parseReference(value);
    const prefix=`business-projects/${Number(userId)}-`;
    if(!key.startsWith(prefix)||path.posix.dirname(key)!=='business-projects')throw videoError('Uploaded project video does not belong to this business','PROJECT_VIDEO_OWNERSHIP');
    return{url:value,key,...parseFilename(userId,path.posix.basename(key)),provider:'s3'};
  }
  if(!value.startsWith('/uploads/business-projects/'))return null;
  const prefix=`/uploads/business-projects/${Number(userId)}-`;
  if(!value.startsWith(prefix))throw videoError('Uploaded project video does not belong to this business','PROJECT_VIDEO_OWNERSHIP');
  return{url:value,...parseFilename(userId,path.posix.basename(value)),provider:'local'};
}
async function saveProjectVideo(userId,mime,buffer){
  const parsed=assertVideoBuffer(buffer,mime);
  const timestamp=Date.now();
  const filename=`${Number(userId)}-${timestamp}-${crypto.randomBytes(12).toString('hex')}.${parsed.extension}`;
  let url;
  const useObjectStorage=s3.assertWriteStorage();
  if(useObjectStorage){
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

const MULTIPART_THRESHOLD=96*1024*1024;
const MIN_PART_BYTES=64*1024*1024;
const PROVIDER_MAX_BYTES=5*1024**4;

function validateVideoRequest(mime,size){
  const normalized=normalizeMime(mime),bytes=Number(size);
  if(!Object.hasOwn(MIME_EXTENSIONS,normalized))throw videoError('Only MP4, MOV and WebM videos are supported','INVALID_PROJECT_VIDEO_TYPE');
  if(!Number.isSafeInteger(bytes)||bytes<12)throw videoError('Select a valid, non-empty video','INVALID_PROJECT_VIDEO');
  if(bytes>PROVIDER_MAX_BYTES)throw videoError('Video exceeds Cloudflare R2 object storage capacity','PROJECT_VIDEO_TOO_LARGE');
  return{mime:normalized,bytes,extension:MIME_EXTENSIONS[normalized]};
}
function uploadInfo(userId,reference){
  const parsed=managedVideoInfo(userId,reference);
  if(!parsed||parsed.provider!=='s3')throw videoError('Video upload reference is invalid','INVALID_PROJECT_VIDEO_URL');
  return parsed;
}
async function prepareVideoUpload(userId,mime,size){
  if(!s3.assertWriteStorage())throw videoError('Direct video uploads require Cloudflare R2 storage','VIDEO_STORAGE_UNAVAILABLE');
  const {mime:contentType,bytes,extension}=validateVideoRequest(mime,size);
  const timestamp=Date.now();
  const key='business-projects/'+Number(userId)+'-'+timestamp+'-'+crypto.randomBytes(12).toString('hex')+'.'+extension;
  const reference=s3.makeReference(key);
  const multipart=bytes>MULTIPART_THRESHOLD;
  if(multipart){
    const chunkSize=Math.ceil(Math.max(MIN_PART_BYTES,Math.ceil(bytes/10000))/1048576)*1048576;
    const uploadId=await s3.startMultipartUpload(key,contentType);
    return{mode:'multipart',reference,uploadId,chunkSize,contentType,fileSize:bytes};
  }
  return{mode:'single',reference,
    uploadUrl:s3.buildPresignedUploadUrl(key,{contentType,expiresSeconds:1800}),
    contentType,fileSize:bytes};
}
function presignVideoPart(userId,reference,uploadId,partNumber){
  const info=uploadInfo(userId,reference);
  if(typeof uploadId!=='string'||uploadId.length<8||uploadId.length>700)throw videoError('Invalid video upload session','INVALID_PROJECT_VIDEO');
  const part=Number(partNumber);
  if(!Number.isInteger(part)||part<1||part>10000)throw videoError('Invalid video upload part','INVALID_PROJECT_VIDEO');
  return{uploadUrl:s3.buildPresignedUploadUrl(info.key,{query:{partNumber:String(part),uploadId},expiresSeconds:1800})};
}
async function finishVideoUpload(userId,{reference,uploadId,parts,mimeType,size}={}){
  const info=uploadInfo(userId,reference);
  const {mime,bytes}=validateVideoRequest(mimeType,size);
  const suffix=info.filename.split('.').pop();
  if(suffix!==MIME_EXTENSIONS[mime])throw videoError('Video file type does not match upload','INVALID_PROJECT_VIDEO_TYPE');
  if(uploadId){
    if(typeof uploadId!=='string'||uploadId.length<8||uploadId.length>700)throw videoError('Invalid upload session','INVALID_PROJECT_VIDEO');
    if(!Array.isArray(parts)||!parts.length||parts.length>10000||
      parts.some((p,i)=>p.partNumber!==i+1))throw videoError('Invalid uploaded video parts','INVALID_PROJECT_VIDEO');
    await s3.completeMultipartUpload(info.key,uploadId,parts);
  }else if(parts?.length){
    throw videoError('Unexpected upload parts','INVALID_PROJECT_VIDEO');
  }
  const stored=await s3.headObject(info.key);
  if(!stored||stored.size!==bytes||stored.contentType!==mime){
    throw videoError('Video upload verification failed. Check the file size and format, then try again.','VIDEO_UPLOAD_MISMATCH');
  }
  return{url:reference,displayUrl:await displayUrl(reference),mimeType:mime,
    fileSize:stored.size,uploadedAt:info.uploadedAt.toISOString()};
}
async function abortVideoUpload(userId,{reference,uploadId}={}){
  const info=uploadInfo(userId,reference);
  if(typeof uploadId!=='string'||uploadId.length<8||uploadId.length>700)throw videoError('Invalid upload session','INVALID_PROJECT_VIDEO');
  await s3.abortMultipartUpload(info.key,uploadId);
  return{aborted:true};
}

async function removeManagedProjectVideos(userId,urls){
  const unique=[...new Set((urls||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  for(const url of unique){
    let info;
    try{info=managedVideoInfo(userId,url);}catch{continue}
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
  MAX_VIDEO_BYTES,
  MIME_EXTENSIONS,
  assertVideoBuffer,
  managedVideoInfo,
  displayUrl,
  saveProjectVideo,
  prepareVideoUpload,presignVideoPart,finishVideoUpload,abortVideoUpload,
  removeManagedProjectVideos,
};