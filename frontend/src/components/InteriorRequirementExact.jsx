import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isEmptyAnswer } from './customerFlowQuestionUtils'
import QuoteLocationFields from './QuoteLocationFields'
import { INTERIOR_PACKAGES } from '../data/interiorPackageCatalog'
import './InteriorRequirementExact.css'

const STYLE_IMAGES = {
  modern: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=88',
  minimalist: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=88',
  contemporary: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=88',
  traditional: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=88',
  luxury: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=88',
}
const WORK_ICONS = {
  modular_kitchen: 'kitchen',
  wardrobes: 'layout',
  tv_unit: 'layout',
  false_ceiling: 'spark',
  furniture: 'living',
  lighting: 'spark',
  painting: 'spark',
  pooja_unit: 'spark',
  study_unit: 'layout',
  crockery_unit: 'kitchen',
}

const INTERIOR_SCOPE_MODES = [
  { value: 'end_to_end', label: 'Full Home Interiors', detail: 'Complete interior planning for your home' },
  { value: 'selected_work', label: 'Select Specific Work', detail: 'Choose only the items you need' },
]

const FALLBACK_INTERIOR_WORK = [
  { value: 'modular_kitchen', label: 'Modular Kitchen' },
  { value: 'wardrobes', label: 'Wardrobes' },
  { value: 'tv_unit', label: 'TV Unit' },
  { value: 'false_ceiling', label: 'False Ceiling' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'painting', label: 'Painting / Wall Finish' },
  { value: 'pooja_unit', label: 'Pooja Unit' },
  { value: 'study_unit', label: 'Study Unit' },
  { value: 'crockery_unit', label: 'Crockery Unit' },
]

const FALLBACK_BHK_OPTIONS = [
  { value: '1_bhk', label: '1 BHK' },
  { value: '2_bhk', label: '2 BHK' },
  { value: '3_bhk', label: '3 BHK' },
  { value: '4_bhk', label: '4 BHK' },
  { value: '5_plus_bhk', label: '5+ BHK' },
]

const MAX_REFERENCE_FILES = 8
const MAX_REFERENCE_FILE_BYTES = 5 * 1024 * 1024
const REFERENCE_FILE_TYPES = new Set(['image/jpeg','image/png','image/webp','application/pdf'])
const HERO = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2100&q=92'
const PROMO = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=90'

function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'pin') return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'shield') return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'receipt') return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if (name === 'chat') return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
  if (name === 'support') return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'phone') return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (name === 'clock') return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  if (name === 'spark') return <svg {...p}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z"/></svg>
  if (name === 'layout') return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M9 10h12"/></svg>
  if (name === 'upload') return <svg {...p}><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 15v5h16v-5"/></svg>
  if (name === 'living') return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/></svg>
  if (name === 'bed') return <svg {...p}><path d="M3 18V7M21 18v-7H9a4 4 0 0 0-4 4v3"/><path d="M3 15h18M5 9h4v4H5z"/></svg>
  if (name === 'kitchen') return <svg {...p}><path d="M4 21V3h16v18"/><path d="M4 10h16M9 10v11M14 6h2"/></svg>
  if (name === 'bath') return <svg {...p}><path d="M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3Z"/><path d="M7 12V6a3 3 0 0 1 6 0"/></svg>
  if (name === 'dining') return <svg {...p}><path d="M4 10h16M7 10l-1 11M17 10l1 11M9 4v4M12 4v4M15 4v4"/></svg>
  return <svg {...p}><circle cx="12" cy="12" r="8"/></svg>
}

function answerLabel(question, value) {
  if (!question || isEmptyAnswer(value)) return '—'
  if (Array.isArray(value)) return value.map(v => question.options?.find(o => o.value === v)?.label || v).join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return question.options?.find(o => o.value === value)?.label || String(value)
}

function Chips({ question, value, onChange }) {
  if (!question) return null
  if (question.questionType === 'boolean') {
    return <div className="irx-chips">{[['Yes', true], ['No', false]].map(([label, v]) => <button type="button" key={label} className={value === v ? 'active' : ''} onClick={() => onChange(v)}>{label}</button>)}</div>
  }
  const multi = question.questionType === 'multi_select'
  const selected = multi && Array.isArray(value) ? value : []
  return <div className="irx-chips">{(question.options || []).map(option => {
    const active = multi ? selected.includes(option.value) : value === option.value
    return <button type="button" key={option.value} className={active ? 'active' : ''} onClick={() => onChange(multi ? (active ? selected.filter(v => v !== option.value) : [...selected, option.value]) : option.value)}>{active && <span>✓</span>}{option.label}</button>
  })}</div>
}

export default function InteriorRequirementExact(props) {
  const { questions, answers, setAnswer, cities, locationStates, locationStateId, setLocationState, cityId, setCity, locationQuestion, setPincode, onDetectedLocation, pinLookup, contact, setContact, state, submit, contactData, completion } = props
  const fileRef = useRef(null)
  const previewUrlsRef = useRef(new Set())
  const [referenceFiles, setReferenceFiles] = useState([])
  const [uploadNotice, setUploadNotice] = useState('')
  const [legacyScopeMode, setLegacyScopeMode] = useState('')
  const byKey = useMemo(() => Object.fromEntries(questions.map(q => [q.questionKey, q])), [questions])
  const propertyType = byKey.property_type
  const bhk = byKey.bhk
  const scope = byKey.interior_scope
  const selectedWork = byKey.selected_work
  const finishQuality = byKey.finish_quality
  const selectedPackageKey = ['standard','premium'].includes(String(answers.finish_quality || '').toLowerCase())
    ? String(answers.finish_quality).toLowerCase()
    : ''
  const selectedPackage = INTERIOR_PACKAGES.find(item => item.key === selectedPackageKey) || null
  const budget = byKey.budget
  const timeline = byKey.timeline
  const style = byKey.design_style
  const additional = byKey.additional_requirement
  const handledKeys = new Set(['project_location','property_type','bhk','interior_scope','selected_work','finish_quality','budget','timeline','design_style','additional_requirement'])
  const extraQuestions = questions.filter(q => !handledKeys.has(q.questionKey))
  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  useEffect(() => () => {
    previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    previewUrlsRef.current.clear()
  }, [])

  const propertyTypeValue = propertyType ? answers[propertyType.questionKey] : ''
  // Keep the bedroom selector visible by default so the customer can see it
  // even before choosing a residential property. Hide it only for clearly
  // non-residential property types.
  const showBhk = !['office','commercial_space'].includes(propertyTypeValue)
  const bhkOptions = bhk?.options?.length ? bhk.options : FALLBACK_BHK_OPTIONS
  const scopeAnswer = scope ? answers[scope.questionKey] : ''
  const legacyScopeValues = Array.isArray(scopeAnswer) ? scopeAnswer : []
  const isLegacyScope = Boolean(scope && scope.questionType === 'multi_select' && !selectedWork)
  const fullHomeLegacyValue = scope?.options?.find(option => ['full_home','end_to_end'].includes(option.value))?.value || 'full_home'
  const legacySpecificOptions = (scope?.options || []).filter(option => !['full_home','end_to_end','selected_work'].includes(option.value))
  const workOptions = selectedWork?.options?.length ? selectedWork.options : (legacySpecificOptions.length ? legacySpecificOptions : FALLBACK_INTERIOR_WORK)
  const selectedWorkValues = selectedWork
    ? (Array.isArray(answers[selectedWork.questionKey]) ? answers[selectedWork.questionKey] : [])
    : legacyScopeValues.filter(value => value !== fullHomeLegacyValue)
  const scopeMode = isLegacyScope
    ? (legacyScopeValues.includes(fullHomeLegacyValue) ? 'end_to_end' : (legacyScopeMode || (selectedWorkValues.length ? 'selected_work' : '')))
    : (scopeAnswer || '')

  function selectScopeMode(mode) {
    if (!scope) return
    if (isLegacyScope) {
      setLegacyScopeMode(mode)
      if (mode === 'end_to_end') setAnswer(scope.questionKey, [fullHomeLegacyValue])
      else setAnswer(scope.questionKey, legacyScopeValues.filter(value => value !== fullHomeLegacyValue))
      return
    }
    setAnswer(scope.questionKey, mode)
    if (mode === 'end_to_end' && selectedWork) setAnswer(selectedWork.questionKey, [])
  }

  function setInteriorWorkValues(values) {
    if (!scope) return
    if (isLegacyScope) {
      setLegacyScopeMode('selected_work')
      setAnswer(scope.questionKey, values)
      return
    }
    if (selectedWork) setAnswer(selectedWork.questionKey, values)
  }

  function toggleInteriorWork(value) {
    const next = selectedWorkValues.includes(value)
      ? selectedWorkValues.filter(item => item !== value)
      : [...selectedWorkValues, value]
    setInteriorWorkValues(next)
  }

  const selectedWorkLabel = selectedWorkValues.length
    ? selectedWorkValues.map(value => workOptions.find(option => option.value === value)?.label || value).join(', ')
    : '—'

  const summary = [
    ['Location', [
      cities.find(c => String(c.id) === String(cityId))?.name,
      locationStates.find(s => String(s.id) === String(locationStateId))?.name,
    ].filter(Boolean).join(', ') || '—'],
    ['PIN Code', answerLabel(locationQuestion, locationQuestion ? answers[locationQuestion.questionKey] : '')],
    ['Property Type', answerLabel(propertyType, propertyType ? answers[propertyType.questionKey] : '')],
    ...(showBhk ? [['Bedrooms', bhk ? answerLabel(bhk, answers[bhk.questionKey]) : (answers.bhk || '—')]] : []),
    ['Interior Scope', scopeMode === 'end_to_end' ? 'Full Home Interiors' : scopeMode === 'selected_work' ? 'Selected Work' : '—'],
    ...(scopeMode === 'selected_work' ? [['Selected Work', selectedWorkLabel]] : []),
    ['Interior Package', selectedPackage ? selectedPackage.name : '—'],
    ['Budget', answerLabel(budget, budget ? answers[budget.questionKey] : '')],
    ['Timeline', answerLabel(timeline, timeline ? answers[timeline.questionKey] : '')],
    ['Design Style', answerLabel(style, style ? answers[style.questionKey] : '')],
  ]

  function pickFiles(event) {
    const incoming = Array.from(event.target.files || [])
    const accepted = incoming.filter(file => REFERENCE_FILE_TYPES.has(file.type) && file.size <= MAX_REFERENCE_FILE_BYTES)
    const rejected = incoming.length - accepted.length

    setReferenceFiles(current => {
      const existing = new Set(current.map(item => item.key))
      const next = [...current]
      for (const file of accepted) {
        const key = [file.name,file.size,file.lastModified].join(':')
        if (existing.has(key) || next.length >= MAX_REFERENCE_FILES) continue
        existing.add(key)
        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
        if (previewUrl) previewUrlsRef.current.add(previewUrl)
        next.push({ key, file, previewUrl })
      }
      return next
    })

    if (rejected) setUploadNotice('Some files were skipped. Use JPG, PNG, WebP or PDF files up to 5 MB each.')
    else if (incoming.length) setUploadNotice('')
    event.target.value = ''
  }

  function removeReferenceFile(key) {
    setReferenceFiles(current => {
      const item = current.find(entry => entry.key === key)
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
        previewUrlsRef.current.delete(item.previewUrl)
      }
      return current.filter(entry => entry.key !== key)
    })
  }


  return <main className="rq-page rq-premium-page irx-page">
    <header className="irx-header">
      <Link to="/" className="irx-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link>
      <nav><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link className="active" to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></nav>
      <a href="#irx-basic" className="irx-header-cta">Get Free Consultation <Icon name="arrow" size={15}/></a>
    </header>

    <section className="irx-hero">
      <img src={HERO} alt="Premium modern interior" />
      <div className="irx-hero-wash" />
      <div className="irx-hero-copy"><span>INTERIOR DESIGN</span><h1>Beautiful Interiors<em>For Every Space</em></h1><p>Tell us your requirements and get connected with relevant interior design businesses for your project.</p></div>
      <aside className="irx-hero-features">
        <div><Icon name="spark"/><span>Modern Designs</span></div><div><Icon name="layout"/><span>Functional Spaces</span></div><div><Icon name="spark"/><span>Custom Solutions</span></div><div><Icon name="clock"/><span>On-Time Planning</span></div><div><Icon name="receipt"/><span>Budget Friendly</span></div>
      </aside>
      <div className="irx-benefits">
        <article><Icon name="chat"/><div><b>Free Consultation</b><small>No obligation</small></div></article><article><Icon name="receipt"/><div><b>Package Options</b><small>Compare specifications</small></div></article><article><Icon name="shield"/><div><b>Relevant Designers</b><small>Matched to your requirement</small></div></article><article><Icon name="support"/><div><b>End-to-End Support</b><small>From design to handover</small></div></article>
      </div>
    </section>

    <form className="irx-form" onSubmit={event=>submit(event,referenceFiles.map(item=>item.file))}>
      <section className="irx-top-grid" id="irx-basic">
        <div className="irx-card irx-basic-card">
          <div className="irx-section-title irx-section-title-premium"><div><h2>Basic Details</h2></div></div>
          <div className="irx-basic-grid">
            <QuoteLocationFields
              states={locationStates}
              stateId={locationStateId}
              onStateChange={setLocationState}
              cities={cities}
              cityId={cityId}
              onCityChange={setCity}
              pincode={locationQuestion ? answers[locationQuestion.questionKey] || '' : ''}
              onPincodeChange={setPincode}
              onDetectedLocation={onDetectedLocation}
              lookupStatus={pinLookup.status}
              lookupMessage={pinLookup.message}
              stateLabel="Property State"
              cityLabel="Property City / Location"
            />
            <label><b>Your Name</b><input value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} placeholder="Enter your full name"/></label>
            <label><b>Mobile Number</b><div className="irx-phone"><span>+91</span><input value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} inputMode="tel" placeholder="Enter 10-digit number"/></div></label>
            <label><b>Email <small>(Optional)</small></b><input type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} placeholder="Enter your email"/></label>
          </div>
        </div>
        <aside className="irx-promo"><div className="irx-promo-photo"><img src={PROMO} alt=""/><h3>Transform<br/>Your Space<br/>Your Way</h3></div><div className="irx-promo-stats"><span><b>Guided</b><small>Easy Journey</small></span><span><b>Tailored</b><small>Your Preferences</small></span><span><b>Local</b><small>City-aware Matching</small></span></div></aside>
      </section>

      <section className="irx-card" id="irx-property">
        <div className="irx-section-title"><div><h2>Property Details</h2></div></div>
        <div className="irx-property-selectors">
          <label className="irx-property-select-field">
            <div><b>Property Type</b></div>
            <select value={propertyType ? (answers[propertyType.questionKey]||'') : ''} onChange={e=>{
              const value=e.target.value
              if(propertyType) setAnswer(propertyType.questionKey,value)
              if(['office','commercial_space'].includes(value)) setAnswer(bhk?.questionKey||'bhk','')
            }}>
              <option value="">Select property type</option>
              {(propertyType?.options||[]).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          {showBhk&&<label className="irx-property-select-field">
            <div><b>Number of Bedrooms (BHK)</b></div>
            <select value={bhk ? (answers[bhk.questionKey]||'') : (answers.bhk||'')} onChange={e=>setAnswer(bhk?.questionKey||'bhk',e.target.value)}>
              <option value="">Select bedrooms</option>
              {bhkOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>}
        </div>
      </section>

      <div className="irx-lower">
        <div>
          <section className="irx-card" id="irx-style">
            <div className="irx-section-title irx-section-title-premium"><div><h2>Interior Style Preference</h2></div></div>
            <div className="irx-style-grid">{(style?.options||[]).map(option=>{const selected=Array.isArray(answers[style.questionKey])?answers[style.questionKey]:[];const active=selected.includes(option.value);return <button type="button" key={option.value} className={active?'active':''} onClick={()=>setAnswer(style.questionKey,active?selected.filter(v=>v!==option.value):[...selected,option.value])}><div><img src={STYLE_IMAGES[option.value]||STYLE_IMAGES.modern} alt=""/>{active&&<i>✓</i>}</div><b>{option.label}</b></button>})}</div>
          </section>

          <section className="irx-card" id="irx-requirements">
            <div className="irx-section-title"><div><h2>Interior Requirements</h2></div></div>

            <div className="irx-requirement-grid scope-only">
              {scope&&<div className="irx-scope-field">
                <b>What interior scope do you need?</b>
                <small>Choose complete interiors or pick only the work you need.</small>
                <div className="irx-scope-cards">
                  {INTERIOR_SCOPE_MODES.map(option=>{
                    const active=scopeMode===option.value
                    return <button type="button" key={option.value} className={active?'active':''} onClick={()=>selectScopeMode(option.value)}>
                      <span><b>{option.label}</b><small>{option.detail}</small></span>{active&&<i>✓</i>}
                    </button>
                  })}
                </div>
              </div>}
            </div>

            {scope&&scopeMode==='selected_work'&&<div className="irx-work-selector">
              <div className="irx-work-heading-row">
                <div className="irx-work-heading"><b>Select the work you need</b></div>
                <div className="irx-work-actions">
                  <button type="button" onClick={()=>setInteriorWorkValues(workOptions.map(option=>option.value))}>Select All</button>
                  {selectedWorkValues.length>0&&<button type="button" onClick={()=>setInteriorWorkValues([])}>Clear</button>}
                </div>
              </div>
              <div className="irx-work-grid">
                {workOptions.map(option=>{
                  const active=selectedWorkValues.includes(option.value)
                  return <button type="button" key={option.value} className={active?'active':''} onClick={()=>toggleInteriorWork(option.value)}>
                    <span><Icon name={WORK_ICONS[option.value]||'layout'} size={20}/></span><b>{option.label}</b>{active&&<i>✓</i>}
                  </button>
                })}
              </div>
            </div>}

            <div className="irx-package-section">
              <div className="irx-package-heading">
                <div><b>Choose Interior Package</b></div>
                <Link to="/packages#interior">Compare packages <Icon name="arrow" size={13}/></Link>
              </div>
              <div className="irx-package-grid">
                {INTERIOR_PACKAGES.map(item=>{
                  const active=selectedPackageKey===item.key
                  return <button type="button" key={item.key} className={active?'active':''} onClick={()=>setAnswer(finishQuality?.questionKey||'finish_quality',item.key)}>
                    <div className="irx-package-top"><span>{item.eyebrow}</span>{item.badge&&<i>{item.badge}</i>}</div>
                    <div className="irx-package-name"><b>{item.name}</b><strong>₹{item.price.toLocaleString('en-IN')}<small>/sq ft</small></strong></div>
                    <p>{item.description}</p>
                    <div className="irx-package-highlights">{item.highlights.slice(0,3).map(text=><span key={text}>✓ {text}</span>)}</div>
                    <em>{active?'Selected':'Select Package'}</em>
                  </button>
                })}
              </div>
              <small className="irx-package-note">Package rates are brochure references only. Final interior price depends on measurements, selected work, design, materials and site conditions.</small>
            </div>

            <div className="irx-preference-grid irx-premium-preferences">
              {budget&&<label className="irx-preference-field irx-budget-field">
                <div className="irx-pref-icon"><Icon name="receipt" size={18}/></div>
                <div className="irx-pref-copy"><b>Approximate Budget</b><small>{budget.helpText||'Share a rough budget so the right businesses can respond.'}</small></div>
                {budget.options?.length
                  ? <select value={answers[budget.questionKey]||''} onChange={e=>setAnswer(budget.questionKey,e.target.value)}><option value="">Select budget range</option>{budget.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  : <div className="irx-budget-input"><span>₹</span><input value={answers[budget.questionKey]||''} onChange={e=>setAnswer(budget.questionKey,e.target.value)} placeholder="Enter approximate budget"/></div>}
              </label>}
              {timeline&&<div className="irx-preference-field irx-timeline-field irx-premium-timeline">
                <div className="irx-pref-icon"><Icon name="clock" size={18}/></div>
                <div className="irx-pref-copy"><b>When do you want to start?</b><small>{timeline.helpText||'Choose the closest expected start timeline.'}</small></div>
                <div className="irx-timeline-options">{(timeline.options||[]).map(option=>{
                  const active=answers[timeline.questionKey]===option.value
                  return <button type="button" key={option.value} className={active?'active':''} onClick={()=>setAnswer(timeline.questionKey,option.value)}>{active&&<span>✓</span>}<b>{option.label}</b></button>
                })}</div>
              </div>}
            </div>

            {extraQuestions.length>0&&<div className="irx-extra-grid">{extraQuestions.map(question=><div className="irx-extra-q" key={question.questionKey}><b>{question.label}</b>{question.helpText&&<small>{question.helpText}</small>}{['single_select','multi_select','timeline','boolean'].includes(question.questionType)?<Chips question={question} value={answers[question.questionKey]} onChange={value=>setAnswer(question.questionKey,value)}/>:<input value={answers[question.questionKey]||''} onChange={e=>setAnswer(question.questionKey,e.target.value)} placeholder="Enter details"/>}</div>)}</div>}
          </section>

          <section className="irx-card irx-notes-card" id="irx-notes">
            <div className="irx-section-title irx-section-title-premium"><div><h2>Additional Notes</h2></div></div>
            {additional&&<div className="irx-notes irx-notes-premium"><div className="irx-notes-label"><b>Project Notes</b><small>Optional</small></div><textarea maxLength={Number(additional.validation?.maxLength||1500)} value={answers[additional.questionKey]||''} onChange={e=>setAnswer(additional.questionKey,e.target.value)} placeholder="E.g. TV wall, pooja unit, storage preference, material choice, lighting idea, smart-home requirement, etc."/><span>{String(answers[additional.questionKey]||'').length}/{Number(additional.validation?.maxLength||1500)}</span></div>}
            <div className="irx-upload irx-upload-premium">
              <div className="irx-upload-head">
                <div><b>Upload Floor Plan or Reference Images <small>Optional</small></b></div>
                <span>{referenceFiles.length}/{MAX_REFERENCE_FILES} files</span>
              </div>
              <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={pickFiles}/>
              <button className="irx-upload-dropzone" type="button" onClick={()=>fileRef.current?.click()} disabled={referenceFiles.length>=MAX_REFERENCE_FILES}>
                <span className="irx-upload-icon"><Icon name="upload" size={22}/></span>
                <strong>{referenceFiles.length?'Add More Files':'Choose Floor Plan or Images'}</strong>
                <small>JPG, PNG, WebP or PDF · up to 5 MB each</small>
              </button>
              {referenceFiles.length>0&&<div className="irx-reference-gallery">
                {referenceFiles.map((item,index)=><article key={item.key}>
                  <div className="irx-reference-preview">
                    {item.previewUrl?<img src={item.previewUrl} alt={'Reference '+(index+1)}/>:<span className="irx-pdf-preview"><b>PDF</b><small>Floor plan / document</small></span>}
                    <button type="button" onClick={()=>removeReferenceFile(item.key)} aria-label={'Remove '+item.file.name}>×</button>
                  </div>
                  <div><b title={item.file.name}>{item.file.name}</b><small>{(item.file.size/1024/1024).toFixed(1)} MB</small></div>
                </article>)}
              </div>}
              {uploadNotice&&<div className="irx-upload-notice">{uploadNotice}</div>}
              
            </div>
          </section>
        </div>

        <aside className="irx-side" id="irx-summary">
          <section className="irx-summary-card"><h3>Your Selection Summary</h3><div>{summary.map(([label,value])=><p key={label}><span>{label}</span><b title={value}>{value}</b></p>)}</div>{state.error&&<div className="irx-error">{state.error}</div>}<button type="submit" disabled={state.saving}>{state.saving?'Sending Request…':'Request Quote'} <Icon name="arrow" size={15}/></button></section>
          <section className="irx-help"><div className="irx-help-head"><span><Icon name="support"/></span><div><b>Need Help?</b></div></div><a href={phone?`tel:${phone.replace(/\s/g,'')}`:'#irx-basic'}><Icon name="phone" size={16}/>{phone||'Start Free Consultation'}</a><small>Mon - Sat, 9 AM - 8 PM</small></section>
        </aside>
      </div>
    </form>

    <footer className="irx-footer"><div className="irx-footer-brand"><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your trusted starting point for construction, interiors and real estate requirements.</p><div className="irx-social">f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</div></div><div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link></div><div><b>Our Services</b><Link to="/quote#construction">Home Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/quote#property">Real Estate</Link><Link to="/packages#interior">Interior Packages</Link><Link to="/quote#interiors">Free Consultation</Link></div><div><b>Support</b><Link to="/faq">FAQ</Link><Link to="/contact">Contact Us</Link></div><div><b>Contact Info</b>{phone&&<span><Icon name="phone" size={14}/>{phone}</span>}{email&&<span>{email}</span>}<span><Icon name="pin" size={14}/>Hyderabad, India</span></div></footer>
  </main>
}
