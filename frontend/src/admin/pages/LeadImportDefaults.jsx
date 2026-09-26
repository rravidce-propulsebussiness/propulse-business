import './LeadImportDefaults.css'

export const EMPTY_IMPORT_DEFAULTS=Object.freeze({leadType:'',exclusive:false})

export function normalizeImportDefaults(value={}){
  const leadType=['basic','premium'].includes(String(value?.leadType||'').toLowerCase())?String(value.leadType).toLowerCase():''
  return{leadType,exclusive:value?.exclusive===true}
}

const key=value=>String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,'')
const valueFor=(row,names)=>{
  const wanted=new Set(names.map(key))
  for(const [name,value] of Object.entries(row||{})){
    if(wanted.has(key(name))&&String(value??'').trim()!=='')return String(value).trim()
  }
  return''
}

export function applyImportDefaults(row,defaults){
  const next={...(row||{})}
  const normalized=normalizeImportDefaults(defaults)
  if(normalized.leadType&&!valueFor(next,['Lead Type']))next['Lead Type']=normalized.leadType
  if(normalized.exclusive&&!valueFor(next,['Pro Early Access','Exclusive','Is Exclusive','Early Access']))next['Pro Early Access']='TRUE'
  return next
}

export function importDefaultsSummary(value){
  const defaults=normalizeImportDefaults(value)
  const labels=[]
  if(defaults.leadType)labels.push(defaults.leadType==='premium'?'Premium':'Basic')
  if(defaults.exclusive)labels.push('Exclusive')
  return labels.length?labels.join(' + '):'Automatic'
}

export default function LeadImportDefaults({value,onChange,disabled=false,compact=false}){
  const defaults=normalizeImportDefaults(value)
  const setType=leadType=>onChange?.({...defaults,leadType:defaults.leadType===leadType?'':leadType})
  return <div className={`lead-import-defaults${compact?' compact':''}`}>
    <div className="lead-import-defaults-copy">
      <span>OPTIONAL DEFAULTS</span>
      {!compact&&<small>Used only when that value is blank in the CSV or Google Sheet. Row values always win.</small>}
    </div>
    <div className="lead-import-default-actions">
      <button type="button" className={defaults.leadType==='basic'?'active':''} onClick={()=>setType('basic')} disabled={disabled}>Basic</button>
      <button type="button" className={defaults.leadType==='premium'?'active':''} onClick={()=>setType('premium')} disabled={disabled}>Premium</button>
      <button type="button" className={defaults.exclusive?'active exclusive':''} onClick={()=>onChange?.({...defaults,exclusive:!defaults.exclusive})} disabled={disabled}>Exclusive</button>
    </div>
  </div>
}
