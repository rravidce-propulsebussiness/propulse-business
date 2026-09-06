const pool=require('../config/database');

const leadSelect=`SELECT l.*,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,c.name AS city_name,iu.name AS investor_name,iu.email AS investor_email,CASE WHEN l.is_exclusive THEN (l.created_at + make_interval(days => l.exclusive_delay_days)) ELSE NULL END AS exclusive_available_at FROM leads l LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities c ON c.id=l.city_id LEFT JOIN users iu ON iu.id=l.investor_user_id`;

const normalizeLeadPricing=pricing=>{
  const shares=Array.isArray(pricing?.shares)?pricing.shares:[];
  const counts=new Set(shares.map(x=>Number(x?.shares)));
  if(counts.has(1)&&counts.has(2)&&counts.has(3)&&counts.has(5))return{...pricing,shares:shares.filter(x=>Number(x?.shares)!==5)};
  return pricing;
};
const normalizeBuyerCapacity=row=>{const custom=row?.custom_fields&&typeof row.custom_fields==='object'&&!Array.isArray(row.custom_fields)?row.custom_fields:{};const raw=Number(row?.buyer_capacity??custom.buyerCapacity);return Number.isFinite(raw)&&raw>=2?Math.floor(raw):3;};
const customValue=(custom,names)=>{if(!custom||typeof custom!=='object'||Array.isArray(custom))return'';const normalizedNames=names.map(name=>String(name).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,''));const key=Object.keys(custom).find(k=>normalizedNames.includes(String(k).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,''))&&String(custom[k]??'').trim());return key?String(custom[key]).trim():''};
const normalizeLeadRow=row=>{if(!row)return row;const custom=row?.custom_fields&&typeof row.custom_fields==='object'&&!Array.isArray(row.custom_fields)?row.custom_fields:{};const requirement=String(row.requirement??'').trim()||customValue(custom,['Requirement','Requirements','Requirement Details','Share More Details and Requirement']);return{...row,buyer_capacity:normalizeBuyerCapacity(row),requirement,pricing:normalizeLeadPricing(row.pricing)};};
const dynamicLabel=k=>String(k??'').trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const buildDynamicDetails=row=>{const custom=row?.custom_fields&&typeof row.custom_fields==='object'&&!Array.isArray(row.custom_fields)?row.custom_fields:{};const excluded=new Set(['buyerCapacity','pricing','leadPricing','leadPrice','price','exclusivePricing','exclusivePrice']);return Object.entries(custom).filter(([key,value])=>!excluded.has(key)&&String(value??'').trim()).map(([key,value])=>({key,label:dynamicLabel(key),value:String(value).trim()}));};
const appendAdminDynamicDetails=row=>{const normalized=normalizeLeadRow(row);return{...normalized,dynamic_details:buildDynamicDetails(normalized)};};
const maskLead=row=>({...normalizeLeadRow(row),customer_name:null,customer_phone:null,customer_email:null,notes:null,custom_fields:{}});

const normalizeLeadType=v=>['basic','premium'].includes(String(v||'').toLowerCase())?String(v).toLowerCase():null;

async function isProMember(userId){
  if(!userId)return false;
  const r=await pool.query(`SELECT 1 FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>=CURRENT_TIMESTAMP AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro' AND mp.is_active=TRUE LIMIT 1`,[userId]);
  return r.rows.length>0;
}

module.exports={leadSelect,maskLead,normalizeLeadRow,normalizeLeadPricing,normalizeLeadType,isProMember,appendAdminDynamicDetails,buildDynamicDetails};
