import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './RequirementWizard.css'

const emptyContact = { name: '', phone: '', email: '' }
const isEmpty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)

function visible(question, answers) {
  const rule = question?.showWhen || {}
  if (!rule.questionKey) return true
  const actual = answers[rule.questionKey]
  if (Object.prototype.hasOwnProperty.call(rule, 'equals')) return actual === rule.equals
  if (Array.isArray(rule.in)) return rule.in.includes(actual)
  if (Object.prototype.hasOwnProperty.call(rule, 'notEquals')) return actual !== rule.notEquals
  return true
}

function makeSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12)
}

function ChoiceButtons({ question, value, onChange, multiple = false }) {
  const selected = multiple ? (Array.isArray(value) ? value : []) : []
  return <div className="rq-options">{(question.options || []).map(option => {
    const active = multiple ? selected.includes(option.value) : value === option.value
    return <button key={option.value} type="button" className={active ? 'active' : ''} onClick={() => {
      if (!multiple) return onChange(option.value)
      onChange(active ? selected.filter(item => item !== option.value) : [...selected, option.value])
    }}><span>{active ? '✓' : ''}</span><b>{option.label}</b></button>
  })}</div>
}

function QuestionInput({ question, value, onChange }) {
  if (question.questionType === 'single_select' || question.questionType === 'timeline') {
    return <ChoiceButtons question={question} value={value} onChange={onChange} />
  }
  if (question.questionType === 'multi_select') {
    return <ChoiceButtons question={question} value={value} onChange={onChange} multiple />
  }
  if (question.questionType === 'boolean') {
    return <div className="rq-options two"><button type="button" className={value === true ? 'active' : ''} onClick={() => onChange(true)}><span>{value === true ? '✓' : ''}</span><b>Yes</b></button><button type="button" className={value === false ? 'active' : ''} onClick={() => onChange(false)}><span>{value === false ? '✓' : ''}</span><b>No</b></button></div>
  }
  if (question.questionType === 'text') {
    return <textarea rows="5" value={value || ''} maxLength={Number(question.validation?.maxLength || 2000)} onChange={event => onChange(event.target.value)} placeholder="Share useful details..." />
  }
  if (question.questionType === 'location') {
    return <div className="rq-input-suffix"><input inputMode="numeric" maxLength="6" value={value || ''} onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit PIN code" /><span>PIN</span></div>
  }
  if (question.questionType === 'number' || question.questionType === 'area') {
    return <div className="rq-input-suffix"><input type="number" min={question.validation?.min} max={question.validation?.max} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder="Enter number" />{question.questionType === 'area' && <span>sq ft</span>}</div>
  }
  return <input value={value || ''} maxLength={Number(question.validation?.maxLength || 240)} onChange={event => onChange(event.target.value)} placeholder={question.questionType === 'budget' ? 'Example: ₹10–15 lakh' : 'Enter your answer'} />
}

export default function RequirementWizard({ flowKey }) {
  const [flow, setFlow] = useState(null)
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [contactMode, setContactMode] = useState(false)
  const [contact, setContact] = useState(emptyContact)
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [submissionKey, setSubmissionKey] = useState(makeSubmissionKey)
  const [state, setState] = useState({ loading: true, saving: false, error: '', success: false })
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setState({ loading: true, saving: false, error: '', success: false })
    publicRequest('/customer-flows/' + flowKey).then(data => {
      if (!mounted.current) return
      setFlow(data)
      setAnswers({})
      setStep(0)
      setContactMode(false)
      setSubmissionKey(makeSubmissionKey())
      setState({ loading: false, saving: false, error: '', success: false })
    }).catch(error => mounted.current && setState({ loading: false, saving: false, error: error.message, success: false }))
    return () => { mounted.current = false }
  }, [flowKey])

  const questions = useMemo(() => (flow?.questions || []).filter(question => visible(question, answers)), [flow, answers])
  useEffect(() => { if (step >= questions.length && questions.length) setStep(questions.length - 1) }, [questions.length, step])
  const question = questions[step]
  const progress = contactMode ? 100 : questions.length ? Math.round(((step + 1) / questions.length) * 88) : 0

  function setAnswer(key, value) {
    setAnswers(current => ({ ...current, [key]: value }))
    setState(current => ({ ...current, error: '' }))
  }

  function next() {
    if (!question) return
    if (question.isRequired && isEmpty(answers[question.questionKey])) {
      setState(current => ({ ...current, error: 'Please answer this question to continue.' }))
      return
    }
    setState(current => ({ ...current, error: '' }))
    if (step < questions.length - 1) setStep(step + 1)
    else setContactMode(true)
  }

  async function submit(event) {
    event.preventDefault()
    if (!contact.name.trim() || !contact.phone.trim() || !consent) {
      setState(current => ({ ...current, error: 'Enter your name, mobile number and accept the contact consent.' }))
      return
    }
    try {
      setState(current => ({ ...current, saving: true, error: '' }))
      await publicRequest('/customer-flows/' + flowKey + '/submit', {
        method: 'POST',
        body: JSON.stringify({ flowToken: flow.flowToken, answers, contact, consent, submissionKey, website })
      })
      setState({ loading: false, saving: false, error: '', success: true })
    } catch (error) {
      setState(current => ({ ...current, saving: false, error: error.message }))
    }
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading your requirement form…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This requirement form is unavailable.'}<Link to="/">Back home</Link></div></main>
  if (state.success) return <main className="rq-page"><div className="rq-shell rq-success"><div className="rq-success-mark">✓</div><span>REQUEST RECEIVED</span><h1>We have your requirement.</h1><p>Relevant businesses may contact you about this request. Your contact details remain protected from businesses until ProPulse access rules allow them to view the lead.</p><div><Link to="/">Back home</Link><button type="button" onClick={() => window.location.reload()}>Post another requirement</button></div></div></main>

  return <main className="rq-page">
    <header className="rq-top"><Link to="/"><img src="/brand/propulse-logo.png" alt="ProPulse Business" /></Link><Link to="/leads">For businesses →</Link></header>
    <div className="rq-shell">
      <aside className="rq-side"><span>PROPULSE REQUIREMENTS</span><h1>{flow.name}</h1><p>{flow.config?.subheadline || 'Tell us a few details so we can connect your requirement with relevant businesses.'}</p><div className="rq-scope"><small>Category</small><b>{[flow.industryName, flow.serviceName].filter(Boolean).join(' · ')}</b></div><ul><li>✓ No login required</li><li>✓ No OTP in this version</li><li>✓ Contact details protected</li></ul></aside>
      <section className="rq-card">
        <div className="rq-progress"><div style={{ width: progress + '%' }} /></div>
        {!contactMode ? <>
          <div className="rq-step"><span>QUESTION {String(step + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}</span><h2>{question?.label}</h2>{question?.helpText && <p>{question.helpText}</p>}</div>
          <div className="rq-control"><QuestionInput question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} /></div>
          {state.error && <div className="rq-error">{state.error}</div>}
          <div className="rq-actions"><button type="button" className="secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>← Back</button><button type="button" className="primary" onClick={next}>{step === questions.length - 1 ? 'Continue to contact' : 'Next'} →</button></div>
        </> : <form onSubmit={submit}>
          <div className="rq-step"><span>FINAL STEP</span><h2>Where should businesses reach you?</h2><p>We only ask for contact details after your requirement is complete.</p></div>
          <div className="rq-contact-grid"><label>Name<input value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} autoComplete="name" required /></label><label>Mobile number<input value={contact.phone} onChange={event => setContact({ ...contact, phone: event.target.value })} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" required /></label><label className="wide">Email <small>Optional</small><input type="email" value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} autoComplete="email" /></label><label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
          <label className="rq-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I agree that ProPulse may share my submitted contact information with relevant businesses or professionals so they can respond to this requirement.</span></label>
          {state.error && <div className="rq-error">{state.error}</div>}
          <div className="rq-actions"><button type="button" className="secondary" onClick={() => setContactMode(false)}>← Back</button><button type="submit" className="primary" disabled={state.saving}>{state.saving ? 'Submitting…' : (flow.config?.submitLabel || 'Get Quotes')} →</button></div>
        </form>}
      </section>
    </div>
  </main>
}
