const pool=require('../config/database');
const ALLOWED_STATUS=['Planned','In development','Researching','Coming soon','Future release'];
function clean(v){return String(v??'').trim()}
function normalize(input={}){
  const name=clean(input.name);
  const slug=clean(input.slug||name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(name.length<2){const e=new Error('Feature name is required');e.code='INVALID_FEATURE';throw e}
  if(!slug){const e=new Error('Feature slug is required');e.code='INVALID_FEATURE';throw e}
  return {
    name,slug,category:clean(input.category)||'Platform',
    short_description:clean(input.short_description),
    description:clean(input.description),
    icon:clean(input.icon)||'✦',
    status:ALLOWED_STATUS.includes(clean(input.status))?clean(input.status):'Planned',
    timeline:clean(input.timeline)||'Coming soon',
    sort_order:Number.isFinite(Number(input.sort_order))?Math.trunc(Number(input.sort_order)):0,
    highlighted:Boolean(input.highlighted),
    is_active:input.is_active!==false
  }
}
async function list(activeOnly=true){
  const result=await pool.query(`SELECT id,name,slug,category,short_description,description,icon,status,timeline,sort_order,highlighted,is_active,created_at,updated_at FROM upcoming_features ${activeOnly?'WHERE is_active=TRUE':''} ORDER BY sort_order ASC,id ASC`);
  return result.rows
}
async function get(id){return (await pool.query('SELECT * FROM upcoming_features WHERE id=$1',[id])).rows[0]||null}
async function create(input){
  const v=normalize(input);
  const result=await pool.query(`INSERT INTO upcoming_features(name,slug,category,short_description,description,icon,status,timeline,sort_order,highlighted,is_active)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
  [v.name,v.slug,v.category,v.short_description,v.description,v.icon,v.status,v.timeline,v.sort_order,v.highlighted,v.is_active]);
  return result.rows[0]
}
async function update(id,input){
  const current=await get(id);if(!current)return null;
  const v=normalize({...current,...input});
  const result=await pool.query(`UPDATE upcoming_features SET name=$1,slug=$2,category=$3,short_description=$4,description=$5,icon=$6,status=$7,timeline=$8,sort_order=$9,highlighted=$10,is_active=$11,updated_at=CURRENT_TIMESTAMP WHERE id=$12 RETURNING *`,
  [v.name,v.slug,v.category,v.short_description,v.description,v.icon,v.status,v.timeline,v.sort_order,v.highlighted,v.is_active,id]);
  return result.rows[0]
}
async function remove(id){return (await pool.query('DELETE FROM upcoming_features WHERE id=$1 RETURNING id',[id])).rows[0]||null}
module.exports={list,get,create,update,remove,ALLOWED_STATUS};