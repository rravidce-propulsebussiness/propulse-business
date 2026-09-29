import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'

const FLOW_CONFIG = [
  {
    key: 'build',
    nav: 'Construction',
    tab: 'Build a Home',
    title: 'Home Construction',
    matcher: value => /construction|civil|building/i.test(value),
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1500&q=88',
    fallback: '/homepage/default-residential.svg',
    text: 'Build your dream home with a clear scope, transparent planning and businesses that serve your location.',
    icon: 'home',
  },
  {
    key: 'design',
    nav: 'Interiors',
    tab: 'Design Interiors',
    title: 'Interior Design',
    matcher: value => /interior|design/i.test(value),
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1500&q=88',
    fallback: '/homepage/default-interior.svg',
    text: 'Turn your home into a space that feels considered, functional and distinctly yours.',
    icon: 'sofa',
  },
  {
    key: 'property',
    nav: 'Real Estate',
    tab: 'Find Property',
    title: 'Real Estate',
    matcher: value => /real.?estate|property|properties/i.test(value),
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1500&q=88',
    fallback: '/homepage/default-plot-land.svg',
    text: 'Share what you want to buy, rent, sell or invest in and start with a structured property requirement.',
    icon: 'building',
  },
]

const PROJECTS = [
  ['4 BHK Villa', 'Hyderabad', 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1000&q=86'],
  ['3 BHK Apartment', 'Bengaluru', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=86'],
  ['Duplex House', 'Chennai', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=86'],
  ['Interior Design', 'Pune', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=86'],
  ['Independent House', 'Hyderabad', 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1000&q=86'],
]

const TESTIMONIALS = [
  ['SR', 'Suresh Reddy', 'Hyderabad', 'The construction requirement was easy to complete and gave us a much clearer starting point before discussing quotations.'],
  ['PS', 'Priya Sharma', 'Bengaluru', 'The interior flow helped us explain the rooms, finishes and budget without repeating the same details again and again.'],
  ['KM', 'Karthik Menon', 'Chennai', 'We could define our property requirement quickly and focus on responses relevant to our location and budget.'],
]

function collection(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.items)) return value.items
  return []
}

function Icon({ name, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'home') return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if (name === 'sofa') return <svg {...common}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/><path d="M5 17v2M19 17v2"/></svg>
  if (name === 'building') return <svg {...common}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if (name === 'pin') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'user') return <svg {...common}><circle cx="12" cy="7" r="3"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>
  if (name === 'phone') return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (name === 'chat') return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
  if (name === 'receipt') return <svg {...common}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if (name === 'shield') return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'support') return <svg {...common}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'clipboard') return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>
  if (name === 'calculator') return <svg {...common}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/></svg>
  if (name === 'people') return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  return null
}

function Home() {
  const navigate = useNavigate()
  const [contactData, setContactData] = useState({})
  const [industries, setIndustries] = useState([])
  const [services, setServices] = useState([])
  const [cities, setCities] = useState([])
  const [masterLoading, setMasterLoading] = useState(true)
  const [flow, setFlow] = useState('build')
  const [form, setForm] = useState({ cityId: '', pincode: '', name: '', phone: '' })
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [estimateType, setEstimateType] = useState('construction')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let active = true
    setMasterLoading(true)
    Promise.allSettled([
      publicRequest('/industries'),
      publicRequest('/services'),
      publicRequest('/cities'),
      publicRequest('/contact?audience=website'),
    ]).then(results => {
      if (!active) return
      if (results[0].status === 'fulfilled') setIndustries(collection(results[0].value))
      if (results[1].status === 'fulfilled') setServices(collection(results[1].value))
      if (results[2].status === 'fulfilled') setCities(collection(results[2].value))
      if (results[3].status === 'fulfilled') setContactData(results[3].value || {})
      setMasterLoading(false)
    })
    return () => { active = false }
  }, [])

  const selectedCity = useMemo(
    () => cities.find(city => String(city.id) === String(form.cityId)) || null,
    [cities, form.cityId]
  )

  const cityPincodes = useMemo(() => {
    const rows = Array.isArray(selectedCity?.pincodes) ? selectedCity.pincodes : []
    const seen = new Set()
    return rows
      .map(item => typeof item === 'string' ? { pincode: item } : item)
      .filter(item => /^\d{6}$/.test(String(item?.pincode || '')))
      .filter(item => {
        const pin = String(item.pincode)
        if (seen.has(pin)) return false
        seen.add(pin)
        return true
      })
      .sort((a, b) => String(a.pincode).localeCompare(String(b.pincode)))
  }, [selectedCity])

  const flowCards = useMemo(() => FLOW_CONFIG.map(config => {
    const industry = industries.find(item => config.matcher(`${item.name || ''} ${item.slug || ''}`))
    const childServices = industry
      ? services.filter(item => Number(item.industry_id) === Number(industry.id)).slice(0, 3)
      : []
    return {
      ...config,
      industry,
      displayTitle: industry?.name || config.title,
      description: industry?.description || config.text,
      childServices,
    }
  }), [industries, services])

  const cityList = useMemo(
    () => [...cities].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [cities]
  )

  const featuredCities = cityList.slice(0, 8)

  function scrollTo(id) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function onCityChange(event) {
    const cityId = event.target.value
    const city = cities.find(item => String(item.id) === String(cityId))
    const pins = Array.isArray(city?.pincodes) ? city.pincodes : []
    const validPins = pins.map(item => typeof item === 'string' ? item : item?.pincode).filter(pin => /^\d{6}$/.test(String(pin || '')))
    setForm(value => ({ ...value, cityId, pincode: validPins.length === 1 ? String(validPins[0]) : '' }))
    setError('')
  }

  function submitHero(event) {
    event.preventDefault()
    const pincode = form.pincode.replace(/\D/g, '')
    const phone = form.phone.replace(/\D/g, '')
    if (!form.cityId) return setError('Select a city from the locations configured in Admin.')
    if (!/^\d{6}$/.test(pincode)) return setError('Select or enter a valid 6-digit PIN code.')
    if (form.name.trim().length < 2) return setError('Enter your name.')
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number.')

    try {
      sessionStorage.setItem('propulse_intake_prefill', JSON.stringify({
        flowKey: flow,
        cityId: Number(form.cityId),
        cityName: selectedCity?.name || '',
        pincode,
        name: form.name.trim(),
        phone,
        createdAt: Date.now(),
      }))
    } catch {}

    setError('')
    navigate('/' + flow)
  }

  function startEstimate() {
    navigate(estimateType === 'interior' ? '/interior-estimator' : '/construction-estimator')
  }

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  return <div className="pp-home">
    <header className="pp-header">
      <Link to="/" className="pp-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse" /></Link>
      <nav className={menuOpen ? 'pp-nav open' : 'pp-nav'}>
        <button onClick={() => scrollTo('home')}>Home</button>
        <button onClick={() => { setFlow('build'); scrollTo('home') }}>Construction</button>
        <button onClick={() => { setFlow('design'); scrollTo('home') }}>Interiors</button>
        <button onClick={() => { setFlow('property'); scrollTo('home') }}>Real Estate</button>
        <button onClick={() => scrollTo('projects')}>Projects</button>
        <button onClick={() => scrollTo('how-it-works')}>How It Works</button>
        <button onClick={() => scrollTo('cities')}>Locations</button>
        <button onClick={() => scrollTo('contact')}>Contact</button>
      </nav>
      <div className="pp-header-actions">
        <button className="pp-header-cta" onClick={() => scrollTo('home')}>Get Free Consultation <Icon name="arrow" size={16} /></button>
        <button className="pp-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Open menu">☰</button>
      </div>
    </header>

    <main>
      <section className="pp-hero" id="home">
        <div className="pp-hero-copy">
          <span className="pp-eyebrow">CONSTRUCTION · INTERIORS · REAL ESTATE</span>
          <h1>Your Dream Space <em>Starts Here.</em></h1>
          <p>Start with your location and requirement. We help turn your idea into a structured brief that relevant businesses can understand.</p>

          <form className="pp-consult-card" onSubmit={submitHero}>
            <div className="pp-consult-tabs">
              {flowCards.map(item => <button type="button" key={item.key} className={flow === item.key ? 'active' : ''} onClick={() => { setFlow(item.key); setError('') }}>
                <Icon name={item.icon} size={17} /><span>{item.tab}</span>
              </button>)}
            </div>

            <div className="pp-location-grid">
              <label className="pp-select-field">
                <Icon name="pin" size={17} />
                <select value={form.cityId} onChange={onCityChange} disabled={masterLoading}>
                  <option value="">{masterLoading ? 'Loading Admin locations…' : 'Select City / Location'}</option>
                  {cityList.map(city => <option key={city.id} value={city.id}>{city.name}{city.state_name ? ` · ${city.state_name}` : ''}</option>)}
                </select>
              </label>

              <label className="pp-pin-field">
                <span className="pp-pin-badge">PIN</span>
                {cityPincodes.length
                  ? <select value={form.pincode} onChange={event => setForm({ ...form, pincode: event.target.value })}>
                      <option value="">Select PIN code</option>
                      {cityPincodes.map(item => <option key={item.pincode} value={item.pincode}>{item.pincode}{item.officeName ? ` · ${item.officeName}` : ''}</option>)}
                    </select>
                  : <input value={form.pincode} onChange={event => setForm({ ...form, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" maxLength="6" placeholder={form.cityId ? 'Enter 6-digit PIN' : 'PIN code'} />}
              </label>
            </div>

            <div className="pp-contact-row">
              <label><Icon name="user" size={17} /><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} autoComplete="name" placeholder="Your Name" /></label>
              <label><Icon name="phone" size={17} /><input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="tel" autoComplete="tel" placeholder="Mobile Number" /></label>
              <button type="submit">Get Free Consultation <Icon name="arrow" size={15} /></button>
            </div>

            {error && <div className="pp-form-error">{error}</div>}
            <small>Locations and PIN codes are loaded from Admin → Industries & Locations.</small>
          </form>
        </div>

        <div className="pp-hero-media">
          <img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1900&q=90" alt="Modern premium home" fetchPriority="high" />
          <div className="pp-hero-gradient" />
          <div className="pp-script"><small>FROM</small><strong>Your Ideas</strong><i>to Reality</i></div>
          <div className="pp-journey">
            <div className="pp-journey-card blueprint">
              <div className="pp-blueprint"><i /><i /><i /></div>
              <b>Plan</b>
            </div>
            <span><Icon name="arrow" size={15} /></span>
            <div className="pp-journey-card"><img src={FLOW_CONFIG[0].image} alt="" /><b>Build</b></div>
            <span><Icon name="arrow" size={15} /></span>
            <div className="pp-journey-card"><img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=86" alt="" /><b>Your Dream Home</b></div>
          </div>
        </div>
      </section>

      <section className="pp-trust-wrap">
        <div className="pp-trust-strip">
          <article><span><Icon name="chat" /></span><div><b>Free Consultation</b><small>Start without login</small></div></article>
          <article><span><Icon name="receipt" /></span><div><b>Transparent Estimates</b><small>Understand the budget first</small></div></article>
          <article><span><Icon name="shield" /></span><div><b>Relevant Businesses</b><small>Matched by category & location</small></div></article>
          <article><span><Icon name="support" /></span><div><b>End-to-End Journey</b><small>From requirement to quotations</small></div></article>
        </div>
      </section>

      <section className="pp-section pp-services" id="services">
        <div className="pp-section-title">
          <div><span className="pp-section-kicker">WHAT CAN WE HELP WITH?</span><h2>Our <em>Services</em></h2><p>Categories are linked to the active industry masters configured by Admin.</p></div>
        </div>
        <div className="pp-service-grid">
          {flowCards.map(item => <article key={item.key} className="pp-service-card">
            <div className="pp-service-img">
              <img src={item.image} alt={item.displayTitle} onError={event => { event.currentTarget.src = item.fallback }} />
              <div className="pp-service-shade" />
              <span className="pp-service-badge">{item.industry ? 'Admin enabled' : item.nav}</span>
            </div>
            <div className="pp-service-info">
              <span className="pp-service-icon"><Icon name={item.icon} size={22} /></span>
              <div>
                <h3>{item.displayTitle}</h3>
                <p>{item.description}</p>
                {item.childServices.length > 0 && <div className="pp-service-tags">{item.childServices.map(service => <span key={service.id}>{service.name}</span>)}</div>}
              </div>
              <Link to={'/' + item.key} aria-label={`Start ${item.displayTitle}`}><Icon name="arrow" size={17} /></Link>
            </div>
          </article>)}
        </div>
      </section>

      <section className="pp-estimator" id="estimators">
        <div className="pp-estimator-head">
          <span className="pp-section-kicker">PLAN YOUR BUDGET</span>
          <h2>Quick Cost Estimator</h2>
          <p>Get an indicative project range before requesting quotations.</p>
        </div>
        <div className="pp-estimator-body">
          <div className="pp-estimator-tabs">
            <button className={estimateType === 'construction' ? 'active' : ''} onClick={() => setEstimateType('construction')}><Icon name="home" size={16} />Construction</button>
            <button className={estimateType === 'interior' ? 'active' : ''} onClick={() => setEstimateType('interior')}><Icon name="sofa" size={16} />Interiors</button>
          </div>
          <label><small>Property Type</small><select><option>Select</option><option>Apartment</option><option>Villa</option><option>Independent House</option></select></label>
          <label><small>Built-up Area</small><select><option>Select</option><option>Under 1000 sq ft</option><option>1000–2000 sq ft</option><option>2000+ sq ft</option></select></label>
          <label><small>BHK</small><select><option>Select</option><option>2 BHK</option><option>3 BHK</option><option>4+ BHK</option></select></label>
          <label><small>Budget</small><select><option>Select</option><option>Under ₹20L</option><option>₹20L–₹50L</option><option>₹50L+</option></select></label>
          <button className="pp-estimate-btn" onClick={startEstimate}>Get Estimate <Icon name="arrow" size={15} /></button>
        </div>
      </section>

      <section className="pp-section pp-how" id="how-it-works">
        <div className="pp-section-title">
          <div><span className="pp-section-kicker">SIMPLE BY DESIGN</span><h2>How It <em>Works</em></h2><p>A guided customer journey without marketplace clutter.</p></div>
        </div>
        <div className="pp-how-grid">
          {[
            ['01','clipboard','Share Requirement','Choose your category, city and PIN code, then tell us what you need.'],
            ['02','calculator','Understand Budget','Use an estimator to get an indicative range before speaking to anyone.'],
            ['03','people','Receive Responses','Relevant businesses can understand the same structured brief.'],
            ['04','home','Move Forward','Compare actual quotations and choose how you want to continue.'],
          ].map(([number, icon, title, text], index) => <article key={number}>
            <span className="pp-step-number">{number}</span>
            <div className="pp-how-icon"><Icon name={icon} size={24} /></div>
            <h3>{title}</h3><p>{text}</p>
            {index < 3 && <i className="pp-step-line" />}
          </article>)}
        </div>
      </section>

      <section className="pp-projects" id="projects">
        <div className="pp-section pp-project-inner">
          <div className="pp-section-title">
            <div><span className="pp-section-kicker">INSPIRATION</span><h2>Spaces Worth <em>Building.</em></h2><p>A visual starting point for your requirement — not a catalogue of professionals.</p></div>
          </div>
          <div className="pp-project-grid">
            {PROJECTS.map(([title, city, image], index) => <article key={title} className={index === 0 ? 'featured' : ''}>
              <img src={image} alt={title} loading="lazy" />
              <div className="pp-project-overlay"><span>{city}</span><b>{title}</b></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="pp-section pp-reviews">
        <div className="pp-section-title">
          <div><span className="pp-section-kicker">CUSTOMER EXPERIENCE</span><h2>Clearer Requirements. <em>Better Conversations.</em></h2></div>
        </div>
        <div className="pp-review-grid">
          {TESTIMONIALS.map(([initials, name, city, text]) => <article key={name}>
            <div className="pp-review-top"><span>{initials}</span><div><b>{name}</b><small>{city}</small></div><i>★★★★★</i></div>
            <p>“{text}”</p>
          </article>)}
        </div>
      </section>

      <section className="pp-section pp-cities" id="cities">
        <div className="pp-section-title">
          <div><span className="pp-section-kicker">ADMIN MANAGED LOCATIONS</span><h2>Available <em>Cities</em></h2><p>Only active cities configured in Admin are shown here.</p></div>
          <span className="pp-live-count">{masterLoading ? 'Loading…' : `${cityList.length} active cities`}</span>
        </div>
        {featuredCities.length
          ? <div className="pp-city-grid">{featuredCities.map(city => <button key={city.id} onClick={() => { setForm(value => ({ ...value, cityId: String(city.id), pincode: '' })); scrollTo('home') }}><Icon name="pin" size={15} /><span>{city.name}<small>{city.state_name || 'Available'}</small></span><Icon name="arrow" size={14} /></button>)}</div>
          : <div className="pp-empty-location">{masterLoading ? 'Loading locations from Admin…' : 'No active cities are configured in Admin yet.'}</div>}
      </section>

      <section className="pp-final" id="contact">
        <div><span className="pp-section-kicker light">READY WHEN YOU ARE</span><h2>Bring <em>Your Space to Life.</em></h2><p>Start with your city, PIN code and project requirement.</p></div>
        <button onClick={() => scrollTo('home')}>Start Free Consultation <Icon name="arrow" size={16} /></button>
        <div className="pp-final-proof"><Icon name="shield" size={24} /><span><b>Customer-first</b><small>Structured requirements · protected contact details</small></span></div>
      </section>
    </main>

    <footer className="pp-footer">
      <div className="pp-footer-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse" /><p>Construction, interiors and real estate requirements — one customer starting point.</p><small>© {new Date().getFullYear()} ProPulse. All rights reserved.</small></div>
      <div><b>Quick Links</b><button onClick={() => scrollTo('home')}>Home</button><button onClick={() => scrollTo('projects')}>Projects</button><button onClick={() => scrollTo('cities')}>Locations</button><button onClick={() => scrollTo('contact')}>Contact</button></div>
      <div><b>Our Services</b><Link to="/build">Construction</Link><Link to="/design">Interior Design</Link><Link to="/property">Real Estate</Link><Link to="/construction-estimator">Cost Estimator</Link></div>
      <div><b>Support</b><Link to="/contact?audience=users">FAQs</Link><Link to="/contact?audience=users">Privacy Policy</Link><Link to="/contact?audience=users">Terms & Conditions</Link></div>
      <div className="pp-footer-contact"><b>Contact</b>{phone && <span>{phone}</span>}{email && <span>{email}</span>}<span>Hyderabad, India</span></div>
    </footer>
  </div>
}

export default Home
