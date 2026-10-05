const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {validateDataUrlSignature}=require('../utils/fileValidation');
const pool=require('../config/database');
const {homepageUploadRoot}=require('../config/uploadStorage');
const s3=require('./s3PrivateObjectStorageService');

const SLOT_NAMES=['hero','residential','interior','commercial','turnkey','plot_land','why_homeowners','final_cta'];
const MAX_BYTES=7*1024*1024;
const MIME_EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const UPLOAD_ROOT=homepageUploadRoot;

function clean(value){return String(value??'').trim()}
function normalizeImages(value){
  if(!value||typeof value!=='object'||Array.isArray(value)) return {};
  const next={};
  for(const slot of SLOT_NAMES){
    const valueForSlot=clean(value[slot]);
    if(valueForSlot) next[slot]=valueForSlot;
  }
  return next;
}
function normalizeStored(row){
  return {
    hero_image_url:clean(row?.hero_image_url),
    category_images:normalizeImages(row?.category_images),
    updated_at:row?.updated_at||null
  };
}
async function materializeValue(value){
  const stored=clean(value);
  if(!stored)return '';
  if(s3.isReference(stored))return s3.getMediaGetUrl(stored,{expiresSeconds:3600});
  return stored;
}
async function materialize(row){
  const stored=normalizeStored(row);
  const hero=await materializeValue(stored.hero_image_url);
  const entries=await Promise.all(Object.entries(stored.category_images).map(async([slot,value])=>[slot,await materializeValue(value)]));
  return {...stored,hero_image_url:hero,category_images:Object.fromEntries(entries)};
}
async function getStored(){
  const result=await pool.query('SELECT hero_image_url,category_images,updated_at FROM homepage_media_settings WHERE id=1');
  return normalizeStored(result.rows[0]||{});
}
async function get(){return materialize(await getStored())}
function parseImage(dataUrl){
  const value=clean(dataUrl);
  const match=value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match){const e=new Error('Only JPEG, PNG or WebP images are allowed');e.code='INVALID_IMAGE';throw e}
  const mime=match[1].toLowerCase();
  if(!validateDataUrlSignature(value,['image/jpeg','image/png','image/webp'])){const e=new Error('Image content does not match its declared type');e.code='INVALID_IMAGE';throw e}
  const buffer=Buffer.from(match[2].replace(/\s/g,''),'base64');
  if(!buffer.length){const e=new Error('Image file is empty');e.code='INVALID_IMAGE';throw e}
  if(buffer.length>MAX_BYTES){const e=new Error('Image must be 7 MB or smaller');e.code='IMAGE_TOO_LARGE';throw e}
  return {mime,buffer,extension:MIME_EXTENSIONS[mime]};
}
function assertSlot(slot){
  const key=clean(slot);
  if(!SLOT_NAMES.includes(key)){const e=new Error('Invalid homepage image slot');e.code='INVALID_SLOT';throw e}
  return key;
}
async function removeStoredObject(value){
  const stored=clean(value);
  if(!stored)return;
  if(s3.isReference(stored)){
    await s3.deleteObject(s3.parseReference(stored));
    return;
  }
  if(stored.startsWith('/uploads/homepage/')){
    await fs.promises.unlink(path.join(UPLOAD_ROOT,path.basename(stored))).catch(error=>{if(error?.code!=='ENOENT')throw error});
  }
}
async function storeImage(key,parsed){
  const filename=`${key}-${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${parsed.extension}`;
  const useObjectStorage=s3.assertWriteStorage();
  if(useObjectStorage){
    const objectKey=`homepage/${filename}`;
    await s3.putObject(objectKey,parsed.buffer,{contentType:parsed.mime});
    return s3.makeReference(objectKey);
  }
  await fs.promises.mkdir(UPLOAD_ROOT,{recursive:true});
  const destination=path.join(UPLOAD_ROOT,filename);
  await fs.promises.writeFile(destination,parsed.buffer,{flag:'wx'});
  return `/uploads/homepage/${filename}`;
}
async function replace(slot,dataUrl){
  const key=assertSlot(slot);
  const parsed=parseImage(dataUrl);
  const storedUrl=await storeImage(key,parsed);
  const current=await getStored();
  const next={...current};
  if(key==='hero') next.hero_image_url=storedUrl;
  else next.category_images={...current.category_images,[key]:storedUrl};
  try{
    const result=await pool.query(
      `UPDATE homepage_media_settings SET hero_image_url=$1,category_images=$2,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING hero_image_url,category_images,updated_at`,
      [next.hero_image_url,JSON.stringify(next.category_images)]
    );
    const oldUrl=key==='hero'?current.hero_image_url:current.category_images?.[key];
    if(oldUrl&&oldUrl!==storedUrl)await removeStoredObject(oldUrl).catch(()=>{});
    return materialize(result.rows[0]);
  }catch(error){
    await removeStoredObject(storedUrl).catch(()=>{});
    throw error;
  }
}
async function remove(slot){
  const key=assertSlot(slot);
  const current=await getStored();
  const oldUrl=key==='hero'?current.hero_image_url:current.category_images?.[key];
  const hero=key==='hero'?'':current.hero_image_url;
  const images={...current.category_images};
  delete images[key];
  const result=await pool.query(
    `UPDATE homepage_media_settings SET hero_image_url=$1,category_images=$2,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING hero_image_url,category_images,updated_at`,
    [hero,JSON.stringify(images)]
  );
  await removeStoredObject(oldUrl).catch(()=>{});
  return materialize(result.rows[0]);
}
module.exports={SLOT_NAMES,get,replace,remove,MAX_BYTES,materializeValue};
