const pool=require('../config/database');
const projectPlanService=require('./projectPlanService');

function bad(message){return Object.assign(new Error(message),{code:'INVALID_BROCHURE'});}
function normalize(items,userId){
  if(!Array.isArray(items)||items.length>8)throw bad('Add up to 8 brochures');
  return items.map((item,index)=>{
    const title=String(item?.title||'').trim();
    const description=String(item?.description||'').trim();
    const url=String(item?.fileUrl||item?.file_url||'').trim();
    if(!title||title.length>160||description.length>500)throw bad('Enter a title (160 characters maximum) and a short description');
    if(!url||!projectPlanService.managedPlanInfo(userId,url))throw bad('Upload a brochure PDF or image to your account first');
    return {title,description,url,sortOrder:index,isPublished:item?.isPublished!==false};
  });
}
async function profileId(userId,client=pool){
  const r=await client.query('SELECT id FROM business_profiles WHERE user_id=$1',[userId]);
  if(!r.rowCount)throw bad('Business profile not found');
  return r.rows[0].id;
}
async function decorate(rows,{includeStored=false}={}){
  return Promise.all(rows.map(async row=>({
    ...row,
    ...(includeStored?{stored_url:row.file_url}:{}),
    file_url:await projectPlanService.displayUrl(row.file_url),
  })));
}
async function listMine(userId){
  const id=await profileId(userId);
  return decorate((await pool.query(
    'SELECT id,title,description,file_url,sort_order,is_published FROM business_profile_brochures WHERE business_profile_id=$1 ORDER BY sort_order,id',[id]
  )).rows,{includeStored:true});
}
async function listPublic(id){
  const rows=(await pool.query(
    'SELECT id,title,description,file_url FROM business_profile_brochures WHERE business_profile_id=$1 AND is_published=TRUE ORDER BY sort_order,id LIMIT 8',[id]
  )).rows;
  return decorate(rows);
}
async function saveMine(userId,items){
  const docs=normalize(items,userId);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const id=await profileId(userId,client);
    await client.query('DELETE FROM business_profile_brochures WHERE business_profile_id=$1',[id]);
    for(const item of docs){
      await client.query(
        'INSERT INTO business_profile_brochures(business_profile_id,title,description,file_url,sort_order,is_published) VALUES($1,$2,$3,$4,$5,$6)',
        [id,item.title,item.description,item.url,item.sortOrder,item.isPublished]
      );
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
  return listMine(userId);
}
module.exports={listMine,listPublic,saveMine};
