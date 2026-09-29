import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'

const SERVICES = [
  {
    key: 'build',
    nav: 'Construction',
    title: 'Home Construction',
    text: 'Build your dream home with a clear requirement, trusted businesses and transparent planning.',
    imageKey: 'residential',
    fallback: '/homepage/default-residential.svg',
    icon: '⌂',
  },
  {
    key: 'design',
    nav: 'Interiors',
    title: 'Interior Design',
    text: 'Beautiful and functional interiors for apartments, villas, offices and commercial spaces.',
    imageKey: 'interior',
    fallback: '/homepage/default-interior.svg',
    icon: '▤',
  },
  {
    key: 'property',
    nav: 'Real Estate',
    title: 'Real Estate',
    text: 'Find residential, commercial and plot requirements in the locations that matter to you.',
    imageKey: 'plot-land',
    fallback: '/homepage/default-plot-land.svg',
    icon: '⌂',
  },
]

const CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Delhi NCR', 'Mumbai', 'Pune', 'Kolkata', 'Ahmedabad']

const PROJECTS = [
  ['4 BHK Villa', 'Hyderabad', 'residential', '/homepage/default-residential.svg'],
  ['3 BHK Apartment', 'Bengaluru', 'interior', '/homepage/default-interior.svg'],
  ['Duplex House', 'Chennai', 'residential', '/homepage/default-residential.svg'],
  ['Interior Design', 'Pune', 'interior', '/homepage/default-interior.svg'],
  ['Independent House', 'Hyderabad', 'turnkey', '/homepage/default-turnkey.svg'],
]

const TESTIMONIALS = [
  ['SR', 'Suresh Reddy', 'Hyderabad', 'ProPulse helped us structure our construction requirement clearly. The process was simple and transparent.'],
  ['PS', 'Priya Sharma', 'Bengaluru', 'The interior requirement flow helped us explain exactly what we wanted before speaking with businesses.'],
  ['KM', 'Karthik Menon', 'Chennai', 'We could define our property requirement quickly and receive responses relevant to our location and budget.'],
]

function Home() {
  const navigate = useNavigate()
  const [media, setMedia] = useState({ category_images: {} })
  const [contactData, setContactData] = useState({})
  const [flow, setFlow] = useState('build')
  const [form, setForm] = useState({ pincode: '', name: '', phone: '' })
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [estimateType, setEstimateType] = useState('construction')

  useEffect(() => {
    let active = true
    publicRequest('/homepage-media').then(data => {
      if (active) setMedia({ category_images: data?.category_images || {} })
    }).catch(() => {})
    publicRequest('/contact?audience=website').then(data => {
      if (active) setContactData(data || {})
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const imageFor = (key, fallback) =>
    media.category_images?.[key] ||
    media.category_images?.[key === 'plot-land' ? 'real-estate' : key] ||
    fallback

  // Deliberately use construction/residential media for the hero.
  // The generic Admin hero can contain campaign imagery/people and should not replace
  // the customer-acquisition construction-company hero.
  const heroImage = imageFor('residential', '/homepage/default-residential.svg')

  function scrollTo(id) {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function submitHero(event) {
    event.preventDefault()
    const pincode = form.pincode.replace(/\D/g, '')
    const phone = form.phone.replace(/\D/g, '')
    if (!/^\d{6}$/.test(pincode)) return setError('Enter a valid 6-digit PIN code.')
    if (form.name.trim().length < 2) return setError('Enter your name.')
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number.')

    try {
      sessionStorage.setItem('propulse_intake_prefill', JSON.stringify({
        flowKey: flow,
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
        <button onClick={() => scrollTo('about')}>About</button>
        <button onClick={() => scrollTo('contact')}>Contact</button>
      </nav>

      <div className="pp-header-actions">
        <button className="pp-header-cta" onClick={() => scrollTo('home')}>Get Free Consultation <span>→</span></button>
        <button className="pp-menu" onClick={() => setMenuOpen(v => !v)} aria-label="Open menu">☰</button>
      </div>
    </header>

    <main>
      <section className="pp-hero" id="home">
        <div className="pp-hero-copy">
          <h1>Your Dream Space <em>Starts Here.</em></h1>
          <p>Build your home. Design your interiors. Find the right property — all in one place.</p>

          <form className="pp-consult-card" onSubmit={submitHero}>
            <div className="pp-consult-tabs">
              <button type="button" className={flow === 'build' ? 'active' : ''} onClick={() => setFlow('build')}><span>⌂</span> Build a Home</button>
              <button type="button" className={flow === 'design' ? 'active' : ''} onClick={() => setFlow('design')}><span>▤</span> Design Interiors</button>
              <button type="button" className={flow === 'property' ? 'active' : ''} onClick={() => setFlow('property')}><span>▥</span> Find Property</button>
            </div>

            <label className="pp-location-field">
              <span>⌖</span>
              <input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" placeholder="Select City / Location (PIN code)" />
              <b>⌄</b>
            </label>

            <div className="pp-contact-row">
              <label><span>♙</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" placeholder="Your Name" /></label>
              <label><span>⌕</span><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="tel" autoComplete="tel" placeholder="Mobile Number" /></label>
              <button type="submit">Get Free Consultation <span>→</span></button>
            </div>

            {error && <div className="pp-form-error">{error}</div>}
            <small>Our experts will get in touch with you shortly.</small>
          </form>
        </div>

        <div className="pp-hero-media">
          <img src={heroImage} alt="Modern premium home" onError={e => { e.currentTarget.src = '/homepage/default-residential.svg' }} />
          <div className="pp-hero-fade" />
          <div className="pp-script">From<br /><strong>Your Ideas</strong><br />to Reality</div>

          <div className="pp-journey">
            <div className="pp-journey-card plan">
              <div className="pp-plan-drawing"><i /><i /><i /><i /><i /></div>
              <b>Plan</b>
            </div>
            <span>→</span>
            <div className="pp-journey-card">
              <img src={imageFor('turnkey', '/homepage/default-turnkey.svg')} alt="" />
              <b>Build</b>
            </div>
            <span>→</span>
            <div className="pp-journey-card">
              <img src={heroImage} alt="" />
              <b>Your Dream Home</b>
            </div>
          </div>
        </div>
      </section>

      <section className="pp-trust-strip">
        <article><span>☵</span><div><b>Free Consultation</b><small>Get expert guidance</small></div></article>
        <article><span>▧</span><div><b>Transparent Estimates</b><small>No hidden costs</small></div></article>
        <article><span>♢</span><div><b>Verified Experts</b><small>Trusted & quality checked</small></div></article>
        <article><span>◉</span><div><b>End-to-End Support</b><small>From plan to handover</small></div></article>
      </section>

      <section className="pp-section pp-services" id="services">
        <div className="pp-section-title">
          <div><h2>Our <em>Services</em></h2><p>Everything you need to create, design or find your perfect space.</p></div>
          <button onClick={() => scrollTo('home')}>Explore All Services <span>→</span></button>
        </div>

        <div className="pp-service-grid">
          {SERVICES.map(item => <article key={item.key} className="pp-service-card">
            <div className="pp-service-img"><img src={imageFor(item.imageKey, item.fallback)} alt={item.title} onError={e => { e.currentTarget.src = item.fallback }} /></div>
            <div className="pp-service-info">
              <span className="pp-service-icon">{item.icon}</span>
              <div><h3>{item.title}</h3><p>{item.text}</p></div>
              <Link to={'/' + item.key}>→</Link>
            </div>
          </article>)}
        </div>
      </section>

      <section className="pp-estimator" id="estimators">
        <div className="pp-estimator-title"><h2>Quick Cost Estimator</h2><p>Get an approximate cost for your project in seconds.</p></div>
        <div className="pp-estimator-controls">
          <div className="pp-estimator-tabs">
            <button className={estimateType === 'construction' ? 'active' : ''} onClick={() => setEstimateType('construction')}>⌂ Home Construction</button>
            <button className={estimateType === 'interior' ? 'active' : ''} onClick={() => setEstimateType('interior')}>▤ Interior Design</button>
          </div>
          <label><small>Property Type</small><select><option>Select</option><option>Apartment</option><option>Villa</option><option>Independent House</option></select></label>
          <label><small>Built-up Area (sq ft)</small><select><option>Select</option><option>Under 1000</option><option>1000 - 2000</option><option>2000+</option></select></label>
          <label><small>BHK</small><select><option>Select</option><option>2 BHK</option><option>3 BHK</option><option>4+ BHK</option></select></label>
          <label><small>Your Budget (Optional)</small><select><option>Select</option><option>Under ₹20L</option><option>₹20L - ₹50L</option><option>₹50L+</option></select></label>
          <button className="pp-estimate-btn" onClick={startEstimate}>Get Estimate <span>→</span></button>
        </div>
      </section>

      <section className="pp-section pp-how" id="how-it-works">
        <div className="pp-how-heading"><h2>How It <em>Works</em></h2><p>A simple and hassle-free process.</p></div>
        <div className="pp-how-grid">
          <article><span>1</span><div className="pp-how-icon">▧</div><h3>Share Requirement</h3><p>Tell us about your project and location.</p></article>
          <i>→</i>
          <article><span>2</span><div className="pp-how-icon">▤</div><h3>Get Estimate</h3><p>Receive an estimated plan and cost.</p></article>
          <i>→</i>
          <article><span>3</span><div className="pp-how-icon">♙</div><h3>Meet Expert</h3><p>Connect with relevant businesses.</p></article>
          <i>→</i>
          <article><span>4</span><div className="pp-how-icon">⌂</div><h3>Start Project</h3><p>Compare options and move forward.</p></article>
        </div>
      </section>

      <section className="pp-projects" id="projects">
        <div className="pp-section pp-project-inner">
          <div className="pp-section-title">
            <div><h2>Real Projects. Real <em>Homes.</em></h2><p>Take inspiration from spaces across our core categories.</p></div>
            <button onClick={() => scrollTo('home')}>Start Your Project <span>→</span></button>
          </div>

          <div className="pp-project-grid">
            {PROJECTS.map(([title, city, key, fallback], index) => <article key={title}>
              <img src={imageFor(key, fallback)} alt={title} onError={e => { e.currentTarget.src = fallback }} />
              <div><b>{title}</b><small>{city}</small></div>
              {index === 0 && <span className="pp-featured">Featured</span>}
            </article>)}
          </div>
        </div>
      </section>

      <section className="pp-section pp-reviews">
        <div className="pp-section-title">
          <div><h2>What Our <em>Homeowners Say</em></h2><p>Real requirements. Clearer conversations. Better decisions.</p></div>
        </div>
        <div className="pp-review-grid">
          {TESTIMONIALS.map(([initials, name, city, text]) => <article key={name}>
            <div className="pp-review-top"><span>{initials}</span><div><b>{name}</b><small>{city}</small></div><i>★★★★★</i></div>
            <p>“{text}”</p>
            <strong>”</strong>
          </article>)}
        </div>
      </section>

      <section className="pp-section pp-cities" id="about">
        <h2>We Serve in Major Cities</h2>
        <p>Find construction, interior and property solutions in your city.</p>
        <div className="pp-city-grid">{CITIES.map(city => <span key={city}>▥ {city}</span>)}<button onClick={() => scrollTo('home')}>⌖ More Cities →</button></div>
      </section>

      <section className="pp-final" id="contact">
        <div><h2>Ready to Bring <em>Your Space to Life?</em></h2><p>Get a free consultation and expert guidance for your construction, interior or property needs.</p></div>
        <button onClick={() => scrollTo('home')}>Start Free Consultation <span>→</span></button>
        <div className="pp-trusted"><span>SR</span><span>PS</span><span>KM</span><small>Trusted by<br />homeowners</small></div>
      </section>
    </main>

    <footer className="pp-footer">
      <div className="pp-footer-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse" /><small>© {new Date().getFullYear()} ProPulse. All rights reserved.</small></div>
      <div><b>Quick Links</b><button onClick={() => scrollTo('home')}>Home</button><button onClick={() => scrollTo('about')}>About Us</button><button onClick={() => scrollTo('projects')}>Projects</button><button onClick={() => scrollTo('contact')}>Contact Us</button></div>
      <div><b>Our Services</b><Link to="/build">Construction</Link><Link to="/design">Interior Design</Link><Link to="/property">Real Estate</Link><Link to="/construction-estimator">Cost Estimator</Link></div>
      <div><b>Support</b><Link to="/contact?audience=users">FAQs</Link><Link to="/contact?audience=users">Privacy Policy</Link><Link to="/contact?audience=users">Terms & Conditions</Link></div>
      <div><b>Connect With Us</b><div className="pp-social">f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</div></div>
      <div className="pp-footer-contact">{phone && <span>⌕ {phone}</span>}{email && <span>✉ {email}</span>}<span>⌖ Hyderabad, India</span><small>Building Spaces, Elevating Lives.</small></div>
    </footer>
  </div>
}

export default Home
