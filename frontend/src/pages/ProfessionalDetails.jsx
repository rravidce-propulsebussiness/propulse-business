import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PublicHeader, PublicFooter } from '../components/PublicSiteChrome'
import { publicRequest } from '../utils/auth'
import {formatPublishedPackagePrice} from '../utils/packagePricing'
import ProfessionalCallbackRequirementForm, {emptyProfessionalCallback} from '../components/ProfessionalCallbackRequirementForm'
import {downloadProfessionalPackageEstimatePdf} from '../utils/requirementQuotePdf'
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
  const [requestMode,setRequestMode]=useState('quote')
  const [packageId,setPackageId]=useState('')
  const [quantity,setQuantity]=useState('')
  const [requestResult,setRequestResult]=useState(null)
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
  const priceablePlans=plans.filter(plan=>plan.industry===(request.flowKey==='build'?'construction':request.flowKey==='design'?'design':'none')&&Number(plan.price_from)>0&&['sqft','sqyd','room','running_ft','unit','project'].includes(plan.price_unit))
  const selectedPlan=priceablePlans.find(plan=>String(plan.id)===packageId)
  const quantityUnit=selectedPlan?.price_unit||'sqft'
  const estimatedTotal=selectedPlan&&Number(quantity)>0?Number(selectedPlan.price_from)*Number(quantity):null
  const estimateDisplay=Number.isFinite(estimatedTotal)&&estimatedTotal>0?'₹'+estimatedTotal.toLocaleString('en-IN',{maximumFractionDigits:2}):''
  const quantityLabels={sqft:'Chargeable area (sq ft)',sqyd:'Chargeable area (sq yards)',room:'Number of rooms',running_ft:'Running feet',unit:'Number of items',project:'Projects (enter 1)'}
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
      if(requestMode==='quote'&&(!selectedPlan||!(Number(quantity)>0)))throw new Error('Select an enabled professional package and enter your actual chargeable measurements.')
      const result=await publicRequest('/experts/'+encodeURIComponent(expertId)+'/callback',{
        method:'POST',
        body:JSON.stringify({...request,marketplaceConsent:request.consent,
          requestPurpose:requestMode,packageId:requestMode==='quote'?selectedPlan.id:undefined,
          quantity:requestMode==='quote'?Number(quantity):undefined}),
      })
      setRequestResult(result)
      setSent(true)
      if(requestMode==='quote'&&!result.duplicate&&result.estimate){
        try{
          await downloadProfessionalPackageEstimatePdf({
            companyName:profile.business_name,estimate:result.estimate,
            customerName:request.name,city:request.cityName,pincode:request.pincode,
            requestId:result.requestId,
            propulseContact:await publicRequest('/contact?audience=website').catch(()=>({})),
          })
        }catch(pdfError){setRequestError('Request saved, but the estimate PDF could not be downloaded. '+(pdfError?.message||''))}
      }
    }catch(err){setRequestError(err.message||'Unable to submit request. Please try again.')}
    finally{setSending(false)}
  }
  return <div className="pr-details">
    <PublicHeader/>
    <main className="pr-details-main">
      <Link className="pr-all-professionals" to="/experts">← All Professionals</Link>
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
          <div className="pr-cover-actions"><a href="#callback" className="pr-primary" onClick={()=>setRequestMode('quote')}>Get Professional Quote →</a><a href="#callback" className="pr-secondary" onClick={()=>setRequestMode('callback')}>Request Callback</a></div>
        </header>

        <nav className="pr-sticky-nav" aria-label="Professional profile sections">
          <a href="#about">About</a><a href="#services">Services</a><a href="#completed-projects">Completed Projects</a><a href="#brochures">Brochures</a><a href="#pricing">Pricing</a><a href="#media">Videos & Plans</a><a href="#callback">Get Quote / Callback</a>
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
              {plans.length?<div className="pr-plan-grid">{plans.map(plan=><article key={plan.id} className="pr-plan"><span>{plan.industry==='construction'?'CONSTRUCTION PACKAGE':plan.industry==='design'?'INTERIOR DESIGN PACKAGE':plan.industry==='property'?'REAL ESTATE PACKAGE':'SERVICE PACKAGE'}</span><h3>{plan.title}</h3><strong>{formatPublishedPackagePrice(plan.price_from,plan.price_unit)}</strong><small>Published starting rate · confirm unit and final scope with the professional</small>{plan.duration_label&&<small>{plan.duration_label}</small>}{plan.description&&<p>{plan.description}</p>}{Array.isArray(plan.inclusions)&&plan.inclusions.length>0&&<ul>{plan.inclusions.map((item,i)=><li key={i}>{item}</li>)}</ul>}{plan.brochure_url&&<a className="pr-plan-brochure" href={safeUrl(plan.brochure_url)||'#pricing'} target="_blank" rel="noopener noreferrer">View Package Brochure (PDF) ↗</a>}<a href="#callback" onClick={()=>{setRequestMode('quote');setPackageId(String(plan.id));setQuantity(plan.price_unit==='project'?'1':'')}}>Estimate with this package →</a></article>)}</div>:<div className="pr-empty">No public packages yet. Request a callback for a personalized quotation.</div>}
            </section>

            <section id="media" className="pr-panel">
              <span className="pr-label">VISUAL PORTFOLIO</span><h2>Videos & Project Plans</h2>
              {videos.length>0&&<div className="pr-document-grid">{videos.map(project=><a className="pr-document" key={'video-'+project.id} href={safeUrl(project.video_url)||'#media'} target="_blank" rel="noreferrer"><span aria-hidden="true">▶</span><div><strong>{project.title}</strong><small>Watch completed work video</small></div><b>Play ↗</b></a>)}</div>}
              {drawings.length>0&&<div className="pr-document-grid">{drawings.map(project=><a className="pr-document" key={'plan-'+project.id} href={safeUrl(project.plan_url)||'#media'} target="_blank" rel="noreferrer"><span aria-hidden="true">▤</span><div><strong>{project.title}</strong><small>Project plan / drawing</small></div><b>Open ↗</b></a>)}</div>}
              {!videos.length&&!drawings.length&&<div className="pr-empty">No videos or drawings published yet.</div>}
            </section>

            <section id="callback" className="pr-panel pr-callback-panel">
              <span className="pr-label">DIRECT PROFESSIONAL ENQUIRY</span>
              <h2>{requestMode==='quote'?'Get a Professional Package Estimate':'Request a Callback'}</h2>
              <p>{requestMode==='quote'
                ?'Select this company’s enabled construction or interior package. Enter actual chargeable measurements to receive an indicative PDF immediately after submitting. The company will confirm its final quote.'
                :'Send your requirement to '+profile.business_name+'. ProPulse coordinates contact access. No package price or quotation is required.'}</p>
              <div className="pr-enquiry-switch" role="group" aria-label="Choose enquiry purpose">
                <button type="button" className={requestMode==='quote'?'active':''} onClick={()=>{setRequestMode('quote');setSent(false);setRequestError('')}}>▤ Get Quote</button>
                <button type="button" className={requestMode==='callback'?'active':''} onClick={()=>{setRequestMode('callback');setSent(false);setRequestError('')}}>☎ Request Callback</button>
              </div>
              {sent?<div className="pr-success" role="status">
                <strong>{requestMode==='quote'?'Package estimate request received.':'Callback request received.'}</strong>
                <p>{requestResult?.duplicate?'A recent enquiry is already recorded. No duplicate request was created.':requestMode==='quote'?'Your indicative package PDF download was prepared from this company’s published rate. The professional will review the final scope.':'Your enquiry has been recorded. ProPulse will help coordinate the next steps.'}</p>
                {requestError&&<p role="alert">{requestError}</p>}
                <button type="button" onClick={()=>{setSent(false);setRequestError('')}}>New enquiry</button>
              </div>:
              <ProfessionalCallbackRequirementForm value={request} onChange={setRequest}
                onSubmit={sendCallback} busy={sending} error={requestError}
                submitLabel={requestMode==='quote'?'Submit & Download Estimated PDF':'Send Callback Request'}
                quoteOptions={requestMode==='quote'?{
                  plans:priceablePlans,packageId,setPackageId,quantity,setQuantity,
                  priceUnit:quantityUnit,quantityLabel:quantityLabels[quantityUnit],
                  estimate:estimateDisplay,formatPrice:plan=>formatPublishedPackagePrice(plan.price_from,plan.price_unit),
                }:null}/>}
            </section>
          </div>
          <aside className="pr-side">
            <div className="pr-side-card"><span className="pr-label">YOUR CONNECTION IS PROTECTED</span><h3>Contact through ProPulse</h3><p>Professional phone numbers and emails are not shown. Request an indicative package quote or callback through ProPulse for coordinated follow-up.</p><div className="pr-masked"><span>Phone</span><strong>••••••••••</strong></div><div className="pr-masked"><span>Email</span><strong>Protected</strong></div><a className="pr-primary" href="#callback" onClick={()=>setRequestMode('quote')}>Get Professional Quote →</a></div>
          </aside>
        </div>
      </>}
    </main>
    <PublicFooter description="Explore completed projects, business brochures and verified professional expertise with ProPulse."/>
  </div>
}
