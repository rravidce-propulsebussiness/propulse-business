import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { isEmptyAnswer, isQuestionVisible } from '../components/customerFlowQuestionUtils'
import InteriorRequirementExact from '../components/InteriorRequirementExact'
import RealEstateRequirementExact from '../components/RealEstateRequirementExact'
import QuoteLocationFields from '../components/QuoteLocationFields'
import { createDetailedQuotationPdfDataUrl, downloadConstructionBrochurePdf, downloadInteriorBrochurePdf, downloadRequirementQuotePdf } from '../utils/requirementQuotePdf'
import { calculateRequirementQuotation } from '../utils/customerQuotation'
import { getInteriorPackage } from '../data/interiorPackageCatalog'
import './RequirementWizard.css'

const CONSTRUCTION_FLOORS = [
  { value: '1', label: 'Ground Floor' },
  { value: '2', label: 'G+1' },
  { value: '3', label: 'G+2' },
  { value: '4', label: 'G+3' },
  { value: '5', label: 'Above G+3' },
]

const CONSTRUCTION_BUDGET_OPTIONS = [
  { value: 'under_25_lakh', label: 'Below ₹25 lakh' },
  { value: '25_50_lakh', label: '₹25–50 lakh' },
  { value: '50_lakh_1_cr', label: '₹50 lakh–₹1 crore' },
  { value: 'above_1_cr', label: 'Above ₹1 crore' },
]

const LEGACY_PLOT_AREA_ESTIMATE_YARDS = {
  under_100: 90,
  '100_200': 150,
  above_200: 250,
}

function plotAreaSqYards(value) {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  return LEGACY_PLOT_AREA_ESTIMATE_YARDS[String(value || '')] || 0
}

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

function fileToDataUrl(file) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>resolve(String(reader.result||''))
    reader.onerror=()=>reject(reader.error||new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
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
  if (question.questionKey === 'plot_area') {
    const yards = plotAreaSqYards(value)
    return yards ? String(yards) + ' sq yards' : '—'
  }
  if (question.questionKey === 'budget') {
    return question.options?.find(option => option.value === value)?.label
      || CONSTRUCTION_BUDGET_OPTIONS.find(option => option.value === value)?.label
      || String(value)
  }
  return question.options?.find(option => option.value === value)?.label || String(value)
}

function PremiumQuestion({ question, value, onChange, visual = 'default' }) {
  if (!question) return null
  const options = question.options || []

  if (question.questionKey === 'plot_area') {
    const numericValue = Number.isFinite(Number(value)) && Number(value) > 0 ? value : ''
    return <div className="rq-number-wrap"><input type="number" min={10} max={100000} value={numericValue} onChange={event => onChange(event.target.value)} placeholder="Enter plot area" /><span>sq yards</span></div>
  }

  if (question.questionKey === 'budget' && visual === 'budget-dropdown') {
    const budgetOptions = options.length ? options : CONSTRUCTION_BUDGET_OPTIONS
    return <select className="rq-floor-select rq-budget-select" value={value ?? ''} onChange={event => onChange(event.target.value)}>
      <option value="">Select budget range</option>
      {budgetOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  }

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

export default function RequirementWizard({ flowKey, onCompletionChange, embedded = false, projectQuote = null }) {
  const [flow, setFlow] = useState(null)
  const [cities, setCities] = useState([])
  const [contactData, setContactData] = useState({})
  const [answers, setAnswers] = useState({})
  const [cityId, setCityId] = useState('')
  const [locationStateId, setLocationStateId] = useState('')
  const [pinLookup, setPinLookup] = useState({ status: '', message: '' })
  const pinLookupRequest = useRef(0)
  const autoBuiltUpRef = useRef('')
  const [contact, setContact] = useState(emptyContact)
  const [website, setWebsite] = useState('')
  const [submissionKey, setSubmissionKey] = useState(makeSubmissionKey)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [state, setState] = useState({ loading: true, saving: false, error: '', success: false })
  const mounted = useRef(true)
  const onCompletionChangeRef = useRef(onCompletionChange)
  const theme = THEMES[flowKey] || THEMES.build
  const isQuotationFlow = flowKey === 'build'

  useEffect(()=>{onCompletionChangeRef.current=onCompletionChange},[onCompletionChange])

  useEffect(() => {
    mounted.current = true
    onCompletionChangeRef.current?.(false)
    queueMicrotask(()=>{
      if(!mounted.current)return
      setSubmissionResult(null)
      setState({ loading: true, saving: false, error: '', success: false })
    })

    Promise.all([publicRequest('/customer-flows/' + flowKey), publicRequest('/cities').catch(() => []), publicRequest('/contact?audience=website').catch(() => ({}))]).then(([data, cityData, websiteContact]) => {
      if (data?.unavailable) throw new Error(data.message || 'This requirement form is temporarily unavailable. Please try again shortly.')
      if (data?.flowType !== 'requirement') throw new Error('This requirement form is not available.')
      if (!mounted.current) return

      const loadedCities = [...new Map(collection(cityData).map(city => [String(city.id), city])).values()]
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

      const packageParam = String(new URLSearchParams(window.location.search).get('package') || '').toLowerCase()
      if (flowKey === 'build') {
        const qualityByPackage = { standard: 'standard', premium: 'premium', royal: 'luxury' }
        if (qualityByPackage[packageParam]) initialAnswers.quality = qualityByPackage[packageParam]
        // Older saved/configured construction flows may use property_type while the
        // current visible card uses project_type. Keep one canonical answer.
        if (!initialAnswers.project_type && initialAnswers.property_type) {
          initialAnswers.project_type = initialAnswers.property_type
        }
      }
      if (flowKey === 'design' && ['standard','premium'].includes(packageParam)) {
        initialAnswers.finish_quality = packageParam
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

  const professionalQuoteMode=Boolean(projectQuote)
  const questions = useMemo(() => (flow?.questions || [])
    .map(question => flowKey === 'build' && question.questionKey === 'property_type' && !(flow?.questions || []).some(item => item.questionKey === 'project_type')
      ? { ...question, questionKey: 'project_type' } : question)
    .filter(question => isQuestionVisible(question, answers))
    // Professional plans replace the catalog quality/package question in every industry.
    .filter(question => !(professionalQuoteMode && ['quality','finish_quality'].includes(question.questionKey)))
    .filter(question => !(flowKey === 'build' && ['property_type','construction_scope','basement'].includes(question.questionKey)))
    .filter(question => !(flowKey === 'design' && ['area','rooms','property_status','possession_status','kitchen','wardrobes','false_ceiling','furniture'].includes(question.questionKey))), [flow, answers, flowKey, professionalQuoteMode])
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

  const ownPlotQuestion = flowKey === 'build' ? questions.find(question => question.questionKey === 'own_plot') : null
  const propertyQuestions = questions.filter(question => ['project_type', 'property_intent', 'bhk', 'property_status', 'possession_status'].includes(question.questionKey))
  const propertyTypeQuestion = flowKey === 'build'
    ? (questions.find(question => question.questionKey === 'project_type') || questions.find(question => question.questionKey === 'property_type'))
    : null
  const propertyTypeAnswer = propertyTypeQuestion
    ? (answers[propertyTypeQuestion.questionKey] ?? answers.project_type ?? answers.property_type)
    : undefined
  const builtUpQuestion = flowKey === 'build'
    ? (questions.find(question => question.questionKey === 'built_up_area') || {
        id: 'derived-built-up-area',
        questionKey: 'built_up_area',
        questionType: 'area',
        label: 'Planned total built-up area',
        helpText: 'Auto-calculated from plot area and floors. You can edit this value.',
        isRequired: true,
        validation: { min: 50, max: 1000000 },
        options: [],
      })
    : null
  const configQuestions = flowKey === 'build'
    ? [
        questions.find(question => question.questionKey === 'plot_area'),
        questions.find(question => question.questionKey === 'floors'),
        questions.find(question => question.questionKey === 'site_access'),
      ].filter(Boolean)
    : questions.filter(question => question.questionKey === 'area')
  const preferenceQuestions = questions.filter(question => ['quality', 'budget', 'timeline', 'interior_scope', 'kitchen', 'wardrobes', 'false_ceiling', 'furniture', 'finish_quality'].includes(question.questionKey))
  const additionalQuestion = questions.find(question => question.questionKey === 'additional_requirement')
  const usedKeys = new Set([locationQuestion?.questionKey, ownPlotQuestion?.questionKey, builtUpQuestion?.questionKey, ...propertyQuestions.map(q => q.questionKey), ...configQuestions.map(q => q.questionKey), ...preferenceQuestions.map(q => q.questionKey), additionalQuestion?.questionKey].filter(Boolean))
  const extraQuestions = questions.filter(question => !usedKeys.has(question.questionKey))

  const locationRequiredCount = locationQuestion ? 1 : 0
  const requiredTotal = questions.filter(question => question.isRequired).length + 2 + locationRequiredCount
  const requiredDone = questions.filter(question => question.isRequired && !isEmptyAnswer(answers[question.questionKey])).length
    + (contact.name.trim() ? 1 : 0)
    + (/^[6-9]\d{9}$/.test(contact.phone.replace(/\D/g, '')) ? 1 : 0)
    + (locationQuestion && cityId ? 1 : 0)
  const completion = requiredTotal ? Math.round(requiredDone / requiredTotal * 100) : 0

  function setAnswer(key, value) {
    setAnswers(current => {
      if (flowKey === 'build' && (key === 'project_type' || key === 'property_type')) {
        return { ...current, project_type: value, property_type: value }
      }
      return { ...current, [key]: value }
    })
    setState(current => ({ ...current, error: '' }))
  }

  useEffect(() => {
    if (flowKey !== 'build') return
    const plotYards = plotAreaSqYards(answers.plot_area)
    const floorCount = Number(answers.floors)
    if (!plotYards || !Number.isFinite(floorCount) || floorCount < 1) return

    const calculated = String(Math.round(plotYards * 9 * floorCount))
    const current = String(answers.built_up_area ?? '')
    if(current===calculated){
      autoBuiltUpRef.current=calculated
      return
    }
    if (!current || current === String(autoBuiltUpRef.current || '')) {
      autoBuiltUpRef.current = calculated
      setAnswers(previous => ({ ...previous, built_up_area: calculated }))
    }
  }, [flowKey, answers.plot_area, answers.floors, answers.built_up_area])

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

  function applyDeviceLocation(data) {
    if (data?.error) {
      setPinLookup({ status: 'error', message: data.error })
      return
    }
    const pin = String(data?.pincode || '').replace(/\D/g, '').slice(0, 6)
    if (pin && locationQuestion) setAnswers(current => ({ ...current, [locationQuestion.questionKey]: pin }))
    if (data?.stateId) setLocationStateId(String(data.stateId))
    if (data?.cityId) setCityId(String(data.cityId))

    if (data?.cityId) {
      const label = [data.localityName, data.cityName, data.stateName].filter(Boolean).join(', ')
      setPinLookup({ status: 'matched', message: label ? 'Current location: ' + label : 'Current location detected.' })
      return
    }

    setPinLookup({
      status: data?.stateId || data?.stateName ? 'state' : 'error',
      message: data?.stateId || data?.stateName
        ? 'Current location detected' + (data.stateName ? ': ' + data.stateName : '') + '. Select the city to continue.'
        : 'Current location detected, but no supported city match was found.',
    })
  }

  function jump(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function uploadInteriorReferences(files,leadId) {
    if(flowKey!=='design'||!leadId||!Array.isArray(files)||!files.length)return{referenceFilesUploaded:0,referenceFilesFailed:0}
    let uploaded=0
    let failed=0
    for(const file of files.slice(0,8)){
      try{
        const dataUrl=await fileToDataUrl(file)
        await publicRequest('/customer-flows/'+flowKey+'/'+leadId+'/attachments',{
          method:'POST',
          body:JSON.stringify({
            submissionKey,
            originalName:file.name,
            attachmentKey:[file.name,file.size,file.lastModified].join(':').slice(0,240),
            dataUrl,
          }),
          timeoutMs:45000,
        })
        uploaded+=1
      }catch(error){
        console.error('Reference upload failed:',error)
        failed+=1
      }
    }
    return{referenceFilesUploaded:uploaded,referenceFilesFailed:failed}
  }

  async function submit(event,referenceFiles=[]) {
    event.preventDefault()
    const missing = questions.find(question => {
      if (!question.isRequired) return false
      // A professional's service plans replace the catalog's Standard/Premium selector.
      if (projectQuote && question.questionKey === 'finish_quality') return false
      if (flowKey === 'build' && question.questionKey === 'property_type') return false
      if (
        flowKey === 'build'
        && ['project_type', 'property_type'].includes(question.questionKey)
        && !isEmptyAnswer(answers.project_type ?? answers.property_type ?? propertyTypeAnswer)
      ) return false
      return isEmptyAnswer(answers[question.questionKey])
    })
    if (missing) {
      setState(current => ({ ...current, error: `Please complete “${missing.label}”.` }))
      const target = missing.questionKey === 'built_up_area'
        ? 'rq-built-up'
        : missing.questionKey === 'own_plot' || ['plot_area','site_access','area','floors'].includes(missing.questionKey)
          ? 'rq-config'
          : ['project_type','property_intent','bhk','property_status','possession_status'].includes(missing.questionKey)
          ? 'rq-property'
          : missing.questionKey === 'additional_requirement' ? 'rq-additional' : 'rq-preferences'
      jump(target)
      return
    }

    if (locationQuestion && !cityId) {
      setState(current => ({ ...current, error: 'Enter a valid 6-digit PIN to auto-detect the city, or type and choose a supported city.' }))
      jump('rq-basic')
      return
    }

    if (projectQuote && projectQuote.preferredPackage && !(projectQuote.packages || []).some(plan => plan.title === projectQuote.preferredPackage)) {
      setState(current => ({ ...current, error: 'Choose one of this professional’s published packages to continue.' }))
      jump(flowKey==='design'?'irx-requirements':'professional-quote-package-title')
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

      if (projectQuote) {
        // Use the exact public requirements for each industry, but create only a
        // project-specific professional quotation request, not a marketplace lead.
        // This is an independently trackable quote lead linked to the professional.
        const detailRows = questions
          .filter(question => !['finish_quality', locationQuestion?.questionKey].includes(question.questionKey))
          .map(question => [question.label.replace(/\?$/, ''), fieldLabel(question, answers)])
          .filter(([, value]) => value && value !== '—')
          .map(([label, value]) => label + ': ' + value)
        const constructionBuiltUp = flowKey === 'build' && Number(answers.built_up_area) > 0
          ? String(answers.built_up_area).trim() + ' sq ft' : ''
        const areaQuestion = questions.find(question => question.questionKey === 'area')
        const budgetQuestion = questions.find(question => question.questionKey === 'budget')
        const sitePincode = locationQuestion ? fieldLabel(locationQuestion, answers) : ''
        const requirement = [
          'Reference project: ' + projectQuote.project.title,
          'Published professional: ' + (projectQuote.project.businessName || 'Selected business'),
          'Quotation industry: ' + (flowKey === 'build' ? 'Construction' : flowKey === 'design' ? 'Interior Design' : 'Real Estate'),
          ...(sitePincode && sitePincode !== '—' ? ['Site PIN code: ' + sitePincode] : []),
          ...(constructionBuiltUp && !questions.some(question => question.questionKey === 'built_up_area') ? ['Planned built-up area: ' + constructionBuiltUp] : []),
          ...detailRows,
        ].join('\n').slice(0, 3000)
        const result = await publicRequest('/experts/projects/' + encodeURIComponent(projectQuote.project.id) + '/quote-request', {
          method: 'POST',
          body: JSON.stringify({
            name: contact.name.trim(),
            phone,
            email: contact.email.trim(),
            requirement,
            siteLocation: [selectedCity?.name, selectedCity?.state_name].filter(Boolean).join(', '),
            area: (constructionBuiltUp || (areaQuestion ? fieldLabel(areaQuestion, answers) : '')).slice(0,120),
            budget: budgetQuestion ? fieldLabel(budgetQuestion, answers).slice(0,120) : '',
            preferredPackage: projectQuote.preferredPackage,
            consent: true,
            website,
          }),
        })
        setSubmissionResult(result)
        setState({ loading: false, saving: false, error: '', success: true })
        projectQuote.onSubmitted?.(result)
        onCompletionChangeRef.current?.(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      const quotation = isQuotationFlow && answers.built_up_area
        ? await calculateRequirementQuotation({ flowKey, answers, publicRequest })
        : null

      const submitAnswers = flowKey === 'build'
        ? {
            ...answers,
            // The construction UI uses project_type, while older backend flow
            // definitions validate property_type. Submit both keys consistently.
            project_type: answers.project_type || answers.property_type || '',
            property_type: answers.project_type || answers.property_type || '',
          }
        : answers
      const result = await publicRequest('/customer-flows/' + flowKey + '/submit', {
        method: 'POST',
        body: JSON.stringify({ flowToken: flow.flowToken, answers: submitAnswers, contact: { ...contact, phone }, consent: true, submissionKey, website })
      })
      const referenceUpload = await uploadInteriorReferences(referenceFiles,result?.leadId)
      if (flowKey === 'build' && quotation && contact.email && result?.leadId) {
        try {
          const quoteRows = questions.filter(question => question.questionKey !== locationQuestion?.questionKey)
            .map(question => [question.label.replace(/\?$/,''), fieldLabel(question, submitAnswers)])
            .filter(([,value]) => value && value !== '—')
          const pdfDataUrl = await createDetailedQuotationPdfDataUrl({
            quotation, flowName: flow?.name || theme.eyebrow, flowKey, leadId: result.leadId,
            customerName: contact.name, phone, email: contact.email, city: selectedCity?.name || '',
            pincode: locationQuestion ? fieldLabel(locationQuestion, submitAnswers) : '', rows: quoteRows,
          })
          await publicRequest('/customer-flows/' + flowKey + '/' + result.leadId + '/quotation-email', {
            method:'POST',
            body:JSON.stringify({ submissionKey, pdfDataUrl, packageName:quotation.project?.constructionPackage, total:quotation.totalText || quotation.minimumText })
          })
        } catch (emailError) { console.warn('Quotation email delivery failed:', emailError) }
      }
      setSubmissionResult({ ...(result || {}), quotation, ...referenceUpload })
      setState({ loading: false, saving: false, error: '', success: true })
      onCompletionChangeRef.current?.(true)
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

  async function downloadInteriorBrochure() {
    const packageKey = ['standard','premium'].includes(String(answers.finish_quality || '').toLowerCase())
      ? String(answers.finish_quality).toLowerCase()
      : 'standard'
    await downloadInteriorBrochurePdf({
      packageKey,
      requestId: submissionResult?.leadId,
      customerName: contact.name,
      city: [selectedCity?.name, selectedCity?.state_name].filter(Boolean).join(', '),
    })
  }

  if (state.loading) return <main className="rq-page"><div className="rq-shell rq-status">Loading your requirement form…</div></main>
  if (!flow) return <main className="rq-page"><div className="rq-shell rq-status error">{state.error || 'This requirement form is unavailable.'}<Link to="/">Back home</Link></div></main>

  if (state.success) {
    const quotation = submissionResult?.quotation
    if (flowKey === 'design') {
      const interiorPackage = getInteriorPackage(answers.finish_quality)
      return <main className="rq-page rq-premium-page">
        {!embedded && <header className="rq-premium-header"><Link to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link><Link to="/">Back to Home</Link></header>}
        <div className="rq-success rq-premium-success rq-interior-success">
          <div className="rq-success-mark">✓</div>
          <span>QUOTE REQUEST RECEIVED</span>
          <h1>Your interior quote request is submitted.</h1>
          <p>We saved your project requirements and package preference. Final pricing is confirmed only after the selected work, measurements, design, materials and site conditions are reviewed.</p>
          <div className="rq-interior-package-result">
            <small>SELECTED INTERIOR PACKAGE</small>
            <div><strong>{interiorPackage.name}</strong><b>₹{interiorPackage.price.toLocaleString('en-IN')}<em>/sq ft reference</em></b></div>
            <p>{interiorPackage.description}</p>
            <span>This is a package reference, not an instant project quotation.</span>
          </div>
          {submissionResult?.leadId && <div className="rq-success-reference">Request ID <b>#{submissionResult.leadId}</b></div>}
          {submissionResult?.referenceFilesUploaded>0&&<div className="rq-reference-upload-status">✓ {submissionResult.referenceFilesUploaded} floor plan / reference file{submissionResult.referenceFilesUploaded===1?'':'s'} attached to this request.</div>}
          {submissionResult?.referenceFilesFailed>0&&<div className="rq-reference-upload-status warning">Request saved, but {submissionResult.referenceFilesFailed} reference file{submissionResult.referenceFilesFailed===1?'':'s'} could not be uploaded.</div>}
          <div className="rq-success-actions">
            <button className="rq-download-quote" type="button" onClick={downloadInteriorBrochure}>↓ Download Interior Package Brochure</button>
            <Link className="rq-back-home" to="/">Back home</Link>
            <button type="button" onClick={() => window.location.reload()}>Request another quote</button>
          </div>
        </div>
      </main>
    }
    return <main className="rq-page rq-premium-page">
      {!embedded && <header className="rq-premium-header"><Link to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link><Link to="/">Back to Home</Link></header>}
      <div className="rq-success rq-premium-success">
        <div className="rq-success-mark">✓</div>
        <span>{quotation ? 'QUOTATION GENERATED' : 'REQUEST RECEIVED'}</span>
        <h1>{quotation ? 'Your detailed quotation is ready.' : 'Your requirement is ready.'}</h1>
        <p>{quotation
          ? 'Your project requirement has been saved and priced using the selected ProPulse package rate. Download the detailed quotation with exact package pricing, specifications, payment milestones, exclusions and terms.'
          : 'We saved your structured requirement. Download a PDF copy for your records.'}</p>
        {quotation && <div className="rq-quotation-result">
          <div>
            <small>{quotation.exactPricing ? 'Package quotation amount' : 'Estimated project cost'}</small>
            <strong>{quotation.totalText || quotation.minimumText}</strong>
          </div>
          <span>{quotation.packageRateText || quotation.effectiveRateText} · {quotation.project?.constructionPackage} · {quotation.project?.builtUpArea?.toLocaleString('en-IN')} sq ft</span>
        </div>}
        {submissionResult?.leadId && <div className="rq-success-reference">Request ID <b>#{submissionResult.leadId}</b></div>}
        <div className="rq-success-actions">
          <button className="rq-download-quote" type="button" onClick={downloadQuoteRequest}>↓ {quotation ? 'Download Detailed Quotation PDF' : 'Download Requirement PDF'}</button>
          {quotation && <button type="button" onClick={() => downloadConstructionBrochurePdf({quality:answers.quality,requestId:submissionResult?.leadId,customerName:contact.name,city:[selectedCity?.name,selectedCity?.state_name].filter(Boolean).join(', ')})}>↓ Download Selected Package Brochure</button>}
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
      embedded={embedded}
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
      onDetectedLocation={applyDeviceLocation}
      pinLookup={pinLookup}
      locationQuestion={locationQuestion}
      contact={contact}
      setContact={setContact}
      state={state}
      submit={submit}
      contactData={contactData}
      completion={completion}
      projectQuote={projectQuote}
    />
  }

  if (flowKey === 'property') {
    return <RealEstateRequirementExact
      embedded={embedded}
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
      onDetectedLocation={applyDeviceLocation}
      pinLookup={pinLookup}
      locationQuestion={locationQuestion}
      contact={contact}
      setContact={setContact}
      state={state}
      submit={submit}
      contactData={contactData}
      completion={completion}
      projectQuote={projectQuote}
    />
  }

  const summaryRows = [
    ...(projectQuote ? [['Professional package',projectQuote.preferredPackage||'—']] : []),
    ['Location', [selectedCity?.name, selectedCity?.state_name].filter(Boolean).join(', ') || '—'],
    ['PIN Code', locationQuestion ? fieldLabel(locationQuestion, answers) : '—'],
    ...propertyQuestions.slice(0, 2).map(q => [q.label.replace(/\?$/,''), fieldLabel(q, answers)]),
    ...configQuestions.slice(0, 2).map(q => [q.label.replace(/\?$/,''), fieldLabel(q, answers)]),
    ...preferenceQuestions.slice(0, 2).map(q => [q.label.replace(/\?$/,''), fieldLabel(q, answers)]),
  ]

  return <main className="rq-page rq-premium-page">
    {!embedded && <header className="rq-premium-header">
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
        <Link to="/contact">Contact</Link>
      </nav>
      <button onClick={() => jump('rq-basic')}>{isQuotationFlow ? 'Get Free Quotation' : 'Get Free Consultation'} <Icon name="arrow" size={15} /></button>
    </header>}

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
        <article><Icon name="receipt" /><div><b>{projectQuote ? 'Professional Quote' : isQuotationFlow ? 'Detailed Quotation' : 'Transparent Estimates'}</b><small>{projectQuote ? 'Your chosen expert' : isQuotationFlow ? 'Cost + specifications' : 'Compare actual options'}</small></div></article>
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

    <form className="rq-premium-form" onSubmit={submit}>
      <section className="rq-form-row basic-row" id="rq-basic">
        <div className="rq-section-card">
          <div className="rq-section-heading"><div><h2>Basic Details</h2></div></div>
          <div className="rq-basic-grid">
            <QuoteLocationFields
              states={locationStates}
              stateId={locationStateId}
              onStateChange={setLocationState}
              cities={cities}
              cityId={cityId}
              onCityChange={setCity}
              pincode={locationQuestion ? answers[locationQuestion.questionKey] || '' : ''}
              onPincodeChange={setPincode}
              onDetectedLocation={applyDeviceLocation}
              lookupStatus={pinLookup.status}
              lookupMessage={pinLookup.message}
              cityLabel="Project City / Location"
            />
            <label><span>Your Name</span><input value={contact.name} onChange={event => setContact({ ...contact, name: event.target.value })} autoComplete="name" placeholder="Enter your full name" /></label>
            <label><span>Mobile Number</span><div className="rq-phone-field"><b>+91</b><input value={contact.phone} onChange={event => setContact({ ...contact, phone: event.target.value.replace(/\D/g,'').slice(0,10) })} inputMode="tel" autoComplete="tel" placeholder="Enter 10-digit number" /></div></label>
            <label><span>Email <small>(Optional)</small></span><input type="email" value={contact.email} onChange={event => setContact({ ...contact, email: event.target.value })} autoComplete="email" placeholder="Enter your email" /></label>
          </div>
        </div>

        
      </section>

      <section className="rq-section-card" id="rq-config">
        <div className="rq-section-heading"><div><h2>Project Details</h2></div></div>
        <div className="rq-config-grid rq-config-grid-four">
          {ownPlotQuestion && <div className="rq-config-choice">
            <span>{ownPlotQuestion.label}</span>
            <PremiumQuestion question={ownPlotQuestion} value={answers[ownPlotQuestion.questionKey]} onChange={value => setAnswer(ownPlotQuestion.questionKey, value)} />
          </div>}
          {configQuestions.map(question => question.questionKey === 'site_access'
            ? <div className="rq-config-choice rq-site-access" key={question.id || question.questionKey}>
                <span>{question.label}</span>
                <PremiumQuestion question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} />
                {question.helpText && <small className="rq-config-help">{question.helpText}</small>}
              </div>
            : <label key={question.id || question.questionKey}><span>{question.label}</span><PremiumQuestion question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} /></label>)}
        </div>
      </section>

      <section className="rq-section-card" id="rq-property">
        <div className="rq-section-heading"><div><h2>Property Type</h2></div></div>
        <div className="rq-question-stack">
          {propertyQuestions.map((question, index) => <div className="rq-question-block" key={question.id || question.questionKey}>
            <div className="rq-question-label">{index === 0 ? null : <>{question.label && <b>{question.label}</b>}{question.helpText && <small>{question.helpText}</small>}</>}</div>
            <PremiumQuestion question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} visual={index === 0 ? 'image' : 'default'} />
          </div>)}
        </div>
      </section>

      <div className="rq-lower-grid">
        <div>
          <section className="rq-section-card" id="rq-preferences">
            <div className="rq-section-heading"><div><h2>Requirements & Preferences</h2></div></div>
            <div className="rq-question-stack">
              {[...preferenceQuestions, ...extraQuestions].map(question => <div className="rq-question-block" key={question.id || question.questionKey}>
                <div className="rq-question-label"><b>{question.label}</b>{question.helpText && <small>{question.helpText}</small>}</div>
                <PremiumQuestion question={question} value={answers[question.questionKey]} onChange={value => setAnswer(question.questionKey, value)} visual={flowKey === 'build' && question.questionKey === 'budget' ? 'budget-dropdown' : (question.questionKey === 'quality' || question.questionKey === 'finish_quality' ? 'image' : 'default')} />
              </div>)}
            </div>
          </section>

          {builtUpQuestion && <section className="rq-section-card rq-built-up-card" id="rq-built-up">
            <div className="rq-section-heading"><div><h2>Planned total built-up area</h2></div></div>
            <div className="rq-built-up-field">
              <PremiumQuestion question={builtUpQuestion} value={answers[builtUpQuestion.questionKey]} onChange={value => setAnswer(builtUpQuestion.questionKey, value)} />
            </div>
          </section>}

          {additionalQuestion&&<section className="rq-section-card" id="rq-additional">
            <div className="rq-section-heading"><div><h2>Additional Requirements</h2></div></div>
            <PremiumQuestion question={additionalQuestion} value={answers[additionalQuestion.questionKey]} onChange={value => setAnswer(additionalQuestion.questionKey, value)} />
          </section>}
        </div>

        <aside className="rq-summary-card" id="rq-summary">
          <div className="rq-summary-progress"><span>{isQuotationFlow ? 'Quotation progress' : 'Requirement progress'}</span><b>{completion}%</b><i><em style={{ width: completion + '%' }} /></i></div>
          <h3>{projectQuote?'Your Professional Quote Summary':isQuotationFlow && answers.built_up_area ? 'Quotation Input Summary' : 'Your Selection Summary'}</h3>
          <div className="rq-summary-list">
            {summaryRows.map(([label,value]) => <div key={label}><span>{label}</span><b title={value}>{value}</b></div>)}
          </div>
          <label className="rq-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
          {state.error && <div className="rq-error">{state.error}</div>}
          <button className="rq-submit" type="submit" disabled={state.saving}>{state.saving ? 'Submitting…' : projectQuote ? 'Request Professional Quote' : (isQuotationFlow && answers.built_up_area ? 'Generate Detailed Quotation' : (isQuotationFlow ? 'Get Free Quote' : (flow.config?.submitLabel || 'Submit Requirement')))} <Icon name="arrow" size={15}/></button>

        </aside>
      </div>
    </form>

    <section className="rq-expert-strip">
      <img src={theme.expert} alt="" />
      <div><h2>Need Help?</h2></div>
      <a href={phone ? `tel:${phone.replace(/\s/g,'')}` : '#rq-basic'}><Icon name="phone" size={19}/> {phone || 'Start Free Consultation'}</a>
    </section>

    {!embedded && <footer className="rq-premium-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse" /><p>Your customer starting point for construction, interiors and real estate requirements.</p></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link></div>
      <div><b>Our Services</b><Link to="/construction-estimator">Cost Estimator</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link></div>
      <div><b>Support</b><Link to="/faq">FAQ</Link><Link to="/contact">Contact Us</Link></div>
      <div><b>Contact</b>{phone && <span>{phone}</span>}{email && <span>{email}</span>}<span>{[flow.industryName, flow.serviceName].filter(Boolean).join(' · ') || flow.name}</span><small>Building Spaces, Elevating Lives.</small></div>
    </footer>}
  </main>
}
