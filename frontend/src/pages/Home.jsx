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

const pricingFallback = [
  { category: 'Marketing', name: 'Marketing & Technology', tagline: 'Websites, apps, marketing & creative.', description: 'Websites, web apps, mobile apps, SEO, social media, performance marketing, branding, photography and video.', price_label: 'Custom quote', billing_note: 'Scope-based pricing', features: ['Website & web app development', 'Mobile app development', 'SEO, social media & performance marketing', 'Branding, photography & video'], cta_label: 'Talk to Marketing', cta_url: '/contact', highlighted: false, image_url: '/homepage/default-marketing.svg' },
  { category: 'Lead Sales', name: 'Lead Marketplace', tagline: 'Buy leads. Reach real opportunities.', description: 'Discover relevant customer enquiries by service and location, review the opportunity and buy eligible access.', price_label: 'Pay per lead', billing_note: 'Exact price shown before purchase', features: ['Location-based lead discovery', 'Protected customer contact data', 'Configured lead pricing', 'Purchased-lead management'], cta_label: 'Explore Leads', cta_url: '/leads', highlighted: true, image_url: '/homepage/default-hero.svg' },
  { category: 'Government Compliance', name: 'Business & Tax Compliance', tagline: 'Registration, GST, ITR & filing support.', description: 'Support for company registration, GST workflows, ITR preparation and filing, documentation and selected statutory compliance workflows.', price_label: 'Custom quote', billing_note: 'Scope and authority dependent', features: ['Company / business registration support', 'GST registration & workflow support', 'ITR preparation & filing support', 'Statutory document coordination'], cta_label: 'Talk to Compliance', cta_url: '/contact', highlighted: false, image_url: '/homepage/default-compliance.svg' }
]

function Home() {
  const token = getToken()
  const user = getUser()
  const loggedIn = Boolean(token && user)
  const [leads, setLeads] = useState([])
  const [leadTotal, setLeadTotal] = useState(0)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [media, setMedia] = useState({ hero_image_url: '', category_images: {} })
  const [activeNav, setActiveNav] = useState('home')
  const [servicePricing, setServicePricing] = useState(pricingFallback)
  const [contactData, setContactData] = useState({})
  const [homepageFaqs, setHomepageFaqs] = useState([])
  const [openFaq, setOpenFaq] = useState(null)

  useEffect(() => {
    let live = true
    publicRequest('/homepage-media').then(data => {
      if (live) setMedia({ hero_image_url: data?.hero_image_url || '', category_images: data?.category_images || {} })
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    publicRequest('/service-pricing').then(data => {
      if (!live) return
      const items = Array.isArray(data) ? data.filter(item => item?.is_active !== false).slice(0, 3) : []
      if (items.length) setServicePricing(items)
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    publicRequest('/contact?audience=website').then(data => {
      if (live) setContactData(data || {})
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    publicRequest('/faqs?audience=website').then(data => {
      if (!live) return
      const items = Array.isArray(data) ? data.filter(item => item?.is_active !== false) : []
      if (items.length) setHomepageFaqs(items)
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    const sections = [
      ['home', 'home-top'],
      ['how-it-works', 'how-it-works'],
      ['pricing', 'pricing'],
      ['about', 'about'],
      ['contact', 'contact'],
      ['faq', 'faq']
    ]
    const observed = sections.map(([key, id]) => {
      const node = document.getElementById(id)
      return node ? [key, node] : null
    }).filter(Boolean)
    if (!observed.length) return undefined

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (!visible) return
      const match = observed.find(([, node]) => node === visible.target)
      if (match) setActiveNav(match[0])
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.15, 0.35, 0.6] })

    observed.forEach(([, node]) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('home-scroll')
    const hash = window.location.hash.replace('#', '')
    if (hash === 'how-it-works' || hash === 'pricing' || hash === 'about' || hash === 'contact' || hash === 'faq') setActiveNav(hash)
    else if (!hash) setActiveNav('home')
    return () => document.documentElement.classList.remove('home-scroll')
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

  const scrollToHome = event => {
    event?.preventDefault()
    const home = document.getElementById('home-top')
    window.history.replaceState({}, '', '/')
    setActiveNav('home')
    if (home) home.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToSection = (event, id) => {
    event?.preventDefault()
    const target = document.getElementById(id)
    setActiveNav(id)
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const dashboardPath = user?.role === 'admin' ? '/admin' : '/leads'
  const leadLabel = useMemo(() => leadTotal === 1 ? 'live lead available' : 'live leads available', [leadTotal])

  return (
    <div className="home-page">
      <header className="public-header">
        <Link className="brand" to="/" aria-label="Propulse home">
          <img src="/brand/propulse-logo.png" alt="Propulse" />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a className={activeNav === 'home' ? 'nav-active' : ''} href="#home-top" onClick={scrollToHome}>Home</a>
          <Link to="/leads">Buy Leads</Link>
          <a className={activeNav === 'how-it-works' ? 'nav-active' : ''} href="#how-it-works" onClick={event => scrollToSection(event, 'how-it-works')}>How It Works</a>
          <a className={activeNav === 'pricing' ? 'nav-active' : ''} href="#pricing" onClick={event => scrollToSection(event, 'pricing')}>Pricing</a>
          <a className={activeNav === 'about' ? 'nav-active' : ''} href="#about" onClick={event => scrollToSection(event, 'about')}>About</a>
          <a className={activeNav === 'contact' ? 'nav-active' : ''} href="#contact" onClick={event => scrollToSection(event, 'contact')}>Contact</a>
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
        <section id="home-top" className="hero-section home-reveal is-visible">
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
              <img className="hero-media-image" src={media.hero_image_url || "/homepage/default-hero.svg"} alt="Propulse project opportunities" />
              <div className="photo-overlay" />
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

        <section className="how-section home-reveal" id="how-it-works">
          <div className="section-heading">
            <div>
              <span className="section-kicker">THE PROPULSE BUYING FLOW</span>
              <h2>Discover. Evaluate. Buy. Connect.</h2>
              <p>Move from your first search to customer follow-up through a clear, focused lead marketplace experience.</p>
            </div>
            <div className="join-card"><span>READY WHEN YOU ARE</span><strong>Start with the right opportunities.</strong><Link to="/leads">Explore Live Leads <b>→</b></Link></div>
          </div>
          <div className="steps-grid">
            <article className="step"><div><b>1</b><span>⌖</span></div><h3>Set your target</h3><p>Choose the industries, services and locations that match your business.</p></article>
            <article className="step"><div><b>2</b><span>⌕</span></div><h3>Browse &amp; evaluate</h3><p>Review each opportunity, requirement and available purchase details.</p></article>
            <article className="step"><div><b>3</b><span>↗</span></div><h3>Buy access &amp; connect</h3><p>Complete your purchase, unlock eligible contact details and follow up.</p></article>
          </div>
        </section>

        <section className="pricing-section-home home-reveal" id="pricing">
          <div className="pricing-home-head">
            <div>
              <span className="section-kicker">SERVICES &amp; PRICING</span>
              <h2>Everything your business needs to grow.</h2>
              <p>Choose the service that matches your next business goal — digital growth, lead acquisition, or business and tax compliance support.</p>
            </div>
            <Link className="pricing-home-action" to="/leads">Browse Live Leads <span>→</span></Link>
          </div>

          <div className="pricing-home-grid">
            {servicePricing.map((item, index) => (
              <article className={item.highlighted ? 'pricing-home-card featured' : 'pricing-home-card'} key={item.id || item.slug || item.name}>
                <div className="pricing-home-image">
                  <img src={item.image_url || pricingFallback[index]?.image_url || '/homepage/default-hero.svg'} alt="" />
                  {item.highlighted && <span className="pricing-home-badge">LEAD MARKETPLACE</span>}
                </div>
                <div className="pricing-home-card-body">
                  <div className="pricing-home-meta"><span>{item.category}</span><small>{item.highlighted ? 'Core marketplace' : 'Business service'}</small></div>
                  <h3>{item.name}</h3>
                  <strong>{item.tagline}</strong>
                  <p>{item.description}</p>
                  <div className="pricing-home-price"><b>{item.price_label}</b><span>{item.billing_note}</span></div>
                  <ul>
                    {(Array.isArray(item.features) ? item.features : []).slice(0, 5).map((feature, featureIndex) => (
                      <li key={featureIndex}><i>✓</i><span>{feature}</span></li>
                    ))}
                  </ul>
                  <Link className={item.highlighted ? 'pricing-home-cta primary' : 'pricing-home-cta'} to={item.cta_url || '/contact'}>{item.cta_label || 'Get Started'} <span>→</span></Link>
                </div>
              </article>
            ))}
          </div>

          <div className="pricing-home-footer"><span>Pricing, features, images and service descriptions are managed from Admin.</span><span>Choose a service and contact Propulse to get started.</span></div>
        </section>

        <section className="benefit-band">
          <div><span>⌖</span><div><strong>Location-Based Leads</strong><small>Find opportunities from target cities.</small></div></div>
          <div><span>✓</span><div><strong>Verified Enquiries</strong><small>Real people. Real project requirements.</small></div></div>
          <div><span>◷</span><div><strong>Real-Time Access</strong><small>Fresh leads added to the marketplace.</small></div></div>
          <div><span>♧</span><div><strong>Dedicated Support</strong><small>Help when you need it.</small></div></div>
        </section>

        <section className="live-leads-section home-reveal" id="live-leads">
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

        <section className="why-section about-section home-reveal" id="about">
          <div className="why-copy about-copy">
            <span className="section-kicker">ABOUT PROPULSE</span>
            <h2>Technology built around <em>business growth.</em></h2>
            <p><strong>Propulse Business Technologies Private Limited</strong> is an IT technology company focused on helping businesses build, digitize, operate and scale.</p>
            <p>We bring practical digital capabilities together under one platform — from websites and business software to mobile apps, digital marketing, lead acquisition, automation and technology support.</p>
            <p>Our goal is simple: make it easier for a business to use technology across the full journey, from getting discovered and generating opportunities to managing digital operations and supporting day-to-day business needs.</p>
            <a className="why-cta" href="#contact" onClick={event => scrollToSection(event, 'contact')}>Talk to Propulse <span>→</span></a>
          </div>
          <div className="why-list about-capabilities">
            <div><b>01</b><strong>Build digital presence</strong><span>Websites, web apps, business portals, mobile applications and digital experiences designed around your business.</span></div>
            <div><b>02</b><strong>Generate demand</strong><span>SEO, social media, performance marketing, creative production, photography, video and business-focused campaigns.</span></div>
            <div><b>03</b><strong>Acquire opportunities</strong><span>Propulse connects businesses with a lead marketplace for discovering, evaluating and purchasing relevant customer enquiries.</span></div>
            <div><b>04</b><strong>Digitize operations</strong><span>Business software, automation, workflows, data tools and technology support that help teams work more efficiently.</span></div>
            <div><b>05</b><strong>Support business requirements</strong><span>Technology-led support for business processes, documentation and selected compliance workflows, depending on the requirement.</span></div>
            <div><b>06</b><strong>Scale with one technology partner</strong><span>Use Propulse for individual digital projects or combine services as your business grows and requirements change.</span></div>
          </div>
        </section>

        <section className="testimonial-section home-reveal">
          <div className="testimonial-intro"><span className="section-kicker">BUILT FOR BUSINESSES</span><h2>One marketplace for new project opportunities.</h2><p>Use Propulse to discover demand without building your own lead-search workflow from scratch.</p><a href="#contact" onClick={event => scrollToSection(event, 'contact')}>Talk to our team <span>→</span></a></div>
          <div className="testimonial-cards">
            <article><b>“</b><p>Find opportunities by service and location, review the requirement and decide whether to purchase access.</p><strong>Marketplace workflow</strong><small>Search → Review → Buy</small></article>
            <article><b>“</b><p>Keep purchased opportunities organized in your account and continue the customer conversation from there.</p><strong>Lead management</strong><small>Purchase → Access → Follow up</small></article>
            <article><b>“</b><p>Use configured membership and pricing options when your business needs a larger, repeatable lead-buying workflow.</p><strong>Flexible access</strong><small>Plan → Discover → Grow</small></article>
          </div>
        </section>

        <section className="final-cta home-reveal">
          <div><span className="section-kicker">READY TO FIND YOUR NEXT PROJECT?</span><h2>Start exploring verified leads.</h2><p>Browse the live marketplace and find opportunities relevant to your business.</p></div>
          <div><Link className="final-primary" to="/leads">View Leads <span>→</span></Link><a className="final-secondary" href="#pricing" onClick={event => scrollToSection(event, 'pricing')}>View Pricing</a></div>
        </section>

        <section className="contact-home-section home-reveal" id="contact">
          <div className="contact-home-head">
            <div>
              <span className="section-kicker">CONTACT PROPULSE</span>
              <h2>One conversation.<br /><em>Many ways to move forward.</em></h2>
              <p>Propulse Business Technologies Private Limited helps businesses build, market, sell and digitize. Tell us what you need — technology, digital marketing, lead opportunities, automation or business support.</p>
            </div>
            <div className="contact-home-company">
              <span>PROPULSE BUSINESS TECHNOLOGIES</span>
              <strong>{contactData.company_name || 'Propulse Business Technologies Private Limited'}</strong>
              <small>IT Technology • Digital Growth • Lead Sales • Business Support</small>
            </div>
          </div>

          <div className="contact-home-grid">
            <div className="contact-home-details">
              <a href={contactData.email ? 'mailto:' + contactData.email : '#'}><b>✉</b><div><small>Email</small><strong>{contactData.email || 'Email not configured'}</strong><span>General business enquiries</span></div><i>→</i></a>
              <a href={contactData.phone ? 'tel:' + contactData.phone : '#'}><b>☎</b><div><small>Phone</small><strong>{contactData.phone || 'Phone not configured'}</strong><span>Speak with the team</span></div><i>→</i></a>
              <a href={contactData.whatsapp ? 'https://wa.me/' + String(contactData.whatsapp).replace(/\D/g,'') : '#'} target="_blank" rel="noreferrer"><b>◉</b><div><small>WhatsApp</small><strong>{contactData.whatsapp || 'WhatsApp not configured'}</strong><span>Quick business conversation</span></div><i>↗</i></a>
              <div><b>◷</b><div><small>Business hours</small><strong>{contactData.business_hours || 'Business hours not configured'}</strong><span>Response time depends on enquiry type</span></div></div>
            </div>

            <div className="contact-home-right">
              <div className="contact-home-address">
                <span className="contact-home-label">OFFICE &amp; LOCATION</span>
                <h3>{contactData.company_name || 'Propulse Business Technologies Private Limited'}</h3>
                <p>{contactData.address || 'Address not configured in Admin Contact settings.'}</p>
                {contactData.maps_url && <a href={contactData.maps_url} target="_blank" rel="noreferrer">Open in Maps ↗</a>}
              </div>
              <div className="contact-home-social">
                <span className="contact-home-label">OFFICIAL SOCIAL CHANNELS</span>
                <div className="contact-home-social-grid">
                  {Array.isArray(contactData.social_handles) && contactData.social_handles.filter(item => item?.enabled && item?.url).map(item => (
                    <a href={item.url} target="_blank" rel="noreferrer" key={item.id || item.platform}><span>{String(item.platform).slice(0,1).toUpperCase()}</span><strong>{item.platform}</strong><i>↗</i></a>
                  ))}
                  {(!Array.isArray(contactData.social_handles) || !contactData.social_handles.some(item => item?.enabled && item?.url)) && <small>No social channels published yet.</small>}
                </div>
              </div>
            </div>
          </div>

          <div className="contact-home-bottom">
            <div><span className="section-kicker">START WITH A REQUIREMENT</span><strong>Need a website, app, marketing support, leads or business technology?</strong></div>
            <div><a href={contactData.email ? 'mailto:' + contactData.email : '#'}>Email Propulse <span>→</span></a><Link to="/leads">Explore Leads</Link></div>
          </div>
        </section>
      </main>

      <section className="faq-section home-reveal premium-home-faq" id="faq">
        <div className="section-heading centered"><span className="section-kicker">FAQ</span><h2>Questions, clearly answered.</h2><p>Everything you need to understand Propulse, its services and the lead marketplace before you get started.</p></div>
        <div className="faq-home-layout">
          <div className="faq-list">
            {(homepageFaqs.length ? homepageFaqs : faqs.map(([question, answer], index) => ({ id: `fallback-${index}`, question, answer }))).map(item => (
              <article className={openFaq === item.id ? 'faq-home-item open' : 'faq-home-item'} key={item.id}>
                <button type="button" onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}>
                  <span>{item.question}</span><b>{openFaq === item.id ? '−' : '+'}</b>
                </button>
                {openFaq === item.id && <div className="faq-home-answer"><p>{item.answer}</p></div>}
              </article>
            ))}
          </div>
          <aside className="faq-home-aside">
            <span className="section-kicker">NEED MORE HELP?</span>
            <h3>Talk to Propulse.</h3>
            <p>Have a technology, digital marketing, lead or business-support requirement? Start a conversation with the team.</p>
            <a href="#contact" onClick={event => scrollToSection(event, 'contact')}>Contact Propulse <span>→</span></a>
          </aside>
        </div>
      </section>

      <footer className="public-footer">
        <div className="footer-brand"><Link to="/"><img src="/brand/propulse-logo.png" alt="Propulse" /></Link><p>Quality Leads. Real Growth.</p></div>
        <div><strong>Marketplace</strong><Link to="/leads">Buy Leads</Link><a href="#pricing" onClick={event => scrollToSection(event, 'pricing')}>Pricing</a><Link to="/industries">Industries</Link></div>
        <div><strong>Support</strong><a href="#contact" onClick={event => scrollToSection(event, 'contact')}>Contact</a><a href="#contact" onClick={event => scrollToSection(event, 'contact')}>Help &amp; Support</a><a href="#how-it-works">How It Works</a><a className={activeNav === 'faq' ? 'nav-active' : ''} href="#faq" onClick={event => scrollToSection(event, 'faq')}>FAQs</a></div>
        <div><strong>Account</strong><Link to="/login">Login</Link><Link to="/signup">Create Account</Link><Link to="/profile">My Account</Link></div>
        <div><strong>Follow Us</strong><div className="socials"><span>f</span><span>◎</span><span>in</span><span>▶</span></div><small>Quality leads. Real opportunities.</small></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Propulse Business. All rights reserved.</span><span>Building businesses. Creating opportunities.</span></div>
      </footer>


    </div>
  )
}

export default Home
