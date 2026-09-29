import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../utils/api'
import AdminEstimatorConfig from '../components/AdminEstimatorConfig'
import './AdminCustomerFlows.css'

const types=['single_select','multi_select','text','number','area','budget','timeline','boolean','location']
const emptyCreate={key:'',name:'',flowType:'requirement',industryId:'',serviceId:'',subserviceId:''}
const optionTypes=new Set(['single_select','multi_select','timeline'])
const inputControls=type=>type==='single_select'||type==='timeline'?[['dropdown','Dropdown'],['cards','Cards']]:type==='multi_select'?[['checkboxes','Checkbox cards'],['cards','Cards']]:type==='boolean'?[['segmented','Yes / No buttons'],['dropdown','Dropdown']]:[['auto','Standard input']]
const blankQuestion=(index=0)=>({questionKey:'question_'+(index+1),questionType:'single_select',label:'New question',helpText:'',isRequired:false,displayOrder:(index+1)*10,validation:{uiControl:'dropdown',section:'Project details',placeholder:'Select an option'},showWhen:{},leadField:'',visibility:'marketplace',isActive:true,options:[{value:'option_1',label:'Option 1',displayOrder:10,isActive:true}]})
const dependencyText=q=>Array.isArray(q.showWhen?.in)?q.showWhen.in.join(','):(q.showWhen?.equals??q.showWhen?.notEquals??'')
const dependencyMode=q=>Array.isArray(q.showWhen?.in)?'in':Object.prototype.hasOwnProperty.call(q.showWhen||{},'notEquals')?'notEquals':'equals'

function recommendedSection(question,flowType){
 const key=String(question?.questionKey||'')
 if(key==='estimate_mode')return 'Estimate type'
 if(['project_location'].includes(key))return flowType==='estimator'?'Site & location':'Project location'
 if(['project_type','own_plot','basement','site_access'].includes(key))return 'Site & project'
 if(['plot_area','built_up_area','floors'].includes(key))return 'Area & floors'
 if(key==='construction_package')return 'Scope of work'
 if(key==='quality')return 'Choose your package'
 if(['steel_spec','cement_spec','sand_spec','brick_spec'].includes(key))return 'Structure materials'
 if(['wire_spec','switch_spec'].includes(key))return 'Electrical'
 if(key==='flooring_spec')return 'Flooring & finishes'
 if(['property_type','bhk','area','property_status'].includes(key))return 'Home details'
 if(['scope_mode','selected_work','kitchen_package','wardrobe_units','false_ceiling_area','furniture_package'].includes(key))return 'Scope & quantities'
 if(key==='finish_quality')return 'Choose your package'
 if(['plywood_spec','internal_laminate_spec','external_laminate_spec','hardware_spec','modular_finish_spec'].includes(key))return 'Core materials & finishes'
 if(key==='customisations')return 'Add-ons & customisations'
 if(/(_area|_meters|_count)$/.test(key)&&question?.showWhen?.questionKey==='customisations')return 'Customisation quantities'
 if(['timeline','additional_requirement'].includes(key))return 'Timeline & notes'
 if(question?.questionType==='location')return 'Project location'
 if(question?.leadField==='requirement'||question?.questionType==='text')return 'Project requirement'
 return 'Project details'
}

function recommendedControl(question){
 const key=String(question?.questionKey||'')
 if(['estimate_mode','quality','finish_quality'].includes(key))return 'cards'
 if(question?.questionType==='single_select'||question?.questionType==='timeline')return 'dropdown'
 if(question?.questionType==='multi_select')return 'checkboxes'
 if(question?.questionType==='boolean')return 'segmented'
 return 'auto'
}

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
 const publicPath=detail?(detail.flow_type==='estimator'?'/estimate/':'/requirements/')+detail.key:''

 const patchDetail=patch=>setDetail(current=>({...current,...patch}))
 const patchConfig=patch=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,config:{...(current.editingVersion?.config||{}),...patch}}}))
 const patchQuestion=(index,patch)=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:current.editingVersion.questions.map((q,i)=>i===index?{...q,...patch}:q)}}))
 const patchQuestionValidation=(index,patch)=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:current.editingVersion.questions.map((q,i)=>i===index?{...q,validation:{...(q.validation||{}),...patch}}:q)}}))
 const patchOption=(questionIndex,optionIndex,patch)=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:current.editingVersion.questions.map((q,i)=>i===questionIndex?{...q,options:(q.options||[]).map((o,j)=>j===optionIndex?{...o,...patch}:o)}:q)}}))
 const addOption=questionIndex=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:current.editingVersion.questions.map((q,i)=>i===questionIndex?{...q,options:[...(q.options||[]),{value:'option_'+((q.options?.length||0)+1),label:'Option '+((q.options?.length||0)+1),displayOrder:((q.options?.length||0)+1)*10,isActive:true}]}:q)}}))
 const removeOption=(questionIndex,optionIndex)=>setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:current.editingVersion.questions.map((q,i)=>i===questionIndex?{...q,options:(q.options||[]).filter((_,j)=>j!==optionIndex).map((o,j)=>({...o,displayOrder:(j+1)*10}))}:q)}}))
 function applyRecommendedLayout(){
  setDetail(current=>({...current,editingVersion:{...current.editingVersion,questions:(current.editingVersion?.questions||[]).map(q=>({
   ...q,
   validation:{
    ...(q.validation||{}),
    section:recommendedSection(q,current.flow_type),
    uiControl:recommendedControl(q),
    fullWidth:['estimate_mode','quality','finish_quality','customisations'].includes(q.questionKey)||['text','multi_select'].includes(q.questionType),
   },
  }))}}))
  setMessage('Recommended single-page field layout applied to this draft. Review it, then save or publish.')
 }
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
  try{setBusy(true);setError('');setMessage('');const made=await apiRequest('/customer-flows/admin',{method:'POST',body:JSON.stringify(createForm)});setCreateForm(emptyCreate);setShowCreate(false);setMessage('Flow created. Add fields, configure the single-page experience, then publish it.');await load(made.id)}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 async function selectFlow(id){
  try{setBusy(true);setError('');setMessage('');setDetail(await apiRequest('/customer-flows/admin/'+id))}catch(e){setError(e.message)}finally{setBusy(false)}
 }

 return <main className="flow-admin">
  <section className="flow-hero"><div><span>CUSTOMER ACQUISITION</span><h1>Forms & Estimators</h1><p>Configure the two customer journeys: Project Estimate and Free Consultation, with dropdowns, conditional fields, packages and versioned pricing.</p></div><div className="flow-hero-actions"><Link to="/admin/customer-funnel">View Funnel Analytics</Link><button type="button" onClick={()=>setShowCreate(x=>!x)}>+ New flow</button></div></section>
  {error&&<div className="flow-alert error">{error}</div>}{message&&<div className="flow-alert success">{message}</div>}
  {showCreate&&<form className="flow-create" onSubmit={create}><div className="flow-panel-head"><div><span>NEW FLOW</span><h3>Create customer flow</h3></div></div><div className="flow-grid"><label>Type<select value={createForm.flowType} onChange={e=>setCreateForm({...createForm,flowType:e.target.value})}><option value="requirement">Free consultation form</option><option value="estimator">Estimator</option></select></label><label>Key<input value={createForm.key} onChange={e=>setCreateForm({...createForm,key:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})} placeholder="example-flow" required/></label><label>Name<input value={createForm.name} onChange={e=>setCreateForm({...createForm,name:e.target.value})} required/></label><label>Industry<select value={createForm.industryId} onChange={e=>setCreateForm({...createForm,industryId:e.target.value,serviceId:'',subserviceId:''})} required><option value="">Select industry</option>{industries.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Service <small>Optional</small><select value={createForm.serviceId} onChange={e=>setCreateForm({...createForm,serviceId:e.target.value,subserviceId:''})}><option value="">All services</option>{createServices.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Subservice <small>Optional</small><select value={createForm.subserviceId} onChange={e=>setCreateForm({...createForm,subserviceId:e.target.value})}><option value="">All subservices</option>{createSubs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div><div className="flow-form-actions"><button type="button" onClick={()=>setShowCreate(false)}>Cancel</button><button className="primary" disabled={busy}>Create</button></div></form>}
  <div className="flow-layout">
   <aside className="flow-list"><div className="flow-list-head"><b>Flows</b><span>{flows.length}</span></div>{flows.map(flow=><button type="button" key={flow.id} className={detail?.id===flow.id?'active':''} onClick={()=>selectFlow(flow.id)}><span>{flow.key}</span><strong>{flow.name}</strong><small>{flow.industry_name}{flow.service_name?' · '+flow.service_name:''}</small><small>{flow.flow_type==='estimator'?'Project estimator':'Free consultation'}</small><em className={flow.published_version?'published':'draft'}>{flow.published_version?'Published v'+flow.published_version:'Draft only'}</em></button>)}</aside>
   <section className="flow-editor">
    {!detail?<div className="flow-empty">{busy?'Loading…':'Create or select a flow.'}</div>:<>
     <div className="flow-editor-head"><div><span>FLOW SETTINGS</span><h2>{detail.name}</h2><p>Public page: <code>{publicPath}</code> · single-page responsive form</p></div><div><a className="flow-preview-link" href={publicPath} target="_blank" rel="noreferrer">Preview form ↗</a><button type="button" className="secondary" onClick={save} disabled={busy}>Save draft</button><button type="button" className="primary" onClick={publish} disabled={busy||!questions.length}>Save & publish</button></div></div>

     <section className="flow-panel"><div className="flow-panel-head"><div><span>FLOW SCOPE</span><h3>Who this form is for</h3><p>Scope determines where leads, pricing and reporting are attributed.</p></div></div><div className="flow-grid"><label>Name<input value={detail.name||''} onChange={e=>patchDetail({name:e.target.value})}/></label><label>Industry<select value={detail.industry_id||''} onChange={e=>patchDetail({industry_id:e.target.value,service_id:'',subservice_id:''})}>{industries.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Service<select value={detail.service_id||''} onChange={e=>patchDetail({service_id:e.target.value,subservice_id:''})}><option value="">All services</option>{editorServices.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Subservice<select value={detail.subservice_id||''} onChange={e=>patchDetail({subservice_id:e.target.value})}><option value="">All subservices</option>{editorSubs.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="flow-toggle">Status<span><input type="checkbox" checked={detail.is_active!==false} onChange={e=>patchDetail({is_active:e.target.checked})}/> Active</span></label></div></section>

     <section className="flow-panel"><div className="flow-panel-head"><div><span>PUBLIC EXPERIENCE</span><h3>Single-page form & consultation copy</h3><p>These fields control the customer-facing headings and the final hand-off after submission.</p></div></div><div className="flow-grid">
      <label>Form headline<input value={detail.editingVersion?.config?.headline||''} onChange={e=>patchConfig({headline:e.target.value})} placeholder={detail.flow_type==='estimator'?'Build your estimate in one place.':'Tell us about your project.'}/></label>
      <label>Submit button<input value={detail.editingVersion?.config?.submitLabel||''} onChange={e=>patchConfig({submitLabel:e.target.value})} placeholder={detail.flow_type==='estimator'?'Calculate & Save Estimate':'Request Consultation'}/></label>
      <label className="wide">Form intro<input value={detail.editingVersion?.config?.subheadline||''} onChange={e=>patchConfig({subheadline:e.target.value})} placeholder="Short explanation shown beside the form."/></label>
      <label>Contact section title<input value={detail.editingVersion?.config?.contactTitle||''} onChange={e=>patchConfig({contactTitle:e.target.value})} placeholder="Your contact details"/></label>
      <label>Contact helper text<input value={detail.editingVersion?.config?.contactText||''} onChange={e=>patchConfig({contactText:e.target.value})} placeholder="Explain why name and mobile are required."/></label>
      <label>Consultation title<input value={detail.editingVersion?.config?.consultationTitle||''} onChange={e=>patchConfig({consultationTitle:e.target.value})} placeholder="Your project brief is ready."/></label>
      <label>Consultation button<input value={detail.editingVersion?.config?.consultationButtonLabel||''} onChange={e=>patchConfig({consultationButtonLabel:e.target.value})} placeholder="Contact project team"/></label>
      <label className="wide">Consultation message<input value={detail.editingVersion?.config?.consultationText||''} onChange={e=>patchConfig({consultationText:e.target.value})} placeholder="Explain that the submitted scope/estimate is already attached to the same lead."/></label>
      {detail.flow_type==='estimator'&&<><label>Result title<input value={detail.editingVersion?.config?.resultTitle||''} onChange={e=>patchConfig({resultTitle:e.target.value})} placeholder="Estimated project cost"/></label><label className="wide">Estimator disclaimer<input value={detail.editingVersion?.config?.estimatorDisclaimer||''} onChange={e=>patchConfig({estimatorDisclaimer:e.target.value})} placeholder="Indicative estimate; final pricing may change after site inspection and professional review."/></label></>}
     </div></section>

     <section className="flow-panel"><div className="flow-panel-head"><div><span>SINGLE-PAGE FIELD BUILDER</span><h3>{questions.length} fields</h3><p>Use dropdowns for compact choices, cards only when visual comparison matters, and sections to keep the form easy to scan.</p></div><div className="flow-panel-head-actions"><button type="button" className="secondary" onClick={applyRecommendedLayout}>Apply recommended layout</button><button type="button" onClick={addQuestion}>+ Add field</button></div></div>
      <div className="question-list">{questions.map((q,index)=>{
       const controls=inputControls(q.questionType)
       const uiControl=q.validation?.uiControl||controls[0][0]
       return <article className="question-card" key={q.id||q.questionKey+'-'+index}>
        <div className="question-card-top"><b>{String(index+1).padStart(2,'0')}</b><span>{q.questionType.replaceAll('_',' ')}</span><em>{q.validation?.systemHidden?'SYSTEM · CUSTOMER HIDDEN':(q.validation?.section||'Project details')+' · '+(controls.find(([value])=>value===uiControl)?.[1]||'Standard input')}</em><div><button type="button" onClick={()=>moveQuestion(index,-1)} disabled={index===0}>↑</button><button type="button" onClick={()=>moveQuestion(index,1)} disabled={index===questions.length-1}>↓</button><button type="button" className="danger" disabled={q.validation?.systemHidden===true} title={q.validation?.systemHidden?'System compatibility fields cannot be removed here.':''} onClick={()=>removeQuestion(index)}>Remove</button></div></div>
        <div className="flow-grid">
         <label>Key<input value={q.questionKey} onChange={e=>patchQuestion(index,{questionKey:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')})}/></label>
         <label>Field type<select value={q.questionType} onChange={e=>{const next=e.target.value;const nextControl=inputControls(next)[0][0];patchQuestion(index,{questionType:next,validation:{...(q.validation||{}),uiControl:nextControl},options:optionTypes.has(next)?(q.options?.length?q.options:[{value:'option_1',label:'Option 1',displayOrder:10,isActive:true}]):[]})}}>{types.map(type=><option key={type} value={type}>{type.replaceAll('_',' ')}</option>)}</select></label>
         <label>Form section<input value={q.validation?.section||''} onChange={e=>patchQuestionValidation(index,{section:e.target.value})} placeholder="Project details"/></label>
         <label>Input control<select value={uiControl} onChange={e=>patchQuestionValidation(index,{uiControl:e.target.value})}>{controls.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
         <label className="wide">Customer label<input value={q.label} onChange={e=>patchQuestion(index,{label:e.target.value})}/></label>
         <label className="wide">Help text<input value={q.helpText||''} onChange={e=>patchQuestion(index,{helpText:e.target.value})} placeholder="Optional explanation shown under the field label."/></label>
         <label>Placeholder<input value={q.validation?.placeholder||''} onChange={e=>patchQuestionValidation(index,{placeholder:e.target.value})} placeholder={optionTypes.has(q.questionType)?'Select an option':'Enter value'}/></label>
         <label>Visibility<select value={q.visibility||'marketplace'} onChange={e=>patchQuestion(index,{visibility:e.target.value})}><option value="marketplace">Customer-visible / marketplace safe</option><option value="protected">Protected customer detail</option><option value="internal">Internal only</option></select></label>
         <label>Lead field<select value={q.leadField||''} onChange={e=>patchQuestion(index,{leadField:e.target.value})}><option value="">None</option><option value="property_type">Property type</option><option value="budget">Budget</option><option value="requirement">Requirement</option></select></label>
         {['number','area'].includes(q.questionType)&&<><label>Minimum<input type="number" value={q.validation?.min??''} onChange={e=>patchQuestionValidation(index,{min:e.target.value===''?undefined:Number(e.target.value)})}/></label><label>Maximum<input type="number" value={q.validation?.max??''} onChange={e=>patchQuestionValidation(index,{max:e.target.value===''?undefined:Number(e.target.value)})}/></label></>}
         {['text','budget'].includes(q.questionType)&&<label>Max length<input type="number" min="1" max="4000" value={q.validation?.maxLength??''} onChange={e=>patchQuestionValidation(index,{maxLength:e.target.value===''?undefined:Number(e.target.value)})} placeholder={q.questionType==='text'?'2000':'240'}/></label>}
         <label className="flow-toggle">Required<span><input type="checkbox" checked={Boolean(q.isRequired)} onChange={e=>patchQuestion(index,{isRequired:e.target.checked})}/> Required</span></label>
         <label className="flow-toggle">Full-width row<span><input type="checkbox" checked={Boolean(q.validation?.fullWidth)} onChange={e=>patchQuestionValidation(index,{fullWidth:e.target.checked})}/> Full width</span></label>
         {detail.flow_type==='estimator'&&!q.validation?.systemHidden&&<label className="flow-toggle">Optional refinement<span><input type="checkbox" checked={Boolean(q.validation?.advancedSection)} onChange={e=>patchQuestionValidation(index,{advancedSection:e.target.checked})}/> Collapse under optional specifications</span></label>}
         {q.validation?.systemHidden&&<div className="flow-system-field-note wide"><b>System compatibility field</b><span>This value is applied automatically and is not shown to customers. Default: {String(q.validation?.systemDefault??'—')}</span></div>}
        </div>

        {optionTypes.has(q.questionType)&&<div className="option-manager"><div className="option-manager-head"><div><b>Dropdown / choice options</b><small>Customer-facing label and stable stored value.</small></div><button type="button" onClick={()=>addOption(index)}>+ Add option</button></div><div className="option-rows">{(q.options||[]).map((option,optionIndex)=><div className="option-row" key={option.id||option.value+'-'+optionIndex}><label>Value<input value={option.value||''} onChange={e=>patchOption(index,optionIndex,{value:e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,'_')})}/></label><label>Label<input value={option.label||''} onChange={e=>patchOption(index,optionIndex,{label:e.target.value})}/></label><label className="option-active"><input type="checkbox" checked={option.isActive!==false} onChange={e=>patchOption(index,optionIndex,{isActive:e.target.checked})}/> Active</label><button type="button" className="option-remove" onClick={()=>removeOption(index,optionIndex)} disabled={(q.options||[]).length<=1}>×</button></div>)}</div></div>}

        <div className="dependency-box"><b>Conditional display <small>Optional — useful for detailed estimate fields</small></b><div><select value={q.showWhen?.questionKey||''} onChange={e=>patchQuestion(index,{showWhen:e.target.value?{questionKey:e.target.value,equals:''}:{}})}><option value="">Always show</option>{questions.filter((_,i)=>i!==index).map(item=><option key={item.questionKey} value={item.questionKey}>{item.label} · {item.questionKey}</option>)}</select><select disabled={!q.showWhen?.questionKey} value={dependencyMode(q)} onChange={e=>{const dep=q.showWhen?.questionKey;if(!dep)return;const text=dependencyText(q);patchQuestion(index,{showWhen:e.target.value==='in'?{questionKey:dep,in:text.split(',').map(v=>v.trim()).filter(Boolean)}:{questionKey:dep,[e.target.value]:text}})}}><option value="equals">equals</option><option value="notEquals">not equals</option><option value="in">in list</option></select><input disabled={!q.showWhen?.questionKey} placeholder="Value or comma list" value={dependencyText(q)} onChange={e=>{const dep=q.showWhen?.questionKey;if(!dep)return;const mode=dependencyMode(q);patchQuestion(index,{showWhen:mode==='in'?{questionKey:dep,in:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)}:{questionKey:dep,[mode]:e.target.value}})}}/></div></div>
       </article>
      })}</div>
     </section>
     {detail.flow_type==='estimator'&&<AdminEstimatorConfig flowId={detail.id} versionId={detail.editingVersion?.id} questions={questions}/>}
    </>}
   </section>
  </div>
 </main>
}
