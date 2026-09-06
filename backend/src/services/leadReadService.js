const pool=require('../config/database');

const leadSelect=`SELECT l.*,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,c.name AS city_name,iu.name AS investor_name,iu.email AS investor_email,CASE WHEN l.is_exclusive THEN (l.created_at + make_interval(days => l.exclusive_delay_days)) ELSE NULL END AS exclusive_available_at FROM leads l LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities c ON c.id=l.city_id LEFT JOIN users iu ON iu.id=l.investor_user_id`;

const normalizeLeadPricing=pricing=>{
  const shares=Array.isArray(pricing?.shares)?pricing.shares:[];
  const counts=new Set(shares.map(x=>Number(x?.shares)));
  if(counts.has(1)&&counts.has(2)&&counts.has(3)&&counts.has(5))return{...pricing,shares:shares.filter(x=>Number(x?.shares)!==5)};
  return pricing;
};
const normalizeLeadRow=row=>row?({...row,pricing:normalizeLeadPricing(row.pricing)}):row;
const maskLead=row=>({...normalizeLeadRow(row),customer_name:null,customer_phone:null,customer_email:null,notes:null,custom_fields:{}});

const normalizeLeadType=v=>['basic','premium'].includes(String(v||'').toLowerCase())?String(v).toLowerCase():null;

async function isProMember(userId){
  if(!userId)return false;
  const r=await pool.query(`SELECT 1 FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>=CURRENT_TIMESTAMP AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro' AND mp.is_active=TRUE LIMIT 1`,[userId]);
  return r.rows.length>0;
}

module.exports={leadSelect,maskLead,normalizeLeadRow,normalizeLeadPricing,normalizeLeadType,isProMember};
