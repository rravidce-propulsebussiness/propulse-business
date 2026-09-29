import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { publicRequest } from '../utils/auth'
import './CompanySitePage.css'

const pageCopy={
  construction:{
    eyebrow:'CONSTRUCTION',
    title:'Build with a clear package, specification and project plan.',
    text:'Start with a rough or detailed construction estimate, compare the published package specifications and submit one structured project enquiry for follow-up.',
    estimator:'/construction-estimator',
    requirement:'/build',
    flowKey:'construction-cost-estimator',
    imageKey:'residential',
    fallback:'/homepage/default-residential.svg',
  },
  interiors:{
    eyebrow:'INTERIORS',
    title:'Plan your interiors room by room, finish by finish.',
    text:'Estimate kitchen, wardrobe and interior work with configurable package details, material selections and a clear customer enquiry.',
    estimator:'/interior-estimator',
    requirement:'/design',
    flowKey:'interior-cost-estimator',
    imageKey:'interior',
    fallback:'/homepage/default-interior.svg',
  },
}

const steps=[
  ['01','Consultation','Share the project location, scope, budget expectation and key requirements.'],
  ['02','Package selection','Choose the package and specification level that best matches the project.'],
  ['03','Design & planning','Measurements, drawings and technical planning refine the scope before execution.'],
  ['04','2D & 3D modelling','Plans, elevations and visualisations can be prepared where they are part of the agreed scope.'],
  ['05','Execution','Approved scope, materials and stage requirements guide the site or interior execution.'],
  ['06','Handover','Final checks, finishing and handover complete the project journey.'],
]

function CompanyHeader(){
  return <header className="csp-header">
    <Link className="csp-brand" to="/"><img src="/brand/propulse-logo.png" alt="ProPulse Business"/></Link>
    <nav>
      <Link to="/">Home</Link>
      <Link to="/construction">Construction</Link>
      <Link to="/interiors">Interiors</Link>
      <Link to="/packages">Packages</Link>
      <Link to="/how-it-works">How It Works</Link>
      <Link to="/about">About</Link>
      <Link to="/contact">Contact</Link>
    </nav>
    <Link className="csp-professional" to="/leads">Professional <span>→</span></Link>
  </header>
}

function CompanyFooter(){
  return <footer className="csp-footer">
    <div><img src="/brand/propulse-logo.png" alt="ProPulse Business"/><p>Construction and Interior project planning, estimation and structured project enquiries.</p></div>
    <div><strong>Construction</strong><Link to="/construction">Overview</Link><Link to="/construction-estimator">Estimator</Link><Link to="/build">Send Requirement</Link></div>
    <div><strong>Interiors</strong><Link to="/interiors">Overview</Link><Link to="/interior-estimator">Estimator</Link><Link to="/design">Send Requirement</Link></div>
    <div><strong>Company</strong><Link to="/packages">Packages</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></div>
  </footer>
}

function PackageCards({packages=[],estimator}){
  const[expanded,setExpanded]=useState({})
  if(!packages.length)return <div className="csp-empty">Package details are being configured in Admin.</div>
  return <div className="csp-package-grid">{packages.map((pkg,index)=>{
    const packageKey=String(pkg.packageKey||'').trim()
    const cardKey=(estimator||'packages')+':'+(packageKey||String(pkg.label||index))
    const startLink=estimator&&packageKey?`${estimator}?mode=detailed&package=${encodeURIComponent(packageKey)}`:estimator
    const activeDetails=(pkg.details||[]).filter(item=>item?.isActive!==false)
    const isExpanded=Boolean(expanded[cardKey])
    const visibleDetails=isExpanded?activeDetails:activeDetails.slice(0,6)
    return <article className={index===1?'featured':''} key={pkg.packageKey||pkg.label||index}>
      <div className="csp-package-head"><span>{pkg.badge||'PACKAGE'}</span><h3>{pkg.label}</h3>{pkg.priceNote&&<b>{pkg.priceNote}</b>}</div>
      {pkg.summary&&<p>{pkg.summary}</p>}
      <div className="csp-spec-list">{visibleDetails.map((detail,i)=><div key={detail.detailKey||i}><small>{detail.section||'Specification'} · {detail.label}</small><strong>{detail.value}</strong>{detail.note&&<em>{detail.note}</em>}</div>)}</div>
      {activeDetails.length>6&&<button type="button" className="csp-spec-toggle" aria-expanded={isExpanded} onClick={()=>setExpanded(current=>({...current,[cardKey]:!current[cardKey]}))}>{isExpanded?'Show fewer specifications':`View all ${activeDetails.length} specifications`} <span>{isExpanded?'↑':'↓'}</span></button>}
      {startLink&&<Link className="csp-package-start" to={startLink}>Start with {pkg.label} <span>→</span></Link>}
    </article>
  })}</div>
}

function ServicePage({type}){
  const cfg=pageCopy[type]
  const[media,setMedia]=useState({hero_image_url:'',category_images:{}})
  const[flow,setFlow]=useState(null)
  useEffect(()=>{
    let active=true
    publicRequest('/homepage-media').then(data=>active&&setMedia({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{}})).catch(()=>{})
    publicRequest('/customer-flows/'+cfg.flowKey).then(data=>active&&setFlow(data)).catch(()=>{})
    return()=>{active=false}
  },[cfg.flowKey])
  const packages=useMemo(()=>Array.isArray(flow?.packages)?flow.packages.filter(item=>item?.isActive!==false):[],[flow])

  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-hero">
      <div><span>{cfg.eyebrow}</span><h1>{cfg.title}</h1><p>{cfg.text}</p><div className="csp-actions"><Link className="primary" to={cfg.estimator}>Get Estimate <b>→</b></Link><Link to={cfg.requirement}>Send Requirement</Link></div></div>
      <img src={media.category_images?.[cfg.imageKey]||cfg.fallback} alt=""/>
    </section>
    <section className="csp-section csp-plan">
      <div className="csp-section-head"><span>PROJECT PLANNING</span><h2>{type==='construction'?'Start rough, then go detailed when you are ready.':'Choose the work scope, then refine materials and finishes.'}</h2><p>{type==='construction'?'The rough estimate is useful for early budget planning. Detailed mode captures steel, cement, sand, brick class, wire, switches, flooring and other Admin-configured selections.':'The rough estimate gives an early planning range. Detailed mode captures plywood, laminate, hardware, modular finish and other Admin-configured selections.'}</p></div>
      <div className="csp-two-cards"><article><span>01</span><h3>Rough estimate</h3><p>Fast planning range using the core project details and the selected package.</p><Link to={cfg.estimator+'?mode=rough'}>Start rough estimate →</Link></article><article><span>02</span><h3>Detailed estimate</h3><p>Continue with material and specification selections for a more structured project brief.</p><Link to={cfg.estimator+'?mode=detailed'}>Start detailed estimate →</Link></article></div>
    </section>
    <section className="csp-section csp-packages"><div className="csp-section-head"><span>PUBLISHED PACKAGES</span><h2>Package details come directly from Admin.</h2><p>Names, badges, summaries, specification rows and notes below are read from the currently published estimator configuration.</p></div><PackageCards packages={packages} estimator={cfg.estimator}/></section>
    <section className="csp-bottom-cta"><div><span>READY TO CONTINUE?</span><h2>Turn the estimate into one structured project enquiry.</h2><p>Name and mobile number are required before the estimate is created so the project scope and estimate stay attached to the same customer lead.</p></div><div><Link className="primary" to={cfg.estimator}>Get Estimate →</Link><Link to={cfg.requirement}>Send Requirement</Link></div></section>
  </main><CompanyFooter/></div>
}

function PackagesPage(){
  const[flows,setFlows]=useState({construction:null,interior:null})
  const[audience,setAudience]=useState('construction')
  useEffect(()=>{
    let active=true
    Promise.allSettled([
      publicRequest('/customer-flows/construction-cost-estimator'),
      publicRequest('/customer-flows/interior-cost-estimator'),
    ]).then(results=>active&&setFlows({
      construction:results[0].status==='fulfilled'?results[0].value:null,
      interior:results[1].status==='fulfilled'?results[1].value:null,
    }))
    return()=>{active=false}
  },[])
  const packages=(flows[audience]?.packages||[]).filter(item=>item?.isActive!==false)
  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-simple-hero"><span>PACKAGES</span><h1>Compare the specifications before you estimate.</h1><p>Every package shown here is controlled from Admin and follows the currently published estimator version.</p></section>
    <section className="csp-section csp-packages">
      <div className="csp-package-tabs"><button type="button" className={audience==='construction'?'active':''} onClick={()=>setAudience('construction')}>Construction</button><button type="button" className={audience==='interior'?'active':''} onClick={()=>setAudience('interior')}>Interiors</button></div>
      <PackageCards packages={packages} estimator={audience==='construction'?'/construction-estimator':'/interior-estimator'}/>
    </section>
    <section className="csp-bottom-cta"><div><span>NEXT STEP</span><h2>Start detailed estimation with your package already selected.</h2><p>Choose any package above to carry it into the estimator. The selected package and its saved specification snapshot stay attached to the estimate and the customer lead.</p></div><div><Link className="primary" to={(audience==='construction'?'/construction-estimator':'/interior-estimator')+'?mode=detailed'}>Start Detailed Estimate →</Link></div></section>
  </main><CompanyFooter/></div>
}

function HowItWorksPage(){
  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-simple-hero"><span>HOW IT WORKS</span><h1>A clear project journey from first requirement to handover.</h1><p>The workflow follows the consultation, package selection, design/planning, modelling, execution and handover sequence from your project material.</p></section>
    <section className="csp-section"><div className="csp-step-grid">{steps.map(([number,title,text])=><article key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section className="csp-bottom-cta"><div><span>START WITH PLANNING</span><h2>Estimate first or send the project requirement directly.</h2></div><div><Link className="primary" to="/construction-estimator">Construction Estimate →</Link><Link to="/interior-estimator">Interior Estimate</Link></div></section>
  </main><CompanyFooter/></div>
}

function AboutPage(){
  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-simple-hero"><span>ABOUT</span><h1>Project enquiries with more context than a normal callback form.</h1><p>ProPulse connects the customer planning experience with structured Construction and Interior project requirements, estimates and professional follow-up.</p></section>
    <section className="csp-section"><div className="csp-about-grid"><article><span>01</span><h3>Clear project inputs</h3><p>Customers provide location, scope, package and relevant project details before the enquiry is saved.</p></article><article><span>02</span><h3>Admin-controlled specifications</h3><p>Published package names, details and pricing inputs remain configurable instead of being hard-coded in the customer website.</p></article><article><span>03</span><h3>Versioned estimate records</h3><p>The calculation snapshot stays tied to the version used when the customer submitted the estimate.</p></article><article><span>04</span><h3>Professional follow-up</h3><p>The Professional side remains separate from the customer-facing Construction and Interior company experience.</p></article></div></section>
    <section className="csp-bottom-cta"><div><span>PLAN YOUR PROJECT</span><h2>Construction or Interiors — start with the scope that matters to you.</h2></div><div><Link className="primary" to="/construction">Construction →</Link><Link to="/interiors">Interiors</Link></div></section>
  </main><CompanyFooter/></div>
}

function ContactPage(){
  const[contact,setContact]=useState({})
  useEffect(()=>{let active=true;publicRequest('/contact?audience=website').then(data=>active&&setContact(data||{})).catch(()=>{});return()=>{active=false}},[])
  const whatsapp=String(contact.whatsapp||'').replace(/\D/g,'')
  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-simple-hero"><span>CONTACT</span><h1>Tell us what you are planning.</h1><p>For the clearest follow-up, start with an estimate or requirement form. You can also use the configured contact details below.</p></section>
    <section className="csp-section csp-contact-grid">
      <div className="csp-contact-actions"><h2>Start with your project.</h2><p>Construction and Interior forms collect the project scope before contact details, so the enquiry reaches follow-up with useful context.</p><Link className="primary" to="/construction-estimator">Construction Estimate →</Link><Link to="/interior-estimator">Interior Estimate →</Link><Link to="/build">Construction Requirement</Link><Link to="/design">Interior Requirement</Link></div>
      <div className="csp-contact-details"><a href={contact.phone?'tel:'+contact.phone:'#'}><small>PHONE</small><strong>{contact.phone||'Configure in Admin'}</strong></a><a href={contact.email?'mailto:'+contact.email:'#'}><small>EMAIL</small><strong>{contact.email||'Configure in Admin'}</strong></a><a href={whatsapp?'https://wa.me/'+whatsapp:'#'} target="_blank" rel="noreferrer"><small>WHATSAPP</small><strong>{contact.whatsapp||'Configure in Admin'}</strong></a><div><small>OFFICE</small><strong>{contact.address||'Configure in Admin'}</strong></div></div>
    </section>
  </main><CompanyFooter/></div>
}

export default function CompanySitePage({page}){
  if(page==='construction'||page==='interiors')return <ServicePage type={page}/>
  if(page==='packages')return <PackagesPage/>
  if(page==='how-it-works')return <HowItWorksPage/>
  if(page==='about')return <AboutPage/>
  if(page==='contact')return <ContactPage/>
  return <ServicePage type="construction"/>
}
