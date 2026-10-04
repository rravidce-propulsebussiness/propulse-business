export const EMPTY_IMPORT_DEFAULTS=Object.freeze({leadType:'',exclusive:false,singleOnly:false})

export function normalizeImportDefaults(value={}){
  const rawType=String(value?.leadType||'').toLowerCase()
  const leadType=['basic','premium'].includes(rawType)?rawType:''
  return{leadType,exclusive:value?.exclusive===true,singleOnly:value?.singleOnly===true}
}

const key=value=>String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,'')
const valueFor=(row,names)=>{
  const wanted=new Set(names.map(key))
  for(const [name,value] of Object.entries(row||{})){
    if(wanted.has(key(name))&&String(value??'').trim()!=='')return String(value).trim()
  }
  return''
}

const ACCESS_FIELDS=[
  'Access Strategy','Buyer Strategy',
  'Buyer Capacity','Buyer Capacity Limit','Max Buyers','Capacity',
  'Release to 2 Hours','Release To Two Hours',
  'Release to 3 Hours','Release To Three Hours'
]

export function applyImportDefaults(row,defaults){
  const next={...(row||{})}
  const normalized=normalizeImportDefaults(defaults)

  if(normalized.leadType&&!valueFor(next,['Lead Type']))next['Lead Type']=normalized.leadType
  if(normalized.exclusive&&!valueFor(next,['Pro Early Access','Exclusive','Is Exclusive','Early Access']))next['Pro Early Access']='TRUE'

  // Sharing precedence: exact row access values > Single Only connection override > Admin access configuration.
  if(normalized.singleOnly&&!valueFor(next,ACCESS_FIELDS)){
    next['Access Strategy']='Permanent Single'
    next['Buyer Capacity']='1'
  }

  return next
}

export function importDefaultsSummary(value){
  const defaults=normalizeImportDefaults(value)
  const labels=[]
  if(defaults.leadType)labels.push(defaults.leadType==='premium'?'Premium':'Basic')
  if(defaults.singleOnly)labels.push('Single Only')
  if(defaults.exclusive)labels.push('Exclusive')
  return labels.length?labels.join(' + '):'Automatic'
}
