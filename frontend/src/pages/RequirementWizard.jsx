import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { isEmptyAnswer, isQuestionVisible } from '../components/CustomerFlowQuestion'
import InteriorRequirementExact from '../components/InteriorRequirementExact'
import RealEstateRequirementExact from '../components/RealEstateRequirementExact'
import './RequirementWizard.css'

const emptyContact = { name: '', phone: '', email: '' }

const THEMES = {
  build: {
    eyebrow: 'HOME CONSTRUCTION',
    line1: 'Let’s Build',
    line2: 'Your Dream Home',
    intro: 'Tell us your requirements and create a clear construction brief for relevant businesses.',
    hero: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1900&q=90',
    promo: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=88',
    expert: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=86',
  },
  design: {
    eyebrow: 'INTERIOR DESIGN',
    line1: 'Design a Home',
    line2: 'That Feels Like You',
    intro: 'Share your rooms, scope, size and preferences in one guided interior requirement.',
    hero: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1900&q=90',
    promo: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=88',
    expert: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=86',
  },
  property: {
    eyebrow: 'REAL ESTATE',
    line1: 'Find the Right',
    line2: 'Property for You',
    intro: 'Tell us what you want, where you want it and your budget so the requirement stays relevant.',
    hero: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1900&q=90',
    promo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=88',
    expert: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1000&q=86',
  },
}

const OPTION_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=84',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=700&q=84',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=700&q=84',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=84',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=700&q=84',
]

function makeSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12)
}

function collection(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.items)) return value.items
  return []
}

function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'tool') return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 9.6 6 7.3 3.7a4 4 0 0 0 5 5L20 16.4a2.1 2.1 0 1 1-3 3Z"/></svg>
  if (name === 'shield') return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'clock') return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  if (name === 'target') return <svg {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M15 9l5-5"/></svg>
  if (name === 'chat') return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
  if (name === 'receipt') return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if (name === 'pin') return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'phone') return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'home') return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if (name === 'area') return <svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><path d="M9 12h6"/></svg>
  return null
}

function fieldLabel(question, answers) {
  if (!question) return '—'
  const value = answers[question.questionKey]
  if (isEmptyAnswer(value)) return '—'
  if (Array.isArray(value)) {
    return value.map(item => question.options?.find(option => option.value === item)?.label || item).join(', ')
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return question.options?.find(option => option.value === value)?.label || String(value)
}

function PremiumQuestion({ question, value, onChange, visual = 'default' }) {
  if (!question) return null
  const options = question.options || []

  if (question.questionType === 'single_select' || question.questionType === 'timeline') {
    const imageMode = visual === 'image'
    return <div className={imageMode ? 'rq-premium-options image-options' : 'rq-premium-options'}>
      {options.map((option, index) => {
        const active = value === option.value
        return <button type="button" key={option.value} className={active ? 'active' : ''} onClick={() => onChange(option.value)}>
          {imageMode && <span className="rq-option-photo"><img src={OPTION_IMAGES[index % OPTION_IMAGES.length]} alt="" />{active && <i>✓</i>}</span>}
          {!imageMode && <span className="rq-choice-dot">{active ? '✓' : ''}</span>}
          <b>{option.label}</b>
          {imageMode && <small>{index === 0 ? 'Popular choice' : 'Select this option'}</small>}
        </button>
      })}
    </div>
  }

  if (question.questionType === 'multi_select') {
    const selected = Array.isArray(value) ? value : []
    return <div className="rq-premium-options compact">
      {options.map(option => {
        const active = selected.includes(option.value)
        return <button type="button" key={option.value} className={active ? 'active' : ''} onClick={() => onChange(active ? selected.filter(item => item !== option.value) : [...selected, option.value])}>
          <span className="rq-choice-dot">{active ? '✓' : ''}</span><b>{option.label}</b>
        </button>
      })}
    </div>
  }

  if (question.questionType === 'boolean') {
    return <div className="rq-premium-options boolean-options">
      {[['yes', true, 'Yes'], ['no', false, 'No']].map(([key, answer, label]) => <button type="button" key={key} className={value === answer ? 'active' : ''} onClick={() => onChange(answer)}><span className="rq-choice-dot">{value === answer ? '✓' : ''}</span><b>{label}</b></button>)}
    </div>
  }

  if (question.questionType === 'text') {
    return <div className="rq-text-wrap"><textarea rows="4" value={value || ''} maxLength={Number(question.validation?.maxLength || 1500)} onChange={event => onChange(event.target.value)} placeholder="E.g. terrace, garden, parking, vastu preference, specific materials…" /><span>{String(value || '').length}/{Number(question.validation?.maxLength || 1500)}</span></div>
  }

  if (question.questionType === 'number' || question.questionType === 'area') {
    return <div className="rq-number-wrap"><input type="number" min={question.validation?.min} max={question.validation?.max} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={question.questionType === 'area' ? 'Enter area' : 'Enter number'} />{question.questionType === 'area' && <span>sq ft</span>}</div>
  }

  return <input className="rq-basic-input" value={value || ''} maxLength={Number(question.validation?.maxLength || 240)} onChange={event => onChange(event.target.value)} placeholder={question.questionType === 'budget' ? 'Example: ₹25–40 lakh' : 'Enter your answer'} />
}

export default function RequirementWizard({ flowKey }) {
  const navigate = useNavigate()
  const [flow, setFlow] = useState(null)
  const [cities, setCities] = useState([])
  const [contactData, setContactData] = useState({})
  const [answers, setAnswers] = useState({})
  const [cityId, setCityId] = useState('')
  const [contact, setContact] = useState(emptyContact)
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [submissionKey, setSubmissionKey] = useState(makeSubmissionKey)
  const [state, setState] = useState({ loading: true, saving: false, error: '', success: false })
  const [submission, setSubmission] = useState(null)
  const mounted = useRef(true)
  const theme = THEMES[flowKey] || THEMES.build

  useEffect(() => {
    mounted.current = true
    setState({ loading: true, saving: false, error: '', success: false })

    Promise.all([publicRequest('/customer-flows/' + flowKey), publicRequest('/cities').catch(() => []), publicRequest('/contact?audience=website').catch(() => ({}))]).then(([data, cityData, websiteContact]) => {
      if (data?.flowType !== 'requirement') throw new Error('This requirement form is not available.')
      if (!mounted.current) return

      const loadedCities = collection(cityData)
      setFlow(data)
      setCities(loadedCities)
      setContactData(websiteContact || {})

      let initialAnswers = {}
      let initialContact = emptyContact
      let initialCityId = ''

      try {
        const saved = JSON.parse(sessionStorage.getItem('propulse_intake_prefill') || 'null')
        const recent = saved && Date.now() - Number(saved.createdAt || 0) < 60 * 60 * 1000
        if (recent && saved.flowKey === flowKey) {
          const locationQuestion = (data.questions || []).find(item => item.questionType === 'location')
          if (locationQuestion && /^\d{6}$/.test(String(saved.pincode || ''))) {
            initialAnswers[locationQuestion.questionKey] = String(saved.pincode)
          }
          initialContact = { name: String(saved.name || ''), phone: String(saved.phone || ''), email: '' }
          initialCityId = saved.cityId ? String(saved.cityId) : ''
          if (!initialCityId && saved.pincode) {
            const matched = loadedCities.find(city => (city.pincodes || []).some(item => String(typeof item === 'string' ? item : item?.pincode) === String(saved.pincode)))
            if (matched) initialCityId = String(matched.id)
          }
          sessionStorage.removeItem('propulse_intake_prefill')
        }
      } catch {}

      setAnswers(initialAnswers)
      setContact(initialContact)
      setCityId(initialCityId)
      setConsent(false)
      setSubmissionKey(makeSubmissionKey())
      setSubmission(null)
      setState({ loading: false, saving: false, error: '', success: false })
    }).catch(error => mounted.current && setState({ loading: false, saving: false, error: error.message, success: false }))

    return () => { mounted.current = false }
  }, [flowKey])

  const questions = useMemo(() => (flow?.questions || []).filter(question => isQuestionVisible(question, answers)), [flow, answers])
  const byKey = useMemo(() => Object.fromEntries(questions.map(question => [question.questionKey, question])), [questions])
  const locationQuestion = questions.find(question => question.questionType === 'location')
  const selectedCity = useMemo(() => cities.find(city => String(city.id) === String(cityId)), [cities, cityId])
  const cityPincodes = useMemo(() => {
    const rows = Array.isArray(selectedCity?.pincodes) ? selectedCity.pincodes : []
    const map = new Map()
    rows.forEach(item => {
      const pin = String(typeof item === 'string' ? item : item?.pincode || '')
      if (/^\d{6}$/.test(pin) && !map.has(pin)) map.set(pin, typeof item === 'string' ? { pincode: pin } : item)
    })
    return [...map.values()]
  }, [selectedCity])

  const propertyQuestions = questions.filter(question => ['project_type', 'own_plot', 'property_type', 'property_intent', 'bhk', 'property_status', 'possession_status'].includes(question.questionKey))
  const configQuestions = questions.filter(question => ['plot_area', 'built_up_area', 'area', 'floors'].includes(question.questionKey))
  const preferenceQuestions = questions.filter(question => ['construction_scope', 'quality', 'budget', 'timeline', 'interior_scope', 'kitchen', 'wardrobes', 'false_ceiling', 'furniture', 'finish_quality'].includes(question.questionKey))
  const additionalQuestion = questions.find(question => question.questionKey === 'additional_requirement')
  const usedKeys = new Set([locationQuestion?.questionKey, ...propertyQuestions.map(q => q.questionKey), ...configQuestions.map(q => q.questionKey), ...preferenceQuestions.map(q => q.questionKey), additionalQuestion?.questionKey].filter(Boolean))
  const extraQuestions = questions.filter(question => !usedKeys.has(question.questionKey))

  const requiredTotal = questions.filter(question => question.isRequired).length + 3
  const requiredDone = questions.filter(question => question.isRequired && !isEmptyAnswer(answers[question.questionKey])).length + (contact.name.trim() ? 1 : 0) + (/^[6-9]\d{9}$/.test(contact.phone.replace(/\D/g, '')) ? 1 : 0) + (consent ? 1 : 0)
  const completion = requiredTotal ? Math.round(requiredDone / requiredTotal * 100) : 0
  const missingRequired = questions.filter(question => question.isRequired && isEmptyAnswer(answers[question.questionKey]))
  const phoneValid = /^[6-9]\d{9}$/.test(contact.phone.replace(/\D/g, ''))
  const submitIssues = [
    ...missingRequired.map(question => question.label.replace(/\?$/,'')),
    ...(!contact.name.trim() ? ['Your Name'] : []),
    ...(!phoneValid ? ['Valid Mobile Number'] : []),
    ...(!consent ? ['Contact Consent'] : []),
  ]

  function setAnswer(key, value) {
    setAnswers(current => ({ ...current, [key]: value }))
    setState(current => ({ ...current, error: '' }))
  }

  function setCity(value) {
    const city = cities.find(item => String(item.id) === String(value))
    setCityId(value)
    if (locationQuestion) {
      const pins = (city?.pincodes || []).map(item => String(typeof item === 'string' ? item : item?.pincode || '')).filter(pin => /^\d{6}$/.test(pin))
      setAnswer(locationQuestion.questionKey, pins.length === 1 ? pins[0] : '')
    }
  }

  function jump(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function estimatorPrefill() {
    if (flowKey !== 'build') return
    const projectTypeMap = {
      house_construction: 'house',
      commercial_building: 'commercial',
      building_extension: 'extension',
    }
    const scope = Array.isArray(answers.construction_scope) ? answers.construction_scope : []
    let constructionPackage = ''
    if (scope.includes('turnkey')) constructionPackage = 'turnkey'
    else if (scope.includes('civil_structure')) constructionPackage = 'structure_only'
    else if (scope.includes('finishing')) constructionPackage = 'finishing_only'

    const mapped = {
      project_location: answers.project_location || '',
      project_type: projectTypeMap[answers.project_type] || '',
      own_plot: answers.own_plot,
      plot_area: answers.plot_area || '',
      built_up_area: answers.built_up_area || '',
      floors: answers.floors || '',
      construction_package: constructionPackage,
      quality: answers.quality || '',
      timeline: answers.timeline || '',
      additional_requirement: answers.additional_requirement || '',
    }
    try {
      sessionStorage.setItem('propulse_estimator_prefill', JSON.stringify({
        flowKey: 'construction-cost-estimator',
        cityId,
        answers: Object.fromEntries(Object.entries(mapped).filter(([, value]) => value !== '' && value !== undefined && value !== null)),
        createdAt: Date.now(),
      }))
    } catch {}
  }

  function openEstimator() {
    estimatorPrefill()
    navigate('/construction-estimator')
  }

  async function submit(event) {
    event.preventDefault()
    const missing = questions.find(question => question.isRequired && isEmptyAnswer(answers[question.questionKey]))
    if (missing) {
      setState(current => ({ ...current, error: `Please complete “${missing.label}”.` }))
      const target = ['project_type','own_plot','property_type','property_intent','bhk','property_status','possession_status'].includes(missing.questionKey)
        ? 'rq-property'
        : ['plot_area','built_up_area','area','floors'].includes(missing.questionKey)
          ? 'rq-config'
          : missing.questionKey === 'additional_requirement' ? 'rq-additional' : 'rq-preferences'
      jump(target)
      return
    }

    const phone = contact.phone.replace(/\D/g, '')
    if (!contact.name.trim() || !/^[6-9]\d{9}$/.test(phone)) {
      setState(current => ({ ...current, error: 'Enter your name and a valid 10-digit mobile number.' }))
      jump('rq-basic')
      return
    }
    if (!consent) {
      setState(current => ({ ...current, error: 'Please accept the contact consent to submit your requirement.' }))
      jump('rq-summary')
      return
    }

    try {
      setState(current => ({ ...current, saving: true, error: '' }))
      const submitted = await publicRequest('/customer-flows/' + flowKey + '/submit', {
        method: 'POST',
        body: JSON.stringify({ flowToken: flow.flowToken, answers, contact: { ...contact, phone }, consent, submissionKey, website })
      })
      setSubmission(submitted || null)
      setState({ loading: false, saving: false, error: '', success: true })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setState(current => ({ ...current, saving: false, error: error.message }))
    }
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading your requirement form…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This requirement form is unavailable.'}<Link to="/">Back home</Link></div></main>

  if (state.success) return <main className="rq-page rq-premium-page">
    <header className="rq-premium-header"><Link to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link><Link to="/">Back to Home</Link></header>
    <div className="rq-success rq-premium-success">
      <div className="rq-success-mark">✓</div>
      <span>QUOTATION REQUEST SUBMITTED</span>
      <h1>Your requirement has been sent successfully.</h1>
      <p>Relevant businesses can now respond with their actual quotations. Actual quotations are not generated instantly by ProPulse because pricing depends on the business, site details, specifications and final scope.</p>
      {submission?.leadId && <small className="rq-success-reference">Request reference: #{submission.leadId}</small>}
      {flowKey === 'build' && <div className="rq-success-estimate"><b>Want a price range now?</b><span>Use the Construction Cost Estimator. We’ll carry over the details you already entered so you do not have to start again.</span></div>}
      <div>
        {flowKey === 'build' && <button className="rq-success-primary" type="button" onClick={openEstimator}>Get Instant Cost Estimate</button>}
        <Link to="/">Back home</Link>
        <button type="button" onClick={() => window.location.reload()}>Post another requirement</button>
      </div>
    </div>
  </main>

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  if (flowKey === 'design') {
    return <InteriorRequirementExact
      flow={flow}
      questions={questions}
      answers={answers}
      setAnswer={setAnswer}
      cities={cities}
      cityId={cityId}
      setCity={setCity}
      cityPincodes={cityPincodes}
      locationQuestion={locationQuestion}
      contact={contact}
      setContact={setContact}
      consent={consent}
      setConsent={setConsent}
      state={state}
      submit={submit}
      contactData={contactData}
      completion={completion}
    />
  }

  const summaryRows = [
    ['Location', selectedCity?.name || '—'],
    ['PIN Code', locationQuestion ? fieldLabel(locationQuestion, answers) : '—'],
    ...propertyQuestions.slice(0, 2).map(q => [q.label.replace(/\?$/,''), fieldLabel(q, answers)]),
    ...configQuestions.slice(0, 2).map(q => [q.label.replace(/\?$/,''), fieldLabel(q, answers)]),
    ...preferenceQuestions.slice(0, 2).map(q => [q.label.replace(/\?$/,''), fieldLabel(q, answers)]),
  ]

  return <main className="rq-page rq-premium-page">
    <header className="rq-premium-header">
      <Link to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link>
      <nav>
        <Link to="/">Home</Link>
        <Link className={flowKey === 'build' ? 'active' : ''} to="/build">Construction</Link>
        <Link className={flowKey === 'design' ? 'active' : ''} to="/design">Interiors</Link>
        <Link className={flowKey === 'property' ? 'active' : ''} to="/property">Real Estate</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>
      <button onClick={() => jump('rq-basic')}>Get Free Consultation <Icon name="arrow" size={15} /></button>
    </header>

    <section className="rq-premium-hero">
      <img src={theme.hero} alt="" />
      <div className="rq-hero-overlay" />
      <div className="rq-hero-copy">
        <span>{theme.eyebrow}</span>
        <h1>{theme.line1}<em>{theme.line2}</em></h1>
        <p>{theme.intro}</p>
      </div>
      <div className="rq-hero-benefits">
        <article><Icon name="chat" /><div><b>Free Consultation</b><small>No obligation</small></div></article>
        <article><Icon name="receipt" /><div><b>Transparent Estimates</b><small>Compare actual options</small></div></article>
        <article><Icon name="shield" /><div><b>Relevant Businesses</b><small>Matched to your brief</small></div></article>
        <article><Icon name="target" /><div><b>End-to-End Journey</b><small>From requirement onward</small></div></article>
      </div>
      <div className="rq-hero-features">
        <article><Icon name="tool" /><span>Custom Requirement</span></article>
        <article><Icon name="shield" /><span>Structured Details</span></article>
        <article><Icon name="clock" /><span>Fast Submission</span></article>
        <article><Icon name="target" /><span>Location Relevant</span></article>
      </div>
    </section>

    <div className="rq-flow-nav">
      {[
        ['rq-basic','1','Basic Details','Tell us about your project'],
        ['rq-property','2','Property Details','Type, size and preferences'],
        ['rq-preferences','3','Requirements','Scope, quality and timeline'],
        ['rq-summary','4','Review & Submit','Confirm and connect'],
      ].map(([id, number, title, text], index) => <button key={id} onClick={() => jump(id)} className={completion >= [1,35,65,90][index] ? 'done' : index === 0 ? 'active' : ''}>
        <span>{completion >= [35,65,90,100][index] ? '✓' : number}</span><div><b>{title}</b><small>{text}</small></div>{index < 3 && <i><Icon name="arrow" size={14}/></i>}
      </button>)}
    </div>

    <form className="rq-premium-form" onSubmit={submit}>
      <section className="rq-form-row basic-row" id="rq-basic">
        <div className="rq-section-card">
          <div className="rq-section-heading"><strong>1.</strong><div><h2>Basic Details</h2><p>Let’s start with the essential project and contact information.</p></div></div>
          <div className="rq-basic-grid">
            <label><span>Project Location</span><div className="rq-field-icon"><Icon name="pin" size={15}/><select value={cityId} onChange={event => setCity(event.target.value)}><option value="">Select City / Location</option>{cities.map(city => <option key={city.id} value={city.id}>{city.name}{city.state_name ? ` · ${city.state_name}` : ''}</option>)}</select></div></label>
            <label><span>PIN Code</span>{cityPincodes.length ? <select value={locationQuestion ? answers[locationQuestion.questionKey] || '' : ''} onChange={event => locationQuestion && setAnswer(locationQuestion.questionKey, event.target.value)}><option value="">Select PIN Code</option>{cityPincodes.map(item => <option key={item.pincode} value={item.pincode}>{item.pincode}{item.officeName ? ` · ${item.officeName}` : ''}</option>)}</select> : <input inputMode="numeric" maxLength="6" value={locationQuestion ? answers[locationQuestion.questionKey] || '' : ''} onChange={event => locationQuestion && setAnswer(locationQuestion.questionKey, event.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter 6-digit PIN" />}</label>
            <label><span>Your Name</span><input value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} autoComplete="name" placeholder="Enter your full name" /></label>
            <label><span>Mobile Number</span><div className="rq-phone-field"><b>+91</b><input value={contact.phone} onChange={event => setContact({ ...contact, phone: event.target.value.replace(/\D/g,'').slice(0,10) })} inputMode="tel" autoComplete="tel" placeholder="Enter 10-digit number" /></div></label>
            <label><span>Email <small>(Optional)</small></span><input type="email" value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} autoComplete="email" placeholder="Enter your email" /></label>
          </div>
        </div>

        <aside className="rq-vision-card">
          <div className="rq-vision-image"><img src={theme.promo} alt="" /><div><span>Turn Your</span><strong>Vision into Reality</strong></div></div>
          <div className="rq-vision-stats"><span><b>Simple</b><small>Guided Form</small></span><span><b>Admin</b><small>Managed Flow</small></span><span><b>Secure</b><small>Lead Intake</small></span></div>
        </aside>
      </section>

      <section className="rq-section-card" id="rq-property">
        <div className="rq-section-heading"><strong>2.</strong><div><h2>Property Type</h2><p>Select the options that best describe your project.</p></div></div>
        <div className="rq-question-stack">
          {propertyQuestions.map((question, index) => <div className="rq-question-block" key={question.id || question.questionKey}>
            <div className="rq-question-label"><b>{question.label}</b>{question.helpText && <small>{question.helpText}</small>}</div>
            <PremiumQuestion question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} visual={index === 0 ? 'image' : 'default'} />
          </div>)}
        </div>
      </section>

      <section className="rq-section-card" id="rq-config">
        <div className="rq-section-heading"><strong>3.</strong><div><h2>Built-up Area & Configuration</h2><p>Help us understand the size and scale you’re planning.</p></div></div>
        <div className="rq-config-grid">
          {configQuestions.map(question => <label key={question.id || question.questionKey}><span>{question.label}</span><PremiumQuestion question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} /></label>)}
        </div>
      </section>

      <div className="rq-lower-grid">
        <div>
          <section className="rq-section-card" id="rq-preferences">
            <div className="rq-section-heading"><strong>4.</strong><div><h2>Requirements & Preferences</h2><p>Choose the scope, quality, budget and timing that fit your project.</p></div></div>
            <div className="rq-question-stack">
              {[...preferenceQuestions, ...extraQuestions].map((question, index) => <div className="rq-question-block" key={question.id || question.questionKey}>
                <div className="rq-question-label"><b>{question.label}</b>{question.helpText && <small>{question.helpText}</small>}</div>
                <PremiumQuestion question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} visual={question.questionKey === 'quality' || question.questionKey === 'finish_quality' ? 'image' : 'default'} />
              </div>)}
            </div>
          </section>

          <section className="rq-section-card" id="rq-additional">
            <div className="rq-section-heading"><strong>5.</strong><div><h2>Additional Requirements</h2><p>Tell us any important details we should preserve in the lead.</p></div></div>
            {additionalQuestion ? <PremiumQuestion question={additionalQuestion} value={answers[additionalQuestion.questionKey]} onChange={value => setAnswer(additionalQuestion.questionKey, value)} /> : <div className="rq-empty-note">No additional notes are required for this Admin flow.</div>}
          </section>
        </div>

        <aside className="rq-summary-card" id="rq-summary">
          <div className="rq-summary-progress"><span>Requirement progress</span><b>{completion}%</b><i><em style={{ width: completion + '%' }} /></i></div>
          <h3>Your Selection Summary</h3>
          <div className="rq-summary-list">
            {summaryRows.map(([label,value]) => <div key={label}><span>{label}</span><b title={value}>{value}</b></div>)}
          </div>
          {submitIssues.length > 0 && <div className="rq-submit-checklist"><b>Before requesting quotations</b><span>{submitIssues.length} required item{submitIssues.length === 1 ? '' : 's'} remaining</span><ul>{submitIssues.slice(0,4).map(item => <li key={item}>{item}</li>)}</ul></div>}
          <label className={consent ? 'rq-consent premium' : 'rq-consent premium needs-attention'}><input type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); setState(current => ({ ...current, error: '' })) }} /><span>I agree that ProPulse may share my submitted contact information with relevant businesses so they can respond with quotations.</span></label>
          <label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
          {state.error && <div className="rq-error rq-submit-error" role="alert">{state.error}</div>}
          <button className="rq-submit" type="submit" disabled={state.saving}>{state.saving ? 'Submitting…' : 'Request Quotations'} <Icon name="arrow" size={15}/></button>
          <small className="rq-submit-note">Actual quotations come from responding businesses. For an instant indicative price range, use the Cost Estimator.</small>
        </aside>
      </div>
    </form>

    <section className="rq-expert-strip">
      <img src={theme.expert} alt="" />
      <div><h2>Need Help? Talk to Our Expert</h2><p>Get free consultation and personalized guidance for your requirement.</p></div>
      <a href={phone ? `tel:${phone.replace(/\s/g,'')}` : '#rq-basic'}><Icon name="phone" size={19}/> {phone || 'Start Free Consultation'}</a>
    </section>

    <footer className="rq-premium-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse" /><p>Your customer starting point for construction, interiors and real estate requirements.</p></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/build">Construction</Link><Link to="/design">Interiors</Link><Link to="/property">Real Estate</Link></div>
      <div><b>Our Services</b><Link to="/construction-estimator">Cost Estimator</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link></div>
      <div><b>Support</b><Link to="/contact?audience=users">FAQ</Link><Link to="/contact?audience=users">Contact Us</Link><Link to="/contact?audience=users">Privacy Policy</Link></div>
      <div><b>Contact</b>{phone && <span>{phone}</span>}{email && <span>{email}</span>}<span>{[flow.industryName, flow.serviceName].filter(Boolean).join(' · ') || flow.name}</span><small>Building Spaces, Elevating Lives.</small></div>
    </footer>
  </main>
}
