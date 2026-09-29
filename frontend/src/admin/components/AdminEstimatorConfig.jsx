import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import './AdminEstimatorConfig.css'

const blankRate=(index=0)=>({rateKey:'rate_'+(index+1),label:'Base rate',calculationType:'fixed',unitQuestionKey:'',amountMin:'0.00',amountMax:'0.00',showWhen:{},displayOrder:(index+1)*10,isActive:true})
const blankAdjustment=(index=0)=>({adjustmentKey:'adjustment_'+(index+1),label:'Adjustment',adjustmentType:'percent',valueMin:'0.00',valueMax:'0.00',cityId:'',showWhen:{},displayOrder:(index+1)*10,isActive:true})
const blankMaterialAdjustment=(index=0)=>({adjustmentKey:'material_option_'+(index+1),label:'Detailed option price',adjustmentType:'fixed',valueMin:'0.00',valueMax:'0.00',cityId:'',showWhen:{},displayOrder:500+(index+1)*10,metadata:{kind:'material_option'},isActive:true})
const blankPackage=(index=0)=>({packageKey:'package_'+(index+1),label:'Package '+(index+1),badge:'',selectorQuestionKey:'',selectorValue:'',summary:'',priceNote:'',displayOrder:(index+1)*10,isActive:true,details:[]})
const blankDetail=(index=0)=>({detailKey:'detail_'+(index+1),section:'Specifications',label:'Specification',value:'',note:'',displayOrder:(index+1)*10,isActive:true})
const keyValue=value=>String(value||'').toLowerCase().replace(/[^a-z0-9_]/g,'')
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
 const selectorQuestions=useMemo(()=>questions.filter(q=>['single_select','multi_select','boolean'].includes(q.questionType)),[questions])
 const materialQuestions=useMemo(()=>selectorQuestions.filter(q=>{
  if(q.questionKey==='estimate_mode')return false
  const detailedRule=q.showWhen?.questionKey==='estimate_mode'&&(q.showWhen?.equals==='detailed'||(Array.isArray(q.showWhen?.in)&&q.showWhen.in.includes('detailed')))
  return detailedRule||/(spec|material|laminate|hardware|finish|floor|brick|steel|cement|sand|wire|switch|ply)/i.test(q.questionKey)
 }),[selectorQuestions])

 async function load(){
  if(!flowId)return
  try{
   setBusy(true);setError('');setMessage('')
   const[data,cityResult]=await Promise.all([apiRequest('/customer-flows/admin/'+flowId+'/estimator-config'),apiRequest('/cities')])
   setConfig({...data,packages:Array.isArray(data?.packages)?data.packages:[]})
   setCities(Array.isArray(cityResult)?cityResult:(cityResult?.data||[]))
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{load()},[flowId,versionId])

 const packages=config?.packages||[],rates=config?.rates||[],adjustments=config?.adjustments||[]
 const patchPackage=(index,patch)=>setConfig(current=>({...current,packages:current.packages.map((item,i)=>i===index?{...item,...patch}:item)}))
 const patchPackageDetail=(packageIndex,detailIndex,patch)=>setConfig(current=>({...current,packages:current.packages.map((item,i)=>i===packageIndex?{...item,details:(item.details||[]).map((detail,j)=>j===detailIndex?{...detail,...patch}:detail)}:item)}))
 const patchRate=(index,patch)=>setConfig(current=>({...current,rates:current.rates.map((item,i)=>i===index?{...item,...patch}:item)}))
 const patchAdjustment=(index,patch)=>setConfig(current=>({...current,adjustments:current.adjustments.map((item,i)=>i===index?{...item,...patch}:item)}))
 const movePackage=(index,delta)=>setConfig(current=>{
  const list=[...(current.packages||[])],next=index+delta
  if(next<0||next>=list.length)return current
  ;[list[index],list[next]]=[list[next],list[index]]
  return {...current,packages:list.map((item,i)=>({...item,displayOrder:(i+1)*10}))}
 })
 const movePackageDetail=(packageIndex,detailIndex,delta)=>setConfig(current=>{
  const packages=[...(current.packages||[])],item=packages[packageIndex]
  const details=[...(item?.details||[])],next=detailIndex+delta
  if(!item||next<0||next>=details.length)return current
  ;[details[detailIndex],details[next]]=[details[next],details[detailIndex]]
  packages[packageIndex]={...item,details:details.map((detail,i)=>({...detail,displayOrder:(i+1)*10}))}
  return {...current,packages}
 })

 async function save(){
  if(!config)return
  try{
   setBusy(true);setError('');setMessage('')
   const saved=await apiRequest('/customer-flows/admin/'+flowId+'/estimator-config',{method:'PUT',body:JSON.stringify({packages,rates,adjustments})})
   setConfig({...saved,packages:Array.isArray(saved?.packages)?saved.packages:[]});setMessage('Packages, rates and adjustments saved to this draft.')
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }

 if(!config)return <section className="flow-panel estimator-admin-panel"><div className="flow-panel-head"><div><span>ESTIMATOR ENGINE</span><h3>Packages & pricing</h3></div></div>{error?<div className="flow-alert error">{error}</div>:<p className="est-admin-muted">{busy?'Loading estimator configuration…':'Estimator configuration unavailable.'}</p>}</section>

 return <section className="flow-panel estimator-admin-panel">
  <div className="flow-panel-head"><div><span>ESTIMATOR ENGINE</span><h3>Packages, specifications & pricing</h3><p>Package names, brochure-style specifications, rates and adjustments are versioned together. Published estimates keep their original configuration.</p></div><button type="button" onClick={save} disabled={busy||!config.editable}>Save estimator config</button></div>
  {!config.editable&&<div className="est-admin-notice">This is the published version. Click <b>Save draft</b> in the flow header first. Packages, specifications and pricing will be copied into the new draft.</div>}
  {error&&<div className="flow-alert error">{error}</div>}{message&&<div className="flow-alert success">{message}</div>}

  <div className="est-admin-section-head"><div><b>Customer packages</b><small>Configure package names, badges and the specification details customers see. Link each package to the answer that activates it.</small></div><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,packages:[...(current.packages||[]),blankPackage((current.packages||[]).length)]}))}>+ Package</button></div>
  <div className="est-package-list">{packages.map((item,index)=>{
   const selector=questions.find(q=>q.questionKey===item.selectorQuestionKey)
   const selectorOptions=Array.isArray(selector?.options)?selector.options.filter(option=>option.isActive!==false):[]
   return <article className="est-package-card" key={item.id||item.packageKey+'-'+index}>
    <div className="est-package-card-head"><div><b>{item.badge||'PACKAGE'}</b><strong>{item.label||'Unnamed package'}</strong><small>{item.selectorQuestionKey&&item.selectorValue?item.selectorQuestionKey+' = '+item.selectorValue:'Choose when this package applies'}</small></div><div className="package-order-controls"><button type="button" title="Move package up" disabled={!config.editable||index===0} onClick={()=>movePackage(index,-1)}>↑</button><button type="button" title="Move package down" disabled={!config.editable||index===packages.length-1} onClick={()=>movePackage(index,1)}>↓</button></div><label className="flow-toggle"><span><input disabled={!config.editable} type="checkbox" checked={item.isActive!==false} onChange={e=>patchPackage(index,{isActive:e.target.checked})}/> Active</span></label><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,packages:current.packages.filter((_,i)=>i!==index).map((entry,order)=>({...entry,displayOrder:(order+1)*10}))}))}>Remove</button></div>
    <div className="flow-grid package-grid">
     <label>Package key<input disabled={!config.editable} value={item.packageKey||''} onChange={e=>patchPackage(index,{packageKey:keyValue(e.target.value)})}/></label>
     <label>Customer label<input disabled={!config.editable} value={item.label||''} onChange={e=>patchPackage(index,{label:e.target.value})}/></label>
     <label>Badge <small>Optional</small><input disabled={!config.editable} value={item.badge||''} placeholder="POPULAR / SIGNATURE" onChange={e=>patchPackage(index,{badge:e.target.value})}/></label>
     <label>Selector question<select disabled={!config.editable} value={item.selectorQuestionKey||''} onChange={e=>patchPackage(index,{selectorQuestionKey:e.target.value,selectorValue:''})}><option value="">Select package question</option>{selectorQuestions.map(q=><option key={q.questionKey} value={q.questionKey}>{q.label} ({q.questionKey})</option>)}</select></label>
     <label>Selector value{selectorOptions.length?<select disabled={!config.editable||!item.selectorQuestionKey} value={item.selectorValue||''} onChange={e=>patchPackage(index,{selectorValue:e.target.value})}><option value="">Select value</option>{selectorOptions.map(option=><option key={option.value} value={option.value}>{option.label} ({option.value})</option>)}</select>:<input disabled={!config.editable||!item.selectorQuestionKey} value={item.selectorValue||''} placeholder={selector?.questionType==='boolean'?'true / false':'Option value'} onChange={e=>patchPackage(index,{selectorValue:e.target.value})}/>}</label>
     <label>Price note <small>Optional display only</small><input disabled={!config.editable} value={item.priceNote||''} placeholder="From ₹2,100/sft" onChange={e=>patchPackage(index,{priceNote:e.target.value})}/></label>
     <label className="wide-field">Customer summary<textarea disabled={!config.editable} rows="2" value={item.summary||''} onChange={e=>patchPackage(index,{summary:e.target.value})}/></label>
    </div>

    <div className="package-details-head"><div><b>Package details</b><small>Steel, cement, bricks, wire, ply, laminate, hardware, flooring, warranty or any other package promise.</small></div><button type="button" disabled={!config.editable} onClick={()=>patchPackage(index,{details:[...(item.details||[]),blankDetail((item.details||[]).length)]})}>+ Detail</button></div>
    <div className="package-detail-list">{(item.details||[]).map((detail,detailIndex)=><div className="package-detail-row" key={detail.id||detail.detailKey+'-'+detailIndex}>
     <label>Section<input disabled={!config.editable} value={detail.section||''} onChange={e=>patchPackageDetail(index,detailIndex,{section:e.target.value})}/></label>
     <label>Label<input disabled={!config.editable} value={detail.label||''} onChange={e=>patchPackageDetail(index,detailIndex,{label:e.target.value})}/></label>
     <label className="package-detail-value">Specification<input disabled={!config.editable} value={detail.value||''} onChange={e=>patchPackageDetail(index,detailIndex,{value:e.target.value})}/></label>
     <label>Note <small>Optional</small><input disabled={!config.editable} value={detail.note||''} placeholder="Warranty / allowance / condition" onChange={e=>patchPackageDetail(index,detailIndex,{note:e.target.value})}/></label>
     <label>Key<input disabled={!config.editable} value={detail.detailKey||''} onChange={e=>patchPackageDetail(index,detailIndex,{detailKey:keyValue(e.target.value)})}/></label>
     <div className="package-detail-actions"><button type="button" title="Move detail up" disabled={!config.editable||detailIndex===0} onClick={()=>movePackageDetail(index,detailIndex,-1)}>↑</button><button type="button" title="Move detail down" disabled={!config.editable||detailIndex===(item.details||[]).length-1} onClick={()=>movePackageDetail(index,detailIndex,1)}>↓</button></div>
     <label className="flow-toggle"><span><input disabled={!config.editable} type="checkbox" checked={detail.isActive!==false} onChange={e=>patchPackageDetail(index,detailIndex,{isActive:e.target.checked})}/> Show</span></label>
     <button className="package-detail-remove" type="button" disabled={!config.editable} onClick={()=>patchPackage(index,{details:(item.details||[]).filter((_,i)=>i!==detailIndex).map((entry,order)=>({...entry,displayOrder:(order+1)*10}))})}>×</button>
    </div>)}</div>
   </article>
  })}</div>

  <div className="est-admin-section-head material-pricing-head"><div><b>Detailed option pricing</b><small>Set a fixed or percentage cost adjustment for a material/specification option. This is the simple pricing editor for detailed estimates; use Advanced adjustments below for city-specific or complex rules.</small></div><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,adjustments:[...current.adjustments,blankMaterialAdjustment(current.adjustments.length)]}))}>+ Option price</button></div>
  <div className="material-price-list">{adjustments.map((item,index)=>{
   if(item?.metadata?.kind!=='material_option')return null
   const q=questions.find(question=>question.questionKey===item.showWhen?.questionKey)
   const options=Array.isArray(q?.options)?q.options.filter(option=>option.isActive!==false&&String(option.value)!=='package_default'):[]
   const selectedOption=options.find(option=>String(option.value)===String(item.showWhen?.equals??''))
   return <article className="material-price-card" key={item.id||item.adjustmentKey+'-'+index}>
    <div className="material-price-card-head"><div><span>DETAIL PRICE</span><strong>{item.label||'Detailed option price'}</strong><small>{q?.label||'Choose a specification'}{selectedOption?' · '+selectedOption.label:''}</small></div><label className="flow-toggle"><span><input disabled={!config.editable} type="checkbox" checked={item.isActive!==false} onChange={e=>patchAdjustment(index,{isActive:e.target.checked})}/> Active</span></label><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,adjustments:current.adjustments.filter((_,i)=>i!==index)}))}>Remove</button></div>
    <div className="flow-grid material-price-grid">
     <label>Specification<select disabled={!config.editable} value={item.showWhen?.questionKey||''} onChange={e=>{const question=questions.find(entry=>entry.questionKey===e.target.value);patchAdjustment(index,{showWhen:e.target.value?{questionKey:e.target.value,equals:''}:{},label:question?.label?question.label+' option':'Detailed option price',adjustmentKey:e.target.value?'material_'+keyValue(e.target.value)+'_'+(index+1):'material_option_'+(index+1),metadata:{...(item.metadata||{}),kind:'material_option'}})}}><option value="">Select detailed question</option>{materialQuestions.map(question=><option key={question.questionKey} value={question.questionKey}>{question.label}</option>)}</select></label>
     <label>Option<select disabled={!config.editable||!q} value={item.showWhen?.equals??''} onChange={e=>{const option=options.find(entry=>String(entry.value)===String(e.target.value));patchAdjustment(index,{showWhen:{questionKey:q.questionKey,equals:e.target.value},label:(q?.label||'Specification')+(option?.label?' · '+option.label:''),adjustmentKey:'material_'+keyValue(q?.questionKey)+'_'+keyValue(e.target.value),metadata:{...(item.metadata||{}),kind:'material_option'}})}}><option value="">Select option</option>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
     <label>Price effect<select disabled={!config.editable} value={item.adjustmentType||'fixed'} onChange={e=>patchAdjustment(index,{adjustmentType:e.target.value})}><option value="fixed">Fixed amount</option><option value="percent">Percentage</option></select></label>
     <label>Minimum {item.adjustmentType==='percent'?'%':'₹'}<input disabled={!config.editable} inputMode="decimal" value={item.valueMin??''} onChange={e=>patchAdjustment(index,{valueMin:e.target.value})}/></label>
     <label>Maximum {item.adjustmentType==='percent'?'%':'₹'}<input disabled={!config.editable} inputMode="decimal" value={item.valueMax??''} onChange={e=>patchAdjustment(index,{valueMax:e.target.value})}/></label>
    </div>
   </article>
  })}</div>

  <div className="est-admin-section-head"><div><b>Rate items</b><small>These are the actual calculation values. Package display text never silently changes calculation rates.</small></div><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,rates:[...current.rates,blankRate(current.rates.length)]}))}>+ Rate</button></div>
  <div className="est-admin-list">{rates.map((item,index)=><article className="est-admin-card" key={item.id||item.rateKey+'-'+index}>
   <div className="est-admin-card-head"><b>{String(index+1).padStart(2,'0')}</b><strong>{item.label||'Rate item'}</strong><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,rates:current.rates.filter((_,i)=>i!==index)}))}>Remove</button></div>
   <div className="flow-grid">
    <label>Key<input disabled={!config.editable} value={item.rateKey||''} onChange={e=>patchRate(index,{rateKey:keyValue(e.target.value)})}/></label>
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
  <div className="est-admin-list">{adjustments.map((item,index)=>item?.metadata?.kind==='material_option'?null:<article className="est-admin-card" key={item.id||item.adjustmentKey+'-'+index}>
   <div className="est-admin-card-head"><b>{String(index+1).padStart(2,'0')}</b><strong>{item.label||'Adjustment'}</strong><button type="button" disabled={!config.editable} onClick={()=>setConfig(current=>({...current,adjustments:current.adjustments.filter((_,i)=>i!==index)}))}>Remove</button></div>
   <div className="flow-grid">
    <label>Key<input disabled={!config.editable} value={item.adjustmentKey||''} onChange={e=>patchAdjustment(index,{adjustmentKey:keyValue(e.target.value)})}/></label>
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
