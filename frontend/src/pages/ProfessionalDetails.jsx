import BootLoader from '../components/BootLoader'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PublicHeader, PublicFooter } from '../components/PublicSiteChrome'
import { publicRequest } from '../utils/auth'
import {formatPublishedPackagePrice} from '../utils/packagePricing'
import ProfessionalCallbackRequirementForm, {emptyProfessionalCallback} from '../components/ProfessionalCallbackRequirementForm'
import './ProfessionalDetails.css'

const unique=values=>[...new Set(values.filter(Boolean))]
function initials(name){return String(name||'Professional').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'P'}
function safeUrl(value){
  if(typeof value!=='string')return ''
  try{
    const url=new URL(value,window.location.origin)
    return url.protocol==='https:'||url.protocol==='http:'?url.href:''
  }catch{return ''}
}

export default function ProfessionalDetails(){
  const {expertId}=useParams()
  const [profile,setProfile]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [request,setRequest]=useState(emptyProfessionalCallback)
  const [sending,setSending]=useState(false)
  const [sent,setSent]=useState(false)
  const [requestError,setRequestError]=useState('')
  useEffect(()=>{
    let live=true
    publicRequest('/experts/'+encodeURIComponent(expertId),{timeoutMs:12000})
      .then(value=>{if(live){setProfile(value);setError('')}})
      .catch(err=>{if(live)setError(err.message||'Unable to load this professional.')})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[expertId])
  const projects=useMemo(()=>Array.isArray(profile?.projects)?profile.projects:[],[profile])
  const services=Array.isArray(profile?.services)?profile.services:[]
  const plans=Array.isArray(profile?.service_plans)?profile.service_plans:[]
  const brochures=Array.isArray(profile?.brochures)?profile.brochures:[]
  const locations=Array.isArray(profile?.locations)?profile.locations:[]
  const serviceNames=unique(services.map(x=>x.subserviceName||x.serviceName))
  const locationNames=unique(locations.map(x=>[x.subcityName,x.cityName].filter(Boolean).join(', ')))
  const videos=projects.filter(x=>x.video_url).slice().sort((a,b)=>new Date(b.video_published_at||0)-new Date(a.video_published_at||0))
  const drawings=projects.filter(x=>x.plan_url)

  // SeoManager defaults unknown dynamic paths to noindex. The public profile
  // endpoint has already enforced business visibility; reflect that here after
  // client-side navigation and preserve the server JSON-LD on initial loads.
  useEffect(()=>{
    if(!profile)return;
    const official=profile.is_official===true;
    const canonical='https://propulsetechnologies.online/experts/'+profile.business_profile_id;
    const title=official
      ?'ProPulse Construction & Interior Design Services in Hyderabad | ProPulse'
      :String(profile.business_name||'Professional').trim()+' | Construction & Interior Professional | ProPulse';
    const summary=String(profile.public_summary||'').replace(/[*#_]/g,'').replace(/\s+/g,' ').trim();
    const description=summary.slice(0,158)||'View the published construction and interior services, completed projects and service areas on ProPulse.';
    document.title=title;
    for(const [name,value] of [['description',description],['robots','index,follow,max-image-preview:large'],['googlebot','index,follow,max-image-preview:large'],['twitter:title',title],['twitter:description',description]]){
      let tag=document.head.querySelector('meta[name="'+name+'"]');
      if(!tag){tag=document.createElement('meta');tag.name=name;document.head.appendChild(tag)}
      tag.content=value;
    }
    for(const [key,value] of [['og:title',title],['og:description',description],['og:url',canonical],['og:type','profile']]){
      let tag=document.head.querySelector('meta[property="'+key+'"]');
      if(!tag){tag=document.createElement('meta');tag.setAttribute('property',key);document.head.appendChild(tag)}
      tag.content=value;
    }
    let link=document.head.querySelector('link[rel="canonical"]');
    if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link)}
    link.href=canonical;
    document.head.querySelector('script[data-propulse-seo="jsonld"]')?.remove();
    let schema=document.head.querySelector('script[data-propulse-expert-seo]');
    const serverMatch=schema?.dataset.propulseExpertSeo==='server'&&schema.textContent?.includes(canonical);
    if(!serverMatch){
      if(!schema){schema=document.createElement('script');schema.type='application/ld+json';document.head.appendChild(schema)}
      schema.dataset.propulseExpertSeo='client';
      const cities=[...new Set((profile.locations||[]).map(item=>item.cityName).filter(Boolean))];
      schema.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[
        {'@type':'WebPage',name:title,url:canonical,description,inLanguage:'en-IN'},
        {'@type':official?'HomeAndConstructionBusiness':'Organization',name:profile.business_name,url:canonical,
          description,...(cities.length?{areaServed:cities.map(city=>({'@type':'City',name:city}))}:{})}
      ]});
    }
    return()=>document.head.querySelector('script[data-propulse-expert-seo]')?.remove();
  },[profile]);

  async function sendCallback(event){
    event.preventDefault()
    if(sending||sent)return
    setSending(true);setRequestError('')
    try{
      await publicRequest('/experts/'+encodeURIComponent(expertId)+'/callback',{method:'POST',body:JSON.stringify({...request,marketplaceConsent:request.consent})})
      setSent(true)
    }catch(err){setRequestError(err.message||'Unable to submit request. Please try again.')}
    finally{setSending(false)}
  }
  return <div className="pr-details">
    <PublicHeader/>
    <main className="pr-details-main">
      <div className="pr-breadcrumb"><Link to="/experts">← All professionals</Link><span>/</span><span>{profile?.business_name||'Professional profile'}</span></div>
      {loading&&<BootLoader contained message="Loading professional details" />}
      {!loading&&error&&<div className="pr-state" role="alert"><h1>Profile unavailable</h1><p>{error}</p><Link to="/experts">Browse professionals →</Link></div>}
      {!loading&&profile&&<>
        <header className="pr-cover">
          <div className="pr-ident">
            <div className="pr-avatar">{profile.is_official?<img src="/brand/propulse-logo.png" alt=""/>:initials(profile.business_name)}</div>
            <div><span className="pr-kicker">{profile.is_official?'♛ OFFICIAL PROPULSE':profile.is_verified?'VERIFIED PROFESSIONAL':'EXPERT PROFESSIONAL'}</span><h1>{profile.business_name}</h1>
              <p>{profile.public_headline||unique(services.map(x=>x.industryName)).join(' · ')||'Construction, interior and property professionals'}</p>
              <div className="pr-meta">{profile.years_experience!=null&&<span>{profile.years_experience} years experience</span>}{locationNames.length>0&&<span>{locationNames.slice(0,2).join(' · ')}</span>}</div>
            </div>
          </div>
          <div className="pr-cover-actions">{profile.is_official
            ?<><Link to="/contact#direct-project" className="pr-primary">Request ProPulse Consultation →</Link><a href="#pricing" className="pr-secondary">Explore Packages</a></>
            :<><a href="#pricing" className="pr-primary">Get Instant Package Quote →</a><a href="#callback" className="pr-secondary">Request Callback</a></>}</div>
        </header>

        <nav className="pr-sticky-nav" aria-label="Professional profile sections">
          <a href="#about">About</a><a href="#services">Services</a><a href="#completed-projects">Completed Projects</a><a href="#brochures">Brochures</a><a href="#pricing">Pricing</a><a href="#media">Videos & Plans</a><a href="#callback">Callback</a>
        </nav>

        <div className="pr-layout">
          <div className="pr-content">
            <section id="about" className="pr-panel">
              <span className="pr-label">ABOUT THE COMPANY</span><h2>About {profile.business_name}</h2>
              <p>{profile.public_summary||'This professional has not published an introduction yet.'}</p>
              <div className="pr-stats"><div><strong>{projects.length}</strong><small>Published projects</small></div><div><strong>{serviceNames.length}</strong><small>Services</small></div><div><strong>{brochures.length}</strong><small>Brochures</small></div></div>
            </section>

            <section id="services" className="pr-panel">
              <span className="pr-label">EXPERTISE & COVERAGE</span><h2>Services</h2>
              {serviceNames.length?<div className="pr-tags">{serviceNames.map(name=><span key={name}>{name}</span>)}</div>:<p>No services published yet.</p>}
              {locationNames.length>0&&<><h3>Service areas</h3><p>{locationNames.join(' · ')}</p></>}
            </section>

            <section id="completed-projects" className="pr-panel">
              <span className="pr-label">REAL PROJECT WORK</span><h2>Completed Projects</h2>
              {projects.length?<div className="pr-project-grid">{projects.map(project=><article className="pr-project" key={project.id}>
                {safeUrl(project.cover_image_url)?<img src={safeUrl(project.cover_image_url)} alt={project.title} loading="lazy"/>:<div className="pr-project-fallback">Project showcase</div>}
                <div className="pr-project-text"><span>{[project.project_type,project.completion_year].filter(Boolean).join(' · ')||'Project'}</span><h3>{project.title}</h3><p>{project.description||'Published professional project.'}</p>
                  <small>{[project.location_text,project.area_text].filter(Boolean).join(' · ')}</small>
                  <div className="pr-project-links"><Link to={'/projects/'+(project.seo_slug||'project-'+project.id)}>View project details →</Link>{safeUrl(project.video_url)&&<a href={safeUrl(project.video_url)} target="_blank" rel="noreferrer">Watch video ↗</a>}{safeUrl(project.plan_url)&&<a href={safeUrl(project.plan_url)} target="_blank" rel="noreferrer">View drawing ↗</a>}{safeUrl(project.brochure_url)&&<a href={safeUrl(project.brochure_url)} target="_blank" rel="noopener noreferrer">Specifications PDF ↗</a>}</div>
                </div>
              </article>)}</div>:<div className="pr-empty">No completed projects have been published yet.</div>}
            </section>

            <section id="brochures" className="pr-panel">
              <span className="pr-label">COMPANY DOCUMENTS</span><h2>Brochures</h2>
              <p>Explore published company brochures, material specifications, and project information.</p>
              {brochures.length?<div className="pr-document-grid">{brochures.map(doc=><a className="pr-document" key={doc.id} href={safeUrl(doc.file_url)||'#brochures'} target="_blank" rel="noreferrer"><span aria-hidden="true">▤</span><div><strong>{doc.title}</strong><small>{doc.description||'Open brochure / document'}</small></div><b>View ↗</b></a>)}</div>:<div className="pr-empty">No brochures published yet. Check back later or request project information below.</div>}
            </section>

            <section id="pricing" className="pr-panel">
              <span className="pr-label">PRICING &amp; PACKAGES</span>
              <h2>Published Packages &amp; Instant Quotations</h2>
              <p>Review each published package's brands, rates and included works. Open Get Quote to calculate an estimate and download a PDF on a dedicated quotation page.</p>
              {plans.length?<div className="pr-plan-grid">{plans.map(plan=>{
                return <article key={plan.id} className="pr-plan">
                  <span>{plan.industry==='construction'?'CONSTRUCTION PACKAGE':plan.industry==='design'?'INTERIOR DESIGN PACKAGE':plan.industry==='property'?'REAL ESTATE PACKAGE':'SERVICE PACKAGE'}</span>
                  <h3>{plan.title}</h3>
                  <strong>{formatPublishedPackagePrice(plan.price_from,plan.price_unit)}</strong>
                  <small>Published package rate · final scope and measurements require confirmation</small>
                  {plan.duration_label&&<small>{plan.duration_label}</small>}
                  {plan.description&&<p>{plan.description}</p>}
                  {Array.isArray(plan.spec_sections)&&plan.spec_sections.length>0&&<details className="pr-spec-detail"><summary>{plan.spec_sections.length} detailed material &amp; scope specifications</summary>
                    <div className="pr-spec-list">{plan.spec_sections.map((spec,i)=><div key={i} className="pr-spec-item">
                      <b>{spec.title}</b>
                      {spec.description&&<span>{spec.description}</span>}
                      {(spec.brand||spec.grade)&&<small>{[spec.brand&&'Brand: '+spec.brand,spec.grade&&'Grade / model: '+spec.grade].filter(Boolean).join(' · ')}</small>}
                      <small>{({included:'Included',allowance:'Included allowance',extra:'Extra charge',excluded:'Excluded'})[spec.pricingTreatment]||'Included'}{spec.allowanceValue!=null?' · Allowance ₹'+Number(spec.allowanceValue).toLocaleString('en-IN')+(spec.unit&&spec.unit!=='none'?' / '+spec.unit:''):''}</small>
                    </div>)}</div>
                  </details>}
                  {Array.isArray(plan.inclusions)&&plan.inclusions.length>0&&<details className="pr-spec-detail"><summary>Included works ({plan.inclusions.length})</summary><ul>{plan.inclusions.map((item,i)=><li key={i}>{item}</li>)}</ul></details>}
                  {plan.brochure_url&&<a className="pr-plan-brochure" href={safeUrl(plan.brochure_url)||'#pricing'} target="_blank" rel="noopener noreferrer">View Package Brochure (PDF) ↗</a>}
                  {['sqft','sqyd','project'].includes(plan.price_unit)&&Number(plan.price_from)>0
                    ?<Link className="pr-plan-quote-link" to={'/experts/'+expertId+'/quote?package='+encodeURIComponent(String(plan.id||plan.title))}>Get Quote →</Link>
                    :<a className="pr-plan-quote-link" href="#callback">Request Custom Quote →</a>}
                </article>
              })}</div>:<div className="pr-empty">No public packages yet. Request a callback for a personalized quotation.</div>}
            </section>

            <section id="media" className="pr-panel">
              <span className="pr-label">VISUAL PORTFOLIO</span><h2>Videos & Project Plans</h2>
              {videos.length>0&&<div className="pr-document-grid">{videos.map(project=><a className="pr-document" key={'video-'+project.id} href={safeUrl(project.video_url)||'#media'} target="_blank" rel="noreferrer"><span aria-hidden="true">▶</span><div><strong>{project.title}</strong><small>Watch completed work video</small></div><b>Play ↗</b></a>)}</div>}
              {drawings.length>0&&<div className="pr-document-grid">{drawings.map(project=><a className="pr-document" key={'plan-'+project.id} href={safeUrl(project.plan_url)||'#media'} target="_blank" rel="noreferrer"><span aria-hidden="true">▤</span><div><strong>{project.title}</strong><small>Project plan / drawing</small></div><b>Open ↗</b></a>)}</div>}
              {!videos.length&&!drawings.length&&<div className="pr-empty">No videos or drawings published yet.</div>}
            </section>

            <section id="callback" className="pr-panel pr-callback-panel">
              <span className="pr-label">CONTACT THROUGH PROPULSE</span><h2>Request a Callback</h2>
              <p>{profile.is_official?'Contact ProPulse directly about your construction, renovation or interior project. Official enquiries are separate from marketplace leads.':'Send your requirement to this professional through the ProPulse marketplace. Your request may also be offered to other relevant professionals.'}</p>
              {profile.is_official?<Link to="/contact#direct-project" className="pr-primary">Contact ProPulse Directly →</Link>:sent?<div className="pr-success" role="status"><strong>Callback request received.</strong><p>Your enquiry has been recorded. ProPulse will help coordinate the next steps.</p></div>:
              <ProfessionalCallbackRequirementForm value={request} onChange={setRequest} onSubmit={sendCallback} busy={sending} error={requestError} submitLabel="Send Callback Request"/>}
            </section>
          </div>
          <aside className="pr-side">
            <div className="pr-side-card"><span className="pr-label">{profile.is_official?'OFFICIAL PROPULSE SERVICES':'YOUR CONNECTION IS PROTECTED'}</span>
              <h3>{profile.is_official?'Work Directly With ProPulse':'Contact through ProPulse'}</h3>
              <p>{profile.is_official?'Request direct construction and interior execution through ProPulse. This is not a professional lead purchase.':'Direct phone numbers and email addresses are not shared publicly. Submit a callback request for coordinated follow-up.'}</p>
              {profile.is_official?<Link className="pr-primary" to="/contact#direct-project">Contact ProPulse →</Link>:<><div className="pr-masked"><span>Phone</span><strong>••••••••••</strong></div><div className="pr-masked"><span>Email</span><strong>Protected</strong></div><a className="pr-primary" href="#callback">Request Callback →</a></>}</div>
          </aside>
        </div>
      </>}
    </main>
    <PublicFooter description="Explore completed projects, business brochures and verified professional expertise with ProPulse."/>
  </div>
}
