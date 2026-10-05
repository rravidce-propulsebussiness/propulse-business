const pool=require('../config/database');const criticalActionAudit=require('./criticalActionAuditService');const {leadSelect,maskLead,stripQualityGate,normalizeLeadRow,normalizeLeadType,isProMember,businessCustomFields}=require('./leadReadService');const accessService=require('./leadAccessStrategyService');const leadQualityGateService=require('./leadQualityGateService');
const DEFAULT_PRICING={shares:[{shares:1,normal:0,pro:0},{shares:2,normal:0,pro:0},{shares:3,normal:0,pro:0}]};
const cleanJson=(v,fallback={})=>v&&typeof v==='object'&&!Array.isArray(v)?v:fallback;
const isPricingField=k=>{const n=String(k||'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');return /^(normal|pro)\d+(share|shares|buyer|buyers)(price)?$/.test(n)};
const sanitizeCustomFields=v=>{const src=cleanJson(v);const out={};for(const[k,val]of Object.entries(src)){if(!isPricingField(k)&&!/^exclusive(pricing|price)$/i.test(String(k)))out[k]=val;}return out;};
const normalizeBuyerCapacity=v=>accessService.clampCapacity(v);
function normalizePricingRows(rows){return (Array.isArray(rows)?rows:[]).map(x=>({shares:Number(x?.shares),normal:Number(x?.normal),pro:Number(x?.pro)})).filter(x=>Number.isInteger(x.shares)&&x.shares>=1&&x.shares<=3&&Number.isFinite(x.normal)&&x.normal>=0&&Number.isFinite(x.pro)&&x.pro>=0).sort((a,b)=>a.shares-b.shares)}
function completePricingRows(rows){const normalized=normalizePricingRows(rows);if(!normalized.length)return DEFAULT_PRICING.shares.map(x=>({...x}));const by=new Map(normalized.map(x=>[x.shares,{...x}]));for(const shares of [1,2,3]){if(by.has(shares))continue;const source=by.get(shares===1?2:shares===2?3:2)||by.get(1)||by.get(3);if(source)by.set(shares,{shares,normal:source.normal,pro:source.pro})}return[1,2,3].map(shares=>by.get(shares)).filter(Boolean)}
function normalizeSheetPricingRows(rows){const out=[];for(const row of Array.isArray(rows)?rows:[]){const shares=Number(row?.shares);if(!Number.isInteger(shares)||shares<=0)continue;if(shares>3)throw Object.assign(new Error('Sheet pricing supports only 1, 2 and 3 buyer tiers'),{code:'INVALID_PRICING'});const next={shares};for(const tier of ['normal','pro']){const raw=row?.[tier];if(raw===undefined||raw===null||raw==='')continue;const value=Number(raw);if(!Number.isFinite(value)||value<0)throw new Error(`Sheet ${tier} price for ${shares} share(s) must be a non-negative number`);next[tier]=value}if(next.normal!==undefined||next.pro!==undefined)out.push(next)}return out.sort((a,b)=>a.shares-b.shares)}
function mergePricing(base,sheet){const configured=completePricingRows(base?.shares);const fallback=configured.length?configured:DEFAULT_PRICING.shares;const merged=new Map(fallback.map(row=>[Number(row.shares),{...row}]));const overrides=normalizeSheetPricingRows(sheet?.shares);if(!overrides.length)return{shares:[...merged.values()].sort((a,b)=>a.shares-b.shares)};for(const row of overrides){const current=merged.get(row.shares)||{shares:row.shares};const next={...current,...row};if(!Number.isFinite(next.normal)||next.normal<0||!Number.isFinite(next.pro)||next.pro<0)throw new Error(`Sheet pricing for ${row.shares} share(s) is incomplete. Provide both Normal and Pro prices or configure that tier in Admin Lead Pricing.`);merged.set(row.shares,next)}return{shares:[...merged.values()].sort((a,b)=>a.shares-b.shares)}}
async function getConfiguredPricing(industryId,cityId,leadType='basic'){const type=normalizeLeadType(leadType)||'basic';const r=await pool.query(`SELECT pricing FROM lead_pricing_rules WHERE is_active=TRUE AND lead_type=$3 AND (industry_id=$1 OR industry_id IS NULL) AND (city_id=$2 OR city_id IS NULL) ORDER BY CASE WHEN industry_id IS NOT NULL AND city_id IS NOT NULL THEN 3 WHEN industry_id IS NOT NULL THEN 2 WHEN city_id IS NOT NULL THEN 1 ELSE 0 END DESC LIMIT 1`,[industryId||null,cityId||null,type]);if(!r.rows[0])return{shares:[]};const pricing=cleanJson(r.rows[0].pricing,{shares:[]});return{shares:completePricingRows(pricing.shares)};}
function assertValidPricing(pricing){const rows=normalizePricingRows(pricing?.shares);const by=new Map(rows.map(x=>[x.shares,x]));for(const shares of [1,2,3]){const row=by.get(shares);if(!row||!(row.normal>0)||!(row.pro>0)){const error=new Error('Lead pricing is required. Configure positive Normal and Pro prices for 1, 2 and 3 buyers in Admin Lead Pricing, or enter a lead pricing override.');error.code='PRICING_REQUIRED';throw error}}return{shares:[1,2,3].map(shares=>by.get(shares))}}
function resolveEffectivePricing(configured,pricing,pricingSource){const rows=Array.isArray(pricing?.shares)?pricing.shares:[];const hasPositiveOverride=rows.some(row=>Number(row?.normal)>0||Number(row?.pro)>0);const hasExplicitInvalid=rows.some(row=>(row?.normal!==undefined&&row?.normal!==null&&row?.normal!==''&&Number(row.normal)<=0)||(row?.pro!==undefined&&row?.pro!==null&&row?.pro!==''&&Number(row.pro)<=0));const legacyEmpty=rows.length>0&&!hasPositiveOverride&&hasExplicitInvalid;const effective=legacyEmpty?configured:(pricingSource==='sheet'&&hasPositiveOverride?mergePricing(configured,pricing):pricingSource==='rule'?configured:(hasPositiveOverride?mergePricing(configured,pricing):configured));return assertValidPricing(effective)}
async function findDuplicateLead({industryId,serviceId,subserviceId,customerPhone,customerEmail,customerName,requirement,pincode,windowHours=24*30}){
  const phone=String(customerPhone||'').replace(/\D/g,'');
  const email=String(customerEmail||'').trim().toLowerCase();
  const name=String(customerName||'').trim().toLowerCase();
  const req=String(requirement||'').trim().toLowerCase();
  const rawPin=String(pincode||'').replace(/\D/g,'');
  const pin=/^\d{6}$/.test(rawPin)?rawPin:'';
  const hours=Math.max(1,Math.min(24*30,Number(windowHours)||24*30));
  const scope=[industryId,serviceId||null,subserviceId||null,hours,pin];
  const recent=`industry_id=$1 AND service_id IS NOT DISTINCT FROM $2 AND subservice_id IS NOT DISTINCT FROM $3 AND created_at>=CURRENT_TIMESTAMP-($4 * INTERVAL '1 hour') AND ($5::text='' OR COALESCE(pincode,'')=$5)`;
  if(phone.length>=7){const r=await pool.query(`SELECT id,customer_name FROM leads WHERE ${recent} AND regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=$6 AND ($7::text='' OR LOWER(TRIM(COALESCE(requirement,'')))=$7) ORDER BY created_at DESC LIMIT 1`,[...scope,phone,req]);if(r.rows[0])return r.rows[0];}
  if(email){const r=await pool.query(`SELECT id,customer_name FROM leads WHERE ${recent} AND LOWER(TRIM(COALESCE(customer_email,'')))=$6 AND ($7::text='' OR LOWER(TRIM(COALESCE(requirement,'')))=$7) ORDER BY created_at DESC LIMIT 1`,[...scope,email,req]);if(r.rows[0])return r.rows[0];}
  if(name&&req){const r=await pool.query(`SELECT id,customer_name FROM leads WHERE ${recent} AND LOWER(TRIM(COALESCE(customer_name,'')))=$6 AND LOWER(TRIM(COALESCE(requirement,'')))=$7 ORDER BY created_at DESC LIMIT 1`,[...scope,name,req]);if(r.rows[0])return r.rows[0];}
  return null;
}
async function createLead({industryId,serviceId,subserviceId,stateId,cityId,customerName,customerPhone,customerEmail,requirement,propertyType,budget,source,notes,customFields,pricing,pricingSource,leadType='basic',isExclusive=false,exclusiveDelayDays,exclusiveDelayHours,pincode,zipcode,buyerCapacity,accessStrategy,releaseToTwoAfterHours,releaseToThreeAfterHours,createdBy,leadPartnerId=null,investorUserId=null,qualityGateContext='admin',deferQualityGate=false,contactConsentAt=null,contactConsentVersion=null,intakeSubmissionKey=null}){
  if(!industryId)throw new Error('Industry is required');
  const duplicate=await findDuplicateLead({industryId,serviceId,subserviceId,customerPhone,customerEmail,customerName,requirement,pincode:pincode||zipcode});
  if(duplicate){
    const error=new Error(`Duplicate lead: a recent matching requirement already exists${duplicate.customer_name?` (${duplicate.customer_name})`:''}.`);
    error.code='DUPLICATE_LEAD';error.leadId=duplicate.id;throw error;
  }
  const type=normalizeLeadType(leadType)||'basic';
  const configured=await getConfiguredPricing(industryId,cityId,type);
  const effectivePricing=resolveEffectivePricing(configured,pricing,pricingSource);
  const exclusive=Boolean(isExclusive);
  const requestedDays=exclusiveDelayDays!==undefined&&exclusiveDelayDays!==null&&exclusiveDelayDays!==''?Number(exclusiveDelayDays):(exclusiveDelayHours!==undefined&&exclusiveDelayHours!==null&&exclusiveDelayHours!==''?Number(exclusiveDelayHours)/24:1);
  const delay=exclusive?Math.max(1,Math.min(365,Number.isFinite(requestedDays)?requestedDays:1)):0;
  const access=await accessService.resolveForLead({leadType:type,accessStrategy,buyerCapacity:buyerCapacity??cleanJson(customFields).buyerCapacity,releaseToTwoAfterHours,releaseToThreeAfterHours});
  const storedCustomFields={...sanitizeCustomFields(customFields),buyerCapacity:access.buyerCapacity};
  const consentAt=contactConsentAt?new Date(contactConsentAt):null;
  const result=await pool.query(
    `INSERT INTO leads (industry_id,service_id,subservice_id,state_id,city_id,customer_name,customer_phone,customer_email,requirement,property_type,budget,source,notes,custom_fields,pricing,lead_type,is_exclusive,exclusive_delay_days,buyer_capacity,pincode,created_by,access_strategy,release_to_two_after_hours,release_to_three_after_hours,contact_consent_at,contact_consent_version,intake_submission_key,lead_partner_id,investor_user_id,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23,$24,$27,$28,$29,$25,$26,'quarantined') RETURNING *`,
    [industryId,serviceId||null,subserviceId||null,stateId||null,cityId||null,customerName||null,customerPhone||null,customerEmail||null,requirement||null,propertyType||null,budget??null,source||'upload',notes||null,JSON.stringify(storedCustomFields),JSON.stringify(effectivePricing),type,exclusive,delay,access.buyerCapacity,pincode||zipcode||null,createdBy||null,access.accessStrategy,access.releaseToTwoAfterHours,access.releaseToThreeAfterHours,leadPartnerId?Number(leadPartnerId):null,investorUserId?Number(investorUserId):null,consentAt,contactConsentVersion||null,intakeSubmissionKey||null]
  );
  const created=result.rows[0];
  if(deferQualityGate)return created;
  try{
    const gated=await leadQualityGateService.evaluateAndApply(created.id,{context:qualityGateContext,autoRelease:true});
    return gated.lead||created;
  }catch(error){
    console.error('Lead quality gate failed closed:',error.message);
    try{
      const failClosed=(await pool.query(
        `UPDATE leads SET status='quarantined',quality_gate_status='quarantined',quality_gate_reasons=$2::jsonb,
           quality_gate_checked_at=CURRENT_TIMESTAMP,quality_gate_context=$3,updated_at=CURRENT_TIMESTAMP
         WHERE id=$1 RETURNING *`,
        [created.id,JSON.stringify([{code:'gate_evaluation_error',message:'Quality gate could not complete; Admin review is required'}]),String(qualityGateContext||'system').slice(0,32)]
      )).rows[0];
      return failClosed||created;
    }catch{
      throw error;
    }
  }
}
async function hasLeadAccess(userId,leadId){if(!userId)return false;const r=await pool.query(`SELECT 1 FROM lead_purchases WHERE user_id=$1 AND lead_id=$2 AND status='paid' UNION ALL SELECT 1 FROM lead_entitlement_claims WHERE user_id=$1 AND lead_id=$2 AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP) LIMIT 1`,[userId,leadId]);return r.rows.length>0;}
async function getLeadById(id,userId,role){const raw=(await pool.query(`${leadSelect} WHERE l.id=$1`,[id])).rows[0]||null;const lead=normalizeLeadRow(raw);if(!lead)return null;if(role==='admin')return lead;if(await hasLeadAccess(userId,id))return stripQualityGate({...lead,custom_fields:businessCustomFields(lead.custom_fields)});return maskLead(lead);}
async function getLeads({industryId,serviceId,subserviceId,stateId,cityId,status='available',leadType,userId,role}){const v=[],c=[];if(status&&status!=='all'){v.push(status);c.push(`l.status=$${v.length}`)}if(leadType){v.push(normalizeLeadType(leadType)||'basic');c.push(`l.lead_type=$${v.length}`)}if(industryId){v.push(industryId);c.push(`l.industry_id=$${v.length}`)}if(serviceId){v.push(serviceId);c.push(`l.service_id=$${v.length}`)}if(subserviceId){v.push(subserviceId);c.push(`l.subservice_id=$${v.length}`)}if(stateId){v.push(stateId);c.push(`l.state_id=$${v.length}`)}if(cityId){v.push(cityId);c.push(`l.city_id=$${v.length}`)}if(!userId&&!role){const publicRows=(await pool.query(`${leadSelect} ${c.length?`WHERE ${c.join(' AND ')}`:''} ORDER BY l.created_at DESC,l.id DESC`,v)).rows;const seen=new Set();return publicRows.filter(row=>{const id=Number(row.id);if(seen.has(id))return false;seen.add(id);return true;}).map(row=>({...maskLead(normalizeLeadRow(row)),is_pro_member:false,has_exclusive_option:false,exclusive_available:false,exclusive_can_buy:false,exclusive_action:'login_to_buy'}));}let pro=false;if(role!=='admin'){pro=await isProMember(userId);v.push(userId);c.push(`EXISTS (SELECT 1 FROM business_profiles bp JOIN business_profile_services bps ON bps.business_profile_id=bp.id WHERE bp.user_id=$${v.length} AND bps.is_active=TRUE AND (l.industry_id IS NULL OR bps.industry_id=l.industry_id) AND (l.service_id IS NULL OR bps.service_id=l.service_id) AND (l.subservice_id IS NULL OR bps.subservice_id IS NULL OR bps.subservice_id=l.subservice_id))`);v.push(userId);c.push(`EXISTS (SELECT 1 FROM business_profiles bp JOIN business_profile_locations bpl ON bpl.business_profile_id=bp.id WHERE bp.user_id=$${v.length} AND bpl.is_active=TRUE AND (l.state_id IS NULL OR bpl.state_id=l.state_id) AND (l.city_id IS NULL OR bpl.city_id=l.city_id))`);}const rows=(await pool.query(`${leadSelect} ${c.length?`WHERE ${c.join(' AND ')}`:''} ORDER BY l.created_at DESC,l.id DESC`,v)).rows;const seen=new Set();const uniqueRows=rows.filter(row=>{const id=Number(row.id);if(seen.has(id))return false;seen.add(id);return true;});if(role==='admin')return uniqueRows.map(normalizeLeadRow);const access=(await pool.query(`SELECT lead_id FROM lead_purchases WHERE user_id=$1 AND status='paid' UNION SELECT lead_id FROM lead_entitlement_claims WHERE user_id=$1 AND (expires_at IS NULL OR expires_at>=CURRENT_TIMESTAMP)`,[userId])).rows;const accessIds=new Set(access.map(x=>Number(x.lead_id)));return uniqueRows.map(row=>{const normalized=normalizeLeadRow(row);const exclusive=Boolean(normalized.is_exclusive);const expired=!exclusive||!normalized.exclusive_available_at||new Date(normalized.exclusive_available_at)<=new Date();const owned=accessIds.has(Number(normalized.id));const visible=owned;const base=visible?stripQualityGate({...normalized,custom_fields:businessCustomFields(normalized.custom_fields)}):maskLead(normalized);return{...base,is_purchased:owned,is_accessible:owned,is_pro_member:pro,has_exclusive_option:exclusive,exclusive_available:exclusive&&(pro||expired),exclusive_can_buy:!owned&&exclusive&&(pro||expired),exclusive_action:owned?'access_granted':(!exclusive?'buy':(pro||expired?'buy':'upgrade_to_pro'))};});}
async function getAdminLeadsPage({status='all',search='',leadType,origin,industryId,stateId,cityId,page=1,limit=48}){
  const values=[];
  const conditions=[];
  const add=(value,sql)=>{values.push(value);conditions.push(sql.replace('?',`$${values.length}`));};
  if(status&&status!=='all')add(status,'l.status=?');
  if(leadType&&leadType!=='all')add(normalizeLeadType(leadType)||'basic','l.lead_type=?');
  if(industryId)add(Number(industryId),'l.industry_id=?');
  if(stateId)add(Number(stateId),'l.state_id=?');
  if(cityId)add(Number(cityId),'l.city_id=?');
  if(origin==='ours')conditions.push('l.lead_partner_id IS NULL AND l.investor_user_id IS NULL');
  else if(origin==='lead_partner')conditions.push('l.lead_partner_id IS NOT NULL');
  else if(origin==='investor')conditions.push('l.lead_partner_id IS NULL AND l.investor_user_id IS NOT NULL');
  const q=String(search||'').trim();
  if(q){
    values.push(`%${q}%`);
    const ref=`$${values.length}`;
    conditions.push(`(CAST(l.id AS TEXT) ILIKE ${ref} OR COALESCE(l.customer_name,'') ILIKE ${ref} OR COALESCE(l.customer_phone,'') ILIKE ${ref} OR COALESCE(l.customer_email,'') ILIKE ${ref} OR COALESCE(l.requirement,'') ILIKE ${ref} OR COALESCE(l.pincode,'') ILIKE ${ref} OR COALESCE(i.name,'') ILIKE ${ref} OR COALESCE(s.name,'') ILIKE ${ref} OR COALESCE(ss.name,'') ILIKE ${ref} OR COALESCE(st.name,'') ILIKE ${ref} OR COALESCE(c.name,'') ILIKE ${ref} OR COALESCE(iu.name,'') ILIKE ${ref} OR COALESCE(lpu.name,'') ILIKE ${ref} OR COALESCE(l.custom_fields::text,'') ILIKE ${ref})`);
  }
  const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
  const pageNumber=Math.max(1,Number.parseInt(page,10)||1);
  const pageSize=Math.min(100,Math.max(12,Number.parseInt(limit,10)||48));
  const offset=(pageNumber-1)*pageSize;
  const countSql=`SELECT COUNT(*)::int AS total FROM leads l LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities c ON c.id=l.city_id LEFT JOIN users iu ON iu.id=l.investor_user_id LEFT JOIN lead_partners lp ON lp.id=l.lead_partner_id LEFT JOIN users lpu ON lpu.id=lp.user_id ${where}`;
  const summaryConditions=[];
  const summaryValues=[];
  if(status&&status!=='all'){summaryValues.push(status);summaryConditions.push(`l.status=$${summaryValues.length}`)}
  const summaryWhere=summaryConditions.length?`WHERE ${summaryConditions.join(' AND ')}`:'';
  const summarySql=`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE l.lead_type='basic')::int AS basic,COUNT(*) FILTER (WHERE l.lead_type='premium')::int AS premium,COUNT(*) FILTER (WHERE l.is_exclusive=TRUE)::int AS exclusive,COUNT(*) FILTER (WHERE l.status='quarantined')::int AS quarantined FROM leads l ${summaryWhere}`;
  const rowValues=[...values,pageSize,offset];
  const rowsSql=`${leadSelect} ${where} ORDER BY l.created_at DESC,l.id DESC LIMIT $${values.length+1} OFFSET $${values.length+2}`;
  const [rowsResult,countResult,summaryResult]=await Promise.all([pool.query(rowsSql,rowValues),pool.query(countSql,values),pool.query(summarySql,summaryValues)]);
  const total=Number(countResult.rows[0]?.total||0);
  const totalPages=Math.max(1,Math.ceil(total/pageSize));
  const safePage=Math.min(pageNumber,totalPages);
  if(safePage!==pageNumber&&total>0)return getAdminLeadsPage({status,search,leadType,origin,industryId,stateId,cityId,page:safePage,limit:pageSize});
  return{data:rowsResult.rows.map(normalizeLeadRow),pagination:{page:safePage,limit:pageSize,total,totalPages,hasPrevious:safePage>1,hasNext:safePage<totalPages},summary:{total:Number(summaryResult.rows[0]?.total||0),basic:Number(summaryResult.rows[0]?.basic||0),premium:Number(summaryResult.rows[0]?.premium||0),exclusive:Number(summaryResult.rows[0]?.exclusive||0),quarantined:Number(summaryResult.rows[0]?.quarantined||0)}};
}
async function updateLead(id,data){const{industryId,serviceId,subserviceId,stateId,cityId,customerName,customerPhone,customerEmail,requirement,propertyType,budget,source,status,notes,customFields,pricing,pricingSource,leadType,isExclusive,exclusiveDelayDays,pincode,zipcode,buyerCapacity,accessStrategy,accessSource,releaseToTwoAfterHours,releaseToThreeAfterHours,sheetSync}=data;if(!industryId)throw new Error('Industry is required');const current=(await pool.query('SELECT status,buyer_capacity,access_strategy,release_to_two_after_hours,release_to_three_after_hours,access_capacity_locked FROM leads WHERE id=$1',[id])).rows[0];if(!current)throw Object.assign(new Error('Lead not found'),{code:'LEAD_NOT_FOUND'});const type=normalizeLeadType(leadType)||'basic';const configured=await getConfiguredPricing(industryId,cityId,type);const effectivePricing=resolveEffectivePricing(configured,pricing,pricingSource);const exclusive=sheetSync&&sheetSync.exclusiveColumnPresent===false?false:Boolean(isExclusive);const delay=exclusive?Math.max(1,Math.min(365,Number(exclusiveDelayDays===undefined||exclusiveDelayDays===null||exclusiveDelayDays===''?1:exclusiveDelayDays))):0;const configuredAccess=await accessService.getSettingsForType(type);const accessFieldsProvided=[accessStrategy,buyerCapacity,releaseToTwoAfterHours,releaseToThreeAfterHours].some(v=>v!==undefined&&v!==null&&v!=='');const currentAccess={accessStrategy:current.access_strategy,buyerCapacity:Number(current.buyer_capacity),releaseToTwoAfterHours:current.release_to_two_after_hours,releaseToThreeAfterHours:current.release_to_three_after_hours};const access=current.access_capacity_locked!=null?currentAccess:((accessSource==='sheet'||accessSource==='rule')?accessService.normalizeConfig({accessStrategy,buyerCapacity,releaseToTwoAfterHours,releaseToThreeAfterHours},configuredAccess):(accessFieldsProvided?accessService.normalizeConfig({accessStrategy:accessStrategy??current.access_strategy,buyerCapacity:buyerCapacity??current.buyer_capacity,releaseToTwoAfterHours:releaseToTwoAfterHours??current.release_to_two_after_hours,releaseToThreeAfterHours:releaseToThreeAfterHours??current.release_to_three_after_hours},{defaultStrategy:current.access_strategy,maxBuyerCapacity:current.buyer_capacity,releaseToTwoAfterHours:current.release_to_two_after_hours,releaseToThreeAfterHours:current.release_to_three_after_hours}):currentAccess));const storedCustomFields={...sanitizeCustomFields(customFields),buyerCapacity:access.buyerCapacity};const requestedStatus=current.status==='quarantined'&&(!status||status==='available')?'quarantined':(status||current.status||'available');const result=await pool.query(`UPDATE leads SET industry_id=$1,service_id=$2,subservice_id=$3,state_id=$4,city_id=$5,customer_name=$6,customer_phone=$7,customer_email=$8,requirement=$9,property_type=$10,budget=$11,source=$12,status=$13,notes=$14,custom_fields=$15::jsonb,pricing=$16::jsonb,lead_type=$17,is_exclusive=$18,exclusive_delay_days=$19,buyer_capacity=$20,pincode=$21,access_strategy=$22,release_to_two_after_hours=$23,release_to_three_after_hours=$24,updated_at=CURRENT_TIMESTAMP WHERE id=$25 RETURNING *`,[industryId,serviceId||null,subserviceId||null,stateId||null,cityId||null,customerName||null,customerPhone||null,customerEmail||null,requirement||null,propertyType||null,budget??null,source||'upload',requestedStatus,notes||null,JSON.stringify(storedCustomFields),JSON.stringify(effectivePricing),type,exclusive,delay,access.buyerCapacity,pincode||zipcode||null,access.accessStrategy,access.releaseToTwoAfterHours,access.releaseToThreeAfterHours,id]);return result.rows[0]||null;}
async function updateLeadStatus(id,status){
  const current=(await pool.query('SELECT id,status FROM leads WHERE id=$1',[id])).rows[0];
  if(!current)return null;
  if(current.status==='quarantined'&&status==='available'){
    const error=new Error('Use the quality review action to release a quarantined lead');
    error.code='QUALITY_OVERRIDE_REQUIRED';
    throw error;
  }
  return(await pool.query('UPDATE leads SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',[status,id])).rows[0]||null;
}
async function deleteLead(id){return(await pool.query('DELETE FROM leads WHERE id=$1 RETURNING *',[id])).rows[0]||null}
async function getLeadPricing(){return(await pool.query('SELECT * FROM lead_pricing WHERE id=1')).rows[0]||null}
async function updateLeadPricing(data,adminUserId=null){
  const values=[Number(data.normal?.oneShare||0),Number(data.normal?.threeShares||0),Number(data.normal?.fiveShares||0),Number(data.pro?.oneShare||0),Number(data.pro?.threeShares||0),Number(data.pro?.fiveShares||0)];
  if(values.some(v=>!Number.isFinite(v)||v<0))throw Error('Pricing values must be non-negative numbers');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const before=(await client.query('SELECT * FROM lead_pricing WHERE id=1 FOR UPDATE')).rows[0]||null;
    const updated=(await client.query(`INSERT INTO lead_pricing (id,normal_one_share,normal_three_shares,normal_five_shares,pro_one_share,pro_three_shares,pro_five_shares,updated_at) VALUES (1,$1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET normal_one_share=EXCLUDED.normal_one_share,normal_three_shares=EXCLUDED.normal_three_shares,normal_five_shares=EXCLUDED.normal_five_shares,pro_one_share=EXCLUDED.pro_one_share,pro_three_shares=EXCLUDED.pro_three_shares,pro_five_shares=EXCLUDED.pro_five_shares,updated_at=CURRENT_TIMESTAMP RETURNING *`,values)).rows[0];
    await criticalActionAudit.record(client,{actorId:adminUserId,category:'pricing',action:'pricing.legacy_settings',entityType:'lead_pricing',entityId:1,beforeData:before,afterData:updated,source:'lead_service'});
    await client.query('COMMIT');return updated;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
const parseOptionalId=v=>{if(v===undefined||v===null||v==='')return null;const n=Number(v);if(!Number.isInteger(n)||n<=0)throw new Error('Industry and City must be valid IDs');return n};
const normalizePricingRuleInput=data=>{const industryId=parseOptionalId(data?.industryId);const cityId=parseOptionalId(data?.cityId);const leadType=String(data?.leadType||'basic').trim().toLowerCase();if(!['basic','premium'].includes(leadType))throw new Error('Lead Type must be basic or premium');const shares=normalizePricingRows(data?.pricing?.shares);const tiers=shares.map(x=>x.shares);if(shares.length!==3||tiers.some((value,index)=>value!==[1,2,3][index]))throw new Error('Lead pricing must include exactly 1, 2 and 3 buyer tiers');return{industryId,cityId,leadType,pricing:{shares},isActive:data?.isActive!==false};};
async function getPricingRules(){const result=await pool.query(`SELECT r.id,r.industry_id,r.city_id,r.lead_type,r.pricing,r.is_active,r.created_at,r.updated_at,i.name AS industry_name,c.name AS city_name FROM lead_pricing_rules r LEFT JOIN industries i ON i.id=r.industry_id LEFT JOIN cities c ON c.id=r.city_id ORDER BY CASE WHEN r.industry_id IS NULL THEN 0 ELSE 1 END,r.industry_id NULLS FIRST,CASE WHEN r.city_id IS NULL THEN 0 ELSE 1 END,r.city_id NULLS FIRST,r.lead_type,r.id`);return result.rows;}
async function savePricingRule(data,adminUserId=null){
  const normalized=normalizePricingRuleInput(data);
  const id=data?.id===undefined||data?.id===null||data?.id===''?null:Number(data.id);
  if(id!==null&&(!Number.isInteger(id)||id<=0)){const error=new Error('Pricing rule ID must be valid');error.code='INVALID_PRICING_RULE_ID';throw error;}
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    let before=null,row,action;
    if(id!==null){
      before=(await client.query('SELECT * FROM lead_pricing_rules WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!before){const error=new Error('Pricing rule not found');error.code='PRICING_RULE_NOT_FOUND';throw error;}
      try{row=(await client.query(`UPDATE lead_pricing_rules SET industry_id=$1,city_id=$2,lead_type=$3,pricing=$4::jsonb,is_active=$5,updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *`,[normalized.industryId,normalized.cityId,normalized.leadType,JSON.stringify(normalized.pricing),normalized.isActive,id])).rows[0]}
      catch(error){if(error.code==='23505'){const e=new Error('A pricing rule already exists for this Industry, City and Lead Type');e.code='PRICING_RULE_SCOPE_EXISTS';throw e}throw error}
      action='pricing.rule_update';
    }else{
      before=(await client.query(`SELECT * FROM lead_pricing_rules WHERE COALESCE(industry_id,0)=COALESCE($1::int,0) AND COALESCE(city_id,0)=COALESCE($2::int,0) AND lead_type=$3 FOR UPDATE`,[normalized.industryId,normalized.cityId,normalized.leadType])).rows[0]||null;
      try{row=(await client.query(`INSERT INTO lead_pricing_rules(industry_id,city_id,lead_type,pricing,is_active) VALUES($1,$2,$3,$4::jsonb,$5) ON CONFLICT ((COALESCE(industry_id,0)),(COALESCE(city_id,0)),lead_type) DO UPDATE SET pricing=EXCLUDED.pricing,is_active=EXCLUDED.is_active,updated_at=CURRENT_TIMESTAMP RETURNING *`,[normalized.industryId,normalized.cityId,normalized.leadType,JSON.stringify(normalized.pricing),normalized.isActive])).rows[0]}
      catch(error){if(error.code==='23505'){const e=new Error('A pricing rule already exists for this Industry, City and Lead Type');e.code='PRICING_RULE_SCOPE_EXISTS';throw e}throw error}
      action=before?'pricing.rule_update':'pricing.rule_create';
    }
    await criticalActionAudit.record(client,{actorId:adminUserId,category:'pricing',action,entityType:'lead_pricing_rule',entityId:row.id,beforeData:before,afterData:row,source:'lead_service'});
    await client.query('COMMIT');return row;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
async function deletePricingRule(id,adminUserId=null){
  const ruleId=Number(id);if(!Number.isInteger(ruleId)||ruleId<=0){const error=new Error('Pricing rule ID must be valid');error.code='INVALID_PRICING_RULE_ID';throw error;}
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const before=(await client.query('SELECT * FROM lead_pricing_rules WHERE id=$1 FOR UPDATE',[ruleId])).rows[0]||null;
    if(!before){await client.query('COMMIT');return null}
    const deleted=(await client.query('DELETE FROM lead_pricing_rules WHERE id=$1 RETURNING *',[ruleId])).rows[0]||null;
    await criticalActionAudit.record(client,{actorId:adminUserId,category:'pricing',action:'pricing.rule_delete',entityType:'lead_pricing_rule',entityId:ruleId,beforeData:before,afterData:null,source:'lead_service'});
    await client.query('COMMIT');return deleted;
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
module.exports={getLeads,getAdminLeadsPage,getLeadById,createLead,updateLead,updateLeadStatus,deleteLead,getLeadPricing,updateLeadPricing,getConfiguredPricing,findDuplicateLead,getPricingRules,savePricingRule,deletePricingRule,getAccessSettings:accessService.getSettings,updateAccessSettings:accessService.updateSettings};