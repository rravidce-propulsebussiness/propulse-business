const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {validateDataUrlSignature}=require('../utils/fileValidation');
const pool=require('../config/database');

const CATEGORIES=['Marketing','Lead Sales','Government Compliance','Grow','Scale'];
const MAX_IMAGE_BYTES=7*1024*1024;
const MIME_EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const UPLOAD_ROOT=path.join(__dirname,'../../uploads/service-pricing');
function clean(v){return String(v??'').trim()}
function normalizeCtaUrl(value){
  const url=clean(value)||'/contact';
  if(!url.startsWith('/')||url.startsWith('//')||/[\\\r\n]/.test(url)){
    const e=new Error('CTA URL must be an internal application path');e.code='INVALID_CTA_URL';throw e
  }
  return url
}
function safeJson(v){if(Array.isArray(v))return v;try{const parsed=typeof v==='string'?JSON.parse(v):v;return Array.isArray(parsed)?parsed:[]}catch{return[]}}
function normalize(input={}){
  const features=safeJson(input.features).map(x=>clean(x)).filter(Boolean).slice(0,20);
  return {
    category:CATEGORIES.includes(clean(input.category))?clean(input.category):'Marketing',
    name:clean(input.name),
    slug:clean(input.slug).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,''),
    tagline:clean(input.tagline),
    description:clean(input.description),
    price_label:clean(input.price_label)||'Custom quote',
    billing_note:clean(input.billing_note),
    image_url:clean(input.image_url),
    features,
    cta_label:clean(input.cta_label)||'Get Started',
    cta_url:normalizeCtaUrl(input.cta_url),
    highlighted:Boolean(input.highlighted),
    sort_order:Number.isFinite(Number(input.sort_order))?Number(input.sort_order):0,
    is_active:input.is_active!==false
  }
}
async function list(activeOnly=true){
  const r=await pool.query(`SELECT id,category,name,slug,tagline,description,price_label,billing_note,features,cta_label,cta_url,image_url,highlighted,sort_order,is_active,updated_at
    FROM service_pricing ${activeOnly?'WHERE is_active=TRUE':''} ORDER BY sort_order ASC,id ASC`);
  return r.rows
}
async function get(id){return (await pool.query('SELECT * FROM service_pricing WHERE id=$1',[id])).rows[0]||null}
async function create(input){
  const value=normalize(input);
  if(value.name.length<2) {const e=new Error('Pricing item name is required');e.code='INVALID_PRICING';throw e}
  if(!value.slug){const e=new Error('Pricing item slug is required');e.code='INVALID_PRICING';throw e}
  const r=await pool.query(`INSERT INTO service_pricing(category,name,slug,tagline,description,price_label,billing_note,features,cta_label,cta_url,image_url,highlighted,sort_order,is_active)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [value.category,value.name,value.slug,value.tagline,value.description,value.price_label,value.billing_note,JSON.stringify(value.features),value.cta_label,value.cta_url,value.image_url,value.highlighted,value.sort_order,value.is_active]);
  return r.rows[0]
}
async function update(id,input){
  const current=await get(id); if(!current)return null;
  const merged={...current,...input};
  const value=normalize(merged);
  if(value.name.length<2){const e=new Error('Pricing item name is required');e.code='INVALID_PRICING';throw e}
  const r=await pool.query(`UPDATE service_pricing SET category=$1,name=$2,slug=$3,tagline=$4,description=$5,price_label=$6,billing_note=$7,features=$8,cta_label=$9,cta_url=$10,image_url=$11,highlighted=$12,sort_order=$13,is_active=$14,updated_at=CURRENT_TIMESTAMP WHERE id=$15 RETURNING *`,
    [value.category,value.name,value.slug,value.tagline,value.description,value.price_label,value.billing_note,JSON.stringify(value.features),value.cta_label,value.cta_url,value.image_url,value.highlighted,value.sort_order,value.is_active,id]);
  return r.rows[0]
}
function parseImage(dataUrl){
  const value=clean(dataUrl);
  const match=value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match){const e=new Error('Only JPG, PNG or WebP images are allowed');e.code='INVALID_IMAGE';throw e}
  const mime=match[1].toLowerCase();
  if(!validateDataUrlSignature(value,['image/jpeg','image/png','image/webp'])){const e=new Error('Image content does not match its declared type');e.code='INVALID_IMAGE';throw e}
  const buffer=Buffer.from(match[2].replace(/\s/g,''),'base64');
  if(!buffer.length){const e=new Error('Image file is empty');e.code='INVALID_IMAGE';throw e}
  if(buffer.length>MAX_IMAGE_BYTES){const e=new Error('Image must be 7 MB or smaller');e.code='IMAGE_TOO_LARGE';throw e}
  return {buffer,extension:MIME_EXTENSIONS[mime]}
}
async function replaceImage(id,dataUrl){
  const current=await get(id); if(!current)return null;
  const parsed=parseImage(dataUrl);
  await fs.promises.mkdir(UPLOAD_ROOT,{recursive:true});
  const filename=`pricing-${id}-${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${parsed.extension}`;
  const destination=path.join(UPLOAD_ROOT,filename);
  await fs.promises.writeFile(destination,parsed.buffer,{flag:'wx'});
  const url=`/uploads/service-pricing/${filename}`;
  const result=await pool.query('UPDATE service_pricing SET image_url=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[url,id]);
  if(current.image_url&&current.image_url.startsWith('/uploads/service-pricing/')){
    const oldPath=path.resolve(__dirname,'../..',current.image_url.replace(/^\//,''));
    await fs.promises.unlink(oldPath).catch(()=>{});
  }
  return result.rows[0]||null;
}
async function removeImage(id){
  const current=await get(id); if(!current)return null;
  const result=await pool.query("UPDATE service_pricing SET image_url='' , updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *",[id]);
  if(current.image_url&&current.image_url.startsWith('/uploads/service-pricing/')){
    const oldPath=path.resolve(__dirname,'../..',current.image_url.replace(/^\//,''));
    await fs.promises.unlink(oldPath).catch(()=>{});
  }
  return result.rows[0]||null;
}
async function remove(id){
  const current=await get(id);
  if(!current)return null;
  await removeImage(id).catch(()=>{});
  return (await pool.query('DELETE FROM service_pricing WHERE id=$1 RETURNING id',[id])).rows[0]||null
}
module.exports={list,get,create,update,remove,replaceImage,removeImage,CATEGORIES,MAX_IMAGE_BYTES};