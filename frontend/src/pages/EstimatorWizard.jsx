import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import CustomerFlowQuestion, { isEmptyAnswer, isQuestionVisible } from '../components/CustomerFlowQuestion'
import './RequirementWizard.css'
import './EstimatorWizard.css'

const money = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value || 0))
const emptyContact = {name:'',phone:'',email:''}
function makeSubmissionKey(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()
  return 'est_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12)
}

export default function EstimatorWizard({ flowKey }) {
  const [flow,setFlow] = useState(null)
  const [answers,setAnswers] = useState({})
  const [step,setStep] = useState(0)
  const [result,setResult] = useState(null)
  const [quoteMode,setQuoteMode] = useState(false)
  const [contact,setContact] = useState(emptyContact)
  const [consent,setConsent] = useState(false)
  const [website,setWebsite] = useState('')
  const [submissionKey,setSubmissionKey] = useState(makeSubmissionKey)
  const [state,setState] = useState({loading:true,saving:false,error:'',success:false})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setState({loading:true,saving:false,error:'',success:false})
    publicRequest('/customer-flows/'+flowKey).then(data => {
      if (!mounted.current) return
      if (data?.flowType !== 'estimator') throw new Error('This calculator is not available.')
      setFlow(data)
      const query = new URLSearchParams(window.location.search)
      const requestedPackage = String(query.get('package') || '').toLowerCase()
      const initialAnswers = flowKey === 'interior-cost-estimator' && ['standard','premium','luxury'].includes(requestedPackage)
        ? { finish_quality: requestedPackage }
        : {}
      setAnswers(initialAnswers)
      setStep(0)
      setResult(null)
      setQuoteMode(false)
      setContact(emptyContact)
      setConsent(false)
      setWebsite('')
      setSubmissionKey(makeSubmissionKey())
      setState({loading:false,saving:false,error:'',success:false})
    }).catch(error => mounted.current && setState({loading:false,saving:false,error:error.message,success:false}))
    return () => { mounted.current = false }
  },[flowKey])

  const questions = useMemo(() => (flow?.questions || []).filter(question => isQuestionVisible(question,answers)),[flow,answers])
  useEffect(() => { if (step >= questions.length && questions.length) setStep(questions.length - 1) },[questions.length,step])
  const question = questions[step]
  const progress = result ? 100 : questions.length ? Math.round(((step + 1) / questions.length) * 92) : 0

  function setAnswer(key,value) {
    setAnswers(current => ({...current,[key]:value}))
    setState(current => ({...current,error:''}))
  }

  async function next() {
    if (!question) return
    if (question.isRequired && isEmptyAnswer(answers[question.questionKey])) {
      setState(current => ({...current,error:'Please answer this question to continue.'}))
      return
    }
    setState(current => ({...current,error:''}))
    if (step < questions.length - 1) {
      setStep(step + 1)
      return
    }
    try {
      setState(current => ({...current,saving:true,error:''}))
      const calculation = await publicRequest('/customer-flows/'+flowKey+'/calculate',{
        method:'POST',
        body:JSON.stringify({flowToken:flow.flowToken,answers})
      })
      setResult(calculation)
      setState({loading:false,saving:false,error:'',success:false})
    } catch (error) {
      setState(current => ({...current,saving:false,error:error.message}))
    }
  }

  async function requestQuotes(event){
    event.preventDefault()
    if(!result?.calculationId)return
    if(!contact.name.trim()||!contact.phone.trim()||!consent){
      setState(current=>({...current,error:'Enter your name, mobile number and accept the contact consent.'}))
      return
    }
    try{
      setState(current=>({...current,saving:true,error:''}))
      await publicRequest('/customer-flows/estimates/'+result.calculationId+'/convert',{
        method:'POST',
        body:JSON.stringify({contact,consent,submissionKey,website})
      })
      setState({loading:false,saving:false,error:'',success:true})
    }catch(error){
      setState(current=>({...current,saving:false,error:error.message}))
    }
  }

  function restart() {
    setAnswers({})
    setStep(0)
    setResult(null)
    setQuoteMode(false)
    setContact(emptyContact)
    setConsent(false)
    setWebsite('')
    setSubmissionKey(makeSubmissionKey())
    setState({loading:false,saving:false,error:'',success:false})
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading calculator…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This calculator is unavailable.'}<Link to="/">Back home</Link></div></main>

  return <main className="rq-page">
    <header className="rq-top"><Link to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse Business" /></Link><Link to="/">← Back to home</Link></header>
    <div className="rq-shell estimator-shell">
      <aside className="rq-side">
        <span>PROPULSE ESTIMATOR</span>
        <h1>{flow.name}</h1>
        <p>{flow.config?.subheadline || 'Answer a few questions to get an indicative project cost range.'}</p>
        <div className="rq-scope"><small>Category</small><b>{[flow.industryName,flow.serviceName].filter(Boolean).join(' · ')}</b></div>
        <ul><li>✓ No login required</li><li>✓ Server-calculated estimate</li><li>✓ Indicative range, not a final quotation</li></ul>
      </aside>
      <section className="rq-card">
        <div className="rq-progress"><div style={{width:progress+'%'}} /></div>
        {!result ? <>
          <div className="rq-step"><span>QUESTION {String(step + 1).padStart(2,'0')} / {String(questions.length).padStart(2,'0')}</span><h2>{question?.label}</h2>{question?.helpText && <p>{question.helpText}</p>}</div>
          <div className="rq-control"><CustomerFlowQuestion question={question} value={answers[question?.questionKey]} onChange={value => setAnswer(question.questionKey,value)} /></div>
          {state.error && <div className="rq-error">{state.error}</div>}
          <div className="rq-actions"><button type="button" className="secondary" disabled={step===0||state.saving} onClick={()=>setStep(Math.max(0,step-1))}>← Back</button><button type="button" className="primary" disabled={state.saving} onClick={next}>{state.saving?'Calculating…':step===questions.length-1?'Calculate estimate':'Next'} →</button></div>
        </> : state.success ? <div className="rq-success est-success"><div className="rq-success-mark">✓</div><span>QUOTE REQUEST RECEIVED</span><h1>Your estimate is now a requirement.</h1><p>Relevant businesses or professionals may contact you with actual quotations. Your indicative estimate is preserved with the lead for context.</p><div><Link to="/">Back home</Link><button type="button" onClick={restart}>Estimate another project</button></div></div> : <div className="est-result">
          <span>INDICATIVE ESTIMATE</span>
          <h2>{flow.config?.resultTitle || 'Estimated project cost'}</h2>
          <div className="est-range"><strong>{money(result.minimum)}</strong><i>to</i><strong>{money(result.maximum)}</strong></div>
          {result.cityName && <p className="est-city">Adjusted for {result.cityName}</p>}
          {!quoteMode && Array.isArray(result.breakdown) && result.breakdown.length > 0 && <div className="est-breakdown"><b>What shaped this range</b>{result.breakdown.map(item=><div key={item.kind+':'+item.key}><span>{item.label}</span><em>{item.minimum===item.maximum?money(item.minimum):money(item.minimum)+' – '+money(item.maximum)}</em></div>)}</div>}
          <div className="est-disclaimer">{result.disclaimer}</div>
          {!quoteMode ? <div className="rq-actions est-result-actions"><button type="button" className="secondary" onClick={restart}>Recalculate</button>{result.quoteEligible?<button type="button" className="primary est-quote-cta" onClick={()=>{setQuoteMode(true);setState(current=>({...current,error:''}))}}>{flow.config?.quoteCtaLabel || 'Get Actual Quotes'} →</button>:<Link className="est-home" to="/">Done</Link>}</div> : <form className="est-quote-form" onSubmit={requestQuotes}>
            <div className="rq-step"><span>GET ACTUAL QUOTES</span><h2>Where should relevant professionals reach you?</h2><p>Your estimate and project answers will be attached to the requirement.</p></div>
            <div className="rq-contact-grid"><label>Name<input value={contact.name} onChange={event=>setContact({...contact,name:event.target.value})} autoComplete="name" required/></label><label>Mobile number<input value={contact.phone} onChange={event=>setContact({...contact,phone:event.target.value})} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" required/></label><label className="wide">Email <small>Optional</small><input type="email" value={contact.email} onChange={event=>setContact({...contact,email:event.target.value})} autoComplete="email"/></label><label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event=>setWebsite(event.target.value)}/></label></div>
            <label className="rq-consent"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>I agree that ProPulse may share my submitted contact information and project details with relevant businesses or professionals so they can provide actual quotations or callbacks.</span></label>
            {state.error&&<div className="rq-error">{state.error}</div>}
            <div className="rq-actions"><button type="button" className="secondary" disabled={state.saving} onClick={()=>setQuoteMode(false)}>← Back to estimate</button><button type="submit" className="primary" disabled={state.saving}>{state.saving?'Submitting…':'Request Quotes'} →</button></div>
          </form>}
        </div>}
      </section>
    </div>
  </main>
}
