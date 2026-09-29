import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getUser, getToken, publicRequest } from '../utils/auth'
import { listLeads } from '../api/leads'
import WebsiteFaqSection from '../components/WebsiteFaqSection'
import { trackFunnelEvent } from '../utils/funnelTracking'
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

const projectPaths = [
  {
    key: 'build',
    eyebrow: 'CONSTRUCTION REQUIREMENT',
    title: 'I want to build',
    text: 'Share your construction requirement, project location, scope and timeline.',
    to: '/build',
    flowKey: 'build',
    flowType: 'requirement',
    action: 'Start Build Requirement',
    icon: '⌂',
    imageKey: 'residential',
    fallback: '/homepage/default-residential.svg',
  },
  {
    key: 'design',
    eyebrow: 'INTERIOR REQUIREMENT',
    title: 'I need interiors',
    text: 'Tell us about your home, interior scope, preferred finish and timeline.',
    to: '/design',
    flowKey: 'design',
    flowType: 'requirement',
    action: 'Start Interior Requirement',
    icon: '◇',
    imageKey: 'interior',
    fallback: '/homepage/default-interior.svg',
  },
  {
    key: 'construction-estimator',
    eyebrow: 'CONSTRUCTION ESTIMATOR',
    title: 'Estimate construction cost',
    text: 'Get an indicative construction range using built-up area, package and specification choices.',
    to: '/construction-estimator',
    flowKey: 'construction-cost-estimator',
    flowType: 'estimator',
    action: 'Calculate Construction Cost',
    icon: '▥',
    imageKey: 'turnkey',
    fallback: '/homepage/default-turnkey.svg',
  },
  {
    key: 'interior-estimator',
    eyebrow: 'INTERIOR ESTIMATOR',
    title: 'Estimate interior cost',
    text: 'Plan a residential interior budget using area, work scope and finish preferences.',
    to: '/interior-estimator',
    flowKey: 'interior-cost-estimator',
    flowType: 'estimator',
    action: 'Calculate Interior Cost',
    icon: '✦',
    imageKey: 'interior',
    fallback: '/homepage/default-interior.svg',
  },
]

const customerSteps = [
  { number: '01', icon: '⌁', title: 'Tell us about the project', text: 'Choose Construction or Interiors and answer only the questions relevant to your requirement.' },
  { number: '02', icon: '₹', title: 'Understand the budget', text: 'Use the estimator for an indicative range before speaking with businesses or professionals.' },
  { number: '03', icon: '✓', title: 'Request actual quotations', text: 'When you are ready, share contact details with explicit consent and convert the estimate into a requirement.' },
  { number: '04', icon: '↗', title: 'Connect with relevant businesses', text: 'Your requirement enters the same Propulse lead system used by relevant construction and interior businesses.' },
]

const estimatorCards = [
  {
    key: 'construction',
    tag: 'BUILD',
    title: 'Construction Cost Estimator',
    text: 'Built-up area, package, quality, floors, basement, site access and location-aware adjustments.',
    to: '/construction-estimator',
    flowKey: 'construction-cost-estimator',
    rate: 'Turnkey, structure or finishing',
    icon: '▥',
  },
  {
    key: 'interior',
    tag: 'INTERIORS',
    title: 'Interior Cost Estimator',
    text: 'Full-home or selected work, kitchen, wardrobes, false ceiling, furniture and finish choices.',
    to: '/interior-estimator',
    flowKey: 'interior-cost-estimator',
    rate: 'Full-home or selected scope',
    icon: '◇',
  },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [membershipPlans, setMembershipPlans] = useState([])
  const [membershipPricingLoading, setMembershipPricingLoading] = useState(true)
  const [contactData, setContactData] = useState({})
  const [upcomingFeatures, setUpcomingFeatures] = useState([])
  const [upcomingFilter, setUpcomingFilter] = useState('all')

  const membershipCards = useMemo(() => ['grow','scale'].map(groupKey => {
    const group = membershipPlans
      .filter(plan => String(plan?.plan_type || '').toLowerCase() === 'pro' && String(plan?.plan_group || '').toLowerCase() === groupKey)
      .slice()
      .sort((a,b) => Number(a?.billing_months || 1) - Number(b?.billing_months || 1) || Number(a?.price || 0) - Number(b?.price || 0))
    if (!group.length) return null
    const monthly = group.find(plan => Number(plan?.billing_months || 1) === 1) || group[0]
    const monthlyPrice = Number(monthly?.monthly_base_price || 0) > 0
      ? Number(monthly.monthly_base_price)
      : Number(monthly?.price || 0) / Math.max(1, Number(monthly?.billing_months || 1))
    return {
      key: groupKey,
      label: groupKey === 'scale' ? 'SCALE' : 'GROW',
      description: monthly?.description || (groupKey === 'scale' ? 'Higher-volume Propulse membership configured for growing lead buyers.' : 'Core Propulse membership for businesses starting a repeatable lead-buying workflow.'),
      monthlyPrice,
      billing: group.map(plan => plan?.billing_period || `${plan?.billing_months || 1} month`).join(' · '),
      features: Array.isArray(monthly?.benefits) ? monthly.benefits : [],
      cycleCount: group.length,
    }
  }).filter(Boolean), [membershipPlans])

  useEffect(() => {
    let live = true
    publicRequest('/homepage-media').then(data => {
      if (live) setMedia({ hero_image_url: data?.hero_image_url || '', category_images: data?.category_images || {} })
    }).catch(() => {})
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    publicRequest('/membership-plans/public').then(data => {
      if (!live) return
      setMembershipPlans(Array.isArray(data) ? data.filter(item => item?.is_active !== false) : [])
    }).catch(() => {
      if (live) setMembershipPlans([])
    }).finally(() => {
      if (live) setMembershipPricingLoading(false)
    })
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
    publicRequest('/upcoming-features').then(data => {
      if (!live) return
      const items = Array.isArray(data) ? data.filter(item => item?.is_active !== false) : []
      setUpcomingFeatures(items)
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

  useEffect(() => {
    const sectionIds = ['home-top','start-project','estimators','how-it-works','professionals','pricing','about','upcoming-features','contact','faq']
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const probe = window.scrollY + 120
        let current = 'home'
        for (const id of sectionIds) {
          const node = document.getElementById(id)
          if (node && node.getBoundingClientRect().top + window.scrollY <= probe) current = id === 'home-top' ? 'home' : id
        }
        setActiveNav(current)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive:true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('home-scroll')
    const hash = window.location.hash.replace('#','')
    if (hash) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({block:'start'})))
    return () => document.documentElement.classList.remove('home-scroll')
  }, [])

  const scrollTo = (event,id) => {
    event?.preventDefault()
    const target = document.getElementById(id)
    setActiveNav(id === 'home-top' ? 'home' : id)
    setMenuOpen(false)
    window.history.replaceState({},'',window.location.pathname + window.location.search + (id === 'home-top' ? '' : '#'+id))
    target?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  const trackJourney=(flowKey,flowType,cta,position)=>trackFunnelEvent('home_cta_clicked',{
    flowKey,flowType,source:'homepage',metadata:{cta,position,entry:'homepage'}
  })

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'lead_partner' ? '/lead-partner' : '/leads'
  const professionalCta = loggedIn ? dashboardPath : '/signup'
  const publishedUpcoming = upcomingFeatures.length ? upcomingFeatures : [
    {name:'Project workflow tools',category:'Platform',short_description:'More project and business workflow tools.',description:'Additional workflow capabilities are planned for the Propulse platform.',icon:'▦',status:'Planned',timeline:'Coming later'},
    {name:'Business automation',category:'Automation',short_description:'Automate repetitive business follow-up.',description:'Planned automation capabilities for businesses using Propulse.',icon:'⚡',status:'Planned',timeline:'Coming later'},
    {name:'Material discovery',category:'Marketplace',short_description:'Future construction and interior material discovery.',description:'A future marketplace direction for products, suppliers and materials.',icon:'◆',status:'Researching',timeline:'Future release'},
  ]
  const upcomingCategories = ['all',...Array.from(new Set(publishedUpcoming.map(item => item.category).filter(Boolean))).slice(0,5)]
  const filteredUpcoming = publishedUpcoming.filter(item => upcomingFilter === 'all' || item.category === upcomingFilter).slice(0,6)

  return <div className="home-page">
    <header className="home-header">
      <Link className="home-brand" to="/" aria-label="Propulse home"><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link>
      <nav className={menuOpen ? 'home-nav open' : 'home-nav'} aria-label="Main navigation">
        <a className={activeNav==='home'?'active':''} href="#home-top" onClick={event=>scrollTo(event,'home-top')}>Home</a>
        <a className={activeNav==='start-project'?'active':''} href="#start-project" onClick={event=>scrollTo(event,'start-project')}>Start a Project</a>
        <a className={activeNav==='estimators'?'active':''} href="#estimators" onClick={event=>scrollTo(event,'estimators')}>Cost Estimators</a>
        <a className={activeNav==='professionals'?'active':''} href="#professionals" onClick={event=>scrollTo(event,'professionals')}>For Professionals</a>
        <a className={activeNav==='how-it-works'?'active':''} href="#how-it-works" onClick={event=>scrollTo(event,'how-it-works')}>How It Works</a>
        <a className={activeNav==='contact'?'active':''} href="#contact" onClick={event=>scrollTo(event,'contact')}>Contact</a>
        <Link className="home-nav-market" to="/leads" onClick={()=>setMenuOpen(false)}>Buy Leads</Link>
      </nav>
      <div className="home-header-actions">
        <Link className="home-login" to={loggedIn?dashboardPath:'/login'}>{loggedIn?'Dashboard':'Login'}</Link>
        <Link className="home-pro-cta" to="/leads">Professional Marketplace <span>→</span></Link>
        <button type="button" className="home-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}>☰</button>
      </div>
    </header>

    <main>
      <section id="home-top" className="home-hero">
        <div className="home-hero-copy">
          <div className="home-eyebrow"><span>●</span> CONSTRUCTION &amp; INTERIORS, SIMPLIFIED</div>
          <h1>Plan the project.<br/><em>Know the range.</em><br/>Find the right people.</h1>
          <p>Propulse helps customers describe construction and interior requirements, understand an indicative budget, and request actual quotations from relevant businesses when they are ready.</p>
          <div className="home-hero-actions">
            <a className="home-primary" href="#start-project" onClick={event=>scrollTo(event,'start-project')}>Start Your Project <span>→</span></a>
            <a className="home-secondary" href="#estimators" onClick={event=>scrollTo(event,'estimators')}>Estimate Cost <span>↗</span></a>
          </div>
          <div className="home-hero-trust">
            <span><b>✓</b>No login to estimate</span>
            <span><b>✓</b>No OTP for requirement forms</span>
            <span><b>✓</b>Contact shared only with consent</span>
          </div>
        </div>

        <div className="home-hero-visual">
          <div className="home-hero-image">
            <img src={media.hero_image_url || '/homepage/default-hero.svg'} alt="Construction and interior project planning"/>
            <div className="home-hero-shade"/>
          </div>
          <div className="hero-project-panel">
            <div className="hero-panel-head"><span>START HERE</span><strong>What are you planning?</strong></div>
            <Link to="/build" onClick={()=>trackJourney('build','requirement','build_property','hero_panel')}><i>⌂</i><div><b>Build a property</b><small>Share construction requirement</small></div><span>→</span></Link>
            <Link to="/design" onClick={()=>trackJourney('design','requirement','plan_interiors','hero_panel')}><i>◇</i><div><b>Plan home interiors</b><small>Share interior requirement</small></div><span>→</span></Link>
            <div className="hero-panel-estimate">
              <small>NOT READY FOR QUOTES?</small>
              <div><Link to="/construction-estimator" onClick={()=>trackJourney('construction-cost-estimator','estimator','construction_estimate','hero_panel')}>Construction estimate</Link><Link to="/interior-estimator" onClick={()=>trackJourney('interior-cost-estimator','estimator','interior_estimate','hero_panel')}>Interior estimate</Link></div>
            </div>
          </div>
          <div className="hero-floating-note"><span>₹</span><div><small>INDICATIVE COST RANGE</small><b>Before you request actual quotes</b></div></div>
        </div>
      </section>

      <section className="home-proof-strip" aria-label="Propulse customer journey benefits">
        <div><strong>01</strong><span><b>Describe</b><small>Structured project requirement</small></span></div>
        <div><strong>02</strong><span><b>Estimate</b><small>Indicative cost range</small></span></div>
        <div><strong>03</strong><span><b>Request Quotes</b><small>Only when you choose</small></span></div>
        <div><strong>04</strong><span><b>Connect</b><small>Relevant businesses follow up</small></span></div>
      </section>

      <section id="start-project" className="home-section project-start-section">
        <div className="home-section-head">
          <div><span>CHOOSE YOUR PATH</span><h2>What do you want to do today?</h2><p>Start with a detailed requirement or estimate the budget first. Both paths use the same structured project engine.</p></div>
          <div className="section-note"><b>No account required</b><span>Start as a customer without creating a marketplace account.</span></div>
        </div>
        <div className="project-path-grid">
          {projectPaths.map((item,index)=><Link className={index<2?'project-path requirement':'project-path estimator'} to={item.to} key={item.key} onClick={()=>trackJourney(item.flowKey,item.flowType,item.key,'project_grid')}>
            <div className="project-path-media"><img src={media.category_images?.[item.imageKey] || item.fallback} alt=""/><span>{item.icon}</span></div>
            <div className="project-path-body"><small>{item.eyebrow}</small><h3>{item.title}</h3><p>{item.text}</p><b>{item.action} <i>→</i></b></div>
          </Link>)}
        </div>
      </section>

      <section id="estimators" className="home-section estimator-home-section">
        <div className="estimator-home-intro">
          <span>PROJECT COST ESTIMATORS</span>
          <h2>Get a planning range before you talk to anyone.</h2>
          <p>Our estimator engine uses your project answers, versioned admin-configured rates and applicable location adjustments to calculate an indicative range on the server.</p>
          <div className="estimator-facts">
            <div><b>₹</b><span><strong>Range, not false precision</strong><small>Minimum and maximum planning estimate.</small></span></div>
            <div><b>⌖</b><span><strong>Location-aware</strong><small>City adjustments can be configured by Admin.</small></span></div>
            <div><b>↺</b><span><strong>Historically reproducible</strong><small>Rate/version snapshot stored with every calculation.</small></span></div>
          </div>
        </div>
        <div className="estimator-home-cards">
          {estimatorCards.map(card=><Link className={'estimator-home-card '+card.key} to={card.to} key={card.key} onClick={()=>trackJourney(card.flowKey,'estimator',card.key+'_estimator','estimator_section')}>
            <div className="estimator-card-top"><span>{card.tag}</span><i>{card.icon}</i></div>
            <h3>{card.title}</h3><p>{card.text}</p>
            <div className="estimator-card-bottom"><small>{card.rate}</small><b>Start estimate →</b></div>
          </Link>)}
        </div>
      </section>

      <section id="how-it-works" className="home-section customer-how-section">
        <div className="home-section-head compact">
          <div><span>HOW PROPULSE WORKS FOR CUSTOMERS</span><h2>From idea to actual quotations.</h2><p>You stay in control of when contact information is shared.</p></div>
        </div>
        <div className="customer-step-grid">
          {customerSteps.map(step=><article key={step.number}><div className="customer-step-top"><b>{step.number}</b><span>{step.icon}</span></div><h3>{step.title}</h3><p>{step.text}</p></article>)}
        </div>
        <div className="customer-flow-cta">
          <div><span>READY TO START?</span><strong>Choose Construction or Interiors.</strong></div>
          <div><Link to="/build" onClick={()=>trackJourney('build','requirement','start_construction','how_it_works')}>Start Construction <span>→</span></Link><Link to="/design" onClick={()=>trackJourney('design','requirement','start_interiors','how_it_works')}>Start Interiors <span>→</span></Link></div>
        </div>
      </section>

      <section id="professionals" className="professional-section">
        <div className="professional-inner">
          <div className="professional-copy">
            <span>FOR CONSTRUCTION &amp; INTERIOR BUSINESSES</span>
            <h2>Customers plan here.<br/><em>Professionals find opportunities here.</em></h2>
            <p>Propulse converts structured customer requirements and quote requests into the same lead marketplace your business already uses—without creating a separate CRM or lead system.</p>
            <div className="professional-actions">
              <Link className="professional-primary" to="/leads">Explore Live Leads <span>→</span></Link>
              <a className="professional-secondary" href="#pricing" onClick={event=>scrollTo(event,'pricing')}>Memberships</a>
            </div>
            <div className="professional-stat-row">
              <div><strong>{loadingLeads?'…':leadTotal>0?leadTotal.toLocaleString('en-IN'):'Live'}</strong><small>{leadTotal===1?'lead available':'marketplace leads'}</small></div>
              <div><strong>PIN</strong><small>location-aware matching</small></div>
              <div><strong>1</strong><small>canonical lead system</small></div>
            </div>
          </div>
          <div className="professional-preview">
            <div className="professional-preview-head"><span>LIVE MARKETPLACE PREVIEW</span><Link to="/leads">Open marketplace ↗</Link></div>
            {loadingLeads?<div className="home-lead-loading">Loading live opportunities…</div>:leads.length?leads.map(lead=>{
              const location=[lead.city_name,lead.state_name].filter(Boolean).join(', ')
              const shares=lead.pricing?.shares||[]
              const firstPrice=shares[0]?money(shares[0].normal):''
              return <Link to="/leads" className="home-lead-row" key={lead.id}>
                <div className="home-lead-avatar">{String(lead.service_name||lead.industry_name||'P').charAt(0).toUpperCase()}</div>
                <div><strong>{lead.service_name||lead.industry_name||'Project enquiry'}</strong><span>{location||'Location available in marketplace'} · {timeAgo(lead.created_at)}</span></div>
                <small>{firstPrice?`From ${firstPrice}`:'View pricing'}</small>
                <b>→</b>
              </Link>
            }):<div className="home-lead-loading">New opportunities are being added. <Link to="/leads">Open marketplace →</Link></div>}
          </div>
        </div>
      </section>

      <section id="pricing" className="home-section home-membership-section">
        <div className="home-section-head">
          <div><span>PROFESSIONAL MEMBERSHIPS</span><h2>Buy leads with the plan that fits your business.</h2><p>GROW and SCALE stay connected to your existing Admin membership configuration—this homepage does not create another pricing source.</p></div>
          <Link className="section-action" to={loggedIn?'/membership':'/signup'}>{loggedIn?'View Memberships':'Create Business Account'} <span>→</span></Link>
        </div>
        {membershipPricingLoading?<div className="membership-loading">Loading membership packages…</div>:membershipCards.length?<div className="home-membership-grid">
          {membershipCards.map(card=><article className={card.key==='scale'?'home-membership-card featured':'home-membership-card'} key={card.key}>
            <div className="membership-card-label"><span>{card.label}</span>{card.key==='scale'&&<b>POPULAR FOR GROWTH</b>}</div>
            <h3>{card.key==='scale'?'Scale lead acquisition':'Start buying relevant leads'}</h3>
            <p>{card.description}</p>
            <div className="membership-price"><strong>{money(card.monthlyPrice)}</strong><span>/ month equivalent</span></div>
            <small>{card.billing}</small>
            <ul>{card.features.slice(0,6).map((feature,index)=><li key={index}><i>✓</i>{feature}</li>)}</ul>
            <Link to={loggedIn?'/membership':'/signup'}>{loggedIn?`Choose ${card.label}`:'Create Business Account'} <span>→</span></Link>
          </article>)}
        </div>:<div className="membership-loading">Membership packages are being configured in Admin.</div>}
      </section>

      <section id="about" className="home-section home-about-section">
        <div className="about-brand-panel">
          <span>ABOUT PROPULSE</span>
          <h2>One platform connecting project intent with business opportunity.</h2>
          <p>Propulse Business Technologies Private Limited is building a focused customer-acquisition and project-discovery platform for Construction, Interiors and related real-estate services.</p>
          <Link to="/industries">Explore industries <span>→</span></Link>
        </div>
        <div className="about-principles">
          <article><b>01</b><div><strong>Customers get structure</strong><p>Requirements and estimators turn vague enquiries into useful project context.</p></div></article>
          <article><b>02</b><div><strong>Businesses get relevance</strong><p>Location, service and project details make the marketplace easier to evaluate.</p></div></article>
          <article><b>03</b><div><strong>One lead architecture</strong><p>Estimator quote requests and requirement forms feed the existing canonical lead system.</p></div></article>
          <article><b>04</b><div><strong>Admin stays in control</strong><p>Questions, rates, memberships, media and roadmap content remain configurable.</p></div></article>
        </div>
      </section>

      <section id="upcoming-features" className="home-section roadmap-section">
        <div className="home-section-head">
          <div><span>WHAT'S NEXT</span><h2>Propulse is still expanding.</h2><p>These roadmap items are loaded from the same Admin-managed Upcoming Features system.</p></div>
          <a className="section-action" href="#contact" onClick={event=>scrollTo(event,'contact')}>Talk to Propulse <span>→</span></a>
        </div>
        <div className="roadmap-filter">
          <small>{publishedUpcoming.length} published roadmap item{publishedUpcoming.length===1?'':'s'}</small>
          <div>{upcomingCategories.map(filter=><button type="button" key={filter} className={upcomingFilter===filter?'active':''} onClick={()=>setUpcomingFilter(filter)}>{filter==='all'?'All':filter}</button>)}</div>
        </div>
        <div className="roadmap-grid">
          {filteredUpcoming.map((item,index)=><article className={item.highlighted?'roadmap-card featured':'roadmap-card'} key={item.id||item.slug||item.name} style={{'--delay':Math.min(index,5)*60+'ms'}}>
            <div className="roadmap-icon">{item.icon||'✦'}</div>
            <div className="roadmap-meta"><span>{item.category||'Platform'}</span><small>{item.status||'Planned'}</small></div>
            <h3>{item.name}</h3>
            <strong>{item.short_description}</strong>
            <p>{item.description}</p>
            <div className="roadmap-foot"><span>{item.timeline||'Coming later'}</span><b>↗</b></div>
          </article>)}
        </div>
      </section>

      <section id="contact" className="contact-section-new">
        <div className="contact-new-copy">
          <span>CONTACT PROPULSE</span>
          <h2>Have a project or a business question?</h2>
          <p>Customers can start Construction or Interior requirements directly. Businesses can contact Propulse about marketplace access, memberships and platform support.</p>
          <div className="contact-new-actions"><Link to="/build" onClick={()=>trackJourney('build','requirement','start_project','contact')}>Start a Project <span>→</span></Link><Link to="/leads">Professional Marketplace</Link></div>
        </div>
        <div className="contact-new-details">
          <a href={contactData.phone?'tel:'+contactData.phone:'#'}><span>☎</span><div><small>PHONE</small><strong>{contactData.phone||'Not configured'}</strong></div></a>
          <a href={contactData.email?'mailto:'+contactData.email:'#'}><span>✉</span><div><small>EMAIL</small><strong>{contactData.email||'Not configured'}</strong></div></a>
          <a href={contactData.whatsapp?'https://wa.me/'+String(contactData.whatsapp).replace(/\D/g,''):'#'} target="_blank" rel="noreferrer"><span>◉</span><div><small>WHATSAPP</small><strong>{contactData.whatsapp||'Not configured'}</strong></div></a>
          <div><span>⌖</span><div><small>OFFICE</small><strong>{contactData.address||'Address managed from Admin Contact settings'}</strong></div></div>
        </div>
      </section>

      <WebsiteFaqSection variant="home"/>
    </main>

    <footer className="home-footer">
      <div className="home-footer-top">
        <div className="home-footer-brand"><Link to="/"><img src="/brand/propulse-logo.png" alt="Propulse Business"/></Link><p>Project planning for customers. Relevant opportunities for businesses.</p></div>
        <div><strong>Customers</strong><Link to="/build">Construction Requirement</Link><Link to="/design">Interior Requirement</Link><Link to="/construction-estimator">Construction Estimator</Link><Link to="/interior-estimator">Interior Estimator</Link></div>
        <div><strong>Professionals</strong><Link to="/leads">Buy Leads</Link><a href="#pricing" onClick={event=>scrollTo(event,'pricing')}>Memberships</a><Link to="/industries">Industries</Link><Link to={professionalCta}>{loggedIn?'Dashboard':'Create Account'}</Link></div>
        <div><strong>Company</strong><a href="#about" onClick={event=>scrollTo(event,'about')}>About</a><a href="#contact" onClick={event=>scrollTo(event,'contact')}>Contact</a><a href="#upcoming-features" onClick={event=>scrollTo(event,'upcoming-features')}>Roadmap</a><a href="#faq" onClick={event=>scrollTo(event,'faq')}>FAQs</a></div>
      </div>
      <div className="home-footer-bottom"><span>© {new Date().getFullYear()} Propulse Business Technologies Private Limited.</span><span>Construction • Interiors • Project Leads</span></div>
    </footer>
  </div>
}

export default Home
