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
    title:'From plot to finished home.',
    text:'Plan residential construction with clear package specifications, project requirements and an indicative cost before consultation.',
    imageKey:'residential',
    fallback:'/homepage/default-residential.svg',
    requirement:'/build',
    estimator:'/construction-estimator',
  },
  {
    key:'interior',
    eyebrow:'INTERIORS',
    title:'Interiors designed around the way you live.',
    text:'Plan kitchens, wardrobes, finishes and complete home interiors with package details and a structured project enquiry.',
    imageKey:'interior',
    fallback:'/homepage/default-interior.svg',
    requirement:'/design',
    estimator:'/interior-estimator',
  },
]

const howItWorks=[
  ['01','Consultation','Tell us what you are planning, where the project is and the scope you have in mind.'],
  ['02','Package selection','Choose the construction or interior specification that matches your budget and expectations.'],
  ['03','Design & planning','Project requirements are organised before detailed design, measurements and technical planning.'],
  ['04','2D & 3D modelling','Design development can move into plans, elevations and visualisation based on the final project scope.'],
  ['05','Execution','Approved scope, materials and stage requirements guide execution and quality follow-up.'],
  ['06','Handover','Final finishing, checks and project handover complete the delivery journey.'],
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

  const scroll=(event,id)=>{
    event.preventDefault()
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})
  }
  const track=(flowKey,source)=>trackFunnelEvent('homepage_path_selected',{flowKey,flowType:'estimator',source})
  const packageFlow=estimatorFlows[packageAudience]
  const packageItems=Array.isArray(packageFlow?.packages)?packageFlow.packages.filter(item=>item?.isActive!==false):[]

  return <div className="company-home">
    <header className="company-header">
      <Link className="company-brand" to="/" aria-label="ProPulse home"><img src="/brand/propulse-logo.png" alt="ProPulse Business"/></Link>
      <nav className={menuOpen?'company-nav open':'company-nav'}>
        <a href="#home" onClick={event=>scroll(event,'home')}>Home</a>
        <a href="#construction" onClick={event=>scroll(event,'construction')}>Construction</a>
        <a href="#interiors" onClick={event=>scroll(event,'interiors')}>Interiors</a>
        <a href="#estimator" onClick={event=>scroll(event,'estimator')}>Estimator</a>
        <a href="#how-it-works" onClick={event=>scroll(event,'how-it-works')}>How It Works</a>
        <a href="#about" onClick={event=>scroll(event,'about')}>About</a>
        <a href="#contact" onClick={event=>scroll(event,'contact')}>Contact</a>
      </nav>
      <div className="company-header-actions">
        <Link className="professional-link" to="/leads">Professional <span>→</span></Link>
        <button type="button" className="company-menu" aria-label="Toggle navigation" onClick={()=>setMenuOpen(value=>!value)}>☰</button>
      </div>
    </header>

    <main>
      <section id="home" className="company-hero">
        <div className="company-hero-copy">
          <span className="hero-kicker">CONSTRUCTION · INTERIORS · ESTIMATION</span>
          <h1>Plan your home with <em>clear specifications</em> before the first site meeting.</h1>
          <p>Choose Construction or Interiors, understand package details, get an indicative estimate and submit one structured project enquiry with your name and mobile number.</p>
          <div className="hero-actions">
            <Link className="hero-primary" to="/construction-estimator" onClick={()=>track('construction-cost-estimator','hero')}>Estimate Construction <span>→</span></Link>
            <Link className="hero-secondary" to="/interior-estimator" onClick={()=>track('interior-cost-estimator','hero')}>Estimate Interiors</Link>
          </div>
          <div className="hero-points"><span>✓ No login required</span><span>✓ Package specifications</span><span>✓ Estimate saved with enquiry</span></div>
        </div>
        <div className="company-hero-visual">
          <div className="hero-image-wrap"><img src={media.hero_image_url||media.category_images?.residential||'/homepage/default-residential.svg'} alt="Residential construction and interior planning"/></div>
          <div className="hero-estimate-card"><small>START HERE</small><strong>Rough or detailed project estimate</strong><span>Construction &amp; Interior</span></div>
        </div>
      </section>

      <section className="company-trustbar">
        <div><b>01</b><span>Choose your project</span></div>
        <div><b>02</b><span>Select package &amp; specifications</span></div>
        <div><b>03</b><span>Get indicative estimate</span></div>
        <div><b>04</b><span>Continue with consultation</span></div>
      </section>

      <section className="company-section services-section">
        <div className="company-section-head"><span>WHAT WE DO</span><h2>One place for Construction and Interiors.</h2><p>The customer side stays focused on project planning. Business tools are available separately through the Professional option.</p></div>
        <div className="service-grid">
          {services.map(service=><article id={service.key==='construction'?'construction':'interiors'} className="service-card" key={service.key}>
            <div className="service-media"><img src={media.category_images?.[service.imageKey]||service.fallback} alt=""/><span>{service.eyebrow}</span></div>
            <div className="service-copy"><small>{service.eyebrow} SERVICES</small><h3>{service.title}</h3><p>{service.text}</p><div><Link to={service.estimator} onClick={()=>track(service.key==='construction'?'construction-cost-estimator':'interior-cost-estimator','service_card')}>Get Estimate <span>→</span></Link><Link to={service.requirement}>Send Requirement</Link></div></div>
          </article>)}
        </div>
      </section>

      <section id="estimator" className="estimate-showcase">
        <div className="estimate-showcase-copy">
          <span>PROJECT ESTIMATOR</span>
          <h2>Know what changes the budget.</h2>
          <p>Construction estimates can use built-up area, floors, project type, package and specification level. Interior estimates can use home size, work scope, kitchen, wardrobes, finishes and other configurable selections.</p>
          <div className="estimate-feature-grid">
            <div><b>Rough estimate</b><span>Fast planning range for early-stage customers.</span></div>
            <div><b>Detailed estimate</b><span>Package and material-level selections for a clearer project brief.</span></div>
            <div><b>Admin-controlled pricing</b><span>Rates, adjustments and package descriptions are managed from Admin.</span></div>
            <div><b>Customer lead capture</b><span>Name and mobile are required before the estimate is created.</span></div>
          </div>
          <div className="estimate-cta-row"><Link to="/construction-estimator">Construction Estimate <span>→</span></Link><Link to="/interior-estimator">Interior Estimate <span>→</span></Link></div>
        </div>
        <div className="package-showcase">
          <div className="package-showcase-head"><div><span>LIVE PACKAGE PREVIEW</span><small>Names, descriptions, badges and package specifications come from the published Admin configuration.</small></div><div className="package-tabs"><button type="button" className={packageAudience==='construction'?'active':''} onClick={()=>setPackageAudience('construction')}>Construction</button><button type="button" className={packageAudience==='interior'?'active':''} onClick={()=>setPackageAudience('interior')}>Interiors</button></div></div>
          {packageItems.length?packageItems.slice(0,4).map((item,index)=><article className={index===1?'featured':''} key={item.packageKey||item.label||index}><div><span>{item.badge||'PACKAGE'}</span><h3>{item.label||'Package'}</h3></div><p>{item.summary||'Package specification configured from Admin.'}</p><b>{item.priceNote||((item.details||[]).filter(detail=>detail?.isActive!==false).slice(0,2).map(detail=>detail.value).join(' · ')||'View detailed specification in the estimator')}</b></article>):<article className="package-empty"><div><span>ADMIN CONFIGURED</span><h3>No public package configured yet</h3></div><p>Publish package details from Admin → Customer Flows → Estimator configuration and they will appear here automatically.</p><b>{packageAudience==='construction'?'Construction estimator':'Interior estimator'}</b></article>}
        </div>
      </section>

      <section id="how-it-works" className="company-section process-section">
        <div className="company-section-head light"><span>HOW IT WORKS</span><h2>A clear path from enquiry to handover.</h2><p>The sequence follows the consultation, package selection, planning, modelling, execution and handover structure in your project material.</p></div>
        <div className="process-grid">{howItWorks.map(([number,title,text])=><article key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section id="about" className="company-section about-section">
        <div className="about-visual"><img src={media.category_images?.turnkey||media.category_images?.residential||'/homepage/default-turnkey.svg'} alt="Construction planning"/></div>
        <div className="about-copy"><span>WHY THIS EXPERIENCE IS DIFFERENT</span><h2>Specifications first. Follow-up with context.</h2><p>Instead of a generic “call me” form, customers can choose project scope, package and relevant details before submitting the enquiry. The same estimate and selected package stay attached to the customer lead.</p><div className="about-list"><div><b>Transparent packages</b><span>Package details can be changed from Admin without hard-coding the website.</span></div><div><b>Versioned estimates</b><span>Published pricing and package configuration are preserved with each estimate.</span></div><div><b>One customer lead</b><span>Retries use the same submission key so the same enquiry does not create unnecessary duplicates.</span></div></div></div>
      </section>

      <section id="contact" className="company-contact">
        <div><span>START YOUR PROJECT</span><h2>Ready to plan Construction or Interiors?</h2><p>Start with an estimate or send your requirement directly. Name and mobile number are collected before the enquiry is created.</p><div className="contact-ctas"><Link to="/construction-estimator">Construction Estimate <span>→</span></Link><Link to="/interior-estimator">Interior Estimate</Link></div></div>
        <div className="contact-details">
          <a href={contact.phone?'tel:'+contact.phone:'#'}><small>PHONE</small><strong>{contact.phone||'Configure in Admin'}</strong></a>
          <a href={contact.email?'mailto:'+contact.email:'#'}><small>EMAIL</small><strong>{contact.email||'Configure in Admin'}</strong></a>
          <a href={contact.whatsapp?'https://wa.me/'+String(contact.whatsapp).replace(/\D/g,''):'#'} target="_blank" rel="noreferrer"><small>WHATSAPP</small><strong>{contact.whatsapp||'Configure in Admin'}</strong></a>
          <div><small>OFFICE</small><strong>{contact.address||'Address managed from Admin'}</strong></div>
        </div>
      </section>

      <WebsiteFaqSection variant="home"/>
    </main>

    <footer className="company-footer">
      <div className="company-footer-main"><div><img src="/brand/propulse-logo.png" alt="ProPulse Business"/><p>Construction and Interior project planning, estimation and structured project enquiries.</p></div><div><strong>Construction</strong><Link to="/construction-estimator">Cost Estimator</Link><Link to="/build">Send Requirement</Link></div><div><strong>Interiors</strong><Link to="/interior-estimator">Cost Estimator</Link><Link to="/design">Send Requirement</Link></div><div><strong>Professional</strong><Link to="/leads">Professional Access</Link></div></div>
      <div className="company-footer-bottom"><span>© {new Date().getFullYear()} ProPulse Business Technologies Private Limited.</span><span>Construction · Interiors · Estimation</span></div>
    </footer>
  </div>
}

export default Home
