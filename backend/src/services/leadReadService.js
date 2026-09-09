const pool=require('../config/database');

const leadSelect=`SELECT l.*,i.name AS industry_name,s.name AS service_name,ss.name AS subservice_name,st.name AS state_name,c.name AS city_name,iu.name AS investor_name,iu.email AS investor_email,CASE WHEN l.is_exclusive THEN (l.created_at + make_interval(days => l.exclusive_delay_days)) ELSE NULL END AS exclusive_available_at,(SELECT COUNT(DISTINCT lp.user_id)::int FROM lead_purchases lp WHERE lp.lead_id=l.id AND lp.status='paid') AS purchased_buyer_count FROM leads l LEFT JOIN industries i ON i.id=l.industry_id LEFT JOIN services s ON s.id=l.service_id LEFT JOIN subservices ss ON ss.id=l.subservice_id LEFT JOIN states st ON st.id=l.state_id LEFT JOIN cities c ON c.id=l.city_id LEFT JOIN users iu ON iu.id=l.investor_user_id`;

const normalizeLeadPricing=pricing=>pricing;
const normalizeBuyerCapacity=row=>{
  const custom=row?.custom_fields&&typeof row.custom_fields==='object'&&!Array.isArray(row.custom_fields)?row.custom_fields:{};
  const raw=Number(row?.buyer_capacity??custom.buyerCapacity);
  return Number.isFinite(raw)&&raw>=2?Math.floor(raw):3;
};
const normalizeKey=value=>String(value??'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
const customValue=(custom,names)=>{
  if(!custom||typeof custom!=='object'||Array.isArray(custom))return'';
  const normalizedNames=names.map(normalizeKey);
  const key=Object.keys(custom).find(k=>normalizedNames.includes(normalizeKey(k))&&String(custom[k]??'').trim());
  return key?String(custom[key]).trim():'';
};
const customValueContains=(custom,patterns)=>{
  if(!custom||typeof custom!=='object'||Array.isArray(custom))return'';
  const normalizedPatterns=patterns.map(normalizeKey).filter(Boolean);
  const key=Object.keys(custom).find(k=>{
    const n=normalizeKey(k);
    return String(custom[k]??'').trim()&&normalizedPatterns.some(pattern=>n.includes(pattern));
  });
  return key?String(custom[key]).trim():'';
};
const hasCustomKeyMatching=(custom,patterns)=>{
  if(!custom||typeof custom!=='object'||Array.isArray(custom))return false;
  const normalizedPatterns=patterns.map(normalizeKey).filter(Boolean);
  return Object.keys(custom).some(k=>{
    const n=normalizeKey(k);
    return normalizedPatterns.some(pattern=>n.includes(pattern))&&String(custom[k]??'').trim();
  });
};
const normalizeLeadRow=row=>{
  if(!row)return row;
  const custom={...(row?.custom_fields&&typeof row.custom_fields==='object'&&!Array.isArray(row.custom_fields)?row.custom_fields:{})};

  const requirement=String(row.requirement??'').trim()||
    customValue(custom,['Requirement','Requirements','Requirement Details','Share More Details and Requirement','Location And Requirements','Location And Requirements Details'])||
    customValueContains(custom,['requirement','requirements']);

  const budgetCustom=customValue(custom,['Budget','Budget Range','Project Budget','Project Budget Range','Budget From To','Expected Budget','Approx Budget','Approximate Budget','Investment Budget','Estimated Budget'])||customValueContains(custom,['budget']);
  if(!hasCustomKeyMatching(custom,['budget'])){
    if(budgetCustom)custom.Budget=budgetCustom;
    else if(String(row.budget??'').trim())custom.Budget=String(row.budget).trim();
  }
  const normalizedBudget=String(row.budget??'').trim()||budgetCustom;

  const workNumbers=customValue(custom,['Work Numbers','Work Number','Number of Works','Number of Work','No. of Works','No of Works','Works','Quantity','Project Quantity','Number of Projects','Project Count'])||
    customValueContains(custom,['worknumbers','worknumber','numberofworks','numberofwork','noofworks','projectquantity','quantity','projectcount']);
  if(!hasCustomKeyMatching(custom,['worknumber','worknumbers','numberofworks','numberofwork','noofworks','projectquantity','quantity','projectcount'])){
    if(workNumbers)custom['Work Numbers']=workNumbers;
  }

  const workPhone=customValue(custom,['Work Phone Number','Work Phone','Office Phone Number','Office Phone','Business Phone','Business Phone Number','Alternate Work Phone','Alternate Phone','Work Phone No','Work Phone No.','Work Contact Number','Office Contact Number','Business Contact Number','Official Phone Number'])||
    customValueContains(custom,['workphone','officephone','businessphone','workcontact','officecontact','businesscontact']);
  if(!hasCustomKeyMatching(custom,['workphone','officephone','businessphone','workcontact','officecontact','businesscontact'])){
    if(workPhone)custom['Work Phone Number']=workPhone;
  }

  const timeline=customValue(custom,['Timeline','Timeframe','Project Timeline','Expected Timeline','Planning Date','How Soon Required','How Soon Required?','When'])||customValueContains(custom,['timeline','timeframe','planningdate','howsoonrequired']);
  if(!hasCustomKeyMatching(custom,['timeline','timeframe','planningdate','howsoonrequired'])){
    if(timeline)custom.Timeline=timeline;
  }

  const property=customValue(custom,['Property Type','Property','Interior Type','Type of Property'])||customValueContains(custom,['propertytype','property','interiortype']);
  if(!hasCustomKeyMatching(custom,['propertytype','interiortype'])&&property){
    custom['Property Type']=property;
  }

  return{
    ...row,
    budget:normalizedBudget,
    custom_fields:custom,
    buyer_capacity:normalizeBuyerCapacity({...row,custom_fields:custom}),
    purchased_buyer_count:Math.max(0,Number(row.purchased_buyer_count)||0),
    requirement,
    pricing:normalizeLeadPricing(row.pricing)
  };
};
const dynamicLabel=k=>String(k??'').trim().replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const buildDynamicDetails=row=>{
  const custom=row?.custom_fields&&typeof row.custom_fields==='object'&&!Array.isArray(row.custom_fields)?row.custom_fields:{};
  const excluded=new Set(['buyerCapacity','pricing','leadPricing','leadPrice','price','exclusivePricing','exclusivePrice']);
  return Object.entries(custom).filter(([key,value])=>!excluded.has(key)&&String(value??'').trim()).map(([key,value])=>({key,label:dynamicLabel(key),value:String(value).trim()}));
};
const appendAdminDynamicDetails=row=>{
  const normalized=normalizeLeadRow(row);
  const details=buildDynamicDetails(normalized);
  let requirement=String(normalized.requirement??'').trim();
  if(details.length&&requirement){
    const dynamicText=details.map(x=>`${x.label}: ${x.value}`).join(' · ');
    if(requirement===dynamicText)requirement='';
    else if(requirement.endsWith(` · ${dynamicText}`))requirement=requirement.slice(0,-(` · ${dynamicText}`).length).trim();
  }
  return{...normalized,requirement,dynamic_details:details};
};

const contactKey=k=>/(phone|mobile|whatsapp|contact|email|mail|tel|telephone|alternate|address|pincode|pin|zipcode|zip|postal|website|url|social|instagram|facebook|linkedin)/i.test(String(k||''));
const maskContactText=value=>{
  const text=String(value??'').trim();
  if(!text)return'';
  let masked=text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'xxxx@xxxx.com');
  masked=masked.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g,match=>{
    const digits=match.replace(/\D/g,'');
    if(digits.length<8)return'xxxx';
    const visible=digits.length>=10?4:2;
    return`${digits.slice(0,2)}${'x'.repeat(Math.max(4,digits.length-visible-2))}${digits.slice(-visible)}`;
  });
  return masked.replace(/https?:\/\/\S+|www\.\S+/gi,'xxxx');
};
const maskPublicValue=(key,value)=>{
  if(value===null||value===undefined||String(value).trim()==='')return value;
  if(contactKey(key))return maskContactText(value);
  return maskContactText(value);
};
const isMarketplaceCanonicalField=key=>{
  const n=normalizeKey(key);
  return [
    'requirement','requirements','requirementdetails','sharemoredetailsandrequirement',
    'location','locationandrequirements','locationandrequirementsdetails',
    'property','propertytype','interiortype','typeofproperty',
    'buyercapacity'
  ].includes(n);
};
const maskLead=row=>{
  const normalized=normalizeLeadRow(row);
  const custom=normalized?.custom_fields&&typeof normalized.custom_fields==='object'&&!Array.isArray(normalized.custom_fields)?normalized.custom_fields:{};
  const publicCustom={};
  Object.entries(custom).forEach(([key,value])=>{
    if(!isMarketplaceCanonicalField(key)&&String(value??'').trim())publicCustom[key]=maskPublicValue(key,value);
  });
  return{
    ...normalized,
    customer_name:normalized.customer_name||null,
    customer_phone:normalized.customer_phone?maskContactText(normalized.customer_phone):null,
    customer_email:normalized.customer_email?maskContactText(normalized.customer_email):null,
    notes:normalized.notes?maskContactText(normalized.notes):null,
    requirement:normalized.requirement?maskContactText(normalized.requirement):normalized.requirement,
    custom_fields:publicCustom
  };
};

const normalizeLeadType=v=>['basic','premium'].includes(String(v||'').toLowerCase())?String(v).toLowerCase():null;

async function isProMember(userId){
  if(!userId)return false;
  const r=await pool.query(`SELECT 1 FROM memberships m JOIN membership_plans mp ON mp.id=m.membership_plan_id WHERE m.user_id=$1 AND m.status='active' AND m.starts_at<=CURRENT_TIMESTAMP AND m.expires_at>=CURRENT_TIMESTAMP AND LOWER(REPLACE(COALESCE(mp.plan_type,''),'-','_'))='pro' AND mp.is_active=TRUE LIMIT 1`,[userId]);
  return r.rows.length>0;
}

module.exports={leadSelect,maskLead,normalizeLeadRow,normalizeLeadPricing,normalizeLeadType,isProMember,appendAdminDynamicDetails,buildDynamicDetails};
