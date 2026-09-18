const pool=require('../config/database');

const CATEGORIES=['Marketing','Lead Sales','Government Compliance'];
function clean(v){return String(v??'').trim()}
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
    features,
    cta_label:clean(input.cta_label)||'Get Started',
    cta_url:clean(input.cta_url)||'/contact',
    highlighted:Boolean(input.highlighted),
    sort_order:Number.isFinite(Number(input.sort_order))?Number(input.sort_order):0,
    is_active:input.is_active!==false
  }
}
async function list(activeOnly=true){
  const r=await pool.query(`SELECT id,category,name,slug,tagline,description,price_label,billing_note,features,cta_label,cta_url,highlighted,sort_order,is_active,updated_at
    FROM service_pricing ${activeOnly?'WHERE is_active=TRUE':''} ORDER BY sort_order ASC,id ASC`);
  return r.rows
}
async function get(id){return (await pool.query('SELECT * FROM service_pricing WHERE id=$1',[id])).rows[0]||null}
async function create(input){
  const value=normalize(input);
  if(value.name.length<2) {const e=new Error('Pricing item name is required');e.code='INVALID_PRICING';throw e}
  if(!value.slug){const e=new Error('Pricing item slug is required');e.code='INVALID_PRICING';throw e}
  const r=await pool.query(`INSERT INTO service_pricing(category,name,slug,tagline,description,price_label,billing_note,features,cta_label,cta_url,highlighted,sort_order,is_active)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [value.category,value.name,value.slug,value.tagline,value.description,value.price_label,value.billing_note,JSON.stringify(value.features),value.cta_label,value.cta_url,value.highlighted,value.sort_order,value.is_active]);
  return r.rows[0]
}
async function update(id,input){
  const current=await get(id); if(!current)return null;
  const merged={...current,...input};
  const value=normalize(merged);
  if(value.name.length<2){const e=new Error('Pricing item name is required');e.code='INVALID_PRICING';throw e}
  const r=await pool.query(`UPDATE service_pricing SET category=$1,name=$2,slug=$3,tagline=$4,description=$5,price_label=$6,billing_note=$7,features=$8,cta_label=$9,cta_url=$10,highlighted=$11,sort_order=$12,is_active=$13,updated_at=CURRENT_TIMESTAMP WHERE id=$14 RETURNING *`,
    [value.category,value.name,value.slug,value.tagline,value.description,value.price_label,value.billing_note,JSON.stringify(value.features),value.cta_label,value.cta_url,value.highlighted,value.sort_order,value.is_active,id]);
  return r.rows[0]
}
async function remove(id){return (await pool.query('DELETE FROM service_pricing WHERE id=$1 RETURNING id',[id])).rows[0]||null}
module.exports={list,get,create,update,remove,CATEGORIES};