const pool=require('../config/database');
const ALLOWED_STATUS=['Planned','In development','Researching','Coming soon','Future release'];
const ALLOWED_AUDIENCES=['homeowner','professional'];
function cleanText(v){return String(v??'').trim()}
function audienceFrom(value){
  const audience=String(value||'professional').trim().toLowerCase();
  if(!ALLOWED_AUDIENCES.includes(audience)){
    const e=new Error('Invalid roadmap audience');e.code='INVALID_FEATURE';throw e;
  }
  return audience;
}
function normalize(input={}){
  const name=cleanText(input.name);
  const slug=cleanText(input.slug||name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(name.length<2){const e=new Error('Feature name is required');e.code='INVALID_FEATURE';throw e}
  if(!slug){const e=new Error('Feature slug is required');e.code='INVALID_FEATURE';throw e}
  return {
    name,slug,audience:audienceFrom(input.audience),category:cleanText(input.category)||'Platform',
    short_description:cleanText(input.short_description),
    description:cleanText(input.description),
    icon:cleanText(input.icon)||'✦',
    status:ALLOWED_STATUS.includes(cleanText(input.status))?cleanText(input.status):'Planned',
    timeline:cleanText(input.timeline)||'Coming soon',
    sort_order:Number.isFinite(Number(input.sort_order))?Math.trunc(Number(input.sort_order)):0,
    highlighted:Boolean(input.highlighted),
    is_active:input.is_active!==false
  };
}
async function list(activeOnly=true,audience=null){
  const normalized=audience==null?null:audienceFrom(audience);
  const conditions=[],values=[];
  if(activeOnly)conditions.push('is_active=TRUE');
  if(normalized){
    values.push(normalized);
    conditions.push('audience=$'+values.length);
  }
  const where=conditions.length?' WHERE '+conditions.join(' AND '):'';
  const result=await pool.query(
    'SELECT id,name,slug,audience,category,short_description,description,icon,status,timeline,sort_order,highlighted,is_active,created_at,updated_at FROM upcoming_features'+where+' ORDER BY sort_order ASC,id ASC',
    values
  );
  return result.rows;
}
async function get(id){return (await pool.query('SELECT * FROM upcoming_features WHERE id=$1',[id])).rows[0]||null}
async function create(input){
  const v=normalize(input);
  const result=await pool.query(`INSERT INTO upcoming_features(name,slug,audience,category,short_description,description,icon,status,timeline,sort_order,highlighted,is_active)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
  [v.name,v.slug,v.audience,v.category,v.short_description,v.description,v.icon,v.status,v.timeline,v.sort_order,v.highlighted,v.is_active]);
  return result.rows[0];
}
async function update(id,input){
  const current=await get(id);if(!current)return null;
  const v=normalize({...current,...input});
  const result=await pool.query(`UPDATE upcoming_features SET name=$1,slug=$2,audience=$3,category=$4,short_description=$5,description=$6,icon=$7,status=$8,timeline=$9,sort_order=$10,highlighted=$11,is_active=$12,updated_at=CURRENT_TIMESTAMP WHERE id=$13 RETURNING *`,
  [v.name,v.slug,v.audience,v.category,v.short_description,v.description,v.icon,v.status,v.timeline,v.sort_order,v.highlighted,v.is_active,id]);
  return result.rows[0];
}
async function remove(id){return (await pool.query('DELETE FROM upcoming_features WHERE id=$1 RETURNING id',[id])).rows[0]||null}
module.exports={list,get,create,update,remove,ALLOWED_STATUS,ALLOWED_AUDIENCES,audienceFrom};
