import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { trackFunnelEvent, trackFunnelEventOnce } from '../utils/funnelTracking'
import { isValidIndianMobile, normalizeIndianMobileInput } from '../utils/customerContact'
import usePageMeta from '../utils/usePageMeta'
import CustomerFlowQuestion, { isEmptyAnswer, isQuestionVisible } from '../components/CustomerFlowQuestion'
import './RequirementWizard.css'

const emptyContact = { name: '', phone: '', email: '' }

function makeSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12)
}

function requirementSection(question){
  const configured=String(question?.validation?.section||'').trim()
  if(configured)return configured
  if(question?.questionType==='location')return 'Project location'
  if(['budget','timeline'].includes(question?.questionType))return 'Budget & timeline'
  if(question?.leadField==='requirement'||question?.questionType==='text')return 'Project requirement'
  return 'Project details'
}

function groupQuestions(questions){
  const groups=[]
  const byName=new Map()
  for(const question of questions){
    const name=requirementSection(question)
    if(!byName.has(name)){
      const group={name,questions:[]}
      groups.push(group)
      byName.set(name,group)
    }
    byName.get(name).questions.push(question)
  }
  return groups
}

function fieldClass(question){
  const type=question?.questionType
  if(['text','multi_select'].includes(type)||question?.validation?.fullWidth===true)return 'rq-field wide'
  return 'rq-field'
}

export default function RequirementWizard({ flowKey }) {
  const construction=flowKey==='build'
  usePageMeta(construction?'Free Construction Consultation | ProPulse Business':'Free Interior Consultation | ProPulse Business',construction?'Request a free construction consultation by sharing a few basic project details and your contact number.':'Request a free interior consultation by sharing a few basic home and project details and your contact number.')
  const [flow, setFlow] = useState(null)
  const [answers, setAnswers] = useState({})
  const [contact, setContact] = useState(emptyContact)
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [submissionKey, setSubmissionKey] = useState(makeSubmissionKey)
  const [state, setState] = useState({ loading: true, saving: false, error: '', success: false, errorQuestionKey:'' })
  const mounted = useRef(true)
  const startedTracked = useRef(false)

  useEffect(() => {
    mounted.current = true
    startedTracked.current = false
    setState({ loading: true, saving: false, error: '', success: false, errorQuestionKey:'' })
    publicRequest('/customer-flows/' + flowKey).then(data => {
      if (data?.flowType !== 'requirement') throw new Error('This consultation form is not available.')
      if (!mounted.current) return
      setFlow(data)
      setAnswers({})
      setContact(emptyContact)
      setConsent(false)
      setWebsite('')
      setSubmissionKey(makeSubmissionKey())
      setState({ loading: false, saving: false, error: '', success: false, errorQuestionKey:'' })
      trackFunnelEvent('flow_opened',{flowKey,flowType:'requirement',source:'single_page_form'})
    }).catch(error => mounted.current && setState({ loading: false, saving: false, error: error.message, success: false, errorQuestionKey:'' }))
    return () => { mounted.current = false }
  }, [flowKey])

  const questions = useMemo(() => (flow?.questions || []).filter(question => isQuestionVisible(question, answers)), [flow, answers])
  const groups = useMemo(()=>groupQuestions(questions),[questions])
  const completedCount=questions.filter(question=>!isEmptyAnswer(answers[question.questionKey])).length
  const progress=questions.length?Math.round((completedCount/questions.length)*100):0

  useEffect(()=>{
    if(!flow)return
    questions.forEach((question,index)=>trackFunnelEventOnce('flow_question_viewed',{
      flowKey,flowType:'requirement',source:'single_page_form',
      questionKey:question.questionKey,questionIndex:index+1,questionCount:questions.length,
    }))
  },[flow,questions,flowKey])

  function setAnswer(question, value) {
    if (!startedTracked.current) {
      startedTracked.current = true
      trackFunnelEvent('flow_started',{flowKey,flowType:'requirement',source:'single_page_form',metadata:{questions:questions.length}})
    }
    setAnswers(current => ({ ...current, [question.questionKey]: value }))
    setState(current => ({ ...current, error: '', errorQuestionKey:'' }))
    if(!isEmptyAnswer(value)){
      const index=questions.findIndex(item=>item.questionKey===question.questionKey)
      trackFunnelEventOnce('flow_question_completed',{
        flowKey,flowType:'requirement',source:'single_page_form',
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
    if (!contact.name.trim() || !isValidIndianMobile(contact.phone) || !consent) {
      setState(current => ({ ...current, error: 'Enter your name, a valid 10-digit mobile number and accept the contact consent.',errorQuestionKey:'contact' }))
      focusQuestion('contact')
      return false
    }
    return true
  }

  async function submit(event) {
    event.preventDefault()
    if(!validate())return
    try {
      setState(current => ({ ...current, saving: true, error: '',errorQuestionKey:'' }))
      await publicRequest('/customer-flows/' + flowKey + '/submit', {
        method: 'POST',
        body: JSON.stringify({ flowToken: flow.flowToken, answers, contact, consent, submissionKey, website })
      })
      trackFunnelEvent('requirement_submitted',{flowKey,flowType:'requirement',source:'single_page_form'})
      setState({ loading: false, saving: false, error: '', success: true,errorQuestionKey:'' })
    } catch (error) {
      setState(current => ({ ...current, saving: false, error: error.message,errorQuestionKey:'' }))
    }
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading your consultation form…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This consultation form is unavailable.'}<Link to="/">Back home</Link></div></main>
  if (state.success) return <main className="rq-page"><div className="rq-shell rq-success"><div className="rq-success-mark">✓</div><span>CALLBACK REQUESTED</span><h1>{flow.config?.consultationTitle || 'Your project brief is ready.'}</h1><p>{flow.config?.consultationText || 'Your project basics and contact details are saved together so our team can continue from the same information when we call you.'}</p><div><Link to="/">Back home</Link><Link className="rq-success-secondary" to="/contact">Contact project team</Link><button type="button" onClick={() => window.location.reload()}>Request another consultation</button></div></div></main>

  return <main className="rq-page">
    <header className="rq-top"><Link to="/"><img src="/brand/propulse-logo.png" alt="ProPulse Business" /></Link><Link to="/leads">Professional →</Link></header>
    <div className="rq-shell rq-single-shell">
      <aside className="rq-side rq-single-side">
        <span>FREE PROJECT CONSULTATION</span>
        <h1>{flow.name}</h1>
        <p>{flow.config?.subheadline || 'Share the basics in a short form. Our project team can call you back with the right context.'}</p>
        <div className="rq-scope"><small>Category</small><b>{[flow.industryName, flow.serviceName].filter(Boolean).join(' · ')}</b></div>
        <div className="rq-side-progress"><div><span>Form completion</span><b>{progress}%</b></div><i><em style={{width:progress+'%'}}/></i><small>{completedCount} of {questions.length} project fields completed</small></div>
        <ul><li>✓ Short project form</li><li>✓ No login or OTP required</li><li>✓ Free project consultation</li></ul>
      </aside>
      <form className="rq-card rq-form-card rq-single-form" onSubmit={submit}>
        <div className="rq-form-head"><span>FREE CONSULTATION</span><h2>{flow.config?.headline || 'Tell us about your project.'}</h2><p>Tell us only the basics we need before calling you. Relevant fields appear automatically.</p></div>
        {groups.map((group,index)=>{
          const required=group.questions.filter(question=>question.isRequired)
          const complete=required.filter(question=>!isEmptyAnswer(answers[question.questionKey])).length
          const optional=required.length===0
          const done=!optional&&complete===required.length
          return <section className={'rq-form-section '+(done?'complete':'')} key={group.name}>
          <div className="rq-form-section-head"><b>{done?'✓':String(index+1).padStart(2,'0')}</b><div><h3>{group.name}</h3><span>{optional?'Optional details':complete+' of '+required.length+' required completed'}</span></div><em className={done?'done':optional?'optional':''}>{optional?'Optional':done?'Complete':'Needs '+(required.length-complete)}</em></div>
          <div className="rq-form-grid">{group.questions.map(question=><div className={fieldClass(question)+(state.errorQuestionKey===question.questionKey?' error':'')} data-question-key={question.questionKey} key={question.questionKey}>
            <label htmlFor={'rq-'+question.questionKey}>{question.label}{question.isRequired&&<sup>*</sup>}</label>
            {question.helpText&&<p>{question.helpText}</p>}
            <CustomerFlowQuestion id={'rq-'+question.questionKey} question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question,value)} />
          </div>)}</div>
        </section>
        })}

        <section className={'rq-form-section rq-contact-section'+(state.errorQuestionKey==='contact'?' error':'')} data-question-key="contact">
          <div className="rq-form-section-head"><b>{String(groups.length+1).padStart(2,'0')}</b><div><h3>{flow.config?.contactTitle || 'Your contact details'}</h3><span>{flow.config?.contactText || 'We use these details only for this project enquiry and follow-up.'}</span></div></div>
          <div className="rq-contact-grid"><label>Name<input value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} autoComplete="name" required /></label><label>Mobile number<input value={contact.phone} onChange={event => setContact({ ...contact, phone: normalizeIndianMobileInput(event.target.value) })} inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" maxLength="10" pattern="[6-9][0-9]{9}" required /></label><label className="wide">Email <small>Optional</small><input type="email" value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} autoComplete="email" /></label><label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
          <label className="rq-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I agree that ProPulse may use and share my project details and contact information with relevant verified professionals or contractors so they can respond to this project enquiry and provide consultation or service follow-up.</span></label>
        </section>

        {state.error && <div className="rq-error">{state.error}</div>}
        <div className="rq-submit-bar"><div><small>FREE CONSULTATION</small><b>Submit once — our project team can continue from the same details.</b></div><button type="submit" className="primary" disabled={state.saving}>{state.saving ? 'Submitting…' : (flow.config?.submitLabel || 'Get Free Consultation')} <span>→</span></button></div>
      </form>
    </div>
  </main>
}
