import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import CustomerFlowQuestion, { isEmptyAnswer, isQuestionVisible } from '../components/CustomerFlowQuestion'
import './RequirementWizard.css'
import './EstimatorWizard.css'

const money = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value || 0))

export default function EstimatorWizard({ flowKey }) {
  const [flow,setFlow] = useState(null)
  const [answers,setAnswers] = useState({})
  const [step,setStep] = useState(0)
  const [result,setResult] = useState(null)
  const [state,setState] = useState({loading:true,saving:false,error:''})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setState({loading:true,saving:false,error:''})
    publicRequest('/customer-flows/'+flowKey).then(data => {
      if (!mounted.current) return
      if (data?.flowType !== 'estimator') throw new Error('This calculator is not available.')
      setFlow(data)
      setAnswers({})
      setStep(0)
      setResult(null)
      setState({loading:false,saving:false,error:''})
    }).catch(error => mounted.current && setState({loading:false,saving:false,error:error.message}))
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
      setState({loading:false,saving:false,error:''})
    } catch (error) {
      setState(current => ({...current,saving:false,error:error.message}))
    }
  }

  function restart() {
    setAnswers({})
    setStep(0)
    setResult(null)
    setState({loading:false,saving:false,error:''})
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading calculator…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This calculator is unavailable.'}<Link to="/">Back home</Link></div></main>

  return <main className="rq-page">
    <header className="rq-top"><Link to="/"><img src="/brand/propulse-logo.png" alt="ProPulse Business" /></Link><Link to="/leads">For businesses →</Link></header>
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
        </> : <div className="est-result">
          <span>INDICATIVE ESTIMATE</span>
          <h2>{flow.config?.resultTitle || 'Estimated project cost'}</h2>
          <div className="est-range"><strong>{money(result.minimum)}</strong><i>to</i><strong>{money(result.maximum)}</strong></div>
          {result.cityName && <p className="est-city">Adjusted for {result.cityName}</p>}
          {Array.isArray(result.breakdown) && result.breakdown.length > 0 && <div className="est-breakdown"><b>What shaped this range</b>{result.breakdown.map(item=><div key={item.kind+':'+item.key}><span>{item.label}</span><em>{item.minimum===item.maximum?money(item.minimum):money(item.minimum)+' – '+money(item.maximum)}</em></div>)}</div>}
          <div className="est-disclaimer">{result.disclaimer}</div>
          <div className="rq-actions"><button type="button" className="secondary" onClick={restart}>Recalculate</button><Link className="est-home" to="/">Done</Link></div>
        </div>}
      </section>
    </div>
  </main>
}
