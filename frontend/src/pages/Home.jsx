import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Home.css'

const IMAGES = {
  hero: '/homepage/premium-hero.svg',
  construction: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=85',
  interior: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85',
  realEstate: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85',
  project1: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=84',
  project2: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=84',
  project3: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=84',
  project4: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=84',
  project5: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=900&q=84',
}

const SERVICES = [
  {
    key: 'build',
    title: 'Home Construction',
    text: 'Build your dream home with trusted businesses, clear requirements and transparent planning.',
    image: IMAGES.construction,
    fallback: '/homepage/default-residential.svg',
    icon: '⌂',
  },
  {
    key: 'design',
    title: 'Interior Design',
    text: 'Beautiful and functional interiors for homes, apartments, villas, offices and commercial spaces.',
    image: IMAGES.interior,
    fallback: '/homepage/default-interior.svg',
    icon: '▤',
  },
  {
    key: 'property',
    title: 'Real Estate',
    text: 'Find residential, commercial and plot opportunities in locations that match your requirement.',
    image: IMAGES.realEstate,
    fallback: '/homepage/default-plot-land.svg',
    icon: '⌂',
  },
]

const CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Delhi NCR', 'Mumbai', 'Pune', 'Kolkata', 'Ahmedabad']

const PROJECTS = [
  ['4 BHK Villa', 'Hyderabad', IMAGES.project1, '/homepage/default-residential.svg'],
  ['3 BHK Apartment', 'Bengaluru', IMAGES.project2, '/homepage/default-interior.svg'],
  ['Duplex House', 'Chennai', IMAGES.project3, '/homepage/default-residential.svg'],
  ['Interior Design', 'Pune', IMAGES.project4, '/homepage/default-interior.svg'],
  ['Independent House', 'Hyderabad', IMAGES.project5, '/homepage/default-turnkey.svg'],
]

const TESTIMONIALS = [
  ['SR', 'Suresh Reddy', 'Hyderabad', 'ProPulse helped us structure our construction requirement clearly. The entire process was simple and transparent.'],
  ['PS', 'Priya Sharma', 'Bengaluru', 'Our interior requirement was easier to explain, and we could compare responses with much better clarity.'],
  ['KM', 'Karthik Menon', 'Chennai', 'We defined our property requirement quickly and received responses relevant to our location and budget.'],
]

function Home() {
  const navigate = useNavigate()
  const [contactData, setContactData] = useState({})
  const [flow, setFlow] = useState('build')
  const [form, setForm] = useState({ pincode: '', name: '', phone: '' })
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [estimateType, setEstimateType] = useState('construction')

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    let active = true
    publicRequest('/contact?audience=website').then(data => {
      if (active) setContactData(data || {})
    }).catch(() => {})
    return () => { active = false }
  }, [])

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
        <button className="pp-menu" onClick={() => setMenuOpen(value => !value)} aria-label="Open menu">☰</button>
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
              <input value={form.pincode} onChange={event => setForm({ ...form, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" placeholder="Select City / Location" />
              <b>⌄</b>
            </label>

            <div className="pp-contact-row">
              <label><span>♙</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} autoComplete="name" placeholder="Your Name" /></label>
              <label><span>⌕</span><input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} inputMode="tel" autoComplete="tel" placeholder="Mobile Number" /></label>
              <button type="submit">Get Free Consultation <span>→</span></button>
            </div>

            {error && <div className="pp-form-error">{error}</div>}
            <small>Our experts will get in touch with you shortly.</small>
          </form>
        </div>

        <div className="pp-hero-media">
          <img src={IMAGES.hero} alt="Premium modern villa" fetchPriority="high" onError={event => { event.currentTarget.src = '/homepage/default-residential.svg' }} />
          <div className="pp-hero-fade" />
          <div className="pp-journey">
            <div className="pp-journey-card plan">
              <div className="pp-plan-drawing" />
              <b>Plan</b>
            </div>
            <span>→</span>
            <div className="pp-journey-card">
              <img src={IMAGES.construction} alt="" />
              <b>Build</b>
            </div>
            <span>→</span>
            <div className="pp-journey-card">
              <img src={IMAGES.hero} alt="" />
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
            <div className="pp-service-img"><img src={item.image} alt={item.title} loading="lazy" onError={event => { event.currentTarget.src = item.fallback }} /></div>
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
            <div><h2>Real Projects. Real <em>Homes.</em></h2><p>Take inspiration from completed spaces and project ideas.</p></div>
            <button onClick={() => scrollTo('home')}>View All Projects <span>→</span></button>
          </div>

          <div className="pp-project-grid">
            {PROJECTS.map(([title, city, image, fallback]) => <article key={title}>
              <img src={image} alt={title} loading="lazy" onError={event => { event.currentTarget.src = fallback }} />
              <div><b>{title}</b><small>{city}</small></div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="pp-section pp-reviews">
        <div className="pp-section-title">
          <div><h2>What Our <em>Homeowners Say</em></h2><p>Real families. Real experiences.</p></div>
          <button onClick={() => scrollTo('home')}>View All Reviews <span>→</span></button>
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
        <p>Find reliable construction, interior and property solutions in your city.</p>
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
