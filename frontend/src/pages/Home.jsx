import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { publicRequest } from '../utils/auth'
import WebsiteFaqSection from '../components/WebsiteFaqSection'
import { trackFunnelEvent } from '../utils/funnelTracking'
import './Home.css'

const services=[
  {
    key:'construction',
    eyebrow:'CONSTRUCTION',
    title:'End-to-end home construction with clarity from day one.',
    text:'Explore construction packages, understand the major specifications and get a project cost estimate before speaking with our team.',
    imageKey:'residential',
    fallback:'/homepage/default-residential.svg',
    requirement:'/build',
    estimator:'/construction-estimator',
  },
  {
    key:'interior',
    eyebrow:'INTERIORS',
    title:'Complete home interiors designed around your life.',
    text:'Plan kitchens, wardrobes, finishes and full-home interiors with clear packages, a practical estimate and a free design consultation.',
    imageKey:'interior',
    fallback:'/homepage/default-interior.svg',
    requirement:'/design',
    estimator:'/interior-estimator',
  },
]

const howItWorks=[
  ['01','Estimate or consult','Start with a project estimate, or choose a free consultation if you would rather speak with our team first.'],
  ['02','Understand the scope','We review your location, project size, package preference, timeline and the work you need.'],
  ['03','Design & planning','Measurements, drawings, material decisions and technical planning refine the scope before execution.'],
  ['04','Final proposal','The project scope, specifications, commercial terms and schedule are finalised before work begins.'],
  ['05','Execution','Construction or interior work proceeds against the approved scope, selections and project plan.'],
  ['06','Handover','Final finishing, checks and handover complete the project journey.'],
]

function Home(){
  const[media,setMedia]=useState({hero_image_url:'',category_images:{}})
  const[contact,setContact]=useState({})
  const[menuOpen,setMenuOpen]=useState(false)
  const[estimatorFlows,setEstimatorFlows]=useState({construction:null,interior:null})
  const[packageAudience,setPackageAudience]=useState('construction')

  useEffect(()=>{
    let active=true
    publicRequest('/homepage-media').then(data=>active&&setMedia({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{}})).catch(()=>{})
    publicRequest('/contact?audience=website').then(data=>active&&setContact(data||{})).catch(()=>{})
    Promise.allSettled([
      publicRequest('/customer-flows/construction-cost-estimator'),
      publicRequest('/customer-flows/interior-cost-estimator'),
    ]).then(results=>{
      if(!active)return
      setEstimatorFlows({
        construction:results[0].status==='fulfilled'?results[0].value:null,
        interior:results[1].status==='fulfilled'?results[1].value:null,
      })
    })
    return()=>{active=false}
  },[])

  const track=(flowKey,source)=>trackFunnelEvent('home_cta_clicked',{flowKey,flowType:'estimator',source,metadata:{cta:flowKey}})
  const packageFlow=estimatorFlows[packageAudience]
  const packageItems=Array.isArray(packageFlow?.packages)?packageFlow.packages.filter(item=>item?.isActive!==false):[]

  return <div className="company-home">
    <header className="company-header">
      <Link className="company-brand" to="/" aria-label="ProPulse home"><img src="/brand/propulse-logo.png" alt="ProPulse Business"/></Link>
      <nav className={menuOpen?'company-nav open':'company-nav'}>
        <Link to="/" onClick={()=>setMenuOpen(false)}>Home</Link>
        <Link to="/construction" onClick={()=>setMenuOpen(false)}>Construction</Link>
        <Link to="/interiors" onClick={()=>setMenuOpen(false)}>Interiors</Link>
        <Link to="/packages" onClick={()=>setMenuOpen(false)}>Packages</Link>
        <Link to="/how-it-works" onClick={()=>setMenuOpen(false)}>How It Works</Link>
        <Link to="/about" onClick={()=>setMenuOpen(false)}>About</Link>
        <Link to="/contact" onClick={()=>setMenuOpen(false)}>Contact</Link>
      </nav>
      <div className="company-header-actions">
        <Link className="professional-link" to="/leads">Professional <span>→</span></Link>
        <button type="button" className="company-menu" aria-label="Toggle navigation" onClick={()=>setMenuOpen(value=>!value)}>☰</button>
      </div>
    </header>

    <main>
      <section id="home" className="company-hero">
        <div className="company-hero-copy">
          <span className="hero-kicker">CONSTRUCTION · INTERIORS · PROJECT ESTIMATES</span>
          <h1>Build and design your home with <em>clarity before work begins.</em></h1>
          <p>Explore Construction and Interiors, compare package specifications, get a practical project estimate and speak with our team through a free consultation.</p>
          <div className="hero-actions">
            <Link className="hero-primary" to="/construction-estimator" onClick={()=>track('construction-cost-estimator','hero')}>Estimate Construction <span>→</span></Link>
            <Link className="hero-secondary" to="/interior-estimator" onClick={()=>track('interior-cost-estimator','hero')}>Estimate Interiors</Link>
          </div>
          <div className="hero-points"><span>✓ No login required</span><span>✓ Clear package specifications</span><span>✓ Free project consultation</span></div>
        </div>
        <div className="company-hero-visual">
          <div className="hero-image-wrap"><img src={media.hero_image_url||media.category_images?.residential||'/homepage/default-residential.svg'} alt="Residential construction and interior planning"/></div>
          <div className="hero-estimate-card"><small>START HERE</small><strong>One clear project estimate</strong><span>Construction &amp; Interiors</span></div>
        </div>
      </section>

      <section className="company-trustbar">
        <div><b>01</b><span>Choose Construction or Interiors</span></div>
        <div><b>02</b><span>Get your project estimate</span></div>
        <div><b>03</b><span>Speak in a free consultation</span></div>
        <div><b>04</b><span>Plan design &amp; execution</span></div>
      </section>

      <section className="company-section services-section">
        <div className="company-section-head"><span>WHAT WE DO</span><h2>Construction and Interiors under one roof.</h2><p>Start with the service you need, understand the package and budget, then continue with our project team for planning and execution.</p></div>
        <div className="service-grid">
          {services.map(service=><article id={service.key==='construction'?'construction':'interiors'} className="service-card" key={service.key}>
            <div className="service-media"><img src={media.category_images?.[service.imageKey]||service.fallback} alt=""/><span>{service.eyebrow}</span></div>
            <div className="service-copy"><small>{service.eyebrow} SERVICES</small><h3>{service.title}</h3><p>{service.text}</p><div><Link to={service.estimator} onClick={()=>track(service.key==='construction'?'construction-cost-estimator':'interior-cost-estimator','service_card')}>Get Estimate <span>→</span></Link><Link to={service.requirement}>Free Consultation</Link></div></div>
          </article>)}
        </div>
      </section>

      <section id="estimator" className="estimate-showcase">
        <div className="estimate-showcase-copy">
          <span>PROJECT ESTIMATOR</span>
          <h2>Get a useful estimate without a long questionnaire.</h2>
          <p>Enter the main project details, choose a package and receive an indicative range. If you want to refine materials or finishes, those choices remain optional instead of blocking the estimate.</p>
          <div className="estimate-feature-grid">
            <div><b>One straightforward estimate</b><span>Start with the information customers normally know at the planning stage.</span></div>
            <div><b>Package-based planning</b><span>See the specification package connected to the estimate before the consultation.</span></div>
            <div><b>Optional customisation</b><span>Refine materials and finishes only when those decisions are already known.</span></div>
            <div><b>Consultation ready</b><span>The same estimate can be discussed with our team without filling another long form.</span></div>
          </div>
          <div className="estimate-cta-row"><Link to="/construction-estimator">Construction Estimate <span>→</span></Link><Link to="/interior-estimator">Interior Estimate <span>→</span></Link></div>
        </div>
        <div className="package-showcase">
          <div className="package-showcase-head"><div><span>PACKAGE PREVIEW</span><small>Compare the key specifications before starting your estimate.</small></div><div className="package-tabs"><button type="button" className={packageAudience==='construction'?'active':''} onClick={()=>setPackageAudience('construction')}>Construction</button><button type="button" className={packageAudience==='interior'?'active':''} onClick={()=>setPackageAudience('interior')}>Interiors</button></div></div>
          {packageItems.length?packageItems.slice(0,4).map((item,index)=><article className={index===1?'featured':''} key={item.packageKey||item.label||index}><div><span>{item.badge||'PACKAGE'}</span><h3>{item.label||'Package'}</h3></div><p>{item.summary||'Explore the package inclusions and specifications before you estimate.'}</p><b>{item.priceNote||((item.details||[]).filter(detail=>detail?.isActive!==false).slice(0,2).map(detail=>detail.value).join(' · ')||'View package specifications in the estimator')}</b></article>):<article className="package-empty"><div><span>PACKAGE DETAILS</span><h3>Package information is being updated</h3></div><p>You can still start an estimate or request a free consultation with our project team.</p><b>{packageAudience==='construction'?'Construction':'Interiors'}</b></article>}
        </div>
      </section>

      <section id="how-it-works" className="company-section process-section">
        <div className="company-section-head light"><span>HOW IT WORKS</span><h2>A clear path from first estimate to handover.</h2><p>Start online, continue with a project consultation, then move into the design, planning and execution needed for your project.</p></div>
        <div className="process-grid">{howItWorks.map(([number,title,text])=><article key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section id="about" className="company-section about-section">
        <div className="about-visual"><img src={media.category_images?.turnkey||media.category_images?.residential||'/homepage/default-turnkey.svg'} alt="Construction planning"/></div>
        <div className="about-copy"><span>WHY PROPULSE</span><h2>Better decisions before the project starts.</h2><p>Construction and interiors involve many decisions. We make the first stage easier with clear package information, a practical estimate and a short consultation path.</p><div className="about-list"><div><b>Clear scope</b><span>Understand the major project inputs and package inclusions before execution planning begins.</span></div><div><b>Practical estimates</b><span>Use project size, scope and package choices to create an indicative planning range.</span></div><div><b>Free consultation</b><span>Speak with our team using the same project context you already shared online.</span></div></div></div>
      </section>

      <section id="contact" className="company-contact">
        <div><span>START YOUR PROJECT</span><h2>Prefer to speak with a project expert?</h2><p>Request a free Construction or Interior consultation. The form is short, and our team can continue the discussion with your basic project details already available.</p><div className="contact-ctas"><Link to="/build">Construction Consultation <span>→</span></Link><Link to="/design">Interior Consultation</Link></div></div>
        <div className="contact-details">
          <a href={contact.phone?'tel:'+contact.phone:'#'}><small>PHONE</small><strong>{contact.phone||'Call us for details'}</strong></a>
          <a href={contact.email?'mailto:'+contact.email:'#'}><small>EMAIL</small><strong>{contact.email||'Email us for details'}</strong></a>
          <a href={contact.whatsapp?'https://wa.me/'+String(contact.whatsapp).replace(/\D/g,''):'#'} target="_blank" rel="noreferrer"><small>WHATSAPP</small><strong>{contact.whatsapp||'WhatsApp details coming soon'}</strong></a>
          <div><small>OFFICE</small><strong>{contact.address||'Contact us for office details'}</strong></div>
        </div>
      </section>

      <WebsiteFaqSection variant="home"/>
    </main>

    <footer className="company-footer">
      <div className="company-footer-main"><div><img src="/brand/propulse-logo.png" alt="ProPulse Business"/><p>Construction and Interior planning, project estimates and professional consultation.</p></div><div><strong>Construction</strong><Link to="/construction-estimator">Cost Estimator</Link><Link to="/build">Free Consultation</Link></div><div><strong>Interiors</strong><Link to="/interior-estimator">Cost Estimator</Link><Link to="/design">Free Consultation</Link></div><div><strong>Professional</strong><Link to="/leads">Professional Access</Link></div></div>
      <div className="company-footer-bottom"><span>© {new Date().getFullYear()} ProPulse Business Technologies Private Limited.</span><span>Construction · Interiors · Estimation</span></div>
    </footer>
  </div>
}

export default Home
