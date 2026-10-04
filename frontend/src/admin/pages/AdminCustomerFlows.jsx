import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import AdminEstimatorConfig from '../components/AdminEstimatorConfig'
import './AdminCustomerFlows.css'

const types=['single_select','multi_select','text','number','area','budget','timeline','boolean','location']
const emptyCreate={key:'',name:'',flowType:'requirement',industryId:'',serviceId:'',subserviceId:''}
const blankQuestion=(index=0)=>({questionKey:'question_'+(index+1),questionType:'single_select',label:'New question',helpText:'',isRequired:false,displayOrder:(index+1)*10,validation:{},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[{value:'option_1',label:'Option 1',displayOrder:10,isActive:true}]})
const optionTypes=new Set(['single_select','multi_select','timeline'])
const optionsText=q=>(q.options||[]).map(o=>o.value+'|'+o.label).join('\n')
const parseOptions=text=>String(text||'').split('\n').map(x=>x.trim()).filter(Boolean).map((line,index)=>{const [value,...rest]=line.split('|');return{value:(value||'').trim(),label:(rest.join('|')||value||'').trim(),displayOrder:(index+1)*10,isActive:true}})
const dependencyText=q=>Array.isArray(q.showWhen?.in)?q.showWhen.in.join(','):(q.showWhen?.equals??q.showWhen?.notEquals??'')

export default function AdminCustomerFlows(){
 const[flows,setFlows]=useState([]),[detail,setDetail]=useState(null),[industries,setIndustries]=useState([]),[services,setServices]=useState([]),[subservices,setSubservices]=useState([])
 const[createForm,setCreateForm]=useState(emptyCreate),[showCreate,setShowCreate]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')

 async function load(selectedId){
  try{
   setBusy(true);setError('')
   const[flowRows,industryRows,serviceRows,subserviceRows]=await Promise.all([apiRequest('/customer-flows/admin'),apiRequest('/industries'),apiRequest('/services'),apiRequest('/subservices')])
   setFlows(flowRows||[]);setIndustries(industryRows||[]);setServices(serviceRows||[]);setSubservices(subserviceRows||[])
   const chosen=selectedId||flowRows?.[0]?.id
   setDetail(chosen?await apiRequest('/customer-flows/admin/'+chosen):null)
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 useEffect(()=>{load()},[])

 const editorServices=useMemo(()=>services.filter(x=>String(x.industry_id)===String(detail?.industry_id)),[services,detail?.industry_id])
 const editorSubs=useMemo(()=>subservices.filter(x=>String(x.service_id)===String(detail?.service_id)),[subservices,detail?.service_id])
 const createServices=useMemo(()=>services.filter(x=>String(x.industry_id)===String(createForm.industryId)),[services,createForm.industryId])
 const createSubs=useMemo(()=>subservices.filter(x=>String(x.service_id)===String(createForm.serviceId)),[subservices,createForm.serviceId])
 const questions=detail?.editingVersion?.questions||[]

 const patchDetail=patch=>setDetail(current=>({...current,...patch}))
 const patchConfig=patch=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,config:{...(current.editingVersion?.config||{}),...patch}}}))
 const patchQuestion=(index,patch)=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:current.editingVersion.questions.map((q,i)=>i===index?{...q,...patch}:q)}}))
 function addQuestion(){setDetail(current=>{const list=current.editingVersion?.questions||[];return{...current,editingVersion:{...current.editingVersion,questions:[...list,blankQuestion(list.length)]}}})}
 function removeQuestion(index){setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:current.editingVersion.questions.filter((_,i)=>i!==index)}}))}
 function moveQuestion(index,direction){setDetail(current=>{const list=[...current.editingVersion.questions],to=index+direction;if(to<0||to>=list.length)return current;[list[index],list[to]]=[list[to],list[index]];return{...current,editingVersion:{...current.editingVersion,questions:list.map((q,i)=>({...q,displayOrder:(i+1)*10}))}}})}
 function payload(){return{name:detail.name,industryId:detail.industry_id,serviceId:detail.service_id||null,subserviceId:detail.subservice_id||null,isActive:detail.is_active!==false,config:detail.editingVersion?.config||{},questions:questions.map((q,i)=>({...q,displayOrder:(i+1)*10,leadField:q.leadField||'',validation:q.validation||{},showWhen:q.showWhen||{},options:q.options||[]}))}}

 async function saveDraft(reload=true){
  if(!detail)return null
  const saved=await apiRequest('/customer-flows/admin/'+detail.id+'/draft',{method:'PUT',body:JSON.stringify(payload())})
  setDetail(saved);if(reload)await load(saved.id);return saved
 }
 async function save(){
  try{setBusy(true);setError('');setMessage('');await saveDraft();setMessage('Draft saved.')}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function publish(){
  if(!detail)return
  try{setBusy(true);setError('');setMessage('');const saved=await saveDraft(false);await apiRequest('/customer-flows/admin/'+saved.id+'/publish',{method:'POST'});setMessage('Draft saved and published.');await load(saved.id)}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function create(event){
  event.preventDefault()
  try{setBusy(true);setError('');setMessage('');const made=await apiRequest('/customer-flows/admin',{method:'POST',body:JSON.stringify(createForm)});setCreateForm(emptyCreate);setShowCreate(false);setMessage('Flow created. Add questions, then publish it.');await load(made.id)}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function selectFlow(id){
  try{setBusy(true);setError('');setMessage('');setDetail(await apiRequest('/customer-flows/admin/'+id))}catch(e){setError(e.message)}finally{setBusy(false)}
 }

 return <main className="flow-admin">
  <section className="flow-hero"><div><span>CUSTOMER DEMAND</span><h1>Customer Flows</h1><p>Configure requirement journeys and estimator calculators on one versioned question engine.</p></div><button type="button" onClick={()=>setShowCreate(x=>!x)}>+ New flow</button></section>
  {error&&<div className="flow-alert error">{error}</div>}{message&&<div className="flow-alert success">{message}</div>}
  {showCreate&&<form className="flow-create" onSubmit={create}><div className="flow-panel-head"><div><span>NEW FLOW</span><h3>Create customer flow</h3></div></div><div className="flow-grid"><label>Type<select value={createForm.flowType} onChange={e=>setCreateForm({...createForm,flowType:e.target.value})}><option value="requirement">Requirement</option><option value="estimator">Estimator</option></select></label><label>Key<input value={createForm.key} onChange={e=>setCreateForm({...createForm,key:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})} placeholder="example-flow" required/></label><label>Name<input value={createForm.name} onChange={e=>setCreateForm({...createForm,name:e.target.value})} required/></label><label>Industry<select value={createForm.industryId} onChange={e=>setCreateForm({...createForm,industryId:e.target.value,serviceId:'',subserviceId:''})} required><option value="">Select industry</option>{industries.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Service <small>Optional</small><select value={createForm.serviceId} onChange={e=>setCreateForm({...createForm,serviceId:e.target.value,subserviceId:''})}><option value="">All services</option>{createServices.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Subservice <small>Optional</small><select value={createForm.subserviceId} onChange={e=>setCreateForm({...createForm,subserviceId:e.target.value})}><option value="">All subservices</option>{createSubs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div><div className="flow-form-actions"><button type="button" onClick={()=>setShowCreate(false)}>Cancel</button><button className="primary" disabled={busy}>Create</button></div></form>}
  <div className="flow-layout">
   <aside className="flow-list"><div className="flow-list-head"><b>Flows</b><span>{flows.length}</span></div>{flows.map(flow=><button type="button" key={flow.id} className={detail?.id===flow.id?'active':''} onClick={()=>selectFlow(flow.id)}><span>{flow.key}</span><strong>{flow.name}</strong><small>{flow.industry_name}{flow.service_name?' · '+flow.service_name:''}</small><small>{flow.flow_type==='estimator'?'Estimator':'Requirement'}</small><em className={flow.published_version?'published':'draft'}>{flow.published_version?'Published v'+flow.published_version:'Draft only'}</em></button>)}</aside>
   <section className="flow-editor">
    {!detail?<div className="flow-empty">{busy?'Loading…':'Create or select a flow.'}</div>:<>
     <div className="flow-editor-head"><div><span>FLOW SETTINGS</span><h2>{detail.name}</h2><p>Public page: <code>{detail.flow_type==='estimator'?'/estimate/':'/requirements/'}{detail.key}</code></p></div><div><button type="button" className="secondary" onClick={save} disabled={busy}>Save draft</button><button type="button" className="primary" onClick={publish} disabled={busy||!questions.length}>Save & publish</button></div></div>
     <section className="flow-panel"><div className="flow-grid"><label>Name<input value={detail.name||''} onChange={e=>patchDetail({name:e.target.value})}/></label><label>Industry<select value={detail.industry_id||''} onChange={e=>patchDetail({industry_id:e.target.value,service_id:'',subservice_id:''})}>{industries.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Service<select value={detail.service_id||''} onChange={e=>patchDetail({service_id:e.target.value,subservice_id:''})}><option value="">All services</option>{editorServices.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Subservice<select value={detail.subservice_id||''} onChange={e=>patchDetail({subservice_id:e.target.value})}><option value="">All subservices</option>{editorSubs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="flow-toggle">Status<span><input type="checkbox" checked={detail.is_active!==false} onChange={e=>patchDetail({is_active:e.target.checked})}/> Active</span></label></div></section>
     <section className="flow-panel"><div className="flow-panel-head"><div><span>PUBLIC COPY</span><h3>Wizard messaging</h3></div></div><div className="flow-grid"><label>Headline<input value={detail.editingVersion?.config?.headline||''} onChange={e=>patchConfig({headline:e.target.value})}/></label><label>Submit button<input value={detail.editingVersion?.config?.submitLabel||''} onChange={e=>patchConfig({submitLabel:e.target.value})}/></label><label className="wide">Subheadline<input value={detail.editingVersion?.config?.subheadline||''} onChange={e=>patchConfig({subheadline:e.target.value})}/></label>{detail.flow_type==='estimator'&&<><label>Result title<input value={detail.editingVersion?.config?.resultTitle||''} onChange={e=>patchConfig({resultTitle:e.target.value})} placeholder="Estimated project cost"/></label><label className="wide">Estimator disclaimer<input value={detail.editingVersion?.config?.estimatorDisclaimer||''} onChange={e=>patchConfig({estimatorDisclaimer:e.target.value})} placeholder="Indicative estimate; final pricing may change after professional review."/></label></>}</div></section>
     <section className="flow-panel"><div className="flow-panel-head"><div><span>QUESTION BUILDER</span><h3>{questions.length} questions</h3><p>Published versions stay historical; edits become the next draft.</p></div><button type="button" onClick={addQuestion}>+ Add question</button></div>
      <div className="question-list">{questions.map((q,index)=><article className="question-card" key={q.id||q.questionKey+'-'+index}>
       <div className="question-card-top"><b>{String(index+1).padStart(2,'0')}</b><span>{q.questionType.replaceAll('_',' ')}</span><div><button type="button" onClick={()=>moveQuestion(index,-1)} disabled={index===0}>↑</button><button type="button" onClick={()=>moveQuestion(index,1)} disabled={index===questions.length-1}>↓</button><button type="button" className="danger" onClick={()=>removeQuestion(index)}>Remove</button></div></div>
       <div className="flow-grid"><label>Key<input value={q.questionKey} onChange={e=>patchQuestion(index,{questionKey:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')})}/></label><label>Type<select value={q.questionType} onChange={e=>patchQuestion(index,{questionType:e.target.value,options:optionTypes.has(e.target.value)?(q.options?.length?q.options:[{value:'option_1',label:'Option 1',displayOrder:10,isActive:true}]):[]})}>{types.map(type=><option key={type} value={type}>{type.replaceAll('_',' ')}</option>)}</select></label><label className="wide">Label<input value={q.label} onChange={e=>patchQuestion(index,{label:e.target.value})}/></label><label className="wide">Help text<input value={q.helpText||''} onChange={e=>patchQuestion(index,{helpText:e.target.value})}/></label><label>Visibility<select value={q.visibility||'marketplace'} onChange={e=>patchQuestion(index,{visibility:e.target.value})}><option value="marketplace">Marketplace preview</option><option value="protected">Protected</option><option value="internal">Internal</option></select></label><label>Lead field<select value={q.leadField||''} onChange={e=>patchQuestion(index,{leadField:e.target.value})}><option value="">None</option><option value="property_type">Property type</option><option value="budget">Budget</option><option value="requirement">Requirement</option></select></label><label className="flow-toggle">Required<span><input type="checkbox" checked={Boolean(q.isRequired)} onChange={e=>patchQuestion(index,{isRequired:e.target.checked})}/> Required</span></label></div>
       {optionTypes.has(q.questionType)&&<label className="option-editor">Options <small>One per line: value|Label</small><textarea rows="5" value={optionsText(q)} onChange={e=>patchQuestion(index,{options:parseOptions(e.target.value)})}/></label>}
       <div className="dependency-box"><b>Conditional display <small>Optional</small></b><div><input placeholder="Depends on question key" value={q.showWhen?.questionKey||''} onChange={e=>patchQuestion(index,{showWhen:e.target.value?{questionKey:e.target.value,equals:dependencyText(q)}:{}})}/><select value={Array.isArray(q.showWhen?.in)?'in':Object.prototype.hasOwnProperty.call(q.showWhen||{},'notEquals')?'notEquals':'equals'} onChange={e=>{const dep=q.showWhen?.questionKey;if(!dep)return;const text=dependencyText(q);patchQuestion(index,{showWhen:e.target.value==='in'?{questionKey:dep,in:text.split(',').map(v=>v.trim()).filter(Boolean)}:{questionKey:dep,[e.target.value]:text}})}}><option value="equals">equals</option><option value="notEquals">not equals</option><option value="in">in list</option></select><input placeholder="Value or comma list" value={dependencyText(q)} onChange={e=>{const dep=q.showWhen?.questionKey;if(!dep)return;const mode=Array.isArray(q.showWhen?.in)?'in':Object.prototype.hasOwnProperty.call(q.showWhen||{},'notEquals')?'notEquals':'equals';patchQuestion(index,{showWhen:mode==='in'?{questionKey:dep,in:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)}:{questionKey:dep,[mode]:e.target.value}})}}/></div></div>
      </article>)}</div>
     </section>
     {detail.flow_type==='estimator'&&<AdminEstimatorConfig flowId={detail.id} versionId={detail.editingVersion?.id} questions={questions}/>}
    </>}
   </section>
  </div>
 </main>
}
