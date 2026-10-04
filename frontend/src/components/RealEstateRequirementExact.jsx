import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { isEmptyAnswer } from './CustomerFlowQuestion'
import QuoteLocationFields from './QuoteLocationFields'
import './RealEstateRequirementExact.css'

const HERO = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2200&q=92'
const PROMO = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=90'

const CARD_IMAGES = {
  residential: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=88',
  commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=88',
  plot: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=88',
  rental: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=88',
  investment: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=88',
}

const PREF_IMAGES = {
  ready_move: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=800&q=86',
  under_construction: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=86',
  new_launch: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=86',
  resale: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=800&q=86',
  gated_community: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=86',
  near_metro: 'https://images.unsplash.com/photo-1516939884455-1445c8652f83?auto=format&fit=crop&w=800&q=86',
  amenities: 'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=800&q=86',
  corner_view: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=800&q=86',
}

function Icon({ name, size = 20 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'arrow') return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'home') return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if (name === 'building') return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if (name === 'plot') return <svg {...p}><path d="m4 17 4-8 5 4 3-6 4 10"/><path d="M3 20h18"/></svg>
  if (name === 'invest') return <svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/><path d="m3 7 6-4 6 5 6-5"/></svg>
  if (name === 'shield') return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'chat') return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
  if (name === 'receipt') return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if (name === 'support') return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'pin') return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'phone') return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (name === 'doc') return <svg {...p}><path d="M6 2h9l3 3v17H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg>
  return null
}

function labelFor(question, value) {
  if (!question || isEmptyAnswer(value)) return '—'
  if (Array.isArray(value)) return value.map(v => question.options?.find(o => o.value === v)?.label || v).join(', ')
  return question.options?.find(o => o.value === value)?.label || String(value)
}

function Chips({ question, value, onChange }) {
  if (!question) return null
  const multi = question.questionType === 'multi_select'
  const selected = multi && Array.isArray(value) ? value : []
  return <div className="rex-chips">{(question.options || []).map(option => {
    const active = multi ? selected.includes(option.value) : value === option.value
    return <button type="button" key={option.value} className={active ? 'active' : ''} onClick={() => onChange(multi ? (active ? selected.filter(v => v !== option.value) : [...selected, option.value]) : option.value)}>{active && <span>✓</span>}{option.label}</button>
  })}</div>
}

export default function RealEstateRequirementExact(props) {
  const { flow, questions, answers, setAnswer, cities, locationStates, locationStateId, setLocationState, cityId, setCity, locationQuestion, setPincode, onDetectedLocation, pinLookup, contact, setContact, state, submit, contactData, completion } = props
  const byKey = useMemo(() => Object.fromEntries(questions.map(q => [q.questionKey, q])), [questions])
  const intent = byKey.property_intent
  const propertyType = byKey.property_type
  const bhk = byKey.bhk
  const budget = byKey.budget
  const timeline = byKey.timeline
  const preferences = byKey.property_preferences
  const additional = byKey.additional_requirement
  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  const propertyCards = [
    { key:'residential', title:'Residential', subtitle:'Apartments, Villas, Independent Houses', image:CARD_IMAGES.residential, type:'apartment', intent:'buy' },
    { key:'commercial', title:'Commercial', subtitle:'Office spaces, Shops, Showrooms', image:CARD_IMAGES.commercial, type:'commercial', intent:'buy' },
    { key:'plot', title:'Plot / Land', subtitle:'Residential or Commercial plots', image:CARD_IMAGES.plot, type:'plot', intent:'buy' },
    { key:'rental', title:'Rental', subtitle:'Homes, Apartments, Commercial on Rent', image:CARD_IMAGES.rental, type:'apartment', intent:'rent' },
    { key:'investment', title:'Investment', subtitle:'Projects with high return potential', image:CARD_IMAGES.investment, type:'apartment', intent:'invest' },
  ]

  const budgetOptions = ['Under ₹20 Lakhs','₹20 - 50 Lakhs','₹50 Lakhs - 1 Crore','₹1 - 2 Crore','₹2 - 5 Crore','Above ₹5 Crore']
  const selectedType = answers[propertyType?.questionKey]
  const selectedIntent = answers[intent?.questionKey]

  function selectProperty(card) {
    if (propertyType) setAnswer(propertyType.questionKey, card.type)
    if (intent) setAnswer(intent.questionKey, card.intent)
  }

  function cardActive(card) {
    if (card.key === 'residential') return ['apartment','villa','independent_house'].includes(selectedType) && !['rent','invest'].includes(selectedIntent)
    return selectedType === card.type && selectedIntent === card.intent
  }

  const summary = [
    ['City / Location', [
      cities.find(c => String(c.id) === String(cityId))?.name,
      locationStates.find(s => String(s.id) === String(locationStateId))?.name,
    ].filter(Boolean).join(', ') || '—'],
    ['PIN Code', labelFor(locationQuestion, locationQuestion ? answers[locationQuestion.questionKey] : '')],
    ['Property Type', propertyCards.find(cardActive)?.title || labelFor(propertyType, selectedType)],
    ['Budget Range', budget ? (answers[budget.questionKey] || '—') : '—'],
    ['Preference', labelFor(preferences, preferences ? answers[preferences.questionKey] : '')],
    ['Timeline', labelFor(timeline, timeline ? answers[timeline.questionKey] : '')],
  ]

  return <main className="rq-page rq-premium-page rex-page">
    <header className="rex-header">
      <Link to="/" className="rex-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link className="active" to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/#contact">Contact</Link></nav>
      <a href="#rex-basic" className="rex-header-cta">Get Free Consultation <Icon name="arrow" size={15}/></a>
    </header>

    <section className="rex-hero">
      <img src={HERO} alt="Premium real estate development"/>
      <div className="rex-hero-wash"/>
      <div className="rex-hero-copy"><span>REAL ESTATE DISCOVERY</span><h1>Find the Right<em>Property, Faster.</em></h1><p>Tell us your location, budget and preferences once. We turn them into one clear property requirement.</p><a href="#rex-basic">Start Your Search <Icon name="arrow" size={15}/></a></div>
      <aside className="rex-hero-features">
        <div><Icon name="home"/><span>Residential Properties</span></div>
        <div><Icon name="building"/><span>Commercial Spaces</span></div>
        <div><Icon name="plot"/><span>Plots & Land</span></div>
        <div><Icon name="invest"/><span>Investment Guidance</span></div>
        <div><Icon name="doc"/><span>Requirement Documentation</span></div>
      </aside>
      <div className="rex-benefits">
        <article><Icon name="chat"/><div><b>Free Consultation</b><small>No obligation</small></div></article>
        <article><Icon name="receipt"/><div><b>Structured Requirement</b><small>Clear property brief</small></div></article>
        <article><Icon name="shield"/><div><b>Relevant Businesses</b><small>Matched to location & type</small></div></article>
        <article><Icon name="support"/><div><b>End-to-End Support</b><small>From search to next step</small></div></article>
      </div>
    </section>

    <div className="rex-steps">
      {[['1','Basic Details','Location and contact','#rex-basic'],['2','Property Search','Intent and property type','#rq-property'],['3','Preferences','Budget, features and timeline','#rq-preferences'],['4','Review & Request','Confirm your requirement','#rq-summary']].map(([n,title,sub,href],i)=><a key={n} href={href} className={i===0?'active':completion>[30,55,80,99][i]?'done':''}><span>{completion>[30,55,80,99][i]?'✓':n}</span><div><b>{title}</b><small>{sub}</small></div>{i<3&&<Icon name="arrow" size={14}/>}</a>)}
    </div>

    <form className="rex-form" onSubmit={submit}>
      <section className="rex-top-grid" id="rex-basic">
        <div className="rex-card">
          <div className="rex-section-title rex-section-title-premium"><span>1.</span><div><small>YOUR SEARCH STARTS HERE</small><h2>Basic Details</h2><p>Tell us where you are looking and how we can reach you.</p></div></div>
          <div className="rex-basic-grid">
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
              stateLabel="Looking in State"
              cityLabel="City / Location"
            />
            <label><b>Your Name</b><input value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} placeholder="Enter your full name"/></label>
            <label><b>Mobile Number</b><div className="rex-phone"><span>+91</span><input value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} inputMode="tel" placeholder="Enter 10-digit number"/></div></label>
            <label><b>Email <small>(Optional)</small></b><input type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} placeholder="Enter your email"/></label>
          </div>
        </div>
        <aside className="rex-promo rex-promo-premium"><div><img src={PROMO} alt=""/><div className="rex-promo-overlay"/><span className="rex-promo-kicker">PROPERTY DISCOVERY</span><h3>Find Better.<br/><strong>Choose Smarter.</strong></h3><p>One clear requirement for location, budget and property preference.</p></div><footer><span><b>Guided</b><small>Property Search</small></span><span><b>Relevant</b><small>Local Options</small></span><span><b>Simple</b><small>One Requirement</small></span></footer></aside>
      </section>

      <section className="rex-card" id="rq-property">
        <div className="rex-section-title rex-section-title-premium"><span>2.</span><div><small>PROPERTY SEARCH</small><h2>What are you looking for?</h2><p>Choose your intent first, then select the closest property category.</p></div></div>
        {intent && <div className="rex-intent rex-intent-premium"><div><b>I want to</b><small>Select your property goal</small></div><Chips question={intent} value={answers[intent.questionKey]} onChange={v=>setAnswer(intent.questionKey,v)}/></div>}
        <div className="rex-property-grid">{propertyCards.map(card=><button type="button" key={card.key} className={cardActive(card)?'active':''} onClick={()=>selectProperty(card)}><div><img src={card.image} alt=""/>{cardActive(card)&&<i>✓</i>}</div><b>{card.title}</b><small>{card.subtitle}</small></button>)}</div>
      </section>

      <div className="rex-content-grid">
        <div>
          <section className="rex-card">
            <div className="rex-section-title rex-section-title-premium"><span>3.</span><div><small>BUDGET</small><h2>Your Budget Range</h2><p>Select the closest range so property matches stay relevant.</p></div></div>
            <div className="rex-budget">{budgetOptions.map(option=><button type="button" key={option} className={answers[budget?.questionKey]===option?'active':''} onClick={()=>budget&&setAnswer(budget.questionKey,option)}>{option}</button>)}</div>
          </section>

          <section className="rex-card" id="rq-preferences">
            <div className="rex-section-title rex-section-title-premium"><span>4.</span><div><small>PREFERENCES</small><h2>Property Preferences</h2><p>Choose the features that matter most. Multiple selections are allowed.</p></div></div>
            {preferences && <div className="rex-pref-grid">{(preferences.options||[]).map(option=>{const selected=Array.isArray(answers[preferences.questionKey])?answers[preferences.questionKey]:[];const active=selected.includes(option.value);return <button type="button" key={option.value} className={active?'active':''} onClick={()=>setAnswer(preferences.questionKey,active?selected.filter(v=>v!==option.value):[...selected,option.value])}><div><img src={PREF_IMAGES[option.value]||CARD_IMAGES.residential} alt=""/>{active&&<i>✓</i>}</div><b>{option.label}</b></button>})}</div>}
            <div className="rex-subprefs">
              {bhk && <div className="rex-subpref-card"><span className="rex-subpref-icon"><Icon name="home" size={18}/></span><div><b>Home Configuration</b><small>Select the closest BHK requirement.</small><Chips question={bhk} value={answers[bhk.questionKey]} onChange={v=>setAnswer(bhk.questionKey,v)}/></div></div>}
              {timeline && <div className="rex-subpref-card"><span className="rex-subpref-icon"><Icon name="arrow" size={18}/></span><div><b>When do you want to move forward?</b><small>Choose your expected decision timeline.</small><Chips question={timeline} value={answers[timeline.questionKey]} onChange={v=>setAnswer(timeline.questionKey,v)}/></div></div>}
            </div>
          </section>

          <section className="rex-card rex-notes-card">
            <div className="rex-section-title rex-section-title-premium"><span>5.</span><div><small>FINAL DETAILS</small><h2>Additional Requirements</h2><p>Add any locality, facing, parking, amenity or property-specific preference.</p></div></div>
            {additional&&<div className="rex-notes rex-notes-premium"><div className="rex-notes-label"><b>Requirement Notes</b><small>Optional</small></div><textarea maxLength={Number(additional.validation?.maxLength||1500)} value={answers[additional.questionKey]||''} onChange={e=>setAnswer(additional.questionKey,e.target.value)} placeholder="E.g. preferred locality, gated community, east-facing, parking, nearby school or metro, possession preference, etc."/><span>{String(answers[additional.questionKey]||'').length}/{Number(additional.validation?.maxLength||1500)}</span></div>}
          </section>
        </div>

        <aside className="rex-side" id="rq-summary">
          <section className="rex-summary-card rex-summary-premium">
            <div className="rex-summary-head"><div><small>YOUR REQUIREMENT</small><h3>Selection Summary</h3></div><span>{Math.min(100,Math.max(0,Math.round(completion||0)))}%</span></div>
            <div className="rex-summary-progress"><i style={{width:`${Math.min(100,Math.max(0,completion||0))}%`}}/></div>
            <div className="rex-summary-rows">{summary.map(([label,value])=><p key={label}><span>{label}</span><b title={value}>{value}</b></p>)}</div>
            <p className="rex-submit-consent">Submit your requirement to connect with relevant real-estate businesses for your location and preferences.</p>
            {state.error&&<div className="rex-error">{state.error}</div>}
            <button type="submit" disabled={state.saving}>{state.saving?'Sending Request…':'Request Property Options'} <Icon name="arrow" size={15}/></button>
            <small>No OTP required. Your requirement is shared only after submission.</small>
          </section>

          <section className="rex-help rex-help-premium"><div><span><Icon name="support"/></span><div><small>FREE GUIDANCE</small><b>Need help deciding?</b><p>Talk to a real-estate expert about location, property type or budget.</p></div></div><a href={phone?`tel:${phone.replace(/\s/g,'')}`:'#rex-basic'}><Icon name="phone" size={16}/>{phone||'Start Free Consultation'}</a><small>Mon - Sat, 9 AM - 8 PM</small></section>

          <section className="rex-locations rex-locations-premium"><div className="rex-locations-head"><span><Icon name="pin" size={16}/></span><div><small>POPULAR SEARCH AREAS</small><h4>Available Locations</h4></div></div><div>{cities.slice(0,8).map(city=><button type="button" key={city.id} onClick={()=>{setCity(String(city.id));document.getElementById('rex-basic')?.scrollIntoView({behavior:'smooth'})}}>{city.name}<Icon name="arrow" size={11}/></button>)}</div></section>
        </aside>
      </div>
    </form>

    <footer className="rex-footer"><div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your trusted starting point for construction, interiors and real estate requirements.</p><div>f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</div></div><div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link></div><div><b>Our Services</b><Link to="/quote#construction">Home Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/quote#property">Real Estate</Link><Link to="/quote#construction">Construction Quote</Link><Link to="/quote#property">Free Consultation</Link></div><div><b>Support</b><Link to="/contact?audience=users">FAQ</Link><Link to="/#contact">Contact Us</Link><Link to="/contact?audience=users">Privacy Policy</Link><Link to="/contact?audience=users">Terms & Conditions</Link></div><div><b>Contact Info</b>{phone&&<span><Icon name="phone" size={14}/>{phone}</span>}{email&&<span>{email}</span>}<span><Icon name="pin" size={14}/>Hyderabad, India</span></div></footer>
  </main>
}
