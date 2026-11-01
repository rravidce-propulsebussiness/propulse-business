// Serve a genuine published-project photo at a stable URL without leaking R2
// signed links or exposing arbitrary private object keys.
const fs=require('node:fs/promises');
const path=require('node:path');
const s3=require('./s3PrivateObjectStorageService');
const {businessProjectRoot}=require('../config/uploadStorage');

const MAX_BYTES=12*1024*1024;
const PREFIX='private-object-s3:business-projects/';
const LOCAL='/uploads/business-projects/';
const FILENAME=/^[1-9]\d*-image-\d{13}-[a-f0-9]{24}\.(jpg|png|webp)$/;

function normalizeReference(value){
  const text=String(value||'').trim();
  let filename,storage,key;
  if(text.startsWith(PREFIX)){
    key=text.slice('private-object-s3:'.length);
    filename=text.slice(PREFIX.length);
    storage='r2';
  }else if(text.startsWith(LOCAL)){
    filename=text.slice(LOCAL.length);
    storage='local';
  }else return null;
  if(!FILENAME.test(filename)||filename.includes('/'))return null;
  const ext=path.extname(filename).slice(1).toLowerCase();
  const mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[ext];
  if(!mime)return null;
  return {reference:text,filename,storage,key,mime};
}
function selectCover(project){
  if(!project)return null;
  const candidates=[project.cover_image_url,
    ...(Array.isArray(project.image_urls)?project.image_urls:[])];
  return candidates.map(normalizeReference).find(Boolean)||null;
}
function validImage(buffer,mime){
  if(!Buffer.isBuffer(buffer)||buffer.length<12||buffer.length>MAX_BYTES)return false;
  if(mime==='image/jpeg')return buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
  if(mime==='image/png')return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/webp')return buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP';
  return false;
}
async function readCover(photo){
  if(!photo)throw Object.assign(new Error('Project cover is not published'),{code:'COVER_NOT_FOUND'});
  let buffer;
  if(photo.storage==='r2'){
    if(!s3.isEnabled())throw Object.assign(new Error('Project image storage is not configured'),{code:'COVER_UNAVAILABLE'});
    const result=await s3.getObjectBuffer(photo.key,{maxBytes:MAX_BYTES,timeoutMs:10000});
    buffer=result.buffer;
  }else{
    // filename is restricted to one base filename; no traversal or arbitrary reads.
    buffer=await fs.readFile(path.join(businessProjectRoot,photo.filename));
  }
  if(!validImage(buffer,photo.mime))throw Object.assign(new Error('Invalid project image'),{code:'COVER_INVALID'});
  return {buffer,contentType:photo.mime};
}
function coverPathFor(project){
  if(!selectCover(project))return null;
  const slug=String(project.seo_slug||'').trim();
  if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)&&slug.length<=100)
    return '/project-cover/'+slug;
  const id=Number(project.project_id??project.id);
  return Number.isSafeInteger(id)&&id>0?'/project-cover/project-'+id:null;
}
module.exports={normalizeReference,selectCover,validImage,readCover,coverPathFor};
