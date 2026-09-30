import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { isEmptyAnswer, isQuestionVisible } from '../components/CustomerFlowQuestion'
import InteriorRequirementExact from '../components/InteriorRequirementExact'
import RealEstateRequirementExact from '../components/RealEstateRequirementExact'
import QuoteLocationFields from '../components/QuoteLocationFields'
import { downloadRequirementQuotePdf } from '../utils/requirementQuotePdf'
import { calculateRequirementQuotation } from '../utils/customerQuotation'
import './RequirementWizard.css'

const CONSTRUCTION_FLOORS = [
  { value: '1', label: 'Ground Floor' },
  { value: '2', label: 'G+1' },
  { value: '3', label: 'G+2' },
  { value: '4', label: 'G+3' },
  { value: '5', label: 'Above G+3' },
]

function constructionFloorLabel(value) {
  return CONSTRUCTION_FLOORS.find(option => option.value === String(value))?.label || String(value ?? '')
}

const emptyContact = { name: '', phone: '', email: '' }

const THEMES = {
  build: {
    eyebrow: 'HOME CONSTRUCTION',
    line1: 'Let’s Build',
    line2: 'Your Dream Home',
    intro: 'Tell us your project details to generate a structured construction quotation with cost range, specifications and milestone schedule.',
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
  if (question.questionKey === 'floors') return constructionFloorLabel(value)
  if (question.questionKey === 'plot_area') return String(value) + ' sq yards'
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

  if (question.questionKey === 'floors') {
    return <select className="rq-floor-select" value={value ?? ''} onChange={event => onChange(event.target.value)}>
      <option value="">Select floors</option>
      {CONSTRUCTION_FLOORS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  }

  if (question.questionType === 'number' || question.questionType === 'area') {
    const areaUnit = question.questionKey === 'plot_area' ? 'sq yards' : 'sq ft'
    return <div className="rq-number-wrap"><input type="number" min={question.validation?.min} max={question.validation?.max} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={question.questionKey === 'plot_area' ? 'Enter plot area' : question.questionType === 'area' ? 'Enter area' : 'Enter number'} />{question.questionType === 'area' && <span>{areaUnit}</span>}</div>
  }

  return <input className="rq-basic-input" value={value || ''} maxLength={Number(question.validation?.maxLength || 240)} onChange={event => onChange(event.target.value)} placeholder={question.questionType === 'budget' ? 'Example: ₹25–40 lakh' : 'Enter your answer'} />
}

export default function RequirementWizard({ flowKey }) {
  const [flow, setFlow] = useState(null)
  const [cities, setCities] = useState([])
  const [contactData, setContactData] = useState({})
  const [answers, setAnswers] = useState({})
  const [cityId, setCityId] = useState('')
  const [locationStateId, setLocationStateId] = useState('')
  const [pinLookup, setPinLookup] = useState({ status: '', message: '' })
  const pinLookupRequest = useRef(0)
  const [contact, setContact] = useState(emptyContact)
  const [website, setWebsite] = useState('')
  const [submissionKey, setSubmissionKey] = useState(makeSubmissionKey)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [state, setState] = useState({ loading: true, saving: false, error: '', success: false })
  const mounted = useRef(true)
  const theme = THEMES[flowKey] || THEMES.build
  const isQuotationFlow = flowKey === 'build'

  useEffect(() => {
    mounted.current = true
    setSubmissionResult(null)
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
      let initialSubmissionKey = makeSubmissionKey()

      try {
        const saved = JSON.parse(sessionStorage.getItem('propulse_intake_prefill') || 'null')
        const recent = saved && Date.now() - Number(saved.createdAt || 0) < 60 * 60 * 1000
        if (recent && saved.flowKey === flowKey) {
          const flowQuestions = data.questions || []
          const locationQuestion = flowQuestions.find(item => item.questionType === 'location')
          if (locationQuestion && /^\d{6}$/.test(String(saved.pincode || ''))) {
            initialAnswers[locationQuestion.questionKey] = String(saved.pincode)
          }
          if (saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers)) {
            const allowedKeys = new Set(flowQuestions.map(item => item.questionKey))
            Object.entries(saved.answers).forEach(([key, value]) => {
              if (allowedKeys.has(key) && value !== undefined && value !== null && value !== '') initialAnswers[key] = value
            })
          }
          initialContact = { name: String(saved.name || ''), phone: String(saved.phone || ''), email: String(saved.email || '') }
          initialCityId = saved.cityId ? String(saved.cityId) : ''
          if (/^[A-Za-z0-9_-]{16,100}$/.test(String(saved.submissionKey || ''))) initialSubmissionKey = String(saved.submissionKey)
          if (!initialCityId && saved.pincode) {
            const matched = loadedCities.find(city => (city.pincodes || []).some(item => String(typeof item === 'string' ? item : item?.pincode) === String(saved.pincode)))
            if (matched) initialCityId = String(matched.id)
          }
          sessionStorage.removeItem('propulse_intake_prefill')
        }
      } catch {}

      if (flowKey === 'build') {
        const packageParam = String(new URLSearchParams(window.location.search).get('package') || '').toLowerCase()
        const qualityByPackage = { standard: 'standard', premium: 'premium', royal: 'luxury' }
        if (qualityByPackage[packageParam]) initialAnswers.quality = qualityByPackage[packageParam]
      }

      const initialCity = loadedCities.find(city => String(city.id) === String(initialCityId))
      setAnswers(initialAnswers)
      setContact(initialContact)
      setCityId(initialCityId)
      setLocationStateId(initialCity?.state_id ? String(initialCity.state_id) : '')
      setPinLookup({ status: '', message: '' })
      setSubmissionKey(initialSubmissionKey)
      setState({ loading: false, saving: false, error: '', success: false })
    }).catch(error => mounted.current && setState({ loading: false, saving: false, error: error.message, success: false }))

    return () => { mounted.current = false }
  }, [flowKey])

  const questions = useMemo(() => (flow?.questions || []).filter(question => isQuestionVisible(question, answers)), [flow, answers])
  const byKey = useMemo(() => Object.fromEntries(questions.map(question => [question.questionKey, question])), [questions])
  const locationQuestion = questions.find(question => question.questionType === 'location')
  const selectedCity = useMemo(() => cities.find(city => String(city.id) === String(cityId)), [cities, cityId])
  const locationStates = useMemo(() => {
    const map = new Map()
    cities.forEach(city => {
      const id = city?.state_id
      const name = city?.state_name
      if (id && name && !map.has(String(id))) map.set(String(id), { id: String(id), name })
    })
    return [...map.values()].sort((a,b) => String(a.name).localeCompare(String(b.name)))
  }, [cities])

  const propertyQuestions = questions.filter(question => ['project_type', 'own_plot', 'property_type', 'property_intent', 'bhk', 'property_status', 'possession_status'].includes(question.questionKey))
  const configQuestions = questions.filter(question => ['plot_area', 'built_up_area', 'area', 'floors'].includes(question.questionKey))
  const preferenceQuestions = questions.filter(question => ['construction_scope', 'quality', 'budget', 'timeline', 'interior_scope', 'kitchen', 'wardrobes', 'false_ceiling', 'furniture', 'finish_quality'].includes(question.questionKey))
  const additionalQuestion = questions.find(question => question.questionKey === 'additional_requirement')
  const usedKeys = new Set([locationQuestion?.questionKey, ...propertyQuestions.map(q => q.questionKey), ...configQuestions.map(q => q.questionKey), ...preferenceQuestions.map(q => q.questionKey), additionalQuestion?.questionKey].filter(Boolean))
  const extraQuestions = questions.filter(question => !usedKeys.has(question.questionKey))

  const locationRequiredCount = locationQuestion ? 1 : 0
  const requiredTotal = questions.filter(question => question.isRequired).length + 2 + locationRequiredCount
  const requiredDone = questions.filter(question => question.isRequired && !isEmptyAnswer(answers[question.questionKey])).length
    + (contact.name.trim() ? 1 : 0)
    + (/^[6-9]\d{9}$/.test(contact.phone.replace(/\D/g, '')) ? 1 : 0)
    + (locationQuestion && cityId ? 1 : 0)
  const completion = requiredTotal ? Math.round(requiredDone / requiredTotal * 100) : 0

  function setAnswer(key, value) {
    setAnswers(current => ({ ...current, [key]: value }))
    setState(current => ({ ...current, error: '' }))
  }

  function setLocationState(value) {
    setLocationStateId(value)
    const currentCity = cities.find(item => String(item.id) === String(cityId))
    if (!currentCity || String(currentCity.state_id) !== String(value)) setCityId('')
    if (locationQuestion) setAnswers(current => ({ ...current, [locationQuestion.questionKey]: '' }))
    pinLookupRequest.current += 1
    setPinLookup({ status: '', message: '' })
    setState(current => ({ ...current, error: '' }))
  }

  function setCity(value) {
    const city = cities.find(item => String(item.id) === String(value))
    setCityId(value)
    if (city?.state_id) setLocationStateId(String(city.state_id))
    setState(current => ({ ...current, error: '' }))
  }

  function applyDetectedLocation(data, pin) {
    if (!data) return
    if (data.stateId) setLocationStateId(String(data.stateId))
    if (data.cityId) setCityId(String(data.cityId))
    const location = [data.cityName, data.stateName].filter(Boolean).join(', ')
    if (data.cityId) {
      setPinLookup({ status: 'matched', message: location ? `Detected: ${location}` : 'PIN matched to a supported city.' })
    } else if (data.stateId || data.stateName) {
      setPinLookup({ status: 'state', message: `State detected${data.stateName ? ': ' + data.stateName : ''}. Type your city to continue.` })
    } else {
      setPinLookup({ status: 'error', message: 'We could not match this PIN automatically. Type your city name below.' })
    }
    if (locationQuestion && pin) setAnswers(current => ({ ...current, [locationQuestion.questionKey]: pin }))
  }

  function setPincode(value) {
    if (!locationQuestion) return
    const pin = String(value || '').replace(/\D/g, '').slice(0, 6)
    setAnswer(locationQuestion.questionKey, pin)
    const requestId = ++pinLookupRequest.current

    if (pin.length < 6) {
      setPinLookup({ status: '', message: '' })
      return
    }

    const mappedCities = cities.filter(city => (city?.pincodes || []).some(item => String(typeof item === 'string' ? item : item?.pincode || '') === pin))
    if (mappedCities.length === 1) {
      const city = mappedCities[0]
      applyDetectedLocation({
        stateId: city.state_id,
        stateName: city.state_name,
        cityId: city.id,
        cityName: city.name,
      }, pin)
      return
    }

    setPinLookup({ status: 'checking', message: 'Detecting state and city from PIN…' })
    publicRequest('/pincodes/location/' + encodeURIComponent(pin))
      .then(data => {
        if (requestId !== pinLookupRequest.current) return
        applyDetectedLocation(data, pin)
      })
      .catch(() => {
        if (requestId !== pinLookupRequest.current) return
        setPinLookup({ status: 'error', message: 'PIN could not be detected automatically. Type your city name below.' })
      })
  }

  function jump(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

    if (locationQuestion && !cityId) {
      setState(current => ({ ...current, error: 'Enter a valid 6-digit PIN to auto-detect the city, or type and choose a supported city.' }))
      jump('rq-basic')
      return
    }

    const phone = contact.phone.replace(/\D/g, '')
    if (!contact.name.trim() || !/^[6-9]\d{9}$/.test(phone)) {
      setState(current => ({ ...current, error: 'Enter your name and a valid 10-digit mobile number.' }))
      jump('rq-basic')
      return
    }
    try {
      setState(current => ({ ...current, saving: true, error: '' }))

      if (isQuotationFlow) {
        const scope = Array.isArray(answers.construction_scope) ? answers.construction_scope : []
        if (!scope.some(item => ['turnkey','civil_structure','finishing'].includes(item))) {
          throw new Error('Select Turnkey construction, Civil / structure, or Finishing work so we can calculate the quotation.')
        }
        if (!answers.built_up_area) {
          throw new Error('Enter the planned total built-up area to generate the construction quotation.')
        }
      }

      const quotation = isQuotationFlow
        ? await calculateRequirementQuotation({ flowKey, answers, publicRequest })
        : null

      const result = await publicRequest('/customer-flows/' + flowKey + '/submit', {
        method: 'POST',
        body: JSON.stringify({ flowToken: flow.flowToken, answers, contact: { ...contact, phone }, consent: true, submissionKey, website })
      })
      setSubmissionResult({ ...(result || {}), quotation })
      setState({ loading: false, saving: false, error: '', success: true })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setState(current => ({ ...current, saving: false, error: error.message }))
    }
  }

  async function downloadQuoteRequest() {
    const pincode = locationQuestion ? fieldLabel(locationQuestion, answers) : ''
    const rows = questions
      .filter(question => question.questionKey !== locationQuestion?.questionKey)
      .map(question => [question.label.replace(/\?$/,''), fieldLabel(question, answers)])
      .filter(([, value]) => value && value !== '—')

    await downloadRequirementQuotePdf({
      flowName: flow?.name || theme.eyebrow,
      flowKey,
      leadId: submissionResult?.leadId,
      customerName: contact.name,
      phone: contact.phone,
      email: contact.email,
      city: selectedCity?.name || '',
      pincode,
      rows,
      quotation: submissionResult?.quotation || null,
    })
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading your requirement form…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This requirement form is unavailable.'}<Link to="/">Back home</Link></div></main>

  if (state.success) {
    const quotation = submissionResult?.quotation
    return <main className="rq-page rq-premium-page">
      <header className="rq-premium-header"><Link to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link><Link to="/">Back to Home</Link></header>
      <div className="rq-success rq-premium-success">
        <div className="rq-success-mark">✓</div>
        <span>{quotation ? 'QUOTATION GENERATED' : 'REQUEST RECEIVED'}</span>
        <h1>{quotation ? 'Your detailed quotation is ready.' : 'Your requirement is ready.'}</h1>
        <p>{quotation
          ? 'Your project requirement has been saved and priced using the current ProPulse planning-rate configuration. Download the detailed quotation with cost breakdown, package specifications, payment milestones, exclusions and terms.'
          : 'We saved your structured requirement. Download a PDF copy for your records.'}</p>
        {quotation && <div className="rq-quotation-result">
          <div><small>Estimated project cost</small><strong>{quotation.minimumText}</strong><i>to</i><strong>{quotation.maximumText}</strong></div>
          <span>{quotation.effectiveRateText} · {quotation.project?.constructionPackage} · {quotation.project?.quality}</span>
        </div>}
        {submissionResult?.leadId && <div className="rq-success-reference">Request ID <b>#{submissionResult.leadId}</b></div>}
        <div className="rq-success-actions">
          <button className="rq-download-quote" type="button" onClick={downloadQuoteRequest}>↓ {quotation ? 'Download Detailed Quotation PDF' : 'Download Requirement PDF'}</button>
          <Link className="rq-back-home" to="/">Back home</Link>
          <button type="button" onClick={() => window.location.reload()}>{quotation ? 'Create another quotation' : 'Post another requirement'}</button>
        </div>
        {quotation && <small className="rq-quotation-disclaimer">Indicative quotation only. Final contractor price is confirmed after site inspection, drawings, measurements, selected brands, taxes and detailed commercial review.</small>}
      </div>
    </main>
  }

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  if (flowKey === 'design') {
    return <InteriorRequirementExact
      flow={flow}
      questions={questions}
      answers={answers}
      setAnswer={setAnswer}
      cities={cities}
      locationStates={locationStates}
      locationStateId={locationStateId}
      setLocationState={setLocationState}
      cityId={cityId}
      setCity={setCity}
      setPincode={setPincode}
      pinLookup={pinLookup}
      locationQuestion={locationQuestion}
      contact={contact}
      setContact={setContact}
      state={state}
      submit={submit}
      contactData={contactData}
      completion={completion}
    />
  }

  if (flowKey === 'property') {
    return <RealEstateRequirementExact
      flow={flow}
      questions={questions}
      answers={answers}
      setAnswer={setAnswer}
      cities={cities}
      locationStates={locationStates}
      locationStateId={locationStateId}
      setLocationState={setLocationState}
      cityId={cityId}
      setCity={setCity}
      setPincode={setPincode}
      pinLookup={pinLookup}
      locationQuestion={locationQuestion}
      contact={contact}
      setContact={setContact}
      state={state}
      submit={submit}
      contactData={contactData}
      completion={completion}
    />
  }

  const summaryRows = [
    ['Location', [selectedCity?.name, selectedCity?.state_name].filter(Boolean).join(', ') || '—'],
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
        <Link className={flowKey === 'build' ? 'active' : ''} to="/quote#construction">Construction</Link>
        <Link className={flowKey === 'design' ? 'active' : ''} to="/quote#interiors">Interiors</Link>
        <Link to="/packages">Packages</Link>
        <Link className={flowKey === 'property' ? 'active' : ''} to="/quote#property">Real Estate</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/#contact">Contact</Link>
      </nav>
      <button onClick={() => jump('rq-basic')}>{isQuotationFlow ? 'Get Free Quotation' : 'Get Free Consultation'} <Icon name="arrow" size={15} /></button>
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
        <article><Icon name="receipt" /><div><b>{isQuotationFlow ? 'Detailed Quotation' : 'Transparent Estimates'}</b><small>{isQuotationFlow ? 'Cost + specifications' : 'Compare actual options'}</small></div></article>
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
        ['rq-summary','4',isQuotationFlow ? 'Generate Quotation' : 'Review & Submit',isQuotationFlow ? 'Calculate and download' : 'Confirm and connect'],
      ].map(([id, number, title, text], index) => <button key={id} onClick={() => jump(id)} className={completion >= [1,35,65,90][index] ? 'done' : index === 0 ? 'active' : ''}>
        <span>{completion >= [35,65,90,100][index] ? '✓' : number}</span><div><b>{title}</b><small>{text}</small></div>{index < 3 && <i><Icon name="arrow" size={14}/></i>}
      </button>)}
    </div>

    <form className="rq-premium-form" onSubmit={submit}>
      <section className="rq-form-row basic-row" id="rq-basic">
        <div className="rq-section-card">
          <div className="rq-section-heading"><strong>1.</strong><div><h2>Basic Details</h2><p>Let’s start with the essential project and contact information.</p></div></div>
          <div className="rq-basic-grid">
            <QuoteLocationFields
              cities={cities}
              cityId={cityId}
              onCityChange={setCity}
              pincode={locationQuestion ? answers[locationQuestion.questionKey] || '' : ''}
              onPincodeChange={setPincode}
              lookupStatus={pinLookup.status}
              lookupMessage={pinLookup.message}
              cityLabel="Project City / Location"
            />
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
          <div className="rq-summary-progress"><span>{isQuotationFlow ? 'Quotation progress' : 'Requirement progress'}</span><b>{completion}%</b><i><em style={{ width: completion + '%' }} /></i></div>
          <h3>{isQuotationFlow ? 'Quotation Input Summary' : 'Your Selection Summary'}</h3>
          <div className="rq-summary-list">
            {summaryRows.map(([label,value]) => <div key={label}><span>{label}</span><b title={value}>{value}</b></div>)}
          </div>
          <p className="rq-submit-consent">By submitting, you agree that ProPulse may use your project and contact details to process this request and connect you with relevant professionals.</p>
          <label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
          {state.error && <div className="rq-error">{state.error}</div>}
          <button className="rq-submit" type="submit" disabled={state.saving}>{state.saving ? (isQuotationFlow ? 'Calculating quotation…' : 'Submitting…') : (isQuotationFlow ? 'Generate Detailed Quotation' : (flow.config?.submitLabel || 'Submit Requirement'))} <Icon name="arrow" size={15}/></button>
          <small className="rq-submit-note">{isQuotationFlow ? 'No OTP required. Pricing is calculated from Admin-configured rates and your submitted project details.' : 'No OTP required. Your request becomes a lead only after successful submission.'}</small>
        </aside>
      </div>
    </form>

    <section className="rq-expert-strip">
      <img src={theme.expert} alt="" />
      <div><h2>Need Help? Talk to Our Expert</h2><p>{isQuotationFlow ? 'Need help with built-up area, package or specifications? We can help before you generate the quotation.' : 'Get free consultation and personalized guidance for your requirement.'}</p></div>
      <a href={phone ? `tel:${phone.replace(/\s/g,'')}` : '#rq-basic'}><Icon name="phone" size={19}/> {phone || 'Start Free Consultation'}</a>
    </section>

    <footer className="rq-premium-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse" /><p>Your customer starting point for construction, interiors and real estate requirements.</p></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link></div>
      <div><b>Our Services</b><Link to="/construction-estimator">Cost Estimator</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link></div>
      <div><b>Support</b><Link to="/contact?audience=users">FAQ</Link><Link to="/contact?audience=users">Contact Us</Link><Link to="/contact?audience=users">Privacy Policy</Link></div>
      <div><b>Contact</b>{phone && <span>{phone}</span>}{email && <span>{email}</span>}<span>{[flow.industryName, flow.serviceName].filter(Boolean).join(' · ') || flow.name}</span><small>Building Spaces, Elevating Lives.</small></div>
    </footer>
  </main>
}
