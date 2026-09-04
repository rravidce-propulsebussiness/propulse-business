const pool=require('../config/database');
const {leadSelect,maskLead,normalizeLeadType,isProMember}=require('./leadReadService');
const DEFAULT_PRICING={shares:[{shares:1,normal:0,pro:0},{shares:3,normal:0,pro:0},{shares:5,normal:0,pro:0}]};
const cleanJson=(v,fallback={})=>v&&typeof v==='object'&&!Array.isArray(v)?v:fallback;
const isPricingField=k=>{const n=String(k||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');return /^(normal|pro)(1|3|5)(share|shares)(price)?$/.test(n)||/^((normal|pro)(1|3|5)(share|shares)(price)?)$/.test(n)};
const sanitizeCustomFields=v=>{const src=cleanJson(v);const out={};for(const[k,val]of Object.entries(src)){if(!isPricingField(k)&&!/^exclusive(pricing|price)$/i.test(String(k)))out[k]=val;}return out;};
function mergePricing(base,sheet){const baseShares=Array.isArray(base?.shares)?base.shares:DEFAULT_PRICING.shares;if(!sheet||!Array.isArray(sheet.shares))return{shares:baseShares};const source=new Map(sheet.shares.map(x=>[Number(x.shares),x]));const keys=[...new Set([...baseShares.map(x=>Number(x.shares)),...source.keys()])].filter(Number.isFinite).sort((a,b)=>a-b);return{shares:keys.map(n=>{const b=baseShares.find(x=>Number(x.shares)===n)||{shares:n,normal:0,pro:0};const s=source.get(n);return{shares:n,normal:s?.normal!==null&&s?.normal!==undefined&&s?.normal!==''?Number(s.normal):Number(b.normal||0),pro:s?.pro!==null&&s?.pro!==undefined&&s?.pro!==''?Number(s.pro):Number(b.pro||0)}})};}
async function getConfiguredPricing(industryId,cityId,leadType='basic'){const type=normalizeLeadType(leadType)||'basic';const r=await pool.query(`SELECT pricing FROM lead_pricing_rules WHERE is_active=TRUE AND lead_type=$3 AND (industry_id=$1 OR industry_id IS NULL) AND (city_id=$2 OR city_id IS NULL) ORDER BY CASE WHEN industry_id IS NOT NULL AND city_id IS NOT NULL THEN 3 WHEN industry_id IS NOT NULL THEN 2 WHEN city_id IS NOT NULL THEN 1 ELSE 0 END DESC LIMIT 1`,[industryId||null,cityId||null,type]);const pricing=cleanJson(r.rows[0]?.pricing,DEFAULT_PRICING);return{shares:Array.isArray(pricing.shares)?pricing.shares:DEFAULT_PRICING.shares};}
async function findDuplicateLead({industryId,customerPhone,customerEmail,customerName,requirement}){const phone=String(customerPhone||'').replace(/\D/g,'');const email=String(customerEmail||'').trim().toLowerCase();const name=String(customerName||'').trim().toLowerCase();const req=String(requirement||'').trim().toLowerCase();if(phone.length>=7){const r=await pool.query(`SELECT id,customer_name FROM leads WHERE industry_id=$1 AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=$2 LIMIT 1`,[industryId,phone]);if(r.rows[0])return r.rows[0];}if(email){const r=await pool.query(`SELECT id,customer_name FROM leads WHERE industry_id=$1 AND LOWER(TRIM(COALESCE(customer_email,'')))=$2 LIMIT 1`,[industryId,email]);if(r.rows[0])return r.rows[0];}if(name&&req){const r=await pool.query(`SELECT id,customer_name FROM leads WHERE industry_id=$1 AND LOWER(TRIM(COALESCE(customer_name,'')))=$2 AND LOWER(TRIM(COALESCE(requirement,'')))=$3 LIMIT 1`,[industryId,name,req]);if(r.rows[0])return r.rows[0];}return null;}
async function createLead({industryId,serviceId,subserviceId,stateId,cityId,customerName,customerPhone,customerEmail,requirement,propertyType,budget,source,notes,customFields,pricing,pricingSource,leadType='basic',isExclusive=false,exclusiveDelayDays,exclusiveDelayHours,pincode,zipcode,createdBy}){if(!industryId)throw new Error('Industry is required');const duplicate=await findDuplicateLead({industryId,customerPhone,customerEmail,customerName,requirement});if(duplicate){const error=new Error(`Duplicate lead: this lead already exists${duplicate.customer_name?` (${duplicate.customer_name})`:''}.`);error.code='DUPLICATE_LEAD';error.leadId=duplicate.id;throw error;}const type=normalizeLeadType(leadType)||'basic';const configured=await getConfiguredPricing(industryId,cityId,type);const effectivePricing=pricingSource==='sheet'&&pricing?mergePricing(configured,pricing):configured;const exclusive=Boolean(isExclusive);const requestedDays=exclusiveDelayDays!==undefined&&exclusiveDelayDays!==null&&exclusiveDelayDays!==''?Number(exclusiveDelayDays):(exclusiveDelayHours!==undefined&&exclusiveDelayHours!==null&&exclusiveDelayHours!==''?Number(exclusiveDelayHours)/24:1);const delay=exclusive?Math.max(1,Math.min(365,Number.isFinite(requestedDays)?requestedDays:1)):0;const result=await pool.query(`INSERT INTO leads (industry_id,service_id,subservice_id,state_id,city_id,customer_name,customer_phone,customer_email,requirement,property_type,budget,source,notes,custom_fields,pricing,lead_type,is_exclusive,exclusive_delay_days,pincode,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20) RETURNING *`,[industryId,serviceId||null,subserviceId||null,stateId||null,cityId||null,customerName||null,customerPhone||null,customerEmail||null,requirement||null,propertyType||null,budget??null,source||'upload',notes||null,JSON.stringify(sanitizeCustomFields(customFields)),JSON.stringify(effectivePricing),type,exclusive,delay,pincode||zipcode||null,createdBy||null]);return result.rows[0];}
async function hasLeadAccess(userId,leadId){if(!userId)return false;const r=await pool.query(`SELECT 1 FROM lead_purchases WHERE user_id=$1 AND lead_id=$2 AND status='paid' UNION ALL SELECT 1 FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2 AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP) LIMIT 1`,[userId,leadId]);return r.rows.length>0;}
async function getLeadById(id,userId,role){const lead=(await pool.query(`${leadSelect} WHERE l.id=$1`,[id])).rows[0]||null;if(!lead)return null;if(role==='admin'||await hasLeadAccess(userId,id))return lead;return maskLead(lead);}
async function getLeads({industryId,serviceId,subserviceId,stateId,cityId,status='available',leadType,userId,role}){const v=[],c=[];if(status&&status!=='all'){v.push(status);c.push(`l.status=$${v.length}`)}if(leadType){v.push(normalizeLeadType(leadType)||'basic');c.push(`l.lead_type=$${v.length}`)}if(industryId){v.push(industryId);c.push(`l.industry_id=$${v.length}`)}if(serviceId){v.push(serviceId);c.push(`l.service_id=$${v.length}`)}if(subserviceId){v.push(subserviceId);c.push(`l.subservice_id=$${v.length}`)}if(stateId){v.push(stateId);c.push(`l.state_id=$${v.length}`)}if(cityId){v.push(cityId);c.push(`l.city_id=$${v.length}`)}if(!userId&&!role){const publicRows=(await pool.query(`${leadSelect} ${c.length?`WHERE ${c.join(' AND ')}`:''} ORDER BY l.created_at DESC`,v)).rows;return publicRows.map(row=>({...maskLead(row),is_pro_member:false,has_exclusive_option:false,exclusive_available:false,exclusive_can_buy:false,exclusive_action:'login_to_buy'}));}let pro=false;if(role!=='admin'){pro=await isProMember(userId);v.push(userId);c.push(`EXISTS (SELECT 1 FROM business_profiles bp JOIN business_profile_services bps ON bps.business_profile_id=bp.id WHERE bp.user_id=$${v.length} AND bps.is_active=TRUE AND (l.industry_id IS NULL OR bps.industry_id=l.industry_id) AND (l.service_id IS NULL OR bps.service_id=l.service_id) AND (l.subservice_id IS NULL OR bps.subservice_id IS NULL OR bps.subservice_id=l.subservice_id))`);v.push(userId);c.push(`EXISTS (SELECT 1 FROM business_profiles bp JOIN business_profile_locations bpl ON bpl.business_profile_id=bp.id WHERE bp.user_id=$${v.length} AND bpl.is_active=TRUE AND (l.state_id IS NULL OR bpl.state_id=l.state_id) AND (l.city_id IS NULL OR bpl.city_id=l.city_id))`);}const rows=(await pool.query(`${leadSelect} ${c.length?`WHERE ${c.join(' AND ')}`:''} ORDER BY l.created_at DESC`,v)).rows;if(role==='admin')return rows;const access=(await pool.query(`SELECT lead_id FROM lead_purchases WHERE user_id=$1 AND status='paid' UNION SELECT lead_id FROM lead_entitlement_claims WHERE user_id=$1 AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP)`,[userId])).rows;const accessIds=new Set(access.map(x=>Number(x.lead_id)));return rows.map(row=>{const exclusive=Boolean(row.is_exclusive);const expired=!exclusive||!row.exclusive_available_at||new Date(row.exclusive_available_at)<=new Date();const owned=accessIds.has(Number(row.id));const visible=owned;const base=visible?row:maskLead(row);return{...base,is_purchased:owned,is_accessible:owned,is_pro_member:pro,has_exclusive_option:exclusive,exclusive_available:exclusive&&(pro||expired),exclusive_can_buy:!owned&&exclusive&&(pro||expired),exclusive_action:owned?'access_granted':(!exclusive?'buy':(pro||expired?'buy':'upgrade_to_pro'))};});}
async function updateLead(id,data){const{industryId,serviceId,subserviceId,stateId,cityId,customerName,customerPhone,customerEmail,requirement,propertyType,budget,source,status,notes,customFields,pricing,leadType,isExclusive,exclusiveDelayDays,pincode,zipcode}=data;if(!industryId)throw new Error('Industry is required');const type=normalizeLeadType(leadType)||'basic';const exclusive=Boolean(isExclusive);const delay=exclusive?Math.max(1,Math.min(365,Number(exclusiveDelayDays===undefined||exclusiveDelayDays===null||exclusiveDelayDays===''?1:exclusiveDelayDays))):0;const result=await pool.query(`UPDATE leads SET industry_id=$1,service_id=$2,subservice_id=$3,state_id=$4,city_id=$5,customer_name=$6,customer_phone=$7,customer_email=$8,requirement=$9,property_type=$10,budget=$11,source=$12,status=$13,notes=$14,custom_fields=$15::jsonb,pricing=$16::jsonb,lead_type=$17,is_exclusive=$18,exclusive_delay_days=$19,pincode=$20,updated_at=CURRENT_TIMESTAMP WHERE id=$21 RETURNING *`,[industryId,serviceId||null,subserviceId||null,stateId||null,cityId||null,customerName||null,customerPhone||null,customerEmail||null,requirement||null,propertyType||null,budget??null,source||'upload',status||'available',notes||null,JSON.stringify(sanitizeCustomFields(customFields)),JSON.stringify(cleanJson(pricing,DEFAULT_PRICING)),type,exclusive,delay,pincode||zipcode||null,id]);return result.rows[0]||null;}
async function updateLeadStatus(id,status){return(await pool.query('UPDATE leads SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[status,id])).rows[0]||null}
async function deleteLead(id){return(await pool.query('DELETE FROM leads WHERE id=$1 RETURNING *',[id])).rows[0]||null}
async function getLeadPricing(){return(await pool.query('SELECT * FROM lead_pricing WHERE id=1')).rows[0]||null}
async function updateLeadPricing(data){const values=[Number(data.normal?.oneShare||0),Number(data.normal?.threeShares||0),Number(data.normal?.fiveShares||0),Number(data.pro?.oneShare||0),Number(data.pro?.threeShares||0),Number(data.pro?.fiveShares||0)];if(values.some(v=>!Number.isFinite(v)||v<0))throw Error('Pricing values must be non-negative numbers');return(await pool.query(`INSERT INTO lead_pricing (id,normal_one_share,normal_three_shares,normal_five_shares,pro_one_share,pro_three_shares,pro_five_shares,updated_at) VALUES (1,$1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET normal_one_share=EXCLUDED.normal_one_share,normal_three_shares=EXCLUDED.normal_three_shares,normal_five_shares=EXCLUDED.normal_five_shares,pro_one_share=EXCLUDED.pro_one_share,pro_three_shares=EXCLUDED.pro_three_shares,pro_five_shares=EXCLUDED.pro_five_shares,updated_at=CURRENT_TIMESTAMP RETURNING *`,values)).rows[0]}

function normalizeRulePricing(value){
  const pricing=cleanJson(value,DEFAULT_PRICING);
  if(!Array.isArray(pricing.shares)||pricing.shares.length===0) throw Object.assign(new Error('At least one pricing tier is required'),{code:'INVALID_PRICING_RULE'});
  const seen=new Set();
  const shares=pricing.shares.map(item=>{
    const shareCount=Number(item?.shares);
    const normal=Number(item?.normal);
    const pro=Number(item?.pro);
    if(!Number.isInteger(shareCount)||shareCount<=0||seen.has(shareCount)) throw Object.assign(new Error('Share tiers must be unique positive integers'),{code:'INVALID_PRICING_RULE'});
    if(!Number.isFinite(normal)||normal<0||!Number.isFinite(pro)||pro<0) throw Object.assign(new Error('Normal and Pro prices must be non-negative numbers'),{code:'INVALID_PRICING_RULE'});
    seen.add(shareCount);
    return {shares:shareCount,normal,pro};
  }).sort((a,b)=>a.shares-b.shares);
  return {shares};
}

async function getPricingRules(){
  const result=await pool.query(`
    SELECT r.id,r.industry_id,i.name AS industry_name,r.city_id,c.name AS city_name,
           r.lead_type,r.pricing,r.is_active,r.created_at,r.updated_at
    FROM lead_pricing_rules r
    LEFT JOIN industries i ON i.id=r.industry_id
    LEFT JOIN cities c ON c.id=r.city_id
    ORDER BY r.lead_type ASC,i.name ASC NULLS FIRST,c.name ASC NULLS FIRST,r.id ASC
  `);
  return result.rows;
}

async function savePricingRule(data={}){
  const industryId=data.industryId===''||data.industryId===undefined||data.industryId===null?null:Number(data.industryId);
  const cityId=data.cityId===''||data.cityId===undefined||data.cityId===null?null:Number(data.cityId);
  const leadType=normalizeLeadType(data.leadType)||'basic';
  if(industryId!==null&&(!Number.isInteger(industryId)||industryId<=0)) throw Object.assign(new Error('Invalid industry'),{code:'INVALID_PRICING_RULE'});
  if(cityId!==null&&(!Number.isInteger(cityId)||cityId<=0)) throw Object.assign(new Error('Invalid city'),{code:'INVALID_PRICING_RULE'});
  const pricing=normalizeRulePricing(data.pricing);
  const isActive=data.isActive!==false;
  if(industryId!==null){const r=await pool.query('SELECT 1 FROM industries WHERE id=$1 AND is_active=TRUE',[industryId]);if(!r.rows.length)throw Object.assign(new Error('Selected industry is not active'),{code:'INVALID_PRICING_RULE'});}
  if(cityId!==null){const r=await pool.query('SELECT 1 FROM cities WHERE id=$1 AND is_active=TRUE',[cityId]);if(!r.rows.length)throw Object.assign(new Error('Selected city is not active'),{code:'INVALID_PRICING_RULE'});}
  const id=data.id===undefined||data.id===null||data.id===''?null:Number(data.id);
  if(id!==null){
    if(!Number.isInteger(id)||id<=0)throw Object.assign(new Error('Invalid pricing rule id'),{code:'INVALID_PRICING_RULE'});
    const result=await pool.query(`UPDATE lead_pricing_rules SET industry_id=$1,city_id=$2,lead_type=$3,pricing=$4::jsonb,is_active=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *`,[industryId,cityId,leadType,JSON.stringify(pricing),isActive,id]);
    if(!result.rows[0])throw Object.assign(new Error('Pricing rule not found'),{code:'PRICING_RULE_NOT_FOUND'});
    return result.rows[0];
  }
  const existing=await pool.query(`SELECT id FROM lead_pricing_rules WHERE industry_id IS NOT DISTINCT FROM $1 AND city_id IS NOT DISTINCT FROM $2 AND lead_type=$3 LIMIT 1`,[industryId,cityId,leadType]);
  if(existing.rows[0]){
    const result=await pool.query(`UPDATE lead_pricing_rules SET pricing=$1::jsonb,is_active=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *`,[JSON.stringify(pricing),isActive,existing.rows[0].id]);
    return result.rows[0];
  }
  const result=await pool.query(`INSERT INTO lead_pricing_rules(industry_id,city_id,lead_type,pricing,is_active) VALUES($1,$2,$3,$4::jsonb,$5) RETURNING *`,[industryId,cityId,leadType,JSON.stringify(pricing),isActive]);
  return result.rows[0];
}

async function deletePricingRule(id){
  const ruleId=Number(id);
  if(!Number.isInteger(ruleId)||ruleId<=0)throw Object.assign(new Error('Invalid pricing rule id'),{code:'INVALID_PRICING_RULE'});
  return (await pool.query('DELETE FROM lead_pricing_rules WHERE id=$1 RETURNING *',[ruleId])).rows[0]||null;
}

module.exports={createLead,getLeadById,getLeads,updateLead,updateLeadStatus,deleteLead,getLeadPricing,updateLeadPricing,getConfiguredPricing,isProMember,getPricingRules,savePricingRule,deletePricingRule};