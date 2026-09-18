const pool=require('../config/database');

function clean(value){return String(value??'').trim()}
function normalizeSocials(value){
  if(!Array.isArray(value)) return [];
  return value.map((item,index)=>({
    id:clean(item?.id)||`social-${index+1}`,
    platform:clean(item?.platform)||'Social',
    url:clean(item?.url),
    enabled:item?.enabled!==false
  })).filter(item=>item.platform.length>=2);
}
function normalize(input={}){
  return {
    company_name:clean(input.company_name),
    email:clean(input.email),
    phone:clean(input.phone),
    whatsapp:clean(input.whatsapp),
    address:clean(input.address),
    business_hours:clean(input.business_hours),
    support_email:clean(input.support_email),
    careers_email:clean(input.careers_email),
    maps_url:clean(input.maps_url),
    website_url:clean(input.website_url)||'/',
    social_handles:normalizeSocials(input.social_handles)
  };
}
async function get(){
  const result=await pool.query(`SELECT id,company_name,email,phone,whatsapp,address,business_hours,support_email,careers_email,maps_url,website_url,social_handles,updated_at FROM contact_settings WHERE id=1`);
  if(!result.rows[0]) return normalize({});
  return result.rows[0];
}
async function update(input){
  const value=normalize(input);
  if(value.company_name.length<2) {const e=new Error('Company name is required');e.code='INVALID_COMPANY';throw e}
  const result=await pool.query(
    `INSERT INTO contact_settings(id,company_name,email,phone,whatsapp,address,business_hours,support_email,careers_email,maps_url,website_url,social_handles)
     VALUES(1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(id) DO UPDATE SET company_name=EXCLUDED.company_name,email=EXCLUDED.email,phone=EXCLUDED.phone,whatsapp=EXCLUDED.whatsapp,address=EXCLUDED.address,business_hours=EXCLUDED.business_hours,support_email=EXCLUDED.support_email,careers_email=EXCLUDED.careers_email,maps_url=EXCLUDED.maps_url,website_url=EXCLUDED.website_url,social_handles=EXCLUDED.social_handles,updated_at=CURRENT_TIMESTAMP
     RETURNING id,company_name,email,phone,whatsapp,address,business_hours,support_email,careers_email,maps_url,website_url,social_handles,updated_at`,
    [value.company_name,value.email,value.phone,value.whatsapp,value.address,value.business_hours,value.support_email,value.careers_email,value.maps_url,value.website_url,JSON.stringify(value.social_handles)]
  );
  return result.rows[0];
}
module.exports={get,update};