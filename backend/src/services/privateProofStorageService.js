const crypto=require('crypto');
const path=require('path');
const fsp=require('fs/promises');
const {privateProofRoot}=require('../config/uploadStorage');
const s3=require('./s3PrivateObjectStorageService');

const ROOT=privateProofRoot;
const PREFIX='private-proof:';
const DEFAULT_MAX_BYTES=6*1024*1024;
const DATA_URL=/^data:(image\/(?:png|jpeg|jpg|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/i;
const MIME_EXT={
  'image/png':'.png',
  'image/jpeg':'.jpg',
  'image/jpg':'.jpg',
  'image/webp':'.webp',
  'application/pdf':'.pdf',
};
const EXT_MIME={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'};

function privateReference(value){return typeof value==='string'&&(value.startsWith(PREFIX)||s3.isReference(value))}
function safeCategory(value){const category=String(value||'proof').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');return category||'proof'}
function byteLength(payload){const padding=payload.endsWith('==')?2:payload.endsWith('=')?1:0;return Math.floor(payload.length*3/4)-padding}

async function storeDataUrl(value,{category='proof',maxBytes=DEFAULT_MAX_BYTES}={}){
  const source=String(value||'').trim();
  if(!source.startsWith('data:'))return source;
  const match=source.match(DATA_URL);
  if(!match)throw Object.assign(new Error('Proof data is not a supported image or PDF'),{code:'INVALID_PRIVATE_PROOF'});
  const mime=match[1].toLowerCase()==='image/jpg'?'image/jpeg':match[1].toLowerCase();
  const payload=match[2];
  const bytes=byteLength(payload);
  if(bytes<=0||bytes>Number(maxBytes||DEFAULT_MAX_BYTES))throw Object.assign(new Error('Proof file exceeds the allowed size'),{code:'PRIVATE_PROOF_TOO_LARGE'});
  const data=Buffer.from(payload,'base64');
  if(data.length!==bytes||!data.length)throw Object.assign(new Error('Proof data is invalid'),{code:'INVALID_PRIVATE_PROOF'});
  const folder=safeCategory(category);
  const filename=`${Date.now()}-${crypto.randomBytes(16).toString('hex')}${MIME_EXT[mime]}`;
  if(s3.isEnabled()){
    const key=`private-proofs/${folder}/${filename}`;
    await s3.putObject(key,data,{contentType:mime});
    return s3.makeReference(key);
  }
  const directory=path.join(ROOT,folder);
  await fsp.mkdir(directory,{recursive:true,mode:0o700});
  const filePath=path.join(directory,filename);
  await fsp.writeFile(filePath,data,{flag:'wx',mode:0o600});
  return `${PREFIX}${folder}/${filename}`;
}

function resolveReference(reference){
  if(!privateReference(reference))return null;
  const relative=String(reference).slice(PREFIX.length);
  if(!/^[a-z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(relative))throw new Error('Invalid private proof reference');
  const filePath=path.resolve(ROOT,relative);
  if(!filePath.startsWith(ROOT+path.sep))throw new Error('Invalid private proof path');
  return filePath;
}

async function getProofDescriptor(reference,{maxBytes=DEFAULT_MAX_BYTES}={}){
  const value=String(reference||'').trim();
  if(!value)return null;
  if(/^https?:\/\//i.test(value))return{externalUrl:value};
  if(value.startsWith('data:')){
    const match=value.match(DATA_URL);
    if(!match)throw new Error('Stored proof data is unsupported');
    const mime=match[1].toLowerCase()==='image/jpg'?'image/jpeg':match[1].toLowerCase();
    const payload=match[2];
    const bytes=byteLength(payload);
    if(bytes<=0||bytes>Number(maxBytes||DEFAULT_MAX_BYTES))throw new Error('Stored proof file is invalid');
    const buffer=Buffer.from(payload,'base64');
    if(buffer.length!==bytes||!buffer.length)throw new Error('Stored proof data is invalid');
    return{buffer,mime,size:buffer.length};
  }
  if(s3.isReference(value)){
    const key=s3.parseReference(value);
    const ext=path.extname(key).toLowerCase();
    const mime=EXT_MIME[ext];
    if(!mime)throw new Error('Private proof file type is unsupported');
    return{externalUrl:await s3.getSignedGetUrl(value),mime};
  }
  const filePath=resolveReference(value);
  if(!filePath)throw new Error('Stored proof reference is unsupported');
  const stat=await fsp.stat(filePath);
  if(!stat.isFile()||stat.size<=0||stat.size>Number(maxBytes||DEFAULT_MAX_BYTES))throw new Error('Private proof file is invalid');
  const mime=EXT_MIME[path.extname(filePath).toLowerCase()];
  if(!mime)throw new Error('Private proof file type is unsupported');
  return{filePath,mime,size:stat.size};
}

async function materializeProof(reference,{maxBytes=DEFAULT_MAX_BYTES}={}){
  const value=String(reference||'').trim();
  if(!value||value.startsWith('data:')||/^https?:\/\//i.test(value))return value||null;
  if(s3.isReference(value)){
    const key=s3.parseReference(value);
    const ext=path.extname(key).toLowerCase();
    const mime=EXT_MIME[ext];
    if(!mime)throw new Error('Private proof file type is unsupported');
    const result=await s3.getObjectBuffer(key,{maxBytes});
    return `data:${mime};base64,${result.buffer.toString('base64')}`;
  }
  const filePath=resolveReference(value);
  if(!filePath)return value;
  const stat=await fsp.stat(filePath);
  if(!stat.isFile()||stat.size<=0||stat.size>Number(maxBytes||DEFAULT_MAX_BYTES))throw new Error('Private proof file is invalid');
  const mime=EXT_MIME[path.extname(filePath).toLowerCase()];
  if(!mime)throw new Error('Private proof file type is unsupported');
  const data=await fsp.readFile(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

async function removeStoredProof(reference){
  if(s3.isReference(reference)){await s3.deleteObject(s3.parseReference(reference));return}
  let filePath;
  try{filePath=resolveReference(reference)}catch{return}
  if(!filePath)return;
  await fsp.unlink(filePath).catch(error=>{if(error?.code!=='ENOENT')throw error});
}

module.exports={storeDataUrl,materializeProof,getProofDescriptor,removeStoredProof,privateReference,PREFIX};
