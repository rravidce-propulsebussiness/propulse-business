const pool=require('../config/database');

const AUDIENCES=['website','users','lead_partners','common'];
const MAX_URL_LENGTH=2048;

function clean(value){return String(value??'').trim()}
function normalizeAudience(value){
  const audience=clean(value||'website').toLowerCase();
  if(!AUDIENCES.includes(audience)){const e=new Error('Invalid contact audience');e.code='INVALID_AUDIENCE';throw e}
  return audience;
}
function normalizeHttpsUrl(value,field){
  const raw=clean(value);
  if(!raw) return '';
  if(raw.length>MAX_URL_LENGTH){const e=new Error(field+' URL is too long');e.code='INVALID_CONTACT_URL';throw e}
  let url;
  try{url=new URL(raw)}catch{const e=new Error(field+' must be a valid HTTPS URL');e.code='INVALID_CONTACT_URL';throw e}
  if(url.protocol!=='https:'||url.username||url.password){const e=new Error(field+' must be a valid HTTPS URL');e.code='INVALID_CONTACT_URL';throw e}
  return url.toString();
}
function normalizeWebsiteUrl(value){
  const raw=clean(value)||'/';
  if(raw.length>MAX_URL_LENGTH){const e=new Error('Website URL is too long');e.code='INVALID_CONTACT_URL';throw e}
  if(raw.startsWith('/')&&!raw.startsWith('//')&&!/[\\\r\n]/.test(raw)) return raw;
  return normalizeHttpsUrl(raw,'Website');
}
function normalizeSocials(value){
  if(!Array.isArray(value)) return [];
  return value.map((item,index)=>({
    id:clean(item?.id)||`social-${index+1}`,
    platform:clean(item?.platform)||'Social',
    url:normalizeHttpsUrl(item?.url,'Social'),
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
    maps_url:normalizeHttpsUrl(input.maps_url,'Maps'),
    website_url:normalizeWebsiteUrl(input.website_url),
    social_handles:normalizeSocials(input.social_handles)
  };
}
function empty(audience){return {audience,...normalize({})}}
async function get(audience='website'){
  const key=normalizeAudience(audience);
  const result=await pool.query(`SELECT audience,company_name,email,phone,whatsapp,address,business_hours,support_email,careers_email,maps_url,website_url,social_handles,updated_at FROM contact_audience_settings WHERE audience=$1`,[key]);
  if(!result.rows[0]) return empty(key);
  return result.rows[0];
}
async function update(input,audience='website'){
  const key=normalizeAudience(audience);
  const value=normalize(input);
  if(key!=='common' && value.company_name.length<2){const e=new Error('Company name is required');e.code='INVALID_COMPANY';throw e}
  const result=await pool.query(
    `INSERT INTO contact_audience_settings(audience,company_name,email,phone,whatsapp,address,business_hours,support_email,careers_email,maps_url,website_url,social_handles)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT(audience) DO UPDATE SET company_name=EXCLUDED.company_name,email=EXCLUDED.email,phone=EXCLUDED.phone,whatsapp=EXCLUDED.whatsapp,address=EXCLUDED.address,business_hours=EXCLUDED.business_hours,support_email=EXCLUDED.support_email,careers_email=EXCLUDED.careers_email,maps_url=EXCLUDED.maps_url,website_url=EXCLUDED.website_url,social_handles=EXCLUDED.social_handles,updated_at=CURRENT_TIMESTAMP
     RETURNING audience,company_name,email,phone,whatsapp,address,business_hours,support_email,careers_email,maps_url,website_url,social_handles,updated_at`,
    [key,value.company_name,value.email,value.phone,value.whatsapp,value.address,value.business_hours,value.support_email,value.careers_email,value.maps_url,value.website_url,JSON.stringify(value.social_handles)]
  );
  return result.rows[0];
}
module.exports={AUDIENCES,get,update,normalize};
