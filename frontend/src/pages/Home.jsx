import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=92'
const WHY_IMAGE = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=88'
const FINAL_IMAGE = 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1800&q=88'

function makeSubmissionKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'consult_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12)
}

const SERVICES = [
  {
    key: 'build',
    eyebrow: 'BUILD',
    title: 'Home Construction',
    text: 'Independent homes, villas, extensions and complete home construction requirements.',
    image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=88',
    icon: 'home',
  },
  {
    key: 'design',
    eyebrow: 'DESIGN',
    title: 'Interior Design',
    text: 'Full-home interiors, modular kitchens, wardrobes, renovation and room-by-room design.',
    image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=88',
    icon: 'sofa',
  },
  {
    key: 'property',
    eyebrow: 'DISCOVER',
    title: 'Real Estate',
    text: 'Buy, sell, rent or invest with a clear property requirement matched to your location.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=88',
    icon: 'building',
  },
]

const INSPIRATION = [
  ['Independent Houses', 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=86'],
  ['Home Renovation', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=86'],
  ['Modular Kitchens', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=86'],
  ['Living Room Interiors', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=86'],
  ['Premium Apartments', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=86'],
  ['Gated Communities', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=86'],
]

const HOMEOWNER_VALUES = [
  {
    icon: 'clipboard',
    title: 'Clear requirement first',
    text: 'Share the important details once so every conversation starts with the same project context.',
  },
  {
    icon: 'pin',
    title: 'Local relevance',
    text: 'City and PIN-based intake keeps your request focused on businesses that can actually serve your area.',
  },
  {
    icon: 'shield',
    title: 'You stay in control',
    text: 'Start with a free consultation and decide how you want to continue after reviewing your options.',
  },
]

function collection(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.items)) return value.items
  return []
}

function Icon({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (name === 'home') return <svg {...common}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if (name === 'sofa') return <svg {...common}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/><path d="M5 17v2M19 17v2"/></svg>
  if (name === 'building') return <svg {...common}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if (name === 'shield') return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'consult') return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
  if (name === 'support') return <svg {...common}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if (name === 'people') return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if (name === 'heart') return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
  if (name === 'pin') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'clipboard') return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>
  if (name === 'phone') return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'star') return <svg {...common}><path d="m12 2 3 6 7 .9-5 4.8 1.2 6.8L12 17.3 5.8 20.5 7 13.7 2 8.9 9 8Z"/></svg>
  return null
}

function Home() {
  const navigate = useNavigate()
  const [cities, setCities] = useState([])
  const [contactData, setContactData] = useState({})
  const [homepageMedia, setHomepageMedia] = useState({ hero_image_url: '', category_images: {} })
  const [loadingCities, setLoadingCities] = useState(true)
  const [consultOpen, setConsultOpen] = useState(false)
  const [popupCycle, setPopupCycle] = useState(0)
  const [consultForm, setConsultForm] = useState({ flowKey: '', cityId: '', name: '', phone: '', consent: false, website: '' })
  const [consultSubmissionKey, setConsultSubmissionKey] = useState(makeSubmissionKey)
  const [consultError, setConsultError] = useState('')
  const [consultSaving, setConsultSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let active = true
    setLoadingCities(true)
    Promise.allSettled([
      publicRequest('/cities'),
      publicRequest('/contact?audience=website'),
      publicRequest('/homepage-media'),
    ]).then(([cityResult, contactResult, mediaResult]) => {
      if (!active) return
      if (cityResult.status === 'fulfilled') setCities(collection(cityResult.value))
      if (contactResult.status === 'fulfilled') setContactData(contactResult.value || {})
      if (mediaResult.status === 'fulfilled') setHomepageMedia({
        hero_image_url: mediaResult.value?.hero_image_url || '',
        category_images: mediaResult.value?.category_images || {},
      })
      setLoadingCities(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setConsultOpen(true), 5 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [popupCycle])

  const cityList = useMemo(
    () => [...cities].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [cities]
  )

  const selectedCity = useMemo(
    () => cityList.find(city => String(city.id) === String(consultForm.cityId)),
    [cityList, consultForm.cityId]
  )

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  function scrollToSection(id) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openConsult(flowKey = '') {
    setConsultError('')
    setConsultForm(current => ({ ...current, flowKey: flowKey || current.flowKey }))
    setConsultOpen(true)
  }

  function closeConsult() {
    setConsultOpen(false)
    setConsultError('')
    setPopupCycle(value => value + 1)
  }

  async function submitConsult(event) {
    event.preventDefault()
    const mobile = consultForm.phone.replace(/\D/g, '')
    const name = consultForm.name.trim()
    if (!consultForm.flowKey) return setConsultError('Select what you need help with.')
    if (!consultForm.cityId) return setConsultError('Select your city or location.')
    if (name.length < 2) return setConsultError('Enter your name.')
    if (!/^[6-9]\d{9}$/.test(mobile)) return setConsultError('Enter a valid 10-digit mobile number.')
    if (!consultForm.consent) return setConsultError('Please accept the contact consent to continue.')

    try {
      setConsultSaving(true)
      setConsultError('')
      const query = new URLSearchParams(window.location.search)
      await publicRequest('/customer-flows/' + consultForm.flowKey + '/consultation', {
        method: 'POST',
        body: JSON.stringify({
          cityId: Number(consultForm.cityId),
          contact: { name, phone: mobile, email: '' },
          consent: true,
          submissionKey: consultSubmissionKey,
          website: consultForm.website,
          attribution: {
            utmSource: query.get('utm_source') || '',
            utmMedium: query.get('utm_medium') || '',
            utmCampaign: query.get('utm_campaign') || '',
            utmContent: query.get('utm_content') || '',
            utmTerm: query.get('utm_term') || '',
            referrer: document.referrer || '',
            landingPath: window.location.pathname + window.location.search,
          },
        }),
      })

      try {
        sessionStorage.setItem('propulse_intake_prefill', JSON.stringify({
          flowKey: consultForm.flowKey,
          cityId: Number(consultForm.cityId),
          cityName: selectedCity?.name || '',
          name,
          phone: mobile,
          consent: true,
          submissionKey: consultSubmissionKey,
          createdAt: Date.now(),
        }))
      } catch {}

      setConsultOpen(false)
      navigate('/' + consultForm.flowKey)
    } catch (error) {
      setConsultError(error.message || 'Unable to submit your consultation request.')
      setConsultSubmissionKey(current => current || makeSubmissionKey())
    } finally {
      setConsultSaving(false)
    }
  }

  const media = homepageMedia.category_images || {}
  const heroImage = homepageMedia.hero_image_url || HERO_IMAGE
  const serviceMedia = {
    build: media.residential || SERVICES[0].image,
    design: media.interior || SERVICES[1].image,
    property: media.commercial || media.plot_land || SERVICES[2].image,
  }
  const whyImage = media.why_homeowners || WHY_IMAGE
  const finalImage = media.final_cta || FINAL_IMAGE

  return <div className="hc-home">
    <header className="hc-header">
      <Link className="hc-logo" to="/" aria-label="ProPulse home">
        <img src="/brand/propulse-logo.svg" alt="ProPulse" />
      </Link>

      <nav className={menuOpen ? 'hc-nav open' : 'hc-nav'} aria-label="Main navigation">
        <button className="active" onClick={() => scrollToSection('home')}>Home</button>
        <Link to="/build">Construction</Link>
        <Link to="/design">Interior Design</Link>
        <Link to="/property">Real Estate</Link>
        <button onClick={() => scrollToSection('how-it-works')}>How It Works</button>
        <button onClick={() => scrollToSection('about')}>About</button>
        <button onClick={() => scrollToSection('contact')}>Contact</button>
      </nav>

      <div className="hc-header-actions">
        <button className="hc-consult-btn" onClick={() => openConsult()}>Get Free Consultation <Icon name="arrow" size={15} /></button>
        <button className="hc-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(value => !value)}>☰</button>
      </div>
    </header>

    <main>
      <section className="hc-hero" id="home">
        <img className="hc-hero-image" src={heroImage} alt="Modern family home" fetchPriority="high" />
        <div className="hc-hero-wash" />

        <div className="hc-hero-copy">
          <span className="hc-trust-pill"><Icon name="people" size={17} /> Homeowners first · plan with confidence</span>
          <h1>Your Dream Home <em>Starts Here</em></h1>
          <p>Get connected with relevant builders, interior designers and real estate businesses for your home needs. Plan, design, build or find property with a clear requirement from the start.</p>

          <div className="hc-hero-benefits">
            <div><span><Icon name="shield" size={19} /></span><b>Relevant Businesses</b></div>
            <div><span><Icon name="consult" size={19} /></span><b>Free Consultation</b></div>
            <div><span><Icon name="support" size={19} /></span><b>Guided Journey</b></div>
            <div><span><Icon name="heart" size={19} /></span><b>Homeowner Focused</b></div>
          </div>

          <button className="hc-primary-cta" onClick={() => scrollToSection('services')}>Explore Home Solutions <Icon name="arrow" size={18} /></button>
        </div>

        <div className="hc-hero-menu">
          <button onClick={() => openConsult('build')}><span><Icon name="home" size={18} /></span><b>Build Your Home</b></button>
          <button onClick={() => openConsult('design')}><span><Icon name="sofa" size={18} /></span><b>Design Your Interiors</b></button>
          <button onClick={() => openConsult('property')}><span><Icon name="building" size={18} /></span><b>Buy or Sell Property</b></button>
          <button onClick={() => openConsult('property')}><span><Icon name="star" size={18} /></span><b>Property Guidance</b></button>
        </div>
      </section>

      <section className="hc-stats" aria-label="ProPulse homeowner benefits">
        <article><span><Icon name="people" /></span><div><strong>Homeowner First</strong><small>Built around customer requirements</small></div></article>
        <article><span><Icon name="building" /></span><div><strong>3 Core Journeys</strong><small>Construction · Interiors · Property</small></div></article>
        <article><span><Icon name="pin" /></span><div><strong>Location Aware</strong><small>City and PIN-based intake</small></div></article>
        <article><span><Icon name="heart" /></span><div><strong>Free to Start</strong><small>Begin with consultation</small></div></article>
      </section>

      <section className="hc-section hc-services" id="services">
        <div className="hc-section-heading">
          <span>Your home. Our structured journey.</span>
          <h2>Explore What You Need</h2>
          <p>Choose the right starting point for your home and share one clear requirement.</p>
        </div>

        <div className="hc-service-grid">
          {SERVICES.map(service => <article className="hc-service-card" key={service.key}>
            <div className="hc-service-image"><img src={serviceMedia[service.key] || service.image} alt={service.title} loading="lazy" /><div /></div>
            <div className="hc-service-body">
              <span className="hc-service-icon"><Icon name={service.icon} size={22} /></span>
              <div>
                <small>{service.eyebrow}</small>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </div>
              <Link to={'/' + service.key} aria-label={'Start ' + service.title}><Icon name="arrow" size={17} /></Link>
            </div>
          </article>)}
        </div>
      </section>

      <section className="hc-why" id="about" style={{ backgroundImage: `url("${whyImage}")` }}>
        <div className="hc-why-shade" />
        <div className="hc-why-inner">
          <div className="hc-why-heading">
            <h2>Why Homeowners Choose ProPulse</h2>
            <p>We make the first step easier: explain what you need, keep the project context organised and move forward with relevant options.</p>
          </div>

          <div className="hc-why-grid">
            <article><span><Icon name="shield" /></span><div><b>Structured Requirements</b><small>Your project details stay clear from the beginning.</small></div></article>
            <article><span><Icon name="people" /></span><div><b>Multiple Options</b><small>Use the same brief when comparing responses.</small></div></article>
            <article><span><Icon name="consult" /></span><div><b>Free Consultation</b><small>Start without paying for the initial consultation.</small></div></article>
            <article><span><Icon name="support" /></span><div><b>End-to-End Journey</b><small>From planning to the next project decision.</small></div></article>
          </div>
        </div>
      </section>

      <section className="hc-section hc-how" id="how-it-works">
        <div className="hc-section-heading">
          <span>Simple by design</span>
          <h2>How It Works</h2>
          <p>Start your home journey in a few clear steps.</p>
        </div>

        <div className="hc-how-grid">
          <article><div><b>1</b><span><Icon name="clipboard" /></span></div><h3>Tell Us Your Requirement</h3><p>Choose construction, interiors or real estate and share the project details.</p></article>
          <i><Icon name="arrow" size={22} /></i>
          <article><div><b>2</b><span><Icon name="people" /></span></div><h3>We Structure the Brief</h3><p>Your answers become one clear requirement instead of scattered calls and messages.</p></article>
          <i><Icon name="arrow" size={22} /></i>
          <article><div><b>3</b><span><Icon name="consult" /></span></div><h3>Discuss Your Options</h3><p>Relevant businesses can respond with better context about what you actually need.</p></article>
          <i><Icon name="arrow" size={22} /></i>
          <article><div><b>4</b><span><Icon name="home" /></span></div><h3>Move Your Home Forward</h3><p>Compare the next steps and choose how you want your project to continue.</p></article>
        </div>
      </section>

      <section className="hc-inspiration">
        <div className="hc-section-heading compact">
          <span>Ideas for your next step</span>
          <h2>Home Inspiration</h2>
          <p>Explore the kinds of projects homeowners can start through ProPulse.</p>
        </div>

        <div className="hc-inspiration-grid">
          {INSPIRATION.map(([title, image]) => <button key={title} onClick={() => openConsult()}>
            <img src={image} alt="" loading="lazy" />
            <span>{title}</span>
          </button>)}
        </div>
      </section>

      <section className="hc-section hc-homeowner-values">
        <div className="hc-section-heading">
          <span>Trust starts with clarity</span>
          <h2>Designed Around Homeowner Concerns</h2>
          <p>Everything is designed around a homeowner’s questions first, so you can understand the next step before choosing how to continue.</p>
        </div>

        <div className="hc-value-grid">
          {HOMEOWNER_VALUES.map(item => <article key={item.title}>
            <span><Icon name={item.icon} size={24} /></span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <div><Icon name="check" size={15} /> Homeowner-first experience</div>
          </article>)}
        </div>
      </section>

      <section className="hc-final" id="contact">
        <img src={finalImage} alt="" loading="lazy" />
        <div className="hc-final-shade" />
        <div className="hc-final-copy">
          <span>Ready when you are</span>
          <h2>Ready to Plan Your Home?</h2>
          <p>Start with a free consultation and continue with the right construction, interior or property requirement.</p>
          <div>
            <button onClick={() => openConsult()}>Get Free Consultation <Icon name="arrow" size={16} /></button>
            <button className="secondary" onClick={() => scrollToSection('services')}>Explore Services</button>
          </div>
        </div>
        <div className="hc-final-trust">
          <div><span><Icon name="consult" size={18} /></span><b>Free consultation</b></div>
          <div><span><Icon name="shield" size={18} /></span><b>Structured homeowner brief</b></div>
        </div>
      </section>
    </main>

    <footer className="hc-footer">
      <div className="hc-footer-brand">
        <img src="/brand/propulse-logo.svg" alt="ProPulse" />
        <p>A homeowner-first starting point for construction, interiors and real estate requirements.</p>
      </div>
      <div><b>Home Solutions</b><Link to="/build">Construction</Link><Link to="/design">Interior Design</Link><Link to="/property">Real Estate</Link></div>
      <div><b>Quick Links</b><button onClick={() => scrollToSection('how-it-works')}>How It Works</button><button onClick={() => openConsult()}>Free Consultation</button><Link to="/contact">Contact</Link></div>
      <div><b>Contact</b>{phone && <a href={'tel:' + String(phone).replace(/\s/g, '')}>{phone}</a>}{email && <a href={'mailto:' + email}>{email}</a>}<span>Hyderabad, India</span></div>
    </footer>

    {consultOpen && <aside className="hc-consult-popup" role="dialog" aria-label="Free consultation">
      <button className="hc-popup-close" type="button" onClick={closeConsult} aria-label="Close consultation popup">×</button>
      <div className="hc-popup-head">
        <span><Icon name="phone" size={21} /></span>
        <div><h3>Get Free Consultation</h3><p>Tell us what you need and continue with a guided homeowner requirement.</p></div>
      </div>

      <form onSubmit={submitConsult}>
        <label>
          <span>I am looking for</span>
          <select value={consultForm.flowKey} onChange={event => { setConsultForm({ ...consultForm, flowKey: event.target.value }); setConsultError('') }}>
            <option value="">Select requirement</option>
            <option value="build">Home Construction</option>
            <option value="design">Interior Design</option>
            <option value="property">Real Estate</option>
          </select>
        </label>

        <label>
          <span>City / Location</span>
          <select value={consultForm.cityId} disabled={loadingCities} onChange={event => { setConsultForm({ ...consultForm, cityId: event.target.value }); setConsultError('') }}>
            <option value="">{loadingCities ? 'Loading locations…' : 'Select city'}</option>
            {cityList.map(city => <option value={city.id} key={city.id}>{city.name}{city.state_name ? ' · ' + city.state_name : ''}</option>)}
          </select>
        </label>

        <label>
          <span>Your Name</span>
          <input className="hc-popup-input" autoComplete="name" maxLength="160" value={consultForm.name} onChange={event => { setConsultForm({ ...consultForm, name: event.target.value }); setConsultError('') }} placeholder="Enter your name" />
        </label>

        <label>
          <span>Mobile Number</span>
          <div className="hc-popup-phone"><i>+91</i><input inputMode="tel" autoComplete="tel" maxLength="10" value={consultForm.phone} onChange={event => { setConsultForm({ ...consultForm, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }); setConsultError('') }} placeholder="Enter 10-digit number" /></div>
        </label>

        <label className="hc-popup-consent">
          <input type="checkbox" checked={consultForm.consent} onChange={event => { setConsultForm({ ...consultForm, consent: event.target.checked }); setConsultError('') }} />
          <span>I agree that ProPulse may use and share my submitted contact details with relevant businesses so they can respond to this requirement.</span>
        </label>
        <label className="hc-popup-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={consultForm.website} onChange={event => setConsultForm({ ...consultForm, website: event.target.value })} /></label>

        {consultError && <div className="hc-popup-error">{consultError}</div>}
        <button className="hc-popup-submit" type="submit" disabled={consultSaving}>{consultSaving ? 'Submitting…' : 'Submit Request'} {!consultSaving && <Icon name="arrow" size={15} />}</button>
        <small><Icon name="shield" size={12} /> Your consultation is saved first, then you can add project details.</small>
      </form>
    </aside>}
  </div>
}

export default Home
