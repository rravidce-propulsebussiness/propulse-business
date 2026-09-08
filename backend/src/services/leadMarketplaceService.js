const pool=require('../config/database');const {leadSelect,maskLead,normalizeLeadType,isProMember}=require('./leadReadService');

async function getMarketplacePage({industryId,serviceId,subserviceId,stateId,cityId,status='available',leadType,search,allIndustries,userId,role,page=1,limit=20}){
 const safePage=Math.max(1,Number.parseInt(page,10)||1);const safeLimit=Math.min(50,Math.max(1,Number.parseInt(limit,10)||20));const values=[];const conditions=[];const add=(value,sql)=>{values.push(value);conditions.push(sql.replace('?',`$${values.length}`))};
 if(status&&status!=='all')add(status,'l.status=?');
 const type=normalizeLeadType(leadType);if(type)add(type,'l.lead_type=?');
 if(industryId&&String(industryId).toLowerCase()!=='all')add(industryId,'l.industry_id=?');
 if(serviceId)add(serviceId,'l.service_id=?');if(subserviceId)add(subserviceId,'l.subservice_id=?');if(stateId)add(stateId,'l.state_id=?');if(cityId)add(cityId,'l.city_id=?');
 const q=String(search||'').trim().toLowerCase();if(q){values.push(`%${q}%`);const p=`$${values.length}`;conditions.push(`(LOWER(COALESCE(i.name,'')) LIKE ${p} OR LOWER(COALESCE(s.name,'')) LIKE ${p} OR LOWER(COALESCE(ss.name,'')) LIKE ${p} OR LOWER(COALESCE(c.name,'')) LIKE ${p} OR LOWER(COALESCE(st.name,'')) LIKE ${p} OR LOWER(COALESCE(l.requirement,'')) LIKE ${p})`)}
 // Customer default matching: every available lead in any active profile industry AND any active profile state. City/service filters remain optional refinements.
 if(role!=='admin'&&userId&&!String(allIndustries||'').match(/^(1|true)$/i)){
   values.push(userId);const p=`$${values.length}`;
   conditions.push(`EXISTS (
     SELECT 1
     FROM business_profiles bp
     JOIN business_profile_services bps ON bps.business_profile_id=bp.id AND bps.is_active=TRUE
     WHERE bp.user_id=${p}
       AND l.industry_id=bps.industry_id
   )`);
   values.push(userId);const p2=`$${values.length}`;
   conditions.push(`EXISTS (
     SELECT 1
     FROM business_profiles bp2
     JOIN business_profile_locations bpl ON bpl.business_profile_id=bp2.id AND bpl.is_active=TRUE
     WHERE bp2.user_id=${p2}
       AND l.state_id=bpl.state_id
   )`);
 }
 if(role!=='admin'&&userId){values.push(userId);const p3=`$${values.length}`;conditions.push(`NOT EXISTS (SELECT 1 FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.user_id=${p3} AND lp.status IN ('paid','pending_payment'))`)}
 const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
 const from=`leads l LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities c ON c.id=l.city_id`;
 const count=await pool.query(`SELECT COUNT(*)::int AS total FROM ${from} ${where}`,values);const total=Number(count.rows[0]?.total||0);const offset=(safePage-1)*safeLimit;
 const pageValues=[...values,safeLimit,offset];
 const rows=(await pool.query(`${leadSelect} ${where} ORDER BY l.created_at DESC,l.id DESC LIMIT $${pageValues.length-1} OFFSET $${pageValues.length}`,pageValues)).rows;
 if(role==='admin')return rows;
 const pro=await isProMember(userId);const items=rows.map(row=>({...maskLead(row),is_purchased:false,is_accessible:false,is_pro_member:pro,has_exclusive_option:Boolean(row.is_exclusive),exclusive_available:Boolean(row.is_exclusive)&&(!row.exclusive_available_at||new Date(row.exclusive_available_at)<=new Date()||pro),exclusive_can_buy:Boolean(row.is_exclusive)&&(!row.exclusive_available_at||new Date(row.exclusive_available_at)<=new Date()||pro),exclusive_action:'buy'}));
 return{items,pagination:{page:safePage,limit:safeLimit,total,hasNext:offset+rows.length<total,hasPrevious:safePage>1}};
}
module.exports={getMarketplacePage};
