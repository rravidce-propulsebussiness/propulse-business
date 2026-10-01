import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isEmptyAnswer } from './CustomerFlowQuestion'
import QuoteLocationFields from './QuoteLocationFields'
import './InteriorRequirementExact.css'

const PROPERTY_IMAGES = {
  apartment: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=88',
  independent_house: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=88',
  villa: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=88',
  office: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=88',
  commercial_space: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=88',
}
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
  const { flow, questions, answers, setAnswer, cities, locationStates, locationStateId, setLocationState, cityId, setCity, locationQuestion, setPincode, onDetectedLocation, pinLookup, contact, setContact, state, submit, contactData, completion } = props
  const fileRef = useRef(null)
  const [referenceFiles, setReferenceFiles] = useState([])
  const byKey = useMemo(() => Object.fromEntries(questions.map(q => [q.questionKey, q])), [questions])
  const propertyType = byKey.property_type
  const bhk = byKey.bhk
  const scope = byKey.interior_scope
  const selectedWork = byKey.selected_work
  const finishQuality = byKey.finish_quality
  const budget = byKey.budget
  const timeline = byKey.timeline
  const style = byKey.design_style
  const additional = byKey.additional_requirement
  const handledKeys = new Set(['project_location','property_type','bhk','interior_scope','selected_work','finish_quality','budget','timeline','design_style','additional_requirement'])
  const extraQuestions = questions.filter(q => !handledKeys.has(q.questionKey))
  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''
  const summary = [
    ['Location', [
      cities.find(c => String(c.id) === String(cityId))?.name,
      locationStates.find(s => String(s.id) === String(locationStateId))?.name,
    ].filter(Boolean).join(', ') || '—'],
    ['PIN Code', answerLabel(locationQuestion, locationQuestion ? answers[locationQuestion.questionKey] : '')],
    ['Property Type', answerLabel(propertyType, propertyType ? answers[propertyType.questionKey] : '')],
    ...(bhk ? [['Home Configuration', answerLabel(bhk, answers[bhk.questionKey])]] : []),
    ['Interior Scope', answerLabel(scope, scope ? answers[scope.questionKey] : '')],
    ...(selectedWork ? [['Selected Work', answerLabel(selectedWork, answers[selectedWork.questionKey])]] : []),
    ['Finish Level', answerLabel(finishQuality, finishQuality ? answers[finishQuality.questionKey] : '')],
    ['Budget', answerLabel(budget, budget ? answers[budget.questionKey] : '')],
    ['Timeline', answerLabel(timeline, timeline ? answers[timeline.questionKey] : '')],
    ['Design Style', answerLabel(style, style ? answers[style.questionKey] : '')],
  ]

  function pickFiles(event) {
    const files = Array.from(event.target.files || []).filter(file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024)
    setReferenceFiles(current => [...current, ...files].slice(0, 5))
    event.target.value = ''
  }

  return <main className="rq-page rq-premium-page irx-page">
    <header className="irx-header">
      <Link to="/" className="irx-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link>
      <nav><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link className="active" to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/#contact">Contact</Link></nav>
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
        <article><Icon name="chat"/><div><b>Free Consultation</b><small>No obligation</small></div></article><article><Icon name="receipt"/><div><b>Transparent Estimates</b><small>Compare multiple options</small></div></article><article><Icon name="shield"/><div><b>Relevant Designers</b><small>Matched to your requirement</small></div></article><article><Icon name="support"/><div><b>End-to-End Support</b><small>From design to handover</small></div></article>
      </div>
    </section>

    <div className="irx-steps">
      {[['1','Basic Details','Tell us about your space','#irx-basic'],['2','Property Details','Property type and configuration','#irx-property'],['3','Design & Scope','Style, BHK and work selection','#irx-style'],['4','Review & Submit','Confirm and connect','#irx-summary']].map(([n,title,sub,href],index) => <a href={href} key={n} className={index===0?'active':completion>[30,55,80,99][index]?'done':''}><span>{completion>[30,55,80,99][index]?'✓':n}</span><div><b>{title}</b><small>{sub}</small></div>{index<3&&<Icon name="arrow" size={14}/>}</a>)}
    </div>

    <form className="irx-form" onSubmit={submit}>
      <section className="irx-top-grid" id="irx-basic">
        <div className="irx-card irx-basic-card">
          <div className="irx-section-title"><span>1.</span><div><h2>Basic Details</h2><p>Let's start with some basic information about your interior project.</p></div></div>
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
        <div className="irx-section-title"><span>2.</span><div><h2>Property Type</h2><p>Select the type of property you want to design.</p></div></div>
        <div className="irx-property-grid">{(propertyType?.options||[]).map(option=>{const active=answers[propertyType.questionKey]===option.value;return <button type="button" key={option.value} className={active?'active':''} onClick={()=>setAnswer(propertyType.questionKey,option.value)}><div><img src={PROPERTY_IMAGES[option.value]||PROPERTY_IMAGES.apartment} alt=""/>{active&&<i>✓</i>}</div><b>{option.label}</b></button>})}</div>
      </section>

      <div className="irx-lower">
        <div>
          <section className="irx-card" id="irx-style">
            <div className="irx-section-title"><span>3.</span><div><h2>Interior Style Preference</h2><p>Choose your preferred interior style. You can select multiple options.</p></div></div>
            <div className="irx-style-grid">{(style?.options||[]).map(option=>{const selected=Array.isArray(answers[style.questionKey])?answers[style.questionKey]:[];const active=selected.includes(option.value);return <button type="button" key={option.value} className={active?'active':''} onClick={()=>setAnswer(style.questionKey,active?selected.filter(v=>v!==option.value):[...selected,option.value])}><div><img src={STYLE_IMAGES[option.value]||STYLE_IMAGES.modern} alt=""/>{active&&<i>✓</i>}</div><b>{option.label}</b></button>})}</div>
          </section>

          <section className="irx-card" id="irx-requirements">
            <div className="irx-section-title"><span>4.</span><div><h2>Interior Requirements</h2><p>Choose your home configuration and whether you want complete interiors or only selected work.</p></div></div>

            <div className="irx-requirement-grid">
              {bhk&&<label className="irx-select-field">
                <b>Home Configuration</b>
                <small>Select the closest BHK configuration.</small>
                <select value={answers[bhk.questionKey]||''} onChange={e=>setAnswer(bhk.questionKey,e.target.value)}>
                  <option value="">Select BHK</option>
                  {(bhk.options||[]).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>}

              {scope&&<div className="irx-scope-field">
                <b>{scope.label||'What interior scope do you need?'}</b>
                <small>{scope.helpText||'Choose end-to-end interiors or select only the work you need.'}</small>
                <div className="irx-scope-cards">
                  {(scope.options||[]).map(option=>{
                    const active=answers[scope.questionKey]===option.value
                    const detail=option.value==='end_to_end'?'Complete interior planning for the selected property':'Choose only specific interior items'
                    return <button type="button" key={option.value} className={active?'active':''} onClick={()=>{
                      setAnswer(scope.questionKey,option.value)
                      if(option.value==='end_to_end'&&selectedWork)setAnswer(selectedWork.questionKey,[])
                    }}>
                      <span><b>{option.label}</b><small>{detail}</small></span>{active&&<i>✓</i>}
                    </button>
                  })}
                </div>
              </div>}
            </div>

            {scope&&answers[scope.questionKey]==='selected_work'&&selectedWork&&<div className="irx-work-selector">
              <div className="irx-work-heading"><b>Select the work you need</b><small>Choose one or more items. End-to-End hides this list automatically.</small></div>
              <div className="irx-work-grid">
                {(selectedWork.options||[]).map(option=>{
                  const selected=Array.isArray(answers[selectedWork.questionKey])?answers[selectedWork.questionKey]:[]
                  const active=selected.includes(option.value)
                  return <button type="button" key={option.value} className={active?'active':''} onClick={()=>setAnswer(selectedWork.questionKey,active?selected.filter(value=>value!==option.value):[...selected,option.value])}>
                    <span><Icon name={WORK_ICONS[option.value]||'layout'} size={20}/></span><b>{option.label}</b>{active&&<i>✓</i>}
                  </button>
                })}
              </div>
            </div>}

            <div className="irx-preference-grid">
              {finishQuality&&<div className="irx-preference-field"><b>{finishQuality.label}</b>{finishQuality.helpText&&<small>{finishQuality.helpText}</small>}<Chips question={finishQuality} value={answers[finishQuality.questionKey]} onChange={value=>setAnswer(finishQuality.questionKey,value)}/></div>}
              {budget&&<label className="irx-preference-field"><b>{budget.label}</b>{budget.helpText&&<small>{budget.helpText}</small>}{budget.options?.length?<select value={answers[budget.questionKey]||''} onChange={e=>setAnswer(budget.questionKey,e.target.value)}><option value="">Select budget</option>{budget.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:<input value={answers[budget.questionKey]||''} onChange={e=>setAnswer(budget.questionKey,e.target.value)} placeholder="Enter approximate budget"/>}</label>}
              {timeline&&<div className="irx-preference-field irx-timeline-field"><b>{timeline.label}</b>{timeline.helpText&&<small>{timeline.helpText}</small>}<Chips question={timeline} value={answers[timeline.questionKey]} onChange={value=>setAnswer(timeline.questionKey,value)}/></div>}
            </div>

            {extraQuestions.length>0&&<div className="irx-extra-grid">{extraQuestions.map(question=><div className="irx-extra-q" key={question.questionKey}><b>{question.label}</b>{question.helpText&&<small>{question.helpText}</small>}{['single_select','multi_select','timeline','boolean'].includes(question.questionType)?<Chips question={question} value={answers[question.questionKey]} onChange={value=>setAnswer(question.questionKey,value)}/>:<input value={answers[question.questionKey]||''} onChange={e=>setAnswer(question.questionKey,e.target.value)} placeholder="Enter details"/>}</div>)}</div>}
          </section>

          <section className="irx-card" id="irx-notes">
            <div className="irx-section-title"><span>5.</span><div><h2>Additional Notes</h2><p>Add any specific preferences, site details or reference images.</p></div></div>
            {additional&&<div className="irx-notes"><textarea maxLength={Number(additional.validation?.maxLength||1500)} value={answers[additional.questionKey]||''} onChange={e=>setAnswer(additional.questionKey,e.target.value)} placeholder="E.g. TV wall, pooja unit, storage preference, material choice, lighting idea, smart home, etc."/><span>{String(answers[additional.questionKey]||'').length}/{Number(additional.validation?.maxLength||1500)}</span></div>}
            <div className="irx-upload"><b>Upload Reference Images <small>(Optional)</small></b><input ref={fileRef} hidden type="file" accept="image/*" multiple onChange={pickFiles}/><div className="irx-upload-grid">{[0,1,2].map(index=><button type="button" key={index} onClick={()=>fileRef.current?.click()}>{referenceFiles[index]?<><span className="irx-file-name">{referenceFiles[index].name}</span><small>Selected locally</small></>:<><Icon name="upload"/><span>Upload Image</span></>}</button>)}</div><small>Choose up to 5 images, max 5MB each.</small></div>
          </section>
        </div>

        <aside className="irx-side" id="irx-summary">
          <section className="irx-summary-card"><h3>Your Selection Summary</h3><div>{summary.map(([label,value])=><p key={label}><span>{label}</span><b title={value}>{value}</b></p>)}</div><p className="irx-submit-consent">By submitting, you agree that ProPulse may use your project and contact details to process this request and connect you with relevant professionals.</p>{state.error&&<div className="irx-error">{state.error}</div>}<button type="submit" disabled={state.saving}>{state.saving?'Submitting…':(flow.config?.submitLabel||'Submit Requirement')} <Icon name="arrow" size={15}/></button><small>Our experts will get in touch with you shortly.</small></section>
          <section className="irx-help"><div className="irx-help-head"><span><Icon name="support"/></span><div><b>Need Help?<br/>Talk to Our Expert</b><small>Get free consultation and personalized guidance for your interior project.</small></div></div><a href={phone?`tel:${phone.replace(/\s/g,'')}`:'#irx-basic'}><Icon name="phone" size={16}/>{phone||'Start Free Consultation'}</a><small>Mon - Sat, 9 AM - 8 PM</small></section>
        </aside>
      </div>
    </form>

    <footer className="irx-footer"><div className="irx-footer-brand"><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your trusted starting point for construction, interiors and real estate requirements.</p><div className="irx-social">f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</div></div><div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link></div><div><b>Our Services</b><Link to="/quote#construction">Home Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/quote#property">Real Estate</Link><Link to="/packages#interior">Interior Packages</Link><Link to="/quote#interiors">Free Consultation</Link></div><div><b>Support</b><Link to="/contact?audience=users">FAQ</Link><Link to="/#contact">Contact Us</Link><Link to="/contact?audience=users">Privacy Policy</Link><Link to="/contact?audience=users">Terms & Conditions</Link></div><div><b>Contact Info</b>{phone&&<span><Icon name="phone" size={14}/>{phone}</span>}{email&&<span>{email}</span>}<span><Icon name="pin" size={14}/>Hyderabad, India</span></div></footer>
  </main>
}
