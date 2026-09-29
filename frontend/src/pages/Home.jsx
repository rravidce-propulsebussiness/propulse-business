import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'

const services = [
  {
    key: 'build',
    label: 'Build a Home',
    nav: 'Construction',
    title: 'Home Construction',
    text: 'Plan a new home, villa, extension or commercial build with a clear requirement and project location.',
    action: 'Start construction requirement',
    icon: '⌂',
    imageKey: 'residential',
    fallback: '/homepage/default-residential.svg',
  },
  {
    key: 'design',
    label: 'Design Interiors',
    nav: 'Interiors',
    title: 'Interior Design',
    text: 'Share your home size, rooms, finish preferences and budget to connect with relevant interior businesses.',
    action: 'Start interior requirement',
    icon: '◇',
    imageKey: 'interior',
    fallback: '/homepage/default-interior.svg',
  },
  {
    key: 'property',
    label: 'Find Property',
    nav: 'Real Estate',
    title: 'Real Estate',
    text: 'Tell us whether you want to buy, rent, sell or invest and what kind of property you are looking for.',
    action: 'Start property requirement',
    icon: '⌂',
    imageKey: 'plot-land',
    fallback: '/homepage/default-plot-land.svg',
  },
]

const trustItems = [
  ['Free consultation', 'Start without login or upfront payment', '01'],
  ['Transparent planning', 'Share scope, budget and location clearly', '02'],
  ['Relevant businesses', 'Your requirement reaches matching providers', '03'],
  ['End-to-end journey', 'From idea and estimate to actual quotations', '04'],
]

const process = [
  ['01', 'Share your requirement', 'Choose Construction, Interiors or Real Estate and answer only the questions relevant to you.'],
  ['02', 'Understand the budget', 'Use our construction or interior estimator to get an indicative project range before you request quotes.'],
  ['03', 'Request quotations', 'Add your contact details only after your requirement is complete and you are ready to hear from businesses.'],
  ['04', 'Compare and move forward', 'Relevant businesses can respond so you can compare options and decide what works for your project.'],
]

const faqs = [
  ['Do I need to create an account?', 'No. You can submit a construction, interior or property requirement without creating an account.'],
  ['Will my phone number be public?', 'No. Contact details are protected and are only shared according to the ProPulse lead-access rules after you give consent.'],
  ['Are the cost estimators final quotations?', 'No. Estimators provide an indicative range. Actual quotations depend on site conditions, specifications, brands, scope and the business you choose.'],
  ['What happens after I submit?', 'Your requirement is added to the ProPulse lead system so relevant businesses can respond based on category, location and access rules.'],
]

function Home() {
  const navigate = useNavigate()
  const [media, setMedia] = useState({ hero_image_url: '', category_images: {} })
  const [contactData, setContactData] = useState({})
  const [selectedFlow, setSelectedFlow] = useState('build')
  const [intake, setIntake] = useState({ pincode: '', name: '', phone: '' })
  const [formError, setFormError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)

  useEffect(() => {
    let live = true
    publicRequest('/homepage-media').then(data => {
      if (!live) return
      setMedia({ hero_image_url: data?.hero_image_url || '', category_images: data?.category_images || {} })
    }).catch(() => {})
    publicRequest('/contact?audience=website').then(data => {
      if (live) setContactData(data || {})
    }).catch(() => {})
    return () => { live = false }
  }, [])


  const categoryImage = (item) => media?.category_images?.[item.imageKey]
    || media?.category_images?.[item.key]
    || item.fallback

  const heroImage = media.hero_image_url || categoryImage(services[0])

  function startJourney(event) {
    event.preventDefault()
    const pincode = intake.pincode.trim()
    const name = intake.name.trim()
    const phone = intake.phone.replace(/\D/g, '')
    if (!/^\d{6}$/.test(pincode)) {
      setFormError('Enter a valid 6-digit PIN code.')
      return
    }
    if (name.length < 2) {
      setFormError('Enter your name.')
      return
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setFormError('Enter a valid 10-digit mobile number.')
      return
    }
    try {
      sessionStorage.setItem('propulse_intake_prefill', JSON.stringify({
        flowKey: selectedFlow,
        pincode,
        name,
        phone,
        createdAt: Date.now(),
      }))
    } catch {}
    setFormError('')
    navigate('/' + selectedFlow)
  }

  function scrollToSection(id) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''

  return <div className="acq-home">
    <header className="acq-header">
      <Link to="/" className="acq-brand" aria-label="ProPulse home">
        <img src="/brand/propulse-logo.png" alt="ProPulse" />
      </Link>
      <nav className={menuOpen ? 'acq-nav open' : 'acq-nav'} aria-label="Main navigation">
        <button type="button" onClick={() => scrollToSection('home')}>Home</button>
        <button type="button" onClick={() => scrollToSection('services')}>Services</button>
        <button type="button" onClick={() => scrollToSection('estimators')}>Cost Estimator</button>
        <button type="button" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
        <button type="button" onClick={() => scrollToSection('faq')}>FAQ</button>
        <button type="button" onClick={() => scrollToSection('contact')}>Contact</button>
      </nav>
      <div className="acq-header-actions">
        <Link to="/login" className="acq-login">Login</Link>
        <button type="button" className="acq-consult" onClick={() => scrollToSection('home')}>Get Free Consultation <span>→</span></button>
        <button type="button" className="acq-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Toggle menu">☰</button>
      </div>
    </header>

    <main>
      <section className="acq-hero" id="home">
        <div className="acq-hero-copy">
          <span className="acq-kicker"><i /> YOUR DREAM SPACE, ONE STARTING POINT</span>
          <h1>Your Dream Space <em>Starts Here.</em></h1>
          <p>Build your home. Design your interiors. Find the right property. Tell us what you need and ProPulse turns it into a structured requirement for relevant businesses.</p>

          <form className="acq-intake" onSubmit={startJourney}>
            <div className="acq-flow-tabs">
              {services.map(item => <button key={item.key} type="button" className={selectedFlow === item.key ? 'active' : ''} onClick={() => { setSelectedFlow(item.key); setFormError('') }}>
                <span>{item.icon}</span>{item.label}
              </button>)}
            </div>
            <div className="acq-intake-grid">
              <label><span>Project PIN code</span><input inputMode="numeric" maxLength="6" value={intake.pincode} onChange={e => setIntake({ ...intake, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} placeholder="e.g. 500081" /></label>
              <label><span>Your name</span><input autoComplete="name" value={intake.name} onChange={e => setIntake({ ...intake, name: e.target.value })} placeholder="Name" /></label>
              <label><span>Mobile number</span><input inputMode="tel" autoComplete="tel" value={intake.phone} onChange={e => setIntake({ ...intake, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile" /></label>
              <button type="submit">Start Free Consultation <span>→</span></button>
            </div>
            {formError && <div className="acq-form-error">{formError}</div>}
            <small>No login required · Your contact details are only used after you complete the requirement and provide consent.</small>
          </form>
        </div>

        <div className="acq-hero-visual">
          <div className="acq-hero-image">
            <img src={heroImage} alt="Modern home project" onError={e => { e.currentTarget.src = '/homepage/default-hero.svg' }} />
            <div className="acq-hero-overlay" />
          </div>
          <div className="acq-dream-note"><span>FROM</span><strong>Ideas</strong><i>to</i><strong>Reality</strong></div>
          <div className="acq-story">
            <div className="active"><span>01</span><b>Plan</b><small>Share your requirement</small></div>
            <i>→</i>
            <div><span>02</span><b>Build</b><small>Connect with businesses</small></div>
            <i>→</i>
            <div><span>03</span><b>Move In</b><small>Bring the project to life</small></div>
          </div>
        </div>
      </section>

      <section className="acq-trust">
        {trustItems.map(([title, text, number]) => <article key={number}><span>{number}</span><div><b>{title}</b><small>{text}</small></div></article>)}
      </section>

      <section className="acq-section acq-services" id="services">
        <div className="acq-section-head">
          <div><span className="acq-kicker"><i /> OUR SERVICES</span><h2>Everything starts with your requirement.</h2><p>Choose what you want to create, improve or find. The public website stays customer-focused while the resulting requirement feeds the existing ProPulse lead system.</p></div>
        </div>
        <div className="acq-service-grid">
          {services.map(item => <article className="acq-service-card" key={item.key}>
            <div className="acq-service-media"><img src={categoryImage(item)} alt="" onError={e => { e.currentTarget.src = item.fallback }} /><span>{item.icon}</span></div>
            <div className="acq-service-body"><small>{item.nav.toUpperCase()}</small><h3>{item.title}</h3><p>{item.text}</p><Link to={'/' + item.key}>{item.action} <span>→</span></Link></div>
          </article>)}
        </div>
      </section>

      <section className="acq-estimator" id="estimators">
        <div className="acq-estimator-copy">
          <span className="acq-kicker light"><i /> QUICK COST ESTIMATOR</span>
          <h2>Understand your budget before you speak to anyone.</h2>
          <p>Get an indicative construction or interior range first. When you are ready, convert that estimate into a requirement and request actual quotations.</p>
          <div className="acq-estimator-actions"><Link to="/construction-estimator">Construction estimate <span>→</span></Link><Link to="/interior-estimator">Interior estimate <span>→</span></Link></div>
        </div>
        <div className="acq-estimator-cards">
          <article><span>01</span><b>Construction</b><strong>Area + package + specifications</strong><small>Turnkey, structure and finishing choices</small></article>
          <article><span>02</span><b>Interiors</b><strong>Home size + scope + finishes</strong><small>Kitchen, wardrobes, ceiling, furniture and more</small></article>
        </div>
      </section>

      <section className="acq-section acq-process" id="how-it-works">
        <div className="acq-section-head compact"><div><span className="acq-kicker"><i /> HOW IT WORKS</span><h2>A simple path from idea to actual quotations.</h2></div></div>
        <div className="acq-process-grid">
          {process.map(([number, title, text]) => <article key={number}><span>{number}</span><div className="acq-process-icon">{number === '01' ? '✎' : number === '02' ? '₹' : number === '03' ? '✓' : '⌂'}</div><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="acq-showcase">
        <div className="acq-showcase-media"><img src={categoryImage(services[1])} alt="Interior project inspiration" onError={e => { e.currentTarget.src = '/homepage/default-interior.svg' }} /></div>
        <div className="acq-showcase-copy"><span className="acq-kicker"><i /> BUILT AROUND THE CUSTOMER</span><h2>One place for the biggest decisions around your space.</h2><p>Instead of browsing unrelated directories, start with a structured requirement. ProPulse captures the details businesses need to understand your project before they contact you.</p><ul><li>Construction and interior project requirements</li><li>Indicative cost estimators before quotation requests</li><li>Property buying, renting, selling and investment enquiries</li><li>Consent-based contact sharing and protected customer details</li></ul><Link to="/build">Start with construction <span>→</span></Link></div>
      </section>

      <section className="acq-section acq-cities">
        <div className="acq-section-head compact"><div><span className="acq-kicker"><i /> LOCATION AWARE</span><h2>Start with your PIN code.</h2><p>Your location is verified against ProPulse city mapping so the requirement can reach businesses operating in the right market.</p></div></div>
        <div className="acq-city-list">{['Hyderabad','Bengaluru','Chennai','Delhi NCR','Mumbai','Pune','Kolkata','Ahmedabad'].map(city => <span key={city}>⌖ {city}</span>)}</div>
      </section>

      <section className="acq-section acq-faq" id="faq">
        <div className="acq-section-head compact"><div><span className="acq-kicker"><i /> FAQ</span><h2>Questions before you begin?</h2></div></div>
        <div className="acq-faq-list">
          {faqs.map(([question, answer], index) => <article key={question} className={openFaq === index ? 'open' : ''}><button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)}><span>{question}</span><b>{openFaq === index ? '−' : '+'}</b></button>{openFaq === index && <p>{answer}</p>}</article>)}
        </div>
      </section>

      <section className="acq-final" id="contact">
        <div><span className="acq-kicker light"><i /> READY TO START?</span><h2>Bring your space to life.</h2><p>Choose your requirement, complete the guided questions and let ProPulse route it into the right lead workflow.</p></div>
        <div className="acq-final-actions"><Link to="/build">Start Free Consultation <span>→</span></Link><Link className="secondary" to="/contact?audience=users">Talk to ProPulse</Link></div>
      </section>
    </main>

    <footer className="acq-footer">
      <div className="acq-footer-brand"><img src="/brand/propulse-logo.png" alt="ProPulse" /><p>Construction, Interior Design and Real Estate requirements — structured for customers and routed through the ProPulse lead system.</p></div>
      <div><b>Services</b><Link to="/build">Construction</Link><Link to="/design">Interior Design</Link><Link to="/property">Real Estate</Link><Link to="/construction-estimator">Cost Estimator</Link></div>
      <div><b>Help</b><Link to="/contact?audience=users">Contact</Link><button type="button" onClick={() => scrollToSection('faq')}>FAQ</button><Link to="/login">Business Login</Link></div>
      <div className="acq-footer-contact"><b>Contact</b>{phone && <span>{phone}</span>}{email && <span>{email}</span>}<small>Building Spaces, Elevating Lives.</small></div>
      <div className="acq-footer-bottom">© {new Date().getFullYear()} ProPulse. All rights reserved.</div>
    </footer>
  </div>
}

export default Home
