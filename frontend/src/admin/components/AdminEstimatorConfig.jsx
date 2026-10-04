import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminEstimatorConfig.css'

const blankRate=(index=0)=>({rateKey:'rate_'+(index+1),label:'Base rate',calculationType:'fixed',unitQuestionKey:'',amountMin:'0.00',amountMax:'0.00',showWhen:{},displayOrder:(index+1)*10,isActive:true})
const blankAdjustment=(index=0)=>({adjustmentKey:'adjustment_'+(index+1),label:'Adjustment',adjustmentType:'percent',valueMin:'0.00',valueMax:'0.00',cityId:'',showWhen:{},displayOrder:(index+1)*10,isActive:true})
const ruleText=rule=>Array.isArray(rule?.in)?rule.in.join(','):(rule?.equals??rule?.notEquals??'')
const ruleMode=rule=>Array.isArray(rule?.in)?'in':Object.prototype.hasOwnProperty.call(rule||{},'notEquals')?'notEquals':'equals'
const patchRule=(rule,field,value)=>{
 const current=rule||{}
 if(field==='questionKey') return value?{questionKey:value,[ruleMode(current)]:ruleText(current)}:{}
 if(!current.questionKey) return {}
 if(field==='mode') return value==='in'?{questionKey:current.questionKey,in:ruleText(current).split(',').map(x=>x.trim()).filter(Boolean)}:{questionKey:current.questionKey,[value]:ruleText(current)}
 return ruleMode(current)==='in'?{questionKey:current.questionKey,in:String(value).split(',').map(x=>x.trim()).filter(Boolean)}:{questionKey:current.questionKey,[ruleMode(current)]:value}
}

export default function AdminEstimatorConfig({flowId,versionId,questions=[]}){
 const[config,setConfig]=useState(null),[cities,setCities]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 const numericQuestions=useMemo(()=>questions.filter(q=>['number','area'].includes(q.questionType)),[questions])

 async function load(){
  if(!flowId)return
  try{
   setBusy(true);setError('');setMessage('')
   const[data,cityResult]=await Promise.all([apiRequest('/customer-flows/admin/'+flowId+'/estimator-config'),apiRequest('/cities')])
   setConfig(data)
   setCities(Array.isArray(cityResult)?cityResult:(cityResult?.data||[]))
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{load()},[flowId,versionId])

 const rates=config?.rates||[],adjustments=config?.adjustments||[]
 const patchRate=(index,patch)=>setConfig(current=>({...current,rates:current.rates.map((item,i)=>i===index?{...item,...patch}:item)}))
 const patchAdjustment=(index,patch)=>setConfig(current=>({...current,adjustments:current.adjustments.map((item,i)=>i===index?{...item,...patch}:item)}))

 async function save(){
  if(!config)return
  try{
   setBusy(true);setError('');setMessage('')
   const saved=await apiRequest('/customer-flows/admin/'+flowId+'/estimator-config',{method:'PUT',body:JSON.stringify({rates,adjustments})})
   setConfig(saved);setMessage('Estimator rates and adjustments saved.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }

 if(!config)return <section className="flow-panel estimator-admin-panel"><div className="flow-panel-head"><div><span>ESTIMATOR ENGINE</span><h3>Rates & adjustments</h3></div></div>{error?<div className="flow-alert error">{error}</div>:<p className="est-admin-muted">{busy?'Loading estimator configuration…':'Estimator configuration unavailable.'}</p>}</section>

 return <section className="flow-panel estimator-admin-panel">
  <div className="flow-panel-head"><div><span>ESTIMATOR ENGINE</span><h3>Rates & adjustments</h3><p>Amounts are versioned with the flow. Public calculations are recomputed on the server.</p></div><button type="button" onClick={save} disabled={busy||!config.editable}>Save estimator config</button></div>
  {!config.editable&&<div className="est-admin-notice">This is the published version. Click <b>Save draft</b> in the flow header first; the current estimator configuration will be copied into the new draft.</div>}
  {error&&<div className="flow-alert error">{error}</div>}{message&&<div className="flow-alert success">{message}</div>}

  <div className="est-admin-section-head"><div><b>Rate items</b><small>Fixed amount or rate × number/area answer.</small></div><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,rates:[...current.rates,blankRate(current.rates.length)]}))}>+ Rate</button></div>
  <div className="est-admin-list">{rates.map((item,index)=><article className="est-admin-card" key={item.id||item.rateKey+'-'+index}>
   <div className="est-admin-card-head"><b>{String(index+1).padStart(2,'0')}</b><strong>{item.label||'Rate item'}</strong><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,rates:current.rates.filter((_,i)=>i!==index)}))}>Remove</button></div>
   <div className="flow-grid">
    <label>Key<input disabled={!config.editable} value={item.rateKey||''} onChange={e=>patchRate(index,{rateKey:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')})}/></label>
    <label>Label<input disabled={!config.editable} value={item.label||''} onChange={e=>patchRate(index,{label:e.target.value})}/></label>
    <label>Calculation<select disabled={!config.editable} value={item.calculationType||'fixed'} onChange={e=>patchRate(index,{calculationType:e.target.value,unitQuestionKey:e.target.value==='fixed'?'':item.unitQuestionKey})}><option value="fixed">Fixed amount</option><option value="per_unit">Rate × quantity</option></select></label>
    <label>Quantity question<select disabled={!config.editable||item.calculationType!=='per_unit'} value={item.unitQuestionKey||''} onChange={e=>patchRate(index,{unitQuestionKey:e.target.value})}><option value="">Select number / area question</option>{numericQuestions.map(q=><option key={q.questionKey} value={q.questionKey}>{q.label} ({q.questionKey})</option>)}</select></label>
    <label>Minimum ₹<input disabled={!config.editable} inputMode="decimal" value={item.amountMin??''} onChange={e=>patchRate(index,{amountMin:e.target.value})}/></label>
    <label>Maximum ₹<input disabled={!config.editable} inputMode="decimal" value={item.amountMax??''} onChange={e=>patchRate(index,{amountMax:e.target.value})}/></label>
    <label className="flow-toggle">Status<span><input disabled={!config.editable} type="checkbox" checked={item.isActive!==false} onChange={e=>patchRate(index,{isActive:e.target.checked})}/> Active</span></label>
   </div>
   <div className="dependency-box"><b>Apply when <small>Optional</small></b><div><select disabled={!config.editable} value={item.showWhen?.questionKey||''} onChange={e=>patchRate(index,{showWhen:patchRule(item.showWhen,'questionKey',e.target.value)})}><option value="">Always</option>{questions.map(q=><option key={q.questionKey} value={q.questionKey}>{q.label} ({q.questionKey})</option>)}</select><select disabled={!config.editable||!item.showWhen?.questionKey} value={ruleMode(item.showWhen)} onChange={e=>patchRate(index,{showWhen:patchRule(item.showWhen,'mode',e.target.value)})}><option value="equals">equals</option><option value="notEquals">not equals</option><option value="in">in list</option></select><input disabled={!config.editable||!item.showWhen?.questionKey} placeholder="Value / comma list" value={ruleText(item.showWhen)} onChange={e=>patchRate(index,{showWhen:patchRule(item.showWhen,'value',e.target.value)})}/></div></div>
  </article>)}</div>

  <div className="est-admin-section-head"><div><b>Adjustments</b><small>Apply fixed or percentage changes after base rates. City is optional.</small></div><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,adjustments:[...current.adjustments,blankAdjustment(current.adjustments.length)]}))}>+ Adjustment</button></div>
  <div className="est-admin-list">{adjustments.map((item,index)=><article className="est-admin-card" key={item.id||item.adjustmentKey+'-'+index}>
   <div className="est-admin-card-head"><b>{String(index+1).padStart(2,'0')}</b><strong>{item.label||'Adjustment'}</strong><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,adjustments:current.adjustments.filter((_,i)=>i!==index)}))}>Remove</button></div>
   <div className="flow-grid">
    <label>Key<input disabled={!config.editable} value={item.adjustmentKey||''} onChange={e=>patchAdjustment(index,{adjustmentKey:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')})}/></label>
    <label>Label<input disabled={!config.editable} value={item.label||''} onChange={e=>patchAdjustment(index,{label:e.target.value})}/></label>
    <label>Type<select disabled={!config.editable} value={item.adjustmentType||'percent'} onChange={e=>patchAdjustment(index,{adjustmentType:e.target.value})}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
    <label>City <small>Optional</small><select disabled={!config.editable} value={item.cityId||''} onChange={e=>patchAdjustment(index,{cityId:e.target.value})}><option value="">All cities</option>{cities.map(city=><option key={city.id} value={city.id}>{city.name}{city.state_name?' · '+city.state_name:''}</option>)}</select></label>
    <label>Minimum {item.adjustmentType==='percent'?'%':'₹'}<input disabled={!config.editable} inputMode="decimal" value={item.valueMin??''} onChange={e=>patchAdjustment(index,{valueMin:e.target.value})}/></label>
    <label>Maximum {item.adjustmentType==='percent'?'%':'₹'}<input disabled={!config.editable} inputMode="decimal" value={item.valueMax??''} onChange={e=>patchAdjustment(index,{valueMax:e.target.value})}/></label>
    <label className="flow-toggle">Status<span><input disabled={!config.editable} type="checkbox" checked={item.isActive!==false} onChange={e=>patchAdjustment(index,{isActive:e.target.checked})}/> Active</span></label>
   </div>
   <div className="dependency-box"><b>Apply when <small>Optional</small></b><div><select disabled={!config.editable} value={item.showWhen?.questionKey||''} onChange={e=>patchAdjustment(index,{showWhen:patchRule(item.showWhen,'questionKey',e.target.value)})}><option value="">Always</option>{questions.map(q=><option key={q.questionKey} value={q.questionKey}>{q.label} ({q.questionKey})</option>)}</select><select disabled={!config.editable||!item.showWhen?.questionKey} value={ruleMode(item.showWhen)} onChange={e=>patchAdjustment(index,{showWhen:patchRule(item.showWhen,'mode',e.target.value)})}><option value="equals">equals</option><option value="notEquals">not equals</option><option value="in">in list</option></select><input disabled={!config.editable||!item.showWhen?.questionKey} placeholder="Value / comma list" value={ruleText(item.showWhen)} onChange={e=>patchAdjustment(index,{showWhen:patchRule(item.showWhen,'value',e.target.value)})}/></div></div>
  </article>)}</div>
 </section>
}
