const {parseCsvRecords}=require('../utils/csvRecords');

const clean=value=>String(value??'').trim();
const norm=value=>clean(value).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');

const TARGETS=[
  {id:'leadId',label:'Lead ID',canonical:'Lead ID',group:'Identity',aliases:['id','lead id','lead_id','external id','external_id']},
  {id:'industry',label:'Industry',canonical:'Industry',group:'Classification',aliases:['industry','industry name','industry type','industry category','category']},
  {id:'service',label:'Service',canonical:'Service',group:'Classification',aliases:['service','service name','service type','service category']},
  {id:'subservice',label:'Subservice',canonical:'Subservice',group:'Classification',aliases:['subservice','subservice name']},
  {id:'state',label:'State',canonical:'State',group:'Location',aliases:['state','state name']},
  {id:'city',label:'City',canonical:'City',group:'Location',aliases:['city','city name']},
  {id:'pincode',label:'Pincode',canonical:'Pincode',group:'Location',aliases:['pincode','pin code','pin','zipcode','zip code','postal code','post code']},
  {id:'customerName',label:'Customer Name',canonical:'Customer Name',group:'Customer',aliases:['customer name','full name','name','customer']},
  {id:'customerPhone',label:'Customer Phone',canonical:'Customer Phone',group:'Customer',aliases:['customer phone','phone number','phone','mobile','mob no','whatsapp','whatsapp number','contact number']},
  {id:'customerEmail',label:'Customer Email',canonical:'Customer Email',group:'Customer',aliases:['customer email','email','email id']},
  {id:'requirement',label:'Requirement',canonical:'Requirement',group:'Lead',aliases:['requirement','requirements','requirement details','give more details','give more details and requirement','update']},
  {id:'propertyType',label:'Property Type',canonical:'Property Type',group:'Lead',aliases:['property type','property','interior type','falt size']},
  {id:'budget',label:'Budget',canonical:'Budget',group:'Lead',aliases:['budget']},
  {id:'source',label:'Source',canonical:'Source',group:'Lead',aliases:['source','lead source','platform']},
  {id:'notes',label:'Notes',canonical:'Notes',group:'Lead',aliases:['notes','remarks']},
  {id:'leadType',label:'Lead Type',canonical:'Lead Type',group:'Access',aliases:['lead type']},
  {id:'accessStrategy',label:'Access Strategy',canonical:'Access Strategy',group:'Access',aliases:['access strategy','buyer strategy','lead access strategy','lead sharing strategy','sharing strategy','sharing type','sharing mode','access type','distribution strategy']},
  {id:'buyerCapacity',label:'Buyer Capacity',canonical:'Buyer Capacity',group:'Access',aliases:['buyer capacity','buyer capacity limit','max buyers','maximum buyers','max buyers per lead','buyer limit','buyer count','number of buyers','number of buyers per lead','capacity']},
  {id:'releaseToTwoHours',label:'Release to 2 Hours',canonical:'Release to 2 Hours',group:'Access',aliases:['release to 2 hours','release to two hours','release after 2 hours','release after two hours','released after 2 hours','release in 2 hours','2 hour release','2 hours release']},
  {id:'releaseToThreeHours',label:'Release to 3 Hours',canonical:'Release to 3 Hours',group:'Access',aliases:['release to 3 hours','release to three hours','release after 3 hours','release after three hours','released after 3 hours','release in 3 hours','3 hour release','3 hours release']},
  {id:'isExclusive',label:'Pro Early Access',canonical:'Pro Early Access',group:'Access',aliases:['pro early access','early access','exclusive','is exclusive']},
  {id:'exclusiveDelayDays',label:'Exclusive Delay Days',canonical:'Exclusive Delay Days',group:'Access',aliases:['exclusive delay days','early access delay days','pro early access delay days']},
  {id:'normal1BuyerPrice',label:'Normal 1 Buyer Price',canonical:'Normal 1 Buyer',group:'Pricing',aliases:['normal 1 buyer','normal 1 buyer price','normal buyer 1 price','normal buyer price 1','normal price 1 buyer','normal 1 share','normal 1 share price'],scopes:['admin']},
  {id:'normal2BuyerPrice',label:'Normal 2 Buyer Price',canonical:'Normal 2 Buyer',group:'Pricing',aliases:['normal 2 buyer','normal 2 buyer price','normal buyer 2 price','normal buyer price 2','normal price 2 buyers','normal 2 shares','normal 2 share price'],scopes:['admin']},
  {id:'normal3BuyerPrice',label:'Normal 3 Buyer Price',canonical:'Normal 3 Buyer',group:'Pricing',aliases:['normal 3 buyer','normal 3 buyer price','normal buyer 3 price','normal buyer price 3','normal price 3 buyers','normal 3 shares','normal 3 share price'],scopes:['admin']},
  {id:'pro1BuyerPrice',label:'Pro 1 Buyer Price',canonical:'Pro 1 Buyer',group:'Pricing',aliases:['pro 1 buyer','pro 1 buyer price','pro buyer 1 price','pro buyer price 1','pro price 1 buyer','pro 1 share','pro 1 share price']},
  {id:'pro2BuyerPrice',label:'Pro 2 Buyer Price',canonical:'Pro 2 Buyer',group:'Pricing',aliases:['pro 2 buyer','pro 2 buyer price','pro buyer 2 price','pro buyer price 2','pro price 2 buyers','pro 2 shares','pro 2 share price'],scopes:['admin']},
  {id:'pro3BuyerPrice',label:'Pro 3 Buyer Price',canonical:'Pro 3 Buyer',group:'Pricing',aliases:['pro 3 buyer','pro 3 buyer price','pro buyer 3 price','pro buyer price 3','pro price 3 buyers','pro 3 shares','pro 3 share price'],scopes:['admin']}
];

function targetsFor(scope='admin'){
  return TARGETS.filter(target=>!target.scopes||target.scopes.includes(scope));
}
function uniqueHeaders(rawHeaders){
  const used=new Map();
  return rawHeaders.map((value,index)=>{
    const base=clean(value)||`Column ${index+1}`;
    const key=norm(base)||`column${index+1}`;
    const count=(used.get(key)||0)+1;used.set(key,count);
    return count===1?base:`${base} (${count})`;
  });
}
function csvEscape(value){return `"${String(value??'').replace(/"/g,'""')}"`;}
function headerMatchesTarget(header,target){
  const key=norm(header.replace(/\s+\(\d+\)$/,''));
  return [target.canonical,target.label,...target.aliases].some(alias=>norm(alias)===key);
}
function analyzeCsv(csv,{columnMappings={},scope='admin'}={}){
  const matrix=parseCsvRecords(csv);
  if(!matrix.length)throw new Error('CSV file contains no rows');
  const headers=uniqueHeaders(matrix[0]);
  if(!headers.length)throw new Error('CSV file contains no columns');
  const targets=targetsFor(scope);
  const suggestions={};
  const mappingWarnings=[];
  for(const target of targets){
    const candidates=headers.filter(header=>headerMatchesTarget(header,target));
    if(candidates.length){
      suggestions[target.id]=candidates[0];
      if(candidates.length>1)mappingWarnings.push(`${target.label}: multiple possible columns found; using "${candidates[0]}" until you choose another mapping.`);
    }
  }
  const requested=columnMappings&&typeof columnMappings==='object'&&!Array.isArray(columnMappings)?columnMappings:{};
  const effective={};
  for(const target of targets){
    if(scope==='admin'&&((target.group==='Access'&&target.id!=='leadType')||target.group==='Pricing')&&!Object.prototype.hasOwnProperty.call(requested,target.id)){
      // Admin CSV file access and price columns are opt-in overrides. By default,
      // lead creation resolves these values from the configured Admin rules.
      effective[target.id]=null;
      continue;
    }
    if(Object.prototype.hasOwnProperty.call(requested,target.id)){
      const sourceHeader=requested[target.id];
      if(sourceHeader===null||sourceHeader===undefined||clean(sourceHeader)===''){effective[target.id]=null;continue}
      const source=clean(sourceHeader);
      if(!headers.includes(source)){
        const error=new Error(`Mapped column "${source}" is no longer present in the CSV file`);
        error.code='CSV_MAPPING_COLUMN_MISSING';
        throw error;
      }
      effective[target.id]=source;
      continue;
    }
    if(suggestions[target.id])effective[target.id]=suggestions[target.id];
  }
  const usedSources=new Map();
  for(const [targetId,source] of Object.entries(effective)){
    if(!source)continue;
    if(usedSources.has(source)){
      const error=new Error(`Column "${source}" cannot map to both ${usedSources.get(source)} and ${targetId}`);
      error.code='CSV_MAPPING_CONFLICT';
      throw error;
    }
    usedSources.set(source,targetId);
  }
  const selectedBySource=new Map(Object.entries(effective).filter(([,source])=>Boolean(source)).map(([targetId,source])=>[source,targetId]));
  const outputHeaders=headers.map(header=>{
    const targetId=selectedBySource.get(header);
    if(targetId)return targets.find(item=>item.id===targetId)?.canonical||header;
    const colliding=targets.find(target=>
      headerMatchesTarget(header,target)
      && Object.prototype.hasOwnProperty.call(effective,target.id)
      && effective[target.id]!==header
    );
    return colliding?`Unmapped ${header}`:header;
  });
  const width=headers.length;
  const outputRows=matrix.slice(1).filter(row=>row.some(value=>clean(value))).map(row=>{
    const values=[...row];while(values.length<width)values.push('');
    return values.slice(0,width);
  });
  const mappedCsv=[outputHeaders,...outputRows].map(row=>row.map(csvEscape).join(',')).join('\n');
  return{
    headers,
    rowCount:outputRows.length,
    effectiveMappings:effective,
    suggestedMappings:suggestions,
    mappingWarnings,
    mappingFields:targets.map(({id,label,group,canonical})=>({id,label,group,canonical})),
    mappedCsv,
  };
}
module.exports={TARGETS,targetsFor,parseCsvMatrix:parseCsvRecords,analyzeCsv};
