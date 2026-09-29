import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { API_BASE_URL, publicRequest } from '../utils/auth'
import { trackFunnelEvent, trackFunnelEventOnce } from '../utils/funnelTracking'
import { isValidIndianMobile, normalizeIndianMobileInput } from '../utils/customerContact'
import CustomerFlowQuestion, { isEmptyAnswer, isQuestionVisible } from '../components/CustomerFlowQuestion'
import './RequirementWizard.css'
import './EstimatorWizard.css'

const money = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value || 0))
const emptyContact = {name:'',phone:'',email:''}

function packageMatches(item,answers){
  if(!item||item.isActive===false||!item.selectorQuestionKey)return false
  const answer=answers?.[item.selectorQuestionKey]
  return Array.isArray(answer)?answer.map(String).includes(String(item.selectorValue)):String(answer??'')===String(item.selectorValue)
}

function groupPackageDetails(details){
  return details.reduce((acc,detail)=>{
    const section=detail.section||'Specifications'
    if(!acc[section])acc[section]=[]
    acc[section].push(detail)
    return acc
  },{})
}

function PackageDetailGroups({details=[]}){
  const grouped=groupPackageDetails(details)
  return Object.entries(grouped).map(([section,rows])=><div className="est-package-section" key={section}><strong>{section}</strong><div>{rows.map(detail=><article key={detail.detailKey}><span>{detail.label}</span><b>{detail.value}</b>{detail.note&&<small>{detail.note}</small>}</article>)}</div></div>)
}

function PackagePreview({item,compact=false}){
  if(!item)return null
  const activeDetails=(item.details||[]).filter(detail=>detail.isActive!==false)
  const visibleDetails=compact?activeDetails.slice(0,6):activeDetails
  const hiddenDetails=compact?activeDetails.slice(6):[]
  return <section className={compact?'est-package-preview compact':'est-package-preview'}>
    <div className="est-package-preview-head"><div>{item.badge&&<span>{item.badge}</span>}<h3>{item.label}</h3>{item.summary&&<p>{item.summary}</p>}</div>{item.priceNote&&<b>{item.priceNote}</b>}</div>
    <PackageDetailGroups details={visibleDetails}/>
    {hiddenDetails.length>0&&<details className="est-package-more"><summary>View all {activeDetails.length} package specifications <span>+</span></summary><div className="est-package-more-body"><PackageDetailGroups details={hiddenDetails}/></div></details>}
  </section>
}

function EstimatorQuestion({question,value,onChange,packages=[],id}){
  if(!question)return null

  if(question.questionKey==='estimate_mode'){
    const modes=(question.options||[]).filter(option=>option.isActive!==false)
    return <div className="est-mode-grid" role="group" aria-label={question.label}>{modes.map(option=>{
      const active=String(value||'')===String(option.value)
      const detailed=String(option.value)==='detailed'
      return <button type="button" className={active?'est-mode-card active':'est-mode-card'} key={option.value} onClick={()=>onChange(option.value)}>
        <span>{detailed?'DETAILED':'ROUGH'}</span>
        <strong>{option.label}</strong>
        <p>{detailed?'Choose material and specification options such as steel, cement, bricks, wire, flooring, plywood, laminate and hardware where configured.':'Get a faster planning range using the main project details and selected package.'}</p>
        <b>{active?'Selected ✓':'Choose '+option.label}</b>
      </button>
    })}</div>
  }

  const packageOptions=(packages||[]).filter(item=>item?.isActive!==false&&item.selectorQuestionKey===question.questionKey)
  if(packageOptions.length){
    return <div className="est-package-choice-grid" role="group" aria-label={question.label}>{packageOptions.map((item,index)=>{
      const active=String(value??'')===String(item.selectorValue)
      const details=(item.details||[]).filter(detail=>detail?.isActive!==false).slice(0,4)
      return <button type="button" className={active?'est-package-choice active':'est-package-choice'} key={item.packageKey||item.selectorValue||index} onClick={()=>onChange(item.selectorValue)}>
        <div className="est-package-choice-head"><span>{item.badge||'PACKAGE'}</span><strong>{item.label}</strong>{item.priceNote&&<em>{item.priceNote}</em>}</div>
        {item.summary&&<p>{item.summary}</p>}
        {details.length>0&&<div className="est-package-choice-specs">{details.map((detail,i)=><div key={detail.detailKey||i}><small>{detail.label}</small><b>{detail.value}</b></div>)}</div>}
        <i>{active?'Selected ✓':'Select package'}</i>
      </button>
    })}</div>
  }

  return <CustomerFlowQuestion id={id} question={question} value={value} onChange={onChange}/>
}

function makeSubmissionKey(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()
  return 'est_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12)
}

function initialEstimatorAnswers(flow,modeParam,packageParam){
  const seeded={}
  const activeQuestions=(flow?.questions||[]).filter(question=>question?.isActive!==false)
  const questionByKey=new Map(activeQuestions.map(question=>[question.questionKey,question]))

  if(modeParam==='rough'||modeParam==='detailed'){
    const modeQuestion=questionByKey.get('estimate_mode')
    const allowed=(modeQuestion?.options||[]).some(option=>option?.isActive!==false&&String(option.value)===modeParam)
    if(allowed)seeded.estimate_mode=modeParam
  }

  if(packageParam){
    const pkg=(flow?.packages||[]).find(item=>item?.isActive!==false&&String(item.packageKey||'')===String(packageParam))
    if(pkg?.selectorQuestionKey){
      const selectorQuestion=questionByKey.get(pkg.selectorQuestionKey)
      const optionAllowed=(selectorQuestion?.options||[]).some(option=>option?.isActive!==false&&String(option.value)===String(pkg.selectorValue))
      if(optionAllowed)seeded[pkg.selectorQuestionKey]=pkg.selectorValue
    }
  }

  return seeded
}

function smartSection(question,packages){
  const configured=String(question?.validation?.section||'').trim()
  if(configured)return configured
  const key=String(question?.questionKey||'')
  if(key==='estimate_mode')return 'Estimate type'
  if((packages||[]).some(item=>item?.isActive!==false&&item.selectorQuestionKey===key))return 'Choose your package'
  if(['project_location'].includes(key))return 'Site & location'
  if(['project_type','own_plot','basement','site_access'].includes(key))return 'Site & project'
  if(['plot_area','built_up_area','floors'].includes(key))return 'Area & floors'
  if(key==='construction_package')return 'Scope of work'
  if(['steel_spec','cement_spec','sand_spec','brick_spec'].includes(key))return 'Structure materials'
  if(['wire_spec','switch_spec'].includes(key))return 'Electrical'
  if(key==='flooring_spec')return 'Flooring & finishes'
  if(['property_type','bhk','area','property_status'].includes(key))return 'Home details'
  if(['scope_mode','selected_work','kitchen_package','wardrobe_units','false_ceiling_area','furniture_package'].includes(key))return 'Scope & quantities'
  if(['plywood_spec','internal_laminate_spec','external_laminate_spec','hardware_spec','modular_finish_spec'].includes(key))return 'Core materials & finishes'
  if(key==='customisations')return 'Add-ons & customisations'
  if(/(_area|_meters|_count)$/.test(key)&&question?.showWhen?.questionKey==='customisations')return 'Customisation quantities'
  if(['timeline','additional_requirement'].includes(key))return 'Timeline & notes'
  if(question?.showWhen?.questionKey==='estimate_mode'&&(question.showWhen?.equals==='detailed'||(question.showWhen?.in||[]).includes('detailed')))return 'Detailed specifications'
  if(question?.questionType==='location')return 'Project location'
  return 'Project details'
}

function groupQuestions(questions,packages){
  const groups=[]
  const byName=new Map()
  for(const question of questions){
    const name=smartSection(question,packages)
    if(!byName.has(name)){
      const group={name,questions:[]}
      groups.push(group)
      byName.set(name,group)
    }
    byName.get(name).questions.push(question)
  }
  return groups
}

function fieldClass(question,packages){
  const isPackage=(packages||[]).some(item=>item?.isActive!==false&&item.selectorQuestionKey===question?.questionKey)
  if(question?.questionKey==='estimate_mode'||isPackage||['text','multi_select'].includes(question?.questionType)||question?.validation?.fullWidth===true)return 'rq-field wide'
  return 'rq-field'
}

export default function EstimatorWizard({ flowKey }) {
  const [searchParams] = useSearchParams()
  const modeParam=searchParams.get('mode')
  const packageParam=searchParams.get('package')
  const [flow,setFlow] = useState(null)
  const [answers,setAnswers] = useState({})
  const [result,setResult] = useState(null)
  const [contact,setContact] = useState(emptyContact)
  const [consent,setConsent] = useState(false)
  const [website,setWebsite] = useState('')
  const [submissionKey,setSubmissionKey] = useState(makeSubmissionKey)
  const [state,setState] = useState({loading:true,saving:false,error:'',errorQuestionKey:''})
  const mounted = useRef(true)
  const startedTracked = useRef(false)

  useEffect(() => {
    mounted.current = true
    startedTracked.current = false
    setState({loading:true,saving:false,error:'',errorQuestionKey:''})
    publicRequest('/customer-flows/'+flowKey).then(data => {
      if (!mounted.current) return
      if (data?.flowType !== 'estimator') throw new Error('This calculator is not available.')
      setFlow(data)
      setAnswers(initialEstimatorAnswers(data,modeParam,packageParam))
      setResult(null)
      setContact(emptyContact)
      setConsent(false)
      setWebsite('')
      setSubmissionKey(makeSubmissionKey())
      setState({loading:false,saving:false,error:'',errorQuestionKey:''})
      trackFunnelEvent('flow_opened',{flowKey,flowType:'estimator',source:'single_page_form'})
    }).catch(error => mounted.current && setState({loading:false,saving:false,error:error.message,errorQuestionKey:''}))
    return () => { mounted.current = false }
  },[flowKey,modeParam,packageParam])

  const questions = useMemo(() => (flow?.questions || []).filter(question => isQuestionVisible(question,answers)),[flow,answers])
  const groups = useMemo(()=>groupQuestions(questions,flow?.packages||[]),[questions,flow?.packages])
  const activePackage = useMemo(() => (flow?.packages || []).find(item=>packageMatches(item,answers)) || null,[flow,answers])
  const completedCount=questions.filter(question=>!isEmptyAnswer(answers[question.questionKey])).length
  const progress=result?100:questions.length?Math.round((completedCount/questions.length)*100):0
  const estimateArea=Number(answers.built_up_area||answers.area||0)
  const constructionPerSqft=result&&Number(answers.built_up_area)>0?{
    minimum:Number(result.minimum)/Number(answers.built_up_area),
    maximum:Number(result.maximum)/Number(answers.built_up_area),
  }:null

  useEffect(()=>{
    if(!flow||result)return
    questions.forEach((question,index)=>trackFunnelEventOnce('flow_question_viewed',{
      flowKey,flowType:'estimator',source:'single_page_form',
      questionKey:question.questionKey,questionIndex:index+1,questionCount:questions.length,
    }))
  },[flow,result,questions,flowKey])

  function setAnswer(question,value) {
    if(!startedTracked.current){
      startedTracked.current=true
      trackFunnelEvent('flow_started',{flowKey,flowType:'estimator',source:'single_page_form',metadata:{questions:questions.length}})
    }
    setAnswers(current => ({...current,[question.questionKey]:value}))
    setState(current => ({...current,error:'',errorQuestionKey:''}))
    if(!isEmptyAnswer(value)){
      const index=questions.findIndex(item=>item.questionKey===question.questionKey)
      trackFunnelEventOnce('flow_question_completed',{
        flowKey,flowType:'estimator',source:'single_page_form',
        questionKey:question.questionKey,questionIndex:index+1,questionCount:questions.length,
      })
    }
  }

  function focusQuestion(questionKey){
    if(!questionKey)return
    requestAnimationFrame(()=>document.querySelector('[data-question-key="'+CSS.escape(questionKey)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'}))
  }

  function validate(){
    const missing=questions.find(question=>question.isRequired&&isEmptyAnswer(answers[question.questionKey]))
    if(missing){
      setState(current=>({...current,error:'Please complete “'+missing.label+'”.',errorQuestionKey:missing.questionKey}))
      focusQuestion(missing.questionKey)
      return false
    }
    if(!contact.name.trim()||!isValidIndianMobile(contact.phone)||!consent){
      setState(current=>({...current,error:'Enter your name, a valid 10-digit mobile number and accept the contact consent.',errorQuestionKey:'contact'}))
      focusQuestion('contact')
      return false
    }
    return true
  }

  async function submitEstimate(event){
    event.preventDefault()
    if(!validate())return
    try{
      setState(current=>({...current,saving:true,error:'',errorQuestionKey:''}))
      const calculation=await publicRequest('/customer-flows/'+flowKey+'/calculate',{
        method:'POST',
        body:JSON.stringify({flowToken:flow.flowToken,answers,submissionKey,contact,consent,website})
      })
      setResult(calculation)
      trackFunnelEvent('estimate_completed',{flowKey,flowType:'estimator',calculationId:calculation.calculationId,source:'single_page_form',metadata:{questions:questions.length,leadCaptured:true}})
      setState({loading:false,saving:false,error:'',errorQuestionKey:''})
      requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'smooth'}))
    }catch(error){
      setState(current=>({...current,saving:false,error:error.message,errorQuestionKey:''}))
    }
  }

  function restart() {
    setAnswers(initialEstimatorAnswers(flow,modeParam,packageParam))
    setResult(null)
    setContact(emptyContact)
    setConsent(false)
    setWebsite('')
    setSubmissionKey(makeSubmissionKey())
    setState({loading:false,saving:false,error:'',errorQuestionKey:''})
    window.scrollTo({top:0,behavior:'smooth'})
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading calculator…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This calculator is unavailable.'}<Link to="/">Back home</Link></div></main>

  return <main className="rq-page">
    <header className="rq-top"><Link to="/"><img src="/brand/propulse-logo.png" alt="ProPulse Business" /></Link><Link to="/leads">Professional →</Link></header>
    <div className="rq-shell rq-single-shell estimator-shell">
      <aside className="rq-side rq-single-side">
        <span>PROJECT COST ESTIMATOR</span>
        <h1>{flow.name}</h1>
        <p>{flow.config?.subheadline || 'Complete one clear form to receive an indicative cost range and keep the same project brief ready for consultation.'}</p>
        <div className="rq-scope"><small>Category</small><b>{[flow.industryName,flow.serviceName].filter(Boolean).join(' · ')}</b></div>
        <div className="est-side-summary">{answers.estimate_mode&&<div><small>Estimate type</small><b>{answers.estimate_mode==='detailed'?'Detailed estimate':'Rough estimate'}</b></div>}{activePackage&&<div><small>Selected package</small><b>{activePackage.label}</b></div>}</div>
        {!result&&<div className="rq-side-progress"><div><span>Estimate setup</span><b>{progress}%</b></div><i><em style={{width:progress+'%'}}/></i><small>{completedCount} of {questions.length} estimate fields completed</small></div>}
        <ul><li>✓ Single-page estimator</li><li>✓ Admin-controlled packages & rates</li><li>✓ Estimate and customer enquiry saved together</li></ul>
      </aside>

      {!result?<form className="rq-card rq-form-card rq-single-form est-single-form" onSubmit={submitEstimate}>
        <div className="rq-form-head"><span>PROJECT ESTIMATE</span><h2>{flow.config?.headline || 'Build your estimate in one place.'}</h2><p>Choose the main project inputs first. Detailed material fields appear only when they apply.</p></div>

        {groups.map((group,index)=>{
          const required=group.questions.filter(question=>question.isRequired)
          const complete=required.filter(question=>!isEmptyAnswer(answers[question.questionKey])).length
          const done=required.length===0||complete===required.length
          return <section className={'rq-form-section '+(done?'complete':'')} key={group.name}>
          <div className="rq-form-section-head"><b>{done?'✓':String(index+1).padStart(2,'0')}</b><div><h3>{group.name}</h3><span>{required.length?complete+' of '+required.length+' required completed':'Optional details'}</span></div><em className={done?'done':''}>{done?'Complete':'Needs '+(required.length-complete)}</em></div>
          <div className="rq-form-grid">{group.questions.map(question=><div className={fieldClass(question,flow.packages||[])+(state.errorQuestionKey===question.questionKey?' error':'')} data-question-key={question.questionKey} key={question.questionKey}>
            <label htmlFor={'est-'+question.questionKey}>{question.label}{question.isRequired&&<sup>*</sup>}</label>
            {question.helpText&&<p>{question.helpText}</p>}
            <EstimatorQuestion id={'est-'+question.questionKey} question={question} value={answers[question.questionKey]} onChange={value=>setAnswer(question,value)} packages={flow.packages||[]}/>
          </div>)}</div>
        </section>
        })}

        {activePackage&&<section className="rq-form-section est-selected-package-section"><div className="rq-form-section-head"><b>✓</b><div><h3>Selected package summary</h3><span>This exact published package snapshot will stay with the estimate.</span></div></div><PackagePreview item={activePackage} compact/></section>}

        <section className={'rq-form-section rq-contact-section'+(state.errorQuestionKey==='contact'?' error':'')} data-question-key="contact">
          <div className="rq-form-section-head"><b>{String(groups.length+1).padStart(2,'0')}</b><div><h3>{flow.config?.contactTitle || 'Your contact details'}</h3><span>{flow.config?.contactText || 'Name and mobile are required so the estimate can be saved with the same customer project enquiry.'}</span></div></div>
          <div className="rq-contact-grid"><label>Name<input value={contact.name} onChange={event=>setContact({...contact,name:event.target.value})} autoComplete="name" required/></label><label>Mobile number<input value={contact.phone} onChange={event=>setContact({...contact,phone:normalizeIndianMobileInput(event.target.value)})} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" maxLength="10" pattern="[6-9][0-9]{9}" required/></label><label className="wide">Email <small>Optional</small><input type="email" value={contact.email} onChange={event=>setContact({...contact,email:event.target.value})} autoComplete="email"/></label><label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event=>setWebsite(event.target.value)}/></label></div>
          <label className="rq-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>I agree that ProPulse may use and share my project details and contact information with relevant verified professionals or contractors so they can respond to this project enquiry and provide consultation or service follow-up.</span></label>
        </section>

        {state.error&&<div className="rq-error">{state.error}</div>}
        <div className="rq-submit-bar"><div><small>INDICATIVE ESTIMATE</small><b>Calculation uses the published Admin rates and your selections.</b></div><button type="submit" className="primary" disabled={state.saving}>{state.saving?'Calculating…':(flow.config?.submitLabel || 'Calculate & Save Estimate')} <span>→</span></button></div>
      </form>:<section className="rq-card rq-form-card est-result-card"><div className="est-result">
        <span>YOUR PROJECT ESTIMATE</span>
        <h2>{flow.config?.resultTitle || 'Estimated project cost'}</h2>
        <div className="est-range"><strong>{money(result.minimum)}</strong><i>to</i><strong>{money(result.maximum)}</strong></div>
        {result.cityName && <p className="est-city">Adjusted for {result.cityName}</p>}
        <div className="est-result-meta-grid">
          <div><small>Estimate type</small><b>{answers.estimate_mode==='detailed'?'Detailed':'Rough'}</b></div>
          {estimateArea>0&&<div><small>{answers.built_up_area?'Built-up area':'Home area'}</small><b>{new Intl.NumberFormat('en-IN').format(estimateArea)} sq ft</b></div>}
          {(result.package||activePackage)&&<div><small>Package</small><b>{(result.package||activePackage).label}</b></div>}
          {constructionPerSqft&&<div><small>Average estimate / sq ft</small><b>{money(constructionPerSqft.minimum)} – {money(constructionPerSqft.maximum)}</b></div>}
        </div>
        {(result.package||activePackage)&&<PackagePreview item={result.package||activePackage} compact/>}
        {Array.isArray(result.breakdown) && result.breakdown.length > 0 && <div className="est-breakdown"><b>What shaped this range</b>{result.breakdown.map(item=><div key={item.kind+':'+item.key}><span>{item.label}</span><em>{item.minimum===item.maximum?money(item.minimum):money(item.minimum)+' – '+money(item.maximum)}</em></div>)}</div>}
        <div className="est-lead-confirm"><b>Project enquiry saved</b><span>Your name, mobile number, selected package, detailed choices and estimate are attached to one customer lead for follow-up.</span></div>
        <div className="est-consultation-card"><span>CONSULTATION READY</span><h3>{flow.config?.consultationTitle || 'Continue with the same project brief.'}</h3><p>{flow.config?.consultationText || 'You do not need to fill another form. The estimate and selected specifications are already saved with your enquiry so a consultation can continue from the same information.'}</p><Link to="/contact">{flow.config?.consultationButtonLabel || 'Contact project team'} <b>→</b></Link></div>
        <div className="est-disclaimer">{result.disclaimer}</div>
        <div className="rq-actions est-result-actions"><a className="primary est-download" href={`${API_BASE_URL}/customer-flows/estimates/${encodeURIComponent(result.calculationId)}/pdf?token=${encodeURIComponent(result.pdfToken||'')}`} download>Download Estimate PDF ↓</a><button type="button" className="secondary" onClick={restart}>Estimate another project</button><Link className="est-home" to="/">Back home</Link></div>
      </div></section>}
    </div>
  </main>
}
