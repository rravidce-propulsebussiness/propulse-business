import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL, publicRequest } from '../utils/auth'
import { trackFunnelEvent, trackFunnelEventOnce } from '../utils/funnelTracking'
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

function PackagePreview({item,compact=false}){
  if(!item)return null
  const grouped=(item.details||[]).filter(detail=>detail.isActive!==false).reduce((acc,detail)=>{
    const section=detail.section||'Specifications'
    if(!acc[section])acc[section]=[]
    acc[section].push(detail)
    return acc
  },{})
  return <section className={compact?'est-package-preview compact':'est-package-preview'}>
    <div className="est-package-preview-head"><div>{item.badge&&<span>{item.badge}</span>}<h3>{item.label}</h3>{item.summary&&<p>{item.summary}</p>}</div>{item.priceNote&&<b>{item.priceNote}</b>}</div>
    {Object.entries(grouped).map(([section,details])=><div className="est-package-section" key={section}><strong>{section}</strong><div>{details.map(detail=><article key={detail.detailKey}><span>{detail.label}</span><b>{detail.value}</b>{detail.note&&<small>{detail.note}</small>}</article>)}</div></div>)}
  </section>
}

function makeSubmissionKey(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()
  return 'est_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12)
}

export default function EstimatorWizard({ flowKey }) {
  const [flow,setFlow] = useState(null)
  const [answers,setAnswers] = useState({})
  const [step,setStep] = useState(0)
  const [contactMode,setContactMode] = useState(false)
  const [result,setResult] = useState(null)
  const [contact,setContact] = useState(emptyContact)
  const [consent,setConsent] = useState(false)
  const [website,setWebsite] = useState('')
  const [submissionKey,setSubmissionKey] = useState(makeSubmissionKey)
  const [state,setState] = useState({loading:true,saving:false,error:''})
  const mounted = useRef(true)
  const startedTracked = useRef(false)

  useEffect(() => {
    mounted.current = true
    startedTracked.current = false
    setState({loading:true,saving:false,error:''})
    publicRequest('/customer-flows/'+flowKey).then(data => {
      if (!mounted.current) return
      if (data?.flowType !== 'estimator') throw new Error('This calculator is not available.')
      setFlow(data)
      setAnswers({})
      setStep(0)
      setContactMode(false)
      setResult(null)
      setContact(emptyContact)
      setConsent(false)
      setWebsite('')
      setSubmissionKey(makeSubmissionKey())
      setState({loading:false,saving:false,error:''})
      trackFunnelEvent('flow_opened',{flowKey,flowType:'estimator',source:'wizard'})
    }).catch(error => mounted.current && setState({loading:false,saving:false,error:error.message}))
    return () => { mounted.current = false }
  },[flowKey])

  const questions = useMemo(() => (flow?.questions || []).filter(question => isQuestionVisible(question,answers)),[flow,answers])
  const activePackage = useMemo(() => (flow?.packages || []).find(item=>packageMatches(item,answers)) || null,[flow,answers])
  useEffect(() => { if (step >= questions.length && questions.length) setStep(questions.length - 1) },[questions.length,step])
  const question = questions[step]
  const progress = result ? 100 : contactMode ? 96 : questions.length ? Math.round(((step + 1) / questions.length) * 88) : 0

  useEffect(() => {
    if (!flow || result || contactMode || !question?.questionKey) return
    trackFunnelEventOnce('flow_question_viewed',{
      flowKey,flowType:'estimator',source:'wizard',
      questionKey:question.questionKey,questionIndex:step+1,questionCount:questions.length,
    })
  },[flow,result,contactMode,question?.questionKey,step,questions.length,flowKey])

  function setAnswer(key,value) {
    if(!startedTracked.current){
      startedTracked.current=true
      trackFunnelEvent('flow_started',{flowKey,flowType:'estimator',source:'wizard',metadata:{step:step+1,steps:questions.length}})
    }
    setAnswers(current => ({...current,[key]:value}))
    setState(current => ({...current,error:''}))
  }

  function next() {
    if (!question) return
    if (question.isRequired && isEmptyAnswer(answers[question.questionKey])) {
      setState(current => ({...current,error:'Please answer this question to continue.'}))
      return
    }
    setState(current => ({...current,error:''}))
    trackFunnelEventOnce('flow_question_completed',{
      flowKey,flowType:'estimator',source:'wizard',
      questionKey:question.questionKey,questionIndex:step+1,questionCount:questions.length,
    })
    if (step < questions.length - 1) {
      setStep(step + 1)
      return
    }
    trackFunnelEvent('estimator_contact_opened',{flowKey,flowType:'estimator',source:'wizard',metadata:{steps:questions.length}})
    setContactMode(true)
  }

  async function submitEstimate(event){
    event.preventDefault()
    if(!contact.name.trim()||!contact.phone.trim()||!consent){
      setState(current=>({...current,error:'Enter your name, mobile number and accept the contact consent.'}))
      return
    }
    try{
      setState(current=>({...current,saving:true,error:''}))
      const calculation=await publicRequest('/customer-flows/'+flowKey+'/calculate',{
        method:'POST',
        body:JSON.stringify({flowToken:flow.flowToken,answers,submissionKey,contact,consent,website})
      })
      setResult(calculation)
      setContactMode(false)
      trackFunnelEvent('estimate_completed',{flowKey,flowType:'estimator',calculationId:calculation.calculationId,source:'wizard',metadata:{steps:questions.length,leadCaptured:true}})
      setState({loading:false,saving:false,error:''})
    }catch(error){
      setState(current=>({...current,saving:false,error:error.message}))
    }
  }

  function restart() {
    setAnswers({})
    setStep(0)
    setContactMode(false)
    setResult(null)
    setContact(emptyContact)
    setConsent(false)
    setWebsite('')
    setSubmissionKey(makeSubmissionKey())
    setState({loading:false,saving:false,error:''})
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading calculator…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This calculator is unavailable.'}<Link to="/">Back home</Link></div></main>

  return <main className="rq-page">
    <header className="rq-top"><Link to="/"><img src="/brand/propulse-logo.png" alt="ProPulse Business" /></Link><Link to="/leads">Professional →</Link></header>
    <div className="rq-shell estimator-shell">
      <aside className="rq-side">
        <span>PROJECT COST ESTIMATOR</span>
        <h1>{flow.name}</h1>
        <p>{flow.config?.subheadline || 'Answer a few project questions to get an indicative cost range.'}</p>
        <div className="rq-scope"><small>Category</small><b>{[flow.industryName,flow.serviceName].filter(Boolean).join(' · ')}</b></div>
        <ul><li>✓ No login required</li><li>✓ Name & mobile required before estimate</li><li>✓ Your estimate is saved with your project enquiry</li></ul>
      </aside>
      <section className="rq-card">
        <div className="rq-progress"><div style={{width:progress+'%'}} /></div>
        {!result ? !contactMode ? <>
          <div className="rq-step"><span>QUESTION {String(step + 1).padStart(2,'0')} / {String(questions.length).padStart(2,'0')}</span><h2>{question?.label}</h2>{question?.helpText && <p>{question.helpText}</p>}</div>
          <div className="rq-control"><CustomerFlowQuestion question={question} value={answers[question?.questionKey]} onChange={value => setAnswer(question.questionKey,value)} /></div>
          {activePackage&&question?.questionKey===activePackage.selectorQuestionKey&&<PackagePreview item={activePackage}/>}
          {state.error && <div className="rq-error">{state.error}</div>}
          <div className="rq-actions"><button type="button" className="secondary" disabled={step===0||state.saving} onClick={()=>setStep(Math.max(0,step-1))}>← Back</button><button type="button" className="primary" disabled={state.saving} onClick={next}>{step===questions.length-1?'Continue':'Next'} →</button></div>
        </> : <form className="est-contact-form" onSubmit={submitEstimate}>
          <div className="rq-step"><span>FINAL STEP</span><h2>Get your project estimate</h2><p>Enter your name and mobile number. We save the estimate with your project enquiry so our team can follow up with the same specifications you selected.</p></div>
          {activePackage&&<PackagePreview item={activePackage} compact/>}
          <div className="rq-contact-grid"><label>Name<input value={contact.name} onChange={event=>setContact({...contact,name:event.target.value})} autoComplete="name" required/></label><label>Mobile number<input value={contact.phone} onChange={event=>setContact({...contact,phone:event.target.value})} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" required/></label><label className="wide">Email <small>Optional</small><input type="email" value={contact.email} onChange={event=>setContact({...contact,email:event.target.value})} autoComplete="email"/></label><label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event=>setWebsite(event.target.value)}/></label></div>
          <label className="rq-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>I agree that my project details and contact information may be used to respond to this enquiry and provide quotation or consultation follow-up.</span></label>
          {state.error&&<div className="rq-error">{state.error}</div>}
          <div className="rq-actions"><button type="button" className="secondary" disabled={state.saving} onClick={()=>{setContactMode(false);setState(current=>({...current,error:''}))}}>← Back</button><button type="submit" className="primary" disabled={state.saving}>{state.saving?'Calculating…':'Calculate & save estimate'} →</button></div>
        </form> : <div className="est-result">
          <span>YOUR PROJECT ESTIMATE</span>
          <h2>{flow.config?.resultTitle || 'Estimated project cost'}</h2>
          <div className="est-range"><strong>{money(result.minimum)}</strong><i>to</i><strong>{money(result.maximum)}</strong></div>
          {result.cityName && <p className="est-city">Adjusted for {result.cityName}</p>}
          {(result.package||activePackage)&&<PackagePreview item={result.package||activePackage} compact/>}
          {Array.isArray(result.breakdown) && result.breakdown.length > 0 && <div className="est-breakdown"><b>What shaped this range</b>{result.breakdown.map(item=><div key={item.kind+':'+item.key}><span>{item.label}</span><em>{item.minimum===item.maximum?money(item.minimum):money(item.minimum)+' – '+money(item.maximum)}</em></div>)}</div>}
          <div className="est-lead-confirm"><b>Project enquiry saved</b><span>Your name, mobile number, selected package and estimate are attached to one customer lead for follow-up.</span></div>
          <div className="est-disclaimer">{result.disclaimer}</div>
          <div className="rq-actions est-result-actions"><a className="primary est-download" href={`${API_BASE_URL}/customer-flows/estimates/${encodeURIComponent(result.calculationId)}/pdf?token=${encodeURIComponent(result.pdfToken||'')}`} download>Download Estimate PDF ↓</a><button type="button" className="secondary" onClick={restart}>Estimate another project</button><Link className="est-home" to="/">Back home</Link></div>
        </div>}
      </section>
    </div>
  </main>
}
