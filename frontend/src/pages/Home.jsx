import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getUser, getToken, publicRequest } from '../utils/auth'
import { listLeads } from '../api/leads'
import './Home.css'

const money = value => {
  const n = Number(value)
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : ''
}

const timeAgo = value => {
  const time = new Date(value || 0).getTime()
  if (!time) return ''
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const categories = [
  { name: 'Residential Leads', query: 'residential', icon: '⌂', text: 'Villas, independent houses, apartments' },
  { name: 'Interior Leads', query: 'interior', icon: '◇', text: 'Home interiors, modular kitchens, renovations' },
  { name: 'Commercial Leads', query: 'commercial', icon: '▦', text: 'Offices, retail spaces, warehouses' },
  { name: 'Turnkey Projects', query: 'turnkey', icon: '◫', text: 'Design, build and delivery opportunities' },
  { name: 'Plot & Land Leads', query: 'plot land', icon: '⌖', text: 'Land purchase, gated communities' },
]

const faqs = [
  ['What is Propulse?', 'Propulse is a lead marketplace where businesses can discover relevant project enquiries, review lead details and purchase access to customer contact information.'],
  ['Who can buy leads?', 'Businesses looking for new project enquiries can create an account, add wallet funds when needed and purchase eligible leads from the marketplace.'],
  ['Are customer contact details visible before purchase?', 'No. Contact information is protected in the marketplace. Eligible buyers get access according to the lead purchase and entitlement rules.'],
  ['Can I search leads by location?', 'Yes. The marketplace supports location-based discovery along with industry, service and other lead fields.'],
  ['How does lead pricing work?', 'Pricing is configured by Propulse and can vary by lead, share package and eligible membership pricing. The exact price is shown before purchase.'],
]

function Home() {
  const token = getToken()
  const user = getUser()
  const loggedIn = Boolean(token && user)
  const [leads, setLeads] = useState([])
  const [leadTotal, setLeadTotal] = useState(0)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [media, setMedia] = useState({ hero_image_url: '', category_images: {} })

  useEffect(() => {
    let live = true
    publicRequest('/homepage-media').then(data => {
      if (live) setMedia({ hero_image_url: data?.hero_image_url || '', category_images: data?.category_images || {} })
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    listLeads({ status: 'available', page: 1, limit: 3, allIndustries: true, allLocations: true }, token)
      .then(data => {
        if (!live) return
        const items = (Array.isArray(data) ? data : data?.items || [])
          .filter(lead => !lead?.is_purchased && !lead?.purchased && !lead?.access?.claimed && !lead?.access?.purchased)
        setLeads(items.slice(0, 3))
        setLeadTotal(Number(data?.pagination?.total ?? items.length) || 0)
      })
      .catch(() => {
        if (live) {
          setLeads([])
          setLeadTotal(0)
        }
      })
      .finally(() => live && setLoadingLeads(false))
    return () => { live = false }
  }, [token])

  const dashboardPath = user?.role === 'admin' ? '/admin' : '/leads'
  const leadLabel = useMemo(() => leadTotal === 1 ? 'live lead available' : 'live leads available', [leadTotal])

  return (
    <div className="home-page">
      <header className="public-header">
        <Link className="brand" to="/" aria-label="Propulse home">
          <img src="/brand/propulse-logo.png" alt="Propulse" />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link className="nav-active" to="/">Home</Link>
          <Link to="/leads">Buy Leads</Link>
          <a href="#how-it-works">How It Works</a>
          <Link to="/membership">Pricing</Link>
          <a href="#why-propulse">About</a>
          <Link to="/contact">Contact</Link>
        </nav>
        <div className="header-actions">
          <Link className="header-search" to="/leads" aria-label="Search leads">⌕</Link>
          {loggedIn ? (
            <Link className="header-login" to={dashboardPath}>Marketplace</Link>
          ) : (
            <Link className="header-login" to="/login">Login</Link>
          )}
          <Link className="header-signup" to={loggedIn ? '/leads' : '/signup'}>{loggedIn ? 'Explore Leads' : 'Get Started'} <span>→</span></Link>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <span className="hero-kicker">PREMIUM LEADS FOR CONSTRUCTION &amp; INTERIOR BUSINESSES</span>
            <h1>Verified Leads.<br /><em>Real Projects.</em></h1>
            <p>Discover location-specific project enquiries from customers looking for construction, interiors and related services. Find the right opportunity, purchase access and connect directly.</p>
            <div className="hero-actions">
              <Link className="hero-primary" to="/leads">Explore Leads <span>→</span></Link>
              <a className="hero-secondary" href="#how-it-works">How It Works <span>▶</span></a>
            </div>
            <div className="hero-trust">
              <span>✓</span> Verified opportunities
              <i />
              <span>⌖</span> Location specific
              <i />
              <span>⚡</span> Real enquiries
            </div>
          </div>

          <div className="hero-visual" aria-label="Propulse lead marketplace preview">
            <div className="hero-photo">
              <img className="hero-media-image" src={media.hero_image_url || "/homepage/default-hero.svg"} alt="" />
              <div className="photo-overlay" />
              <div className="hero-building"><span>PROPULSE</span><b>PROJECT<br />OPPORTUNITY</b></div>
              <div className="hero-person"><div className="person-head" /><div className="person-body"><span>P</span></div></div>
              <div className="hero-note"><strong>More Projects</strong><em>Bigger Possibilities</em><span /></div>
            </div>
            <div className="hero-live-card">
              <span className="live-dot" />
              <div><strong>{loadingLeads ? 'Loading marketplace…' : leadTotal > 0 ? leadTotal.toLocaleString('en-IN') : 'Live'}</strong><small>{loadingLeads ? 'Checking leads' : leadTotal > 0 ? leadLabel : 'Marketplace access'}</small></div>
              <Link to="/leads">View →</Link>
            </div>
            <div className="hero-badge"><b>⌖</b><span>Location<br /><strong>Specific</strong></span></div>
          </div>
        </section>

        <section className="category-strip" aria-label="Lead categories">
          {categories.map(category => (
            <Link className="category-card" to={`/leads?search=${encodeURIComponent(category.query)}`} key={category.name}>
              <div className={`category-art art-${category.query.replaceAll(' ', '-')}`}><img src={media.category_images?.[category.query.replaceAll(' ', '-').replace('plot-land','plot_land')] || `/homepage/default-${category.query.replaceAll(' ', '-')}.svg`} alt="" /><span>{category.icon}</span></div>
              <div className="category-copy"><strong>{category.name}</strong><small>{category.text}</small></div>
              <b>→</b>
            </Link>
          ))}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <div>
              <span className="section-kicker">HOW PROPULSE WORKS</span>
              <h2>Get leads in 3 simple steps.</h2>
              <p>Move from searching for opportunities to contacting potential customers with a clear marketplace flow.</p>
            </div>
            <div className="join-card"><span>READY TO GROW?</span><strong>Start finding projects.</strong><Link to="/signup">Get Started Now <b>→</b></Link></div>
          </div>
          <div className="steps-grid">
            <article className="step"><div><b>1</b><span>▤</span></div><h3>Choose your plan</h3><p>Select the membership or buying option that fits your business.</p></article>
            <article className="step"><div><b>2</b><span>⌕</span></div><h3>Browse leads</h3><p>Explore verified project enquiries by service, industry and location.</p></article>
            <article className="step"><div><b>3</b><span>♟</span></div><h3>Buy &amp; connect</h3><p>Purchase eligible lead access and use the customer details provided.</p></article>
          </div>
        </section>

        <section className="benefit-band">
          <div><span>⌖</span><div><strong>Location-Based Leads</strong><small>Find opportunities from target cities.</small></div></div>
          <div><span>✓</span><div><strong>Verified Enquiries</strong><small>Real people. Real project requirements.</small></div></div>
          <div><span>◷</span><div><strong>Real-Time Access</strong><small>Fresh leads added to the marketplace.</small></div></div>
          <div><span>♧</span><div><strong>Dedicated Support</strong><small>Help when you need it.</small></div></div>
        </section>

        <section className="live-leads-section" id="live-leads">
          <div className="section-heading">
            <div><span className="section-kicker">LIVE MARKETPLACE</span><h2>Find your next project.</h2><p>These opportunities are loaded from the live Propulse lead marketplace.</p></div>
            <Link className="outline-link" to="/leads">View All Leads <span>→</span></Link>
          </div>
          {loadingLeads ? (
            <div className="lead-loading">Loading live opportunities…</div>
          ) : leads.length ? (
            <div className="lead-grid">
              {leads.map(lead => {
                const location = [lead.city_name, lead.state_name].filter(Boolean).join(', ')
                const shares = lead.pricing?.shares || []
                const firstPrice = shares[0] ? money(shares[0].normal) : ''
                return (
                  <article className={`lead-card ${lead.lead_type || 'basic'}`} key={lead.id}>
                    <div className="lead-top"><span>NEW</span><small>{timeAgo(lead.created_at)}</small></div>
                    <div className="lead-title"><div>{String(lead.customer_name || lead.service_name || lead.industry_name || 'L').trim().charAt(0).toUpperCase()}</div><section><strong>{lead.service_name || lead.industry_name || 'Project enquiry'}</strong><small>✓ Verified opportunity</small></section></div>
                    <p>{lead.requirement || 'Customer project requirement available in the marketplace.'}</p>
                    <div className="lead-facts">
                      {lead.industry_name && <span>▦ {lead.industry_name}</span>}
                      {lead.service_name && <span>⌁ {lead.service_name}</span>}
                      {location && <span>⌖ {location}</span>}
                    </div>
                    <div className="lead-footer"><small>{firstPrice ? `From ${firstPrice}` : 'Pricing shown after opening'}</small><Link to="/leads">View Lead →</Link></div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="lead-empty"><strong>New opportunities are being added regularly.</strong><span>Open the marketplace to check the latest available leads.</span><Link to="/leads">Explore Leads →</Link></div>
          )}
        </section>

        <section className="why-section" id="why-propulse">
          <div className="why-copy">
            <span className="section-kicker">WHY PROPULSE</span>
            <h2>Less searching.<br /><em>More opportunity.</em></h2>
            <p>Propulse brings project enquiries into one marketplace so businesses can spend less time searching for prospects and more time evaluating opportunities that match their services and locations.</p>
            <Link className="why-cta" to="/leads">Explore the marketplace <span>→</span></Link>
          </div>
          <div className="why-list">
            <div><b>01</b><strong>Relevant demand</strong><span>Browse opportunities around the services your business provides.</span></div>
            <div><b>02</b><strong>Protected contact data</strong><span>Customer contact details stay protected until eligible access is purchased or granted.</span></div>
            <div><b>03</b><strong>Clear purchase flow</strong><span>Review lead information and the configured price before completing a purchase.</span></div>
            <div><b>04</b><strong>Business-ready workflow</strong><span>Purchased leads are available through your account for follow-up and management.</span></div>
          </div>
        </section>

        <section className="testimonial-section">
          <div className="testimonial-intro"><span className="section-kicker">BUILT FOR BUSINESSES</span><h2>One marketplace for new project opportunities.</h2><p>Use Propulse to discover demand without building your own lead-search workflow from scratch.</p><Link to="/contact">Talk to our team <span>→</span></Link></div>
          <div className="testimonial-cards">
            <article><b>“</b><p>Find opportunities by service and location, review the requirement and decide whether to purchase access.</p><strong>Marketplace workflow</strong><small>Search → Review → Buy</small></article>
            <article><b>“</b><p>Keep purchased opportunities organized in your account and continue the customer conversation from there.</p><strong>Lead management</strong><small>Purchase → Access → Follow up</small></article>
            <article><b>“</b><p>Use configured membership and pricing options when your business needs a larger, repeatable lead-buying workflow.</p><strong>Flexible access</strong><small>Plan → Discover → Grow</small></article>
          </div>
        </section>

        <section className="final-cta">
          <div><span className="section-kicker">READY TO FIND YOUR NEXT PROJECT?</span><h2>Start exploring verified leads.</h2><p>Browse the live marketplace and find opportunities relevant to your business.</p></div>
          <div><Link className="final-primary" to="/leads">View Leads <span>→</span></Link><Link className="final-secondary" to="/membership">View Pricing</Link></div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="footer-brand"><Link to="/"><img src="/brand/propulse-logo.png" alt="Propulse" /></Link><p>Quality Leads. Real Growth.</p></div>
        <div><strong>Marketplace</strong><Link to="/leads">Buy Leads</Link><Link to="/membership">Pricing</Link><Link to="/industries">Industries</Link></div>
        <div><strong>Support</strong><Link to="/contact">Contact</Link><Link to="/contact">Help &amp; Support</Link><a href="#how-it-works">How It Works</a><a href="#faq">FAQs</a></div>
        <div><strong>Account</strong><Link to="/login">Login</Link><Link to="/signup">Create Account</Link><Link to="/profile">My Account</Link></div>
        <div><strong>Follow Us</strong><div className="socials"><span>f</span><span>◎</span><span>in</span><span>▶</span></div><small>Quality leads. Real opportunities.</small></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Propulse Business. All rights reserved.</span><span>Building businesses. Creating opportunities.</span></div>
      </footer>

      <section className="faq-section" id="faq">
        <div className="section-heading centered"><span className="section-kicker">FAQ</span><h2>Questions, answered.</h2><p>Understand the lead marketplace before you start.</p></div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
        </div>
      </section>
    </div>
  )
}

export default Home
