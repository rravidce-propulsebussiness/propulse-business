import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { publicRequest } from '../utils/auth'
import usePageMeta from '../utils/usePageMeta'
import './CompanySitePage.css'

const pageCopy={
  construction:{
    eyebrow:'CONSTRUCTION',
    title:'Home construction, planned from foundation to finish.',
    text:'Compare construction packages, get a practical project estimate and continue with a free construction consultation when you are ready.',
    estimator:'/construction-estimator',
    requirement:'/construction-consultation',
    flowKey:'construction-cost-estimator',
    imageKey:'residential',
    fallback:'/homepage/default-residential.svg',
  },
  interiors:{
    eyebrow:'INTERIORS',
    title:'Complete home interiors, planned around your space and budget.',
    text:'Plan kitchens, wardrobes, finishes and full-home interiors with clear package choices, a practical estimate and a free design consultation.',
    estimator:'/interior-estimator',
    requirement:'/interior-consultation',
    flowKey:'interior-cost-estimator',
    imageKey:'interior',
    fallback:'/homepage/default-interior.svg',
  },
}

const steps=[
  ['01','Start','Get a project estimate online or request a free consultation with our team.'],
  ['02','Confirm scope','Review location, size, package, budget expectations and the work included in the project.'],
  ['03','Design & planning','Measurements, drawings and technical planning refine the project before execution.'],
  ['04','Final proposal','Confirm specifications, commercial terms, milestones and the execution schedule.'],
  ['05','Execution','The approved scope and selections guide the construction or interior work.'],
  ['06','Handover','Final finishing, checks and handover complete the project journey.'],
]

const serviceHighlights={
  construction:[
    ['Planning & architecture','Site understanding, project scope, drawings and planning before execution.'],
    ['Structure & civil work','Core construction scope, material specifications and package-level planning.'],
    ['MEP & finishes','Electrical, plumbing, waterproofing, flooring, painting and finishing requirements.'],
    ['Cost & schedule clarity','Start with an indicative estimate, then refine the scope during consultation.'],
  ],
  interiors:[
    ['Space planning','Plan the home around room use, storage needs and the way your family lives.'],
    ['Modular solutions','Kitchen, wardrobes and other modular requirements can be planned by scope and package.'],
    ['Materials & finishes','Compare boards, laminates, hardware, finishes and optional customisations.'],
    ['Cost & execution clarity','Start with an indicative estimate, then refine selections during consultation.'],
  ],
}

function CompanyHeader({estimatePath='/packages'}){
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
    <div className="csp-header-actions"><Link className="csp-estimate" to={estimatePath}>Get Estimate</Link><Link className="csp-professional" to="/leads">Professional <span>→</span></Link></div>
  </header>
}

function CompanyFooter(){
  return <footer className="csp-footer">
    <div><img src="/brand/propulse-logo.png" alt="ProPulse Business"/><p>Construction and Interior planning, project estimates and professional consultation.</p></div>
    <div><strong>Construction</strong><Link to="/construction">Overview</Link><Link to="/construction-estimator">Estimator</Link><Link to="/construction-consultation">Free Consultation</Link></div>
    <div><strong>Interiors</strong><Link to="/interiors">Overview</Link><Link to="/interior-estimator">Estimator</Link><Link to="/interior-consultation">Free Consultation</Link></div>
    <div><strong>Company</strong><Link to="/packages">Packages</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></div>
  </footer>
}

function PackageCards({packages=[],estimator}){
  const[expanded,setExpanded]=useState({})
  if(!packages.length)return <div className="csp-empty">Package details are being updated. You can still start an estimate or request a free consultation.</div>
  return <div className="csp-package-grid">{packages.map((pkg,index)=>{
    const packageKey=String(pkg.packageKey||'').trim()
    const cardKey=(estimator||'packages')+':'+(packageKey||String(pkg.label||index))
    const startLink=estimator&&packageKey?`${estimator}?package=${encodeURIComponent(packageKey)}`:estimator
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
  usePageMeta(type==='construction'?'Home Construction | ProPulse Business':'Home Interiors | ProPulse Business',type==='construction'?'Explore construction packages, get a home construction estimate and request a free construction consultation.':'Explore complete-home interior packages, get an interior estimate and request a free design consultation.')
  const[media,setMedia]=useState({hero_image_url:'',category_images:{}})
  const[flow,setFlow]=useState(null)
  useEffect(()=>{
    let active=true
    publicRequest('/homepage-media').then(data=>active&&setMedia({hero_image_url:data?.hero_image_url||'',category_images:data?.category_images||{},content:data?.content||{}})).catch(()=>{})
    publicRequest('/customer-flows/'+baseCfg.flowKey).then(data=>active&&setFlow(data)).catch(()=>{})
    return()=>{active=false}
  },[baseCfg.flowKey])
  const packages=useMemo(()=>Array.isArray(flow?.packages)?flow.packages.filter(item=>item?.isActive!==false):[],[flow])
  const showcase=type==='construction'?[
    {key:'showcase_construction_1',title:'Structure, services and finishes planned as one scope.',fallback:'/homepage/default-residential.svg'},
    {key:'showcase_construction_2',title:'From core construction to finishing decisions.',fallback:'/homepage/default-turnkey.svg'},
  ]:[
    {key:'showcase_interior_1',title:'Complete-home planning around use, storage and finish.',fallback:'/homepage/default-interior.svg'},
    {key:'showcase_interior_2',title:'Kitchens, wardrobes and spaces connected by one design direction.',fallback:'/homepage/default-interior.svg'},
  ]

  return <div className="csp-page"><CompanyHeader estimatePath={cfg.estimator}/><main>
    <section className="csp-hero">
      <div><span>{cfg.eyebrow}</span><h1>{cfg.title}</h1><p>{cfg.text}</p><div className="csp-actions"><Link className="primary" to={cfg.estimator}>Get Project Estimate <b>→</b></Link><Link to={cfg.requirement}>Get Free Consultation</Link></div></div>
      <img src={media.category_images?.[cfg.imageKey]||cfg.fallback} alt=""/>
    </section>
    <section className="csp-section csp-plan">
      <div className="csp-section-head"><span>START YOUR PROJECT</span><h2>{type==='construction'?'Choose an estimate or speak with our construction team.':'Choose an estimate or speak with our interior design team.'}</h2><p>{type==='construction'?'The estimate uses your site, area, scope and package. Optional material choices can refine it without forcing you through a long form.':'The estimate uses your home details, scope and package. Optional finishes and add-ons can refine it when you already know what you want.'}</p></div>
      <div className="csp-two-cards"><article><span>01</span><h3>Project estimate</h3><p>Get an indicative cost range using the main information customers normally know at the planning stage.</p><Link to={cfg.estimator}>Get project estimate →</Link></article><article><span>02</span><h3>Free consultation</h3><p>Prefer to speak first? Share a few basics and our project team can call you back with the right context.</p><Link to={cfg.requirement}>Get free consultation →</Link></article></div>
    </section>
    <section className="csp-section"><div className="csp-section-head"><span>{type==='construction'?'CONSTRUCTION SERVICES':'INTERIOR SERVICES'}</span><h2>{type==='construction'?'Plan the whole build, not just the square-foot rate.':'Plan the complete interior, not just individual furniture.'}</h2><p>{type==='construction'?'A professional construction discussion should cover scope, specifications, services, finishes, budget and execution planning together.':'A professional interior discussion should connect space planning, storage, materials, finishes, budget and execution instead of treating them as separate decisions.'}</p></div><div className="csp-about-grid">{serviceHighlights[type].map(([title,text],index)=><article key={title}><span>{String(index+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="csp-section csp-showcase"><div className="csp-section-head"><span>PROJECT SHOWCASE</span><h2>{pageContent.showcaseHeading||(type==='construction'?'Visualise the construction journey before you commit.':'See how complete-home interiors can come together.')}</h2><p>{pageContent.showcaseText||(type==='construction'?'Project visuals help connect the estimate with the kind of structure, services and finishing decisions that follow.':'Use the showcase as inspiration while the estimate and consultation keep your actual home scope practical.')}</p></div><div className="csp-showcase-grid">{showcase.map(item=><article key={item.key}><img src={media.category_images?.[item.key]||item.fallback} alt={item.title}/><div><span>{type==='construction'?'CONSTRUCTION':'INTERIORS'}</span><h3>{item.title}</h3></div></article>)}</div></section>
    <section className="csp-section csp-packages"><div className="csp-section-head"><span>PACKAGE OPTIONS</span><h2>Compare what each package includes.</h2><p>Review the key material specifications, allowances and inclusions before starting the estimate or consultation.</p></div><PackageCards packages={packages} estimator={cfg.estimator}/></section>
    <section className="csp-bottom-cta"><div><span>READY TO START?</span><h2>Estimate your project or speak with our team for free.</h2><p>Use the estimate when you want a planning range. Choose the free consultation when you would rather discuss the project first.</p></div><div><Link className="primary" to={cfg.estimator}>Get Project Estimate →</Link><Link to={cfg.requirement}>Get Free Consultation</Link></div></section>
  </main><div className="csp-mobile-actions"><Link to={cfg.estimator}>Get Estimate</Link><Link to={cfg.requirement}>Free Consultation</Link></div><CompanyFooter/></div>
}

function PackagesPage(){
  usePageMeta('Construction & Interior Packages | ProPulse Business','Compare Construction and Interior package specifications, allowances and material inclusions before estimating your project.')
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
    <section className="csp-simple-hero"><span>PACKAGES</span><h1>Compare the specifications before you estimate.</h1><p>Review the major inclusions, allowances and material specifications so you know what the package means before discussing the project.</p></section>
    <section className="csp-section csp-packages">
      <div className="csp-package-tabs"><button type="button" className={audience==='construction'?'active':''} onClick={()=>setAudience('construction')}>Construction</button><button type="button" className={audience==='interior'?'active':''} onClick={()=>setAudience('interior')}>Interiors</button></div>
      <PackageCards packages={packages} estimator={audience==='construction'?'/construction-estimator':'/interior-estimator'}/>
    </section>
    <section className="csp-bottom-cta"><div><span>NEXT STEP</span><h2>Start your estimate with a package already selected.</h2><p>Choose a package above and continue to the estimator. You can still refine optional material or finish choices before calculating.</p></div><div><Link className="primary" to={audience==='construction'?'/construction-estimator':'/interior-estimator'}>Get Project Estimate →</Link></div></section>
  </main><CompanyFooter/></div>
}

function HowItWorksPage(){
  usePageMeta('How It Works | ProPulse Business','See the ProPulse project journey from estimate or free consultation through planning, proposal, execution and handover.')
  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-simple-hero"><span>HOW IT WORKS</span><h1>A clear project journey from first conversation to handover.</h1><p>Start with an estimate or free consultation, then move into scope confirmation, design, planning, execution and handover.</p></section>
    <section className="csp-section"><div className="csp-step-grid">{steps.map(([number,title,text])=><article key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section className="csp-bottom-cta"><div><span>START WITH PLANNING</span><h2>Get a project estimate or choose a free consultation.</h2></div><div><Link className="primary" to="/construction-estimator">Construction Estimate →</Link><Link to="/interior-consultation">Free Interior Consultation</Link></div></section>
  </main><CompanyFooter/></div>
}

function AboutPage(){
  usePageMeta('About ProPulse Business | Construction & Interiors','Learn how ProPulse combines project estimates, package clarity and professional consultation for Construction and Interiors.')
  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-simple-hero"><span>ABOUT</span><h1>Construction and interiors with clearer decisions from the start.</h1><p>ProPulse brings project estimates, package information and consultation into one professional customer journey for Construction and Interiors.</p></section>
    <section className="csp-section"><div className="csp-about-grid"><article><span>01</span><h3>Clear project scope</h3><p>Start with the location, project size, service scope and package information that matter most to planning.</p></article><article><span>02</span><h3>Transparent package view</h3><p>Compare major material specifications, allowances and package inclusions before committing to the next step.</p></article><article><span>03</span><h3>Practical project estimates</h3><p>Use the main project inputs to create an indicative budget range before final drawings and site review.</p></article><article><span>04</span><h3>Free consultation</h3><p>Speak with the project team using the information you already shared, instead of starting the conversation from zero.</p></article></div></section>
    <section className="csp-bottom-cta"><div><span>PLAN YOUR PROJECT</span><h2>Construction or Interiors — start with the scope that matters to you.</h2></div><div><Link className="primary" to="/construction">Construction →</Link><Link to="/interiors">Interiors</Link></div></section>
  </main><CompanyFooter/></div>
}

function ContactPage(){
  usePageMeta('Contact ProPulse Business | Construction & Interiors','Contact ProPulse for Construction and Interior project estimates, free consultations, phone, email and WhatsApp.')
  const[contact,setContact]=useState({})
  useEffect(()=>{let active=true;publicRequest('/contact?audience=website').then(data=>active&&setContact(data||{})).catch(()=>{});return()=>{active=false}},[])
  const whatsapp=String(contact.whatsapp||'').replace(/\D/g,'')
  const socials=(Array.isArray(contact.social_handles)?contact.social_handles:[]).filter(item=>item?.enabled&&item?.url)
  return <div className="csp-page"><CompanyHeader/><main>
    <section className="csp-simple-hero"><span>CONTACT</span><h1>Tell us what you are planning.</h1><p>Start with a project estimate or request a free consultation. You can also reach our team using the contact details below.</p></section>
    <section className="csp-section csp-contact-grid">
      <div className="csp-contact-actions"><h2>Start with your project.</h2><p>Choose an estimate when you want a budget range, or a free consultation when you want our team to call you back first.</p><Link className="primary" to="/construction-estimator">Construction Estimate →</Link><Link to="/interior-estimator">Interior Estimate →</Link><Link to="/construction-consultation">Free Construction Consultation</Link><Link to="/interior-consultation">Free Interior Consultation</Link></div>
      <div className="csp-contact-details"><a href={contact.phone?'tel:'+contact.phone:'#'}><small>PHONE</small><strong>{contact.phone||'Call us for details'}</strong></a><a href={contact.email?'mailto:'+contact.email:'#'}><small>EMAIL</small><strong>{contact.email||'Email us for details'}</strong></a><a href={whatsapp?'https://wa.me/'+whatsapp:'#'} target="_blank" rel="noreferrer"><small>WHATSAPP</small><strong>{contact.whatsapp||'WhatsApp details coming soon'}</strong></a><div><small>OFFICE</small><strong>{contact.address||'Contact us for office details'}</strong>{contact.maps_url&&<a className="csp-inline-link" href={contact.maps_url} target="_blank" rel="noreferrer">Open in Maps ↗</a>}</div>{contact.business_hours&&<div><small>BUSINESS HOURS</small><strong>{contact.business_hours}</strong></div>}{socials.length>0&&<div className="csp-social-links"><small>FOLLOW US</small><div>{socials.map(item=><a key={item.id||item.platform} href={item.url} target="_blank" rel="noreferrer">{item.platform} ↗</a>)}</div></div>}</div>
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
