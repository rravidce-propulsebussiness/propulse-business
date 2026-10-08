import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PublicHeader, PublicFooter } from '../components/PublicSiteChrome'
import { publicRequest } from '../utils/auth'
import './ProfessionalDetails.css'

const emptyRequest={name:'',phone:'',email:'',message:'',consent:false,website:''}
const unique=values=>[...new Set(values.filter(Boolean))]
function initials(name){return String(name||'Professional').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'P'}
function money(value){
  if(value==null||value==='')return ''
  const number=Number(value)
  return Number.isFinite(number)?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(number):''
}
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
  const [request,setRequest]=useState(emptyRequest)
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

  async function sendCallback(event){
    event.preventDefault()
    if(sending||sent)return
    setSending(true);setRequestError('')
    try{
      await publicRequest('/experts/'+encodeURIComponent(expertId)+'/callback',{method:'POST',body:JSON.stringify(request)})
      setSent(true)
    }catch(err){setRequestError(err.message||'Unable to submit request. Please try again.')}
    finally{setSending(false)}
  }
  return <div className="pr-details">
    <PublicHeader/>
    <main className="pr-details-main">
      <div className="pr-breadcrumb"><Link to="/experts">← All professionals</Link><span>/</span><span>{profile?.business_name||'Professional profile'}</span></div>
      {loading&&<div className="pr-state" role="status">Loading professional details…</div>}
      {!loading&&error&&<div className="pr-state" role="alert"><h1>Profile unavailable</h1><p>{error}</p><Link to="/experts">Browse professionals →</Link></div>}
      {!loading&&profile&&<>
        <header className="pr-cover">
          <div className="pr-ident">
            <div className="pr-avatar">{initials(profile.business_name)}</div>
            <div><span className="pr-kicker">{profile.is_verified?'VERIFIED PROFESSIONAL':'EXPERT PROFESSIONAL'}</span><h1>{profile.business_name}</h1>
              <p>{profile.public_headline||unique(services.map(x=>x.industryName)).join(' · ')||'Construction, interior and property professionals'}</p>
              <div className="pr-meta">{profile.years_experience!=null&&<span>{profile.years_experience} years experience</span>}{locationNames.length>0&&<span>{locationNames.slice(0,2).join(' · ')}</span>}</div>
            </div>
          </div>
          <div className="pr-cover-actions"><a href="#callback" className="pr-primary">Request a Callback →</a><a href="#completed-projects" className="pr-secondary">View Completed Projects</a></div>
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
                  <div className="pr-project-links"><Link to={'/projects/project-'+project.id}>View project details →</Link>{safeUrl(project.video_url)&&<a href={safeUrl(project.video_url)} target="_blank" rel="noreferrer">Watch video ↗</a>}{safeUrl(project.plan_url)&&<a href={safeUrl(project.plan_url)} target="_blank" rel="noreferrer">View drawing ↗</a>}{safeUrl(project.brochure_url)&&<a href={safeUrl(project.brochure_url)} target="_blank" rel="noopener noreferrer">Specifications PDF ↗</a>}</div>
                </div>
              </article>)}</div>:<div className="pr-empty">No completed projects have been published yet.</div>}
            </section>

            <section id="brochures" className="pr-panel">
              <span className="pr-label">COMPANY DOCUMENTS</span><h2>Brochures</h2>
              <p>Explore published company brochures, material specifications, and project information.</p>
              {brochures.length?<div className="pr-document-grid">{brochures.map(doc=><a className="pr-document" key={doc.id} href={safeUrl(doc.file_url)||'#brochures'} target="_blank" rel="noreferrer"><span aria-hidden="true">▤</span><div><strong>{doc.title}</strong><small>{doc.description||'Open brochure / document'}</small></div><b>View ↗</b></a>)}</div>:<div className="pr-empty">No brochures published yet. Check back later or request project information below.</div>}
            </section>

            <section id="pricing" className="pr-panel">
              <span className="pr-label">PRICING & PACKAGES</span><h2>Published Packages</h2>
              {plans.length?<div className="pr-plan-grid">{plans.map(plan=><article key={plan.id} className="pr-plan"><span>SERVICE PACKAGE</span><h3>{plan.title}</h3><strong>{money(plan.price_from)||'Request pricing'}</strong>{plan.duration_label&&<small>{plan.duration_label}</small>}{plan.description&&<p>{plan.description}</p>}{Array.isArray(plan.inclusions)&&plan.inclusions.length>0&&<ul>{plan.inclusions.map((item,i)=><li key={i}>{item}</li>)}</ul>}{plan.brochure_url&&<a className="pr-plan-brochure" href={safeUrl(plan.brochure_url)||'#pricing'} target="_blank" rel="noopener noreferrer">View Package Brochure (PDF) ↗</a>}<a href="#callback">Request details →</a></article>)}</div>:<div className="pr-empty">No public packages yet. Request a callback for a personalized quotation.</div>}
            </section>

            <section id="media" className="pr-panel">
              <span className="pr-label">VISUAL PORTFOLIO</span><h2>Videos & Project Plans</h2>
              {videos.length>0&&<div className="pr-document-grid">{videos.map(project=><a className="pr-document" key={'video-'+project.id} href={safeUrl(project.video_url)||'#media'} target="_blank" rel="noreferrer"><span aria-hidden="true">▶</span><div><strong>{project.title}</strong><small>Watch completed work video</small></div><b>Play ↗</b></a>)}</div>}
              {drawings.length>0&&<div className="pr-document-grid">{drawings.map(project=><a className="pr-document" key={'plan-'+project.id} href={safeUrl(project.plan_url)||'#media'} target="_blank" rel="noreferrer"><span aria-hidden="true">▤</span><div><strong>{project.title}</strong><small>Project plan / drawing</small></div><b>Open ↗</b></a>)}</div>}
              {!videos.length&&!drawings.length&&<div className="pr-empty">No videos or drawings published yet.</div>}
            </section>

            <section id="callback" className="pr-panel pr-callback-panel">
              <span className="pr-label">CONTACT THROUGH PROPULSE</span><h2>Request a Callback</h2>
              <p>Send your requirement to {profile.business_name}. Contact details are protected; ProPulse coordinates the introduction.</p>
              {sent?<div className="pr-success" role="status"><strong>Callback request received.</strong><p>Your enquiry has been recorded. ProPulse will help coordinate the next steps.</p></div>:
              <form onSubmit={sendCallback} className="pr-form">
                <label>Full name<input required maxLength={160} autoComplete="name" value={request.name} onChange={e=>setRequest(v=>({...v,name:e.target.value}))} placeholder="Your name"/></label>
                <label>Mobile number<input required type="tel" inputMode="tel" pattern="[0-9+ ()-]{10,18}" autoComplete="tel" value={request.phone} onChange={e=>setRequest(v=>({...v,phone:e.target.value}))} placeholder="Your contact number"/></label>
                <label>Email (optional)<input type="email" maxLength={255} autoComplete="email" value={request.email} onChange={e=>setRequest(v=>({...v,email:e.target.value}))} placeholder="you@example.com"/></label>
                <label className="pr-wide">What are you planning?<textarea rows={4} maxLength={1000} value={request.message} onChange={e=>setRequest(v=>({...v,message:e.target.value}))} placeholder="Project type, locality, budget or preferred callback time"/></label>
                <label className="pr-consent"><input type="checkbox" required checked={request.consent} onChange={e=>setRequest(v=>({...v,consent:e.target.checked}))}/> I agree that ProPulse may use my contact details to coordinate this enquiry.</label>
                <input className="pr-honeypot" aria-hidden="true" tabIndex={-1} autoComplete="off" value={request.website} onChange={e=>setRequest(v=>({...v,website:e.target.value}))}/>
                {requestError&&<p className="pr-error pr-wide" role="alert">{requestError}</p>}
                <button type="submit" disabled={sending}>{sending?'Sending…':'Send Callback Request →'}</button>
              </form>}
            </section>
          </div>
          <aside className="pr-side">
            <div className="pr-side-card"><span className="pr-label">YOUR CONNECTION IS PROTECTED</span><h3>Contact through ProPulse</h3><p>Direct phone numbers and email addresses are not shared publicly. Submit a callback request for coordinated follow-up.</p><div className="pr-masked"><span>Phone</span><strong>••••••••••</strong></div><div className="pr-masked"><span>Email</span><strong>Protected</strong></div><a className="pr-primary" href="#callback">Request Callback →</a></div>
          </aside>
        </div>
      </>}
    </main>
    <PublicFooter description="Explore completed projects, business brochures and verified professional expertise with ProPulse."/>
  </div>
}
