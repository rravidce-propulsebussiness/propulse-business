const pool=require('../config/database');
const leadService=require('./leadService');
const leadClassificationService=require('./leadClassificationService');
const {resolvePincode}=require('./pincodeService');
const pincodeDetectionService=require('./pincodeDetectionService');
const leadImportMapping=require('./leadImportMappingService');
const {parseCsvRecords}=require('../utils/csvRecords');
const {leadRowIdentity,candidateMaps,matchLead}=require('../utils/leadImportIdentity');

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
const phoneKey=v=>clean(v).replace(/\D/g,'');
const emailKey=v=>clean(v).toLowerCase();
const normalizePincode=v=>{const value=clean(v);if(/^\d{6}$/.test(value))return value;const meta=value.match(/^z:(\d{6})$/i);return meta?meta[1]:''};
const isValidPincode=v=>Boolean(normalizePincode(v));

function get(raw,names){const key=Object.keys(raw).find(k=>names.some(n=>norm(k)===norm(n)));return key?clean(raw[key]):''}
function sourceId(row){return get(row,['id','Lead Id','Lead ID','External Id','External ID'])}
function parseRows(csv){const rows=parseCsvRecords(csv);if(!rows.length)return{headers:[],items:[]};const aliases={post_code:'Pincode',postal_code:'Pincode',pin_code:'Pincode',zip_code:'Pincode',zipcode:'Pincode',zip:'Pincode',full_name:'Customer Name',name:'Customer Name',customer:'Customer Name',customer_name:'Customer Name',customername:'Customer Name',phone_number:'Customer Phone',mob_no:'Customer Phone',mobile:'Customer Phone',phone:'Customer Phone',contact_number:'Customer Phone',customer_phone:'Customer Phone',email:'Customer Email',email_id:'Customer Email',customer_email:'Customer Email',share_more_details_and_requirement:'Requirement',requirements:'Requirement',requirement:'Requirement',requirement_details:'Requirement',plot_location:'Location',location:'Location',lead_status:'Lead Status',created_time:'Created At',conditional_question_1:'Question 1',conditional_question_2:'Question 2',conditional_question_3:'Question 3',industry_name:'Industry',service_name:'Service',subservice_name:'Subservice',lead_source:'Source',pro_early_access:'Pro Early Access',early_access:'Pro Early Access',early_access_delay_days:'Exclusive Delay Days',pro_early_access_delay_days:'Exclusive Delay Days',max_buyers:'Buyer Capacity',access_strategy:'Access Strategy',buyer_strategy:'Access Strategy',release_to_2_hours:'Release to 2 Hours',release_to_two_hours:'Release to 2 Hours',release_to_3_hours:'Release to 3 Hours',release_to_three_hours:'Release to 3 Hours'};const normalizedAliases=Object.fromEntries(Object.entries(aliases).map(([k,v])=>[norm(k),v]));const headers=rows[0].map(v=>normalizedAliases[norm(v)]||clean(v));const seen=new Set();const finalHeaders=headers.map((h,i)=>{let x=h||`Column ${i+1}`;if(seen.has(norm(x)))x=`${x} ${i+1}`;seen.add(norm(x));return x});const capacityIndex=finalHeaders.findIndex(h=>['buyercapacity','buyercapacitylimit','maxbuyers','capacity'].includes(norm(h)));const industryIndex=finalHeaders.findIndex(h=>norm(h)==='industry');const data=rows.slice(1).map(source=>{const row=[...source];while(row.length<finalHeaders.length)row.push('');if(capacityIndex>=0&&clean(row[capacityIndex])){const n=Number(row[capacityIndex]);if(Number.isFinite(n)&&n>=1&&n<=3)row[capacityIndex]=String(Math.floor(n))}if(industryIndex>=0&&norm(row[industryIndex])==='intrior design and home interiors')row[industryIndex]='Interior Design & Home Interiors';return row.slice(0,finalHeaders.length)});return{headers:finalHeaders,items:data.map(row=>Object.fromEntries(finalHeaders.map((h,i)=>[h,clean(row[i])])))}}
function normalizeDefaults(value={}){const raw=String(value?.leadType||'').toLowerCase();return{leadType:['basic','premium'].includes(raw)?raw:'',exclusive:value?.exclusive===true,singleOnly:value?.singleOnly===true}}
async function resolveDefaultIndustry(defaultIndustryId){
  if(defaultIndustryId===undefined||defaultIndustryId===null||defaultIndustryId==='')return null;
  const id=Number(defaultIndustryId);
  if(!Number.isInteger(id)||id<=0)throw Object.assign(new Error('Default Industry must be a valid active Industry'),{code:'INVALID_DEFAULT_INDUSTRY'});
  const row=(await pool.query('SELECT id,name FROM industries WHERE id=$1 AND is_active=TRUE',[id])).rows[0];
  if(!row)throw Object.assign(new Error('Default Industry must be a valid active Industry'),{code:'INVALID_DEFAULT_INDUSTRY'});
  return{id:Number(row.id),name:row.name};
}
function applyDefaultIndustry(row,industry){
  if(!industry)return row;
  const hasClassification=Boolean(get(row,['Industry'])||get(row,['Service'])||get(row,['Subservice']));
  return hasClassification?row:{...row,Industry:industry.name};
}
function valueFor(row,names){const wanted=new Set(names.map(norm));for(const[name,value]of Object.entries(row||{})){if(wanted.has(norm(name))&&clean(value))return clean(value)}return''}
function applyDefaults(row,value){const next={...(row||{})},defaults=normalizeDefaults(value);if(defaults.leadType&&!valueFor(next,['Lead Type']))next['Lead Type']=defaults.leadType;if(defaults.exclusive&&!valueFor(next,['Pro Early Access','Exclusive','Is Exclusive','Early Access']))next['Pro Early Access']='TRUE';const accessFields=['Access Strategy','Buyer Strategy','Buyer Capacity','Buyer Capacity Limit','Max Buyers','Capacity','Release to 2 Hours','Release To Two Hours','Release to 3 Hours','Release To Three Hours'];if(defaults.singleOnly&&!valueFor(next,accessFields)){next['Access Strategy']='Permanent Single';next['Buyer Capacity']='1'}return next}
function pricingColumnParts(value){const n=norm(value);let m=n.match(/^(normal|pro)(\d+)(share|shares|buyer|buyers)(price)?$/);if(m)return{tier:m[1],shares:Number(m[2])};m=n.match(/^(normal|pro)(share|shares|buyer|buyers)(\d+)(price)?$/);if(m)return{tier:m[1],shares:Number(m[3])};m=n.match(/^(normal|pro)price(\d+)(share|shares|buyer|buyers)$/);if(m)return{tier:m[1],shares:Number(m[2])};return null}
function parsePricing(raw){const map=new Map();for(const key of Object.keys(raw)){const parts=pricingColumnParts(key);if(!parts)continue;const{shares,tier}=parts,rawValue=clean(raw[key]);if(!rawValue)continue;const value=Number(rawValue);if(Number.isInteger(shares)&&shares>0&&Number.isFinite(value)&&value>=0){const row=map.get(shares)||{shares};row[tier]=value;map.set(shares,row)}}const shares=[...map.values()].sort((a,b)=>a.shares-b.shares);return shares.length?{shares}:null}
function isPricingColumn(key){const n=norm(key);return Boolean(pricingColumnParts(n))||['pricing','leadpricing','leadprice','price'].includes(n)}
function dynamicFields(row){const fixed=new Set(['id','createdat','pincode','industry','service','subservice','state','city','customername','customerphone','customeremail','requirement','propertytype','budget','source','notes','buyercapacity','buyercapacitylimit','maxbuyers','capacity','leadtype','accessstrategy','buyerstrategy','releaseto2hours','releasetotwohours','releaseto3hours','releasetothreehours','exclusive','isexclusive','proearlyaccess','earlyaccess','exclusivedelaydays','exclusivedelayhours','earlyaccessdelaydays','proearlyaccessdelaydays','investor','investorname','investoremail']);const custom={};Object.entries(row).forEach(([key,value])=>{if(!norm(key).startsWith('unmapped')&&!fixed.has(norm(key))&&!isPricingColumn(key)&&clean(value))custom[key]=value});return custom}
function stableObject(value){if(!value||typeof value!=='object'||Array.isArray(value))return value;return Object.keys(value).sort().reduce((out,key)=>{out[key]=stableObject(value[key]);return out},{})}
function stableEqual(a,b){return JSON.stringify(stableObject(a))===JSON.stringify(stableObject(b))}
function catalogMatch(items,value){const wanted=norm(value);if(!wanted)return null;const aliases={interiordesignandhomeinteriors:'interiordesignandhomeimprovement',homeinteriors:'interiordesignandhomeimprovement',interiors:'interiordesignandhomeimprovement'};const target=aliases[wanted]||wanted;return items.find(x=>norm(x.name)===target)||null}
function resolveClassification(row,cat){let industry=catalogMatch(cat.industries,get(row,['Industry']));let service=catalogMatch(cat.services,get(row,['Service']));let subservice=catalogMatch(cat.subservices,get(row,['Subservice']));if(service&&industry&&String(service.industry_id)!==String(industry.id))service=null;if(subservice&&service&&String(subservice.service_id)!==String(service.id))subservice=null;if(subservice&&!service)service=cat.services.find(x=>String(x.id)===String(subservice.service_id))||null;if(service&&!industry)industry=cat.industries.find(x=>String(x.id)===String(service.industry_id))||null;return{industry,service,subservice}}
function resolveCatalogLocation(row,cat){const state=catalogMatch(cat.states,get(row,['State']));const cityName=get(row,['City']);const city=state?cat.cities.find(x=>String(x.state_id)===String(state.id)&&norm(x.name)===norm(cityName)):catalogMatch(cat.cities,cityName);return{state,city}}
function hasColumn(row,names){return Object.keys(row).some(k=>names.some(n=>norm(k)===norm(n)))}
function parseAccessStrategy(value){const n=norm(value);if(!n)return undefined;if(n.includes('permanent')||n==='single'||n==='singlebuyer'||n==='singleonly')return'permanent_single';if(n.includes('auto'))return'auto_release';if(n.includes('shared'))return'shared';throw new Error('Access Strategy must be Single Only, Auto Release, or Shared from Start')}
async function catalogs(){const[i,s,ss,st,c]=await Promise.all([pool.query('SELECT id,name FROM industries WHERE is_active=TRUE'),pool.query('SELECT id,name,industry_id FROM services WHERE is_active=TRUE'),pool.query('SELECT id,name,service_id FROM subservices WHERE is_active=TRUE'),pool.query('SELECT id,name FROM states WHERE is_active=TRUE'),pool.query('SELECT id,name,state_id FROM cities WHERE is_active=TRUE')]);return{industries:i.rows,services:s.rows,subservices:ss.rows,states:st.rows,cities:c.rows}}
function locationFromDetection(info,cat){if(!info)return{state:null,city:null,pincode:''};const state=cat.states.find(x=>String(x.id)===String(info.state_id))||catalogMatch(cat.states,info.state_name);const city=cat.cities.find(x=>String(x.id)===String(info.city?.id))||(state?cat.cities.find(x=>String(x.state_id)===String(state.id)&&norm(x.name)===norm(info.city?.name||info.district_name)):null);return{state,city,pincode:info.pincode||''}}
function buildPayload(row,lead,cat,locationInfo,classificationSettings=null){const classification=resolveClassification(row,cat);const catalogLocation=resolveCatalogLocation(row,cat);const location=locationInfo?locationFromDetection(locationInfo,cat):catalogLocation;const capacityRaw=get(row,['Buyer Capacity','Buyer Capacity Limit','Max Buyers','Capacity']);const capacityNumber=capacityRaw===''?undefined:Number(capacityRaw);if(capacityRaw!==''&&(!Number.isFinite(capacityNumber)||capacityNumber<1||capacityNumber>3))throw new Error('Buyer Capacity must be a number from 1 to 3');const strategyRaw=get(row,['Access Strategy','Buyer Strategy']);const strategy=parseAccessStrategy(strategyRaw);const releaseTwoRaw=get(row,['Release to 2 Hours','Release To Two Hours']);const releaseThreeRaw=get(row,['Release to 3 Hours','Release To Three Hours']);const releaseTwo=releaseTwoRaw===''?undefined:Number(releaseTwoRaw),releaseThree=releaseThreeRaw===''?undefined:Number(releaseThreeRaw);if(releaseTwoRaw!==''&&(!Number.isFinite(releaseTwo)||releaseTwo<0))throw new Error('Release to 2 Hours must be zero or greater');if(releaseThreeRaw!==''&&(!Number.isFinite(releaseThree)||releaseThree<0))throw new Error('Release to 3 Hours must be zero or greater');if(releaseTwo!==undefined&&releaseThree!==undefined&&releaseThree<releaseTwo)throw new Error('Release to 3 Hours must be after Release to 2 Hours');const hasAccessOverride=[strategyRaw,capacityRaw,releaseTwoRaw,releaseThreeRaw].some(value=>clean(value)!=='');const custom={...dynamicFields(row)};if(capacityNumber!==undefined)custom.buyerCapacity=strategy==='permanent_single'?1:Math.floor(capacityNumber);const id=sourceId(row);if(id)custom.id=id;const autoLeadType=leadClassificationService.classify(custom,classificationSettings,classification.industry?.id||lead?.industry_id||null);const exclusiveNames=['Pro Early Access','Exclusive','Is Exclusive','Early Access'];const exclusiveColumnPresent=hasColumn(row,exclusiveNames);const delayNames=['Exclusive Delay Days','Early Access Delay Days','Pro Early Access Delay Days'];const delayRaw=get(row,delayNames);const leadTypeValue=get(row,['Lead Type']);const rawPincode=get(row,['Pincode']);const pincode=normalizePincode(location.pincode)||normalizePincode(rawPincode)||normalizePincode(lead?.pincode);const pricing=parsePricing(row);const resolvedLeadType=norm(leadTypeValue)==='premium'?'premium':(norm(leadTypeValue)==='basic'?'basic':(lead?.lead_type||autoLeadType||'basic'));const ruleExclusive=resolvedLeadType==='premium'&&leadClassificationService.classifyExclusive(custom,classificationSettings,classification.industry?.id||lead?.industry_id||null);const explicitExclusive=exclusiveColumnPresent&&['true','yes','y','1','exclusive'].includes(norm(get(row,exclusiveNames)));const isExclusive=resolvedLeadType==='premium'&&(ruleExclusive||explicitExclusive||(!exclusiveColumnPresent&&Boolean(lead?.is_exclusive)));return{industryId:classification.industry?.id||lead?.industry_id||'',serviceId:classification.service?.id||lead?.service_id||'',subserviceId:classification.subservice?.id||lead?.subservice_id||'',stateId:location.state?.id||lead?.state_id||'',cityId:location.city?.id||lead?.city_id||'',customerName:get(row,['Customer Name'])||lead?.customer_name||'',customerPhone:get(row,['Customer Phone'])||lead?.customer_phone||'',customerEmail:get(row,['Customer Email'])||lead?.customer_email||'',requirement:get(row,['Requirement'])||lead?.requirement||'',propertyType:get(row,['Property Type'])||lead?.property_type||'',budget:get(row,['Budget'])||lead?.budget||'',source:get(row,['Source'])||lead?.source||'csv-upload',notes:get(row,['Notes'])||lead?.notes||'',pincode,buyerCapacity:strategy==='permanent_single'?1:capacityNumber,accessStrategy:strategy,accessSource:hasAccessOverride?'import':'rule',releaseToTwoAfterHours:releaseTwo,releaseToThreeAfterHours:releaseThree,leadType:resolvedLeadType,isExclusive,exclusiveDelayDays:delayRaw!==''?Number(delayRaw):(lead?.exclusive_delay_days??undefined),customFields:custom,pricing:pricing||undefined,pricingSource:pricing?'import':'rule',status:lead?.status||'available',importMetadata:exclusiveColumnPresent?{exclusiveColumnPresent:true}:{}}}
function needsUpdate(next,lead){return next.pricingSource==='import'||next.accessSource==='import'||next.accessSource==='rule'||!stableEqual(next.customerName,lead.customer_name)||!stableEqual(next.customerPhone,lead.customer_phone)||!stableEqual(next.customerEmail,lead.customer_email)||!stableEqual(next.requirement,lead.requirement)||!stableEqual(next.propertyType,lead.property_type)||!stableEqual(next.budget,lead.budget)||!stableEqual(next.source,lead.source)||!stableEqual(next.notes,lead.notes)||!stableEqual(next.pincode,lead.pincode)||String(next.leadType||'')!==String(lead.lead_type||'')||String(next.industryId||'')!==String(lead.industry_id||'')||String(next.serviceId||'')!==String(lead.service_id||'')||String(next.subserviceId||'')!==String(lead.subservice_id||'')||String(next.stateId||'')!==String(lead.state_id||'')||String(next.cityId||'')!==String(lead.city_id||'')||Boolean(next.isExclusive)!==Boolean(lead.is_exclusive)||Number(next.exclusiveDelayDays||0)!==Number(lead.exclusive_delay_days||0)||!stableEqual(next.customFields,lead.custom_fields||{})}
async function findCandidates(rows){const phones=[...new Set(rows.map(r=>phoneKey(get(r,['Customer Phone']))).filter(Boolean))],emails=[...new Set(rows.map(r=>emailKey(get(r,['Customer Email']))).filter(Boolean))],ids=[...new Set(rows.map(sourceId).filter(Boolean))];if(!phones.length&&!emails.length&&!ids.length)return[];return(await pool.query(`SELECT id,industry_id,service_id,subservice_id,state_id,city_id,customer_name,customer_phone,customer_email,requirement,property_type,budget,source,notes,custom_fields,lead_type,is_exclusive,exclusive_delay_days,pincode,status FROM leads WHERE lead_partner_id IS NULL AND investor_user_id IS NULL AND (regexp_replace(COALESCE(customer_phone,''),'[^0-9]','','g')=ANY($1::text[]) OR LOWER(TRIM(COALESCE(customer_email,'')))=ANY($2::text[]) OR COALESCE(custom_fields->>'id',custom_fields->>'leadId',custom_fields->>'lead_id',custom_fields->>'externalId',custom_fields->>'external_id','')=ANY($3::text[])) ORDER BY id DESC`,[phones,emails,ids])).rows}
async function ensurePincode(pincode,cityId,{forCreate=false}={}){if(!isValidPincode(pincode))throw new Error('Pincode is missing and could not be resolved from the supplied location');let detected;try{detected=await pincodeDetectionService.detectPincode(pincode)}catch(error){if(forCreate&&!cityId){const e=new Error('PIN directory could not be verified. Please retry after postal lookup is available.');e.code='PIN_DIRECTORY_UNAVAILABLE';throw e}return null}if(['NEEDS_MAPPING','NO_MATCH'].includes(detected?.status)){if(cityId)await pincodeDetectionService.mapPinToCity(pincode,cityId,'admin-csv');else if(forCreate&&!detected?.state_id&&!detected?.state_name){const e=new Error('New PIN could not be matched to a State or City');e.code='PIN_LOCATION_UNRESOLVED';throw e}}return detected}
async function previewPincodeStatus(pincode,cityId){
  if(!isValidPincode(pincode))return{invalid:'Pincode is missing and could not be resolved from the supplied location'};
  const row=(await pool.query(
    `SELECT p.pincode,
            COUNT(DISTINCT cp.city_id) FILTER(WHERE cp.is_active=TRUE)::int AS mapped_cities,
            BOOL_OR(cp.city_id=$2 AND cp.is_active=TRUE) AS matches_city
       FROM india_pincodes p
       LEFT JOIN city_pincodes cp ON cp.pincode=p.pincode
      WHERE p.pincode=$1 AND p.is_active=TRUE
      GROUP BY p.pincode`,
    [pincode,cityId||null]
  )).rows[0];
  if(!row)return{warning:`PIN ${pincode} will be verified against India Post during activation`};
  if(Number(row.mapped_cities||0)===0)return{warning:`PIN ${pincode} is verified but does not yet have a City mapping; sync will keep the verified State + PIN and leave City unset until mapped`};
  if(cityId&&!row.matches_city)return{warning:`PIN ${pincode} is not currently mapped to the selected City; activation will verify the location`};
  if(Number(row.mapped_cities||0)>1&&!cityId)return{warning:`PIN ${pincode} maps to multiple Cities; include City in the CSV to make the import deterministic`};
  return{};
}
async function previewCsv({adminId,csv,defaults,columnMappings={},defaultIndustryId=null}){
  const normalized=normalizeDefaults(defaults);
  const defaultIndustry=await resolveDefaultIndustry(defaultIndustryId);
  const sourceCsv=String(csv||'');
  const analysis=leadImportMapping.analyzeCsv(sourceCsv,{columnMappings,scope:'admin'});
  const parsed=parseRows(analysis.mappedCsv);
  if(!parsed.items.length)throw new Error('CSV file contains no data rows');
  const unique=[],seen=new Set(),previewRows=[];
  let duplicateCount=0;
  for(let index=0;index<parsed.items.length;index+=1){
    const row=applyDefaultIndustry(applyDefaults(parsed.items[index],normalized),defaultIndustry);
    const key=leadRowIdentity(row);
    if(seen.has(key)){
      duplicateCount+=1;
      if(previewRows.length<60)previewRows.push({row:index+2,status:'warning',action:'skip',key:sourceId(row)||get(row,['Customer Phone'])||get(row,['Customer Email'])||`Row ${index+2}`,messages:['Duplicate row in this CSV; the later copy will be skipped']});
      continue;
    }
    seen.add(key);unique.push({row,index:index+2,key});
  }
  const[cat,candidates,classificationSettings]=await Promise.all([catalogs(),findCandidates(unique.map(item=>item.row)),leadClassificationService.getSettings()]);
  const maps=candidateMaps(candidates);
  let valid=0,warnings=duplicateCount,invalid=0,creates=0,updates=0;
  for(const item of unique){
    let row=item.row;
    const key=sourceId(row)||get(row,['Customer Phone'])||get(row,['Customer Email'])||`Row ${item.index}`;
    const lead=matchLead(row,maps);
    const messages=[];
    try{
      const rawIndustry=get(row,['Industry']),rawService=get(row,['Service']),rawSubservice=get(row,['Subservice']);
      const classification=resolveClassification(row,cat);
      if(rawIndustry&&!classification.industry)throw new Error(`Industry "${rawIndustry}" was not found`);
      if(rawService&&!classification.service)throw new Error(`Service "${rawService}" was not found or does not belong to the selected Industry`);
      if(rawSubservice&&!classification.subservice)throw new Error(`Subservice "${rawSubservice}" was not found or does not belong to the selected Service`);

      let resolvedPincode=normalizePincode(get(row,['Pincode']));
      if(!resolvedPincode){
        const location=resolveCatalogLocation(row,cat);
        const locationText=get(row,['Location','Area','Locality','Post Office','Office','District']);
        const district=get(row,['District']);
        const local=await resolvePincode({stateId:location.state?.id,cityId:location.city?.id,district,location:locationText}).catch(()=>null);
        if(isValidPincode(local?.pincode)){resolvedPincode=local.pincode;row={...row,Pincode:resolvedPincode};messages.push(`Pincode ${resolvedPincode} was inferred from the existing location directory`)}
      }
      const next=buildPayload(row,lead,cat,null,classificationSettings);
      if(!lead&&!next.industryId)throw new Error('Industry is required or must be derivable from Service/Subservice');
      if(!next.pincode)throw new Error('Pincode is missing and could not be resolved from the supplied location');
      const pinState=await previewPincodeStatus(next.pincode,next.cityId);
      if(pinState.invalid)throw new Error(pinState.invalid);
      if(pinState.warning)messages.push(pinState.warning);
      if(!next.customerPhone&&!next.customerEmail)messages.push('Customer phone and email are both blank');
      if(!next.requirement)messages.push('Requirement is blank');
      if(lead)updates+=1;else creates+=1;
      const status=messages.length?'warning':'valid';
      if(status==='warning')warnings+=1;else valid+=1;
      if(previewRows.length<60)previewRows.push({row:item.index,status,action:lead?'update':'create',key,messages});
    }catch(error){
      invalid+=1;
      if(previewRows.length<60)previewRows.push({row:item.index,status:'invalid',action:lead?'update':'create',key,messages:[String(error.message||'Row is invalid')]});
    }
  }
  const summary={
    total:parsed.items.length,
    valid,
    warning:warnings,
    invalid,
    duplicates:duplicateCount,
    creates,
    updates,
    mappingWarnings:analysis.mappingWarnings
  };
  return{
    headers:analysis.headers,
    mappingFields:analysis.mappingFields,
    columnMappings:analysis.effectiveMappings,
    mappingWarnings:analysis.mappingWarnings,
    summary,
    rows:previewRows.slice(0,60)
  };
}
async function syncCsv({adminId,csv,defaults,columnMappings={},defaultIndustryId=null,source='csv'}){
  const defaultIndustry=await resolveDefaultIndustry(defaultIndustryId);
  const sourceCsv=String(csv||'');
  const analysis=leadImportMapping.analyzeCsv(sourceCsv,{columnMappings,scope:'admin'});
  const parsed=parseRows(analysis.mappedCsv);
  if(!parsed.items.length)throw new Error('CSV file contains no data rows');
  const unique=[],seen=new Set();
  for(const original of parsed.items){
    const row=applyDefaultIndustry(applyDefaults({...original,Source:get(original,['Source'])||source},defaults),defaultIndustry);
    const key=leadRowIdentity(row);
    if(seen.has(key))continue;seen.add(key);unique.push(row);
  }
  const[cat,candidates,classificationSettings]=await Promise.all([catalogs(),findCandidates(unique),leadClassificationService.getSettings()]);
  const maps=candidateMaps(candidates),pinCache=new Map();
  let updated=0,created=0,quarantined=0,unchanged=0,failed=0;const failures=[];
  for(const originalRow of unique){
    let row=originalRow;const lead=matchLead(row,maps);const rawPin=get(row,['Pincode']);const normalizedRawPin=normalizePincode(rawPin);let locationInfo=null;
    if(normalizedRawPin){if(!pinCache.has(normalizedRawPin))pinCache.set(normalizedRawPin,pincodeDetectionService.detectPincode(normalizedRawPin).catch(()=>null));locationInfo=await pinCache.get(normalizedRawPin)}
    let resolvedPincode=normalizedRawPin;
    if(!resolvedPincode){
      const catalogLocation=resolveCatalogLocation(row,cat);const location=get(row,['Location','Area','Locality','Post Office','Office','District']);const district=get(row,['District']);
      try{const result=await resolvePincode({stateId:catalogLocation.state?.id,cityId:catalogLocation.city?.id,district,location});resolvedPincode=isValidPincode(result?.pincode)?result.pincode:''}catch{resolvedPincode=''}
    }
    if(resolvedPincode)row={...row,Pincode:resolvedPincode};
    if(!lead&&!isValidPincode(resolvedPincode)){failed++;failures.push(`${sourceId(row)||get(row,['Customer Phone'])||'row'}: Pincode is missing and could not be resolved from the supplied location`);continue}
    try{
      const explicitClassification=resolveClassification(row,cat);
      const rawIndustry=get(row,['Industry']),rawService=get(row,['Service']),rawSubservice=get(row,['Subservice']);
      if(rawIndustry&&!explicitClassification.industry)throw new Error(`Industry "${rawIndustry}" was not found`);
      if(rawService&&!explicitClassification.service)throw new Error(`Service "${rawService}" was not found or does not belong to the selected Industry`);
      if(rawSubservice&&!explicitClassification.subservice)throw new Error(`Subservice "${rawSubservice}" was not found or does not belong to the selected Service`);
      const next=buildPayload(row,lead,cat,locationInfo,classificationSettings);
      if(!next.pincode)throw new Error('Pincode is missing and could not be resolved from the supplied location');
      if(lead){await ensurePincode(next.pincode,next.cityId);if(needsUpdate(next,lead)){await leadService.updateLead(lead.id,next);updated++}else unchanged++}
      else{if(!next.industryId)throw new Error('Industry not found');await ensurePincode(next.pincode,next.cityId,{forCreate:true});const createdLead=await leadService.createLead({...next,createdBy:adminId,qualityGateContext:'admin_csv'});created++;if(createdLead.status==='quarantined')quarantined++}
    }catch(error){failed++;failures.push(`${sourceId(row)||get(row,['Customer Phone'])||'row'}: ${error.message||'sync failed'}`)}
  }
  return{total:unique.length,updated,created,quarantined,unchanged,failed,failures};
}


module.exports={previewCsv,syncCsv};
