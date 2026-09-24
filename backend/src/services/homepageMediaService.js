const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {validateDataUrlSignature}=require('../utils/fileValidation');
const pool=require('../config/database');

const SLOT_NAMES=['hero','residential','interior','commercial','turnkey','plot_land'];
const MAX_BYTES=7*1024*1024;
const MIME_EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const UPLOAD_ROOT=path.join(__dirname,'../../uploads/homepage');

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
function normalize(row){
  return {
    hero_image_url:clean(row?.hero_image_url),
    category_images:normalizeImages(row?.category_images),
    updated_at:row?.updated_at||null
  };
}
async function get(){
  const result=await pool.query('SELECT hero_image_url,category_images,updated_at FROM homepage_media_settings WHERE id=1');
  return normalize(result.rows[0]||{});
}
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
async function replace(slot,dataUrl){
  const key=assertSlot(slot);
  const parsed=parseImage(dataUrl);
  await fs.promises.mkdir(UPLOAD_ROOT,{recursive:true});
  const filename=`${key}-${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${parsed.extension}`;
  const destination=path.join(UPLOAD_ROOT,filename);
  await fs.promises.writeFile(destination,parsed.buffer,{flag:'wx'});
  const url=`/uploads/homepage/${filename}`;
  const current=await get();
  const next={...current};
  if(key==='hero') next.hero_image_url=url;
  else next.category_images={...current.category_images,[key]:url};
  const result=await pool.query(
    `UPDATE homepage_media_settings SET hero_image_url=$1,category_images=$2,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING hero_image_url,category_images,updated_at`,
    [next.hero_image_url,JSON.stringify(next.category_images)]
  );
  const oldUrl=key==='hero'?current.hero_image_url:current.category_images?.[key];
  if(oldUrl&&oldUrl.startsWith('/uploads/homepage/')){
    const oldPath=path.resolve(__dirname,'../..',oldUrl.replace(/^\//,''));
    if(oldPath!==path.resolve(destination)) await fs.promises.unlink(oldPath).catch(()=>{});
  }
  return normalize(result.rows[0]);
}
async function remove(slot){
  const key=assertSlot(slot);
  const current=await get();
  const oldUrl=key==='hero'?current.hero_image_url:current.category_images?.[key];
  const hero=key==='hero'?'':current.hero_image_url;
  const images={...current.category_images};
  delete images[key];
  const result=await pool.query(
    `UPDATE homepage_media_settings SET hero_image_url=$1,category_images=$2,updated_at=CURRENT_TIMESTAMP WHERE id=1 RETURNING hero_image_url,category_images,updated_at`,
    [hero,JSON.stringify(images)]
  );
  if(oldUrl&&oldUrl.startsWith('/uploads/homepage/')){
    const oldPath=path.resolve(__dirname,'../..',oldUrl.replace(/^\//,''));
    await fs.promises.unlink(oldPath).catch(()=>{});
  }
  return normalize(result.rows[0]);
}
module.exports={SLOT_NAMES,get,replace,remove,MAX_BYTES};