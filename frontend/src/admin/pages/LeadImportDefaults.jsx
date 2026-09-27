import { normalizeImportDefaults } from './leadImportDefaultsUtils'
import './LeadImportDefaults.css'

export default function LeadImportDefaults({value,onChange,disabled=false,compact=false}){
  const defaults=normalizeImportDefaults(value)
  const setType=leadType=>onChange?.({...defaults,leadType:defaults.leadType===leadType?'':leadType})
  return <div className={`lead-import-defaults${compact?' compact':''}`}>
    <div className="lead-import-defaults-copy">
      <span>OPTIONAL SHEET DEFAULTS</span>
      {!compact&&<small>Only fills blank sheet values. Exact row values always win.</small>}
    </div>
    <div className="lead-import-default-actions">
      <button type="button" className={defaults.leadType==='basic'?'active':''} onClick={()=>setType('basic')} disabled={disabled}>Basic</button>
      <button type="button" className={defaults.leadType==='premium'?'active':''} onClick={()=>setType('premium')} disabled={disabled}>Premium</button>
      <button type="button" className={defaults.singleOnly?'active single':''} onClick={()=>onChange?.({...defaults,singleOnly:!defaults.singleOnly})} disabled={disabled} title="When sheet sharing fields are blank, force Permanent Single / 1 buyer">Single Only</button>
      <button type="button" className={defaults.exclusive?'active exclusive':''} onClick={()=>onChange?.({...defaults,exclusive:!defaults.exclusive})} disabled={disabled}>Exclusive</button>
    </div>
  </div>
}
