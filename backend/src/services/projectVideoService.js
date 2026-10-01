const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {businessProjectRoot}=require('../config/uploadStorage');

const MAX_VIDEO_BYTES=50*1024*1024;
const MIME_EXTENSIONS={
  'video/mp4':'mp4',
  'video/quicktime':'mov',
  'video/webm':'webm',
};

function videoError(message,code){
  return Object.assign(new Error(message),{code});
}

function normalizeMime(value){
  return String(value||'').split(';')[0].trim().toLowerCase();
}

function validateSignature(buffer,mime){
  if(!Buffer.isBuffer(buffer)||buffer.length<12)return false;
  if(mime==='video/webm'){
    return buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  }
  if(mime==='video/mp4'||mime==='video/quicktime'){
    return buffer.subarray(4,8).toString('ascii')==='ftyp';
  }
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

function managedPrefix(userId){
  return `/uploads/business-projects/${Number(userId)}-`;
}

function managedVideoInfo(userId,url){
  const value=String(url||'').trim();
  if(!value.startsWith('/uploads/business-projects/'))return null;
  if(!value.startsWith(managedPrefix(userId)))throw videoError('Uploaded project video does not belong to this business','PROJECT_VIDEO_OWNERSHIP');
  const name=path.posix.basename(value);
  const match=name.match(new RegExp(`^${Number(userId)}-(\\d{13})-[a-f0-9]{24}\\.(mp4|mov|webm)$`));
  if(!match)throw videoError('Uploaded project video URL is invalid','INVALID_PROJECT_VIDEO_URL');
  const timestamp=Number(match[1]);
  if(!Number.isFinite(timestamp)||timestamp<1577836800000||timestamp>Date.now()+300000)throw videoError('Uploaded project video timestamp is invalid','INVALID_PROJECT_VIDEO_URL');
  return {url:value,filename:name,uploadedAt:new Date(timestamp)};
}

async function saveProjectVideo(userId,mime,buffer){
  const parsed=assertVideoBuffer(buffer,mime);
  await fs.promises.mkdir(businessProjectRoot,{recursive:true,mode:0o700});
  const timestamp=Date.now();
  const filename=`${Number(userId)}-${timestamp}-${crypto.randomBytes(12).toString('hex')}.${parsed.extension}`;
  const destination=path.join(businessProjectRoot,filename);
  await fs.promises.writeFile(destination,buffer,{flag:'wx',mode:0o600});
  return {
    url:`/uploads/business-projects/${filename}`,
    mimeType:parsed.mime,
    fileSize:buffer.length,
    uploadedAt:new Date(timestamp).toISOString(),
  };
}

async function removeManagedProjectVideos(userId,urls){
  const unique=[...new Set((urls||[]).map(value=>String(value||'').trim()).filter(Boolean))];
  for(const url of unique){
    let info;
    try{info=managedVideoInfo(userId,url);}catch{continue}
    if(!info)continue;
    const destination=path.join(businessProjectRoot,info.filename);
    await fs.promises.unlink(destination).catch(error=>{if(error?.code!=='ENOENT')throw error;});
  }
}

module.exports={
  MAX_VIDEO_BYTES,
  MIME_EXTENSIONS,
  assertVideoBuffer,
  managedVideoInfo,
  saveProjectVideo,
  removeManagedProjectVideos,
};
