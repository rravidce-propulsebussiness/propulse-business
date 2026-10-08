
import {useEffect,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {publicRequest} from '../utils/auth'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {normalizeProject} from './Projects'
import {formatPublishedPackagePrice} from '../utils/packagePricing'
import './ProjectQuote.css'

const blank={name:'',phone:'',email:'',siteLocation:'',area:'',budget:'',requirement:'',preferredPackage:'',consent:false,website:''}
const rupees=(value,unit)=>formatPublishedPackagePrice(value,unit)
const cleanPlans=profile=>Array.isArray(profile?.service_plans)?profile.service_plans.filter(plan=>plan?.title):[]

export default function ProjectQuote(){
  const {projectId}=useParams()
  const match=/^project-([1-9]\d*)$/.exec(projectId||'')
  const id=match?.[1]
  const [project,setProject]=useState(null)
  const [packages,setPackages]=useState([])
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [pricingMessage,setPricingMessage]=useState('')
  const [form,setForm]=useState(blank)
  const [saving,setSaving]=useState(false)
  const [requestError,setRequestError]=useState('')
  const [submitted,setSubmitted]=useState(null)

  useEffect(()=>{
    if(!id){setLoading(false);setLoadError('This project link is invalid.');return undefined}
    let active=true
    const controller=new AbortController()
    setProject(null);setPackages([]);setForm(blank);setSubmitted(null)
    setLoadError('');setPricingMessage('');setLoading(true)
    const load=async()=>{
      try{
        const raw=await publicRequest('/experts/projects/'+id,{signal:controller.signal})
        if(!active)return
        const item=normalizeProject(raw)
        setProject(item)
        document.title='Get a quote for '+item.title+' | ProPulse'
        if(item.businessProfileId){
          try{
            const profile=await publicRequest('/experts/'+item.businessProfileId,{signal:controller.signal})
            if(!active)return
            const listed=cleanPlans(profile)
            setPackages(listed)
            const assigned=listed.find(plan=>String(plan.title).trim().toLowerCase()===String(item.packageName||'').trim().toLowerCase())
            if(assigned)setForm(old=>({...old,preferredPackage:assigned.title}))
            if(!listed.length)setPricingMessage('This professional has not published package pricing. You can still request a custom quotation.')
          }catch(error){
            if(active&&!controller.signal.aborted)setPricingMessage('Published package pricing could not be loaded. You can still request a custom quotation.')
          }
        }
      }catch(error){
        if(active&&!controller.signal.aborted)setLoadError(error?.status===404?'This project is not currently available.':error?.message||'Unable to load the project.')
      }finally{if(active)setLoading(false)}
    }
    load()
    return()=>{active=false;controller.abort();document.title='ProPulse'}
  },[id])

  function setField(key,value){setForm(old=>({...old,[key]:value}));setRequestError('')}
  const picked=packages.find(item=>item.title===form.preferredPackage)

  async function submit(event){
    event.preventDefault()
    if(saving||!project||submitted)return
    setRequestError('');setSaving(true)
    try{
      const payload={
        name:form.name,phone:form.phone,email:form.email,requirement:form.requirement,
        siteLocation:form.siteLocation,area:form.area,budget:form.budget,
        preferredPackage:picked?.title||'',consent:form.consent,website:form.website,
      }
      const result=await publicRequest('/experts/projects/'+id+'/quote-request',{
        method:'POST',body:JSON.stringify(payload),
      })
      setSubmitted(result||{accepted:true})
      window.scrollTo({top:0,behavior:'smooth'})
    }catch(error){setRequestError(error?.message||'Unable to send your quote request. Please try again.')}
    finally{setSaving(false)}
  }

  return <main className="pq-page">
    <PublicHeader/>
    <div className="pq-wrap">
      <nav className="pq-breadcrumb" aria-label="Breadcrumb">
        <Link to="/projects">Projects</Link><span>/</span>
        <Link to={'/projects/'+projectId}>Project details</Link><span>/</span><span>Get Quote</span>
      </nav>
      {loading?<div className="pq-loading" role="status">Loading project and professional pricing…</div>:
      loadError||!project?<section className="pq-status" role="alert">
        <h1>Quotation not available</h1><p>{loadError||'Project information is unavailable.'}</p>
        <Link to="/projects">Browse projects →</Link>
      </section>:
      submitted?<section className="pq-success" role="status">
        <div className="pq-success-icon" aria-hidden="true">✓</div>
        <span className="pq-eyebrow">PROJECT QUOTATION REQUEST</span>
        <h1>{submitted.duplicate?'We already received your request':'Quotation request received'}</h1>
        <p>Your enquiry about <strong>{project.title}</strong> has been recorded. The professional can prepare the project-specific price and scope; ProPulse coordinates the response without exposing your contact details publicly.</p>
        {submitted.requestId&&<strong className="pq-request-id">Reference #{submitted.requestId}</strong>}
        <div className="pq-success-actions"><Link to={'/projects/'+projectId}>Back to project</Link><Link to="/projects">More projects</Link></div>
      </section>:
      <>
        <header className="pq-hero">
          <div>
            <span className="pq-eyebrow">PROFESSIONAL PROJECT PRICING</span>
            <h1>Get a quotation for a project like this.</h1>
            <p>Choose a published package from the professional’s profile, share your project details, and request a tailored price.</p>
            <div className="pq-hero-tags"><span>Professional-specific</span><span>Private contact</span><span>No upfront payment</span></div>
          </div>
          <div className="pq-hero-symbol" aria-hidden="true">₹</div>
        </header>
        <div className="pq-grid">
          <div className="pq-main">
            <section className="pq-panel" aria-labelledby="pq-package-title">
              <div className="pq-section-header"><span className="pq-section-index">01</span><div><span className="pq-eyebrow">PUBLISHED PROFESSIONAL PRICING</span><h2 id="pq-package-title">Choose your package</h2><p>These are starting rates set in the professional’s ProPulse profile, not the cost of the completed project shown.</p></div></div>
              {pricingMessage&&<p className="pq-note" role="status">{pricingMessage}</p>}
              <div className="pq-package-list" role="radiogroup" aria-label="Preferred professional package">
                <label className={'pq-package-choice'+(!form.preferredPackage?' selected':'')}>
                  <input type="radio" name="preferredPackage" value="" checked={!form.preferredPackage} onChange={()=>setField('preferredPackage','')}/>
                  <span className="pq-choice-mark" aria-hidden="true"/>
                  <span className="pq-choice-content"><strong>Custom quotation</strong><small>Professional recommends a package after reviewing your requirements.</small></span>
                  <span className="pq-price-box"><strong>On request</strong><small>Custom scope</small></span>
                </label>
                {packages.map(plan=><label key={plan.id||plan.title} className={'pq-package-choice'+(form.preferredPackage===plan.title?' selected':'')}>
                  <input type="radio" name="preferredPackage" value={plan.title} checked={form.preferredPackage===plan.title} onChange={()=>setField('preferredPackage',plan.title)}/>
                  <span className="pq-choice-mark" aria-hidden="true"/>
                  <span className="pq-choice-content">
                    <strong>{plan.title}</strong>
                    {plan.duration_label&&<small>Estimated duration: {plan.duration_label}</small>}
                    {plan.description&&<small className="pq-package-description">{plan.description}</small>}
                    {Array.isArray(plan.inclusions)&&plan.inclusions.length>0&&<span className="pq-inclusions">{plan.inclusions.slice(0,4).map((item,index)=><small key={index}><span aria-hidden="true">✓ </span>{item}</small>)}</span>}
                    {plan.brochure_url&&<a className="pq-document" href={plan.brochure_url} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>View package specifications PDF ↗</a>}
                  </span>
                  <span className="pq-price-box"><strong>{rupees(plan.price_from,plan.price_unit)}</strong><small>Published starting rate</small></span>
                </label>)}
              </div>
              <p className="pq-price-disclaimer">The final amount depends on measurements, site conditions, materials and inclusions. An unspecified unit or a starting price is not a confirmed project total.</p>
            </section>
            <section className="pq-panel" aria-labelledby="pq-form-title">
              <div className="pq-section-header"><span className="pq-section-index">02</span><div><span className="pq-eyebrow">TELL US ABOUT YOUR REQUIREMENT</span><h2 id="pq-form-title">Your project details</h2><p>ProPulse forwards the requirements to the selected professional for a personalized quotation.</p></div></div>
              <form className="pq-form" onSubmit={submit}>
                <div className="pq-form-grid">
                  <label>Full name <span>*</span><input type="text" autoComplete="name" placeholder="Your name" required maxLength={160} value={form.name} onChange={event=>setField('name',event.target.value)}/></label>
                  <label>Mobile number <span>*</span><input type="tel" autoComplete="tel" inputMode="tel" placeholder="10-digit mobile number" required pattern="[0-9+ ()-]{10,18}" maxLength={18} value={form.phone} onChange={event=>setField('phone',event.target.value)}/></label>
                  <label>Email (optional)<input type="email" autoComplete="email" maxLength={255} placeholder="you@example.com" value={form.email} onChange={event=>setField('email',event.target.value)}/></label>
                  <label>Your site location<input type="text" maxLength={180} placeholder="e.g. Uppal, Hyderabad" value={form.siteLocation} onChange={event=>setField('siteLocation',event.target.value)}/></label>
                  <label>Project area<input type="text" maxLength={120} placeholder="e.g. 1,650 sq ft" value={form.area} onChange={event=>setField('area',event.target.value)}/></label>
                  <label>Approximate budget<input type="text" maxLength={120} placeholder="e.g. ₹12–15 lakh" value={form.budget} onChange={event=>setField('budget',event.target.value)}/></label>
                  <label className="pq-wide">Tell us what you want to build or design <span>*</span><textarea rows={5} required maxLength={3000} placeholder="Describe your rooms, construction or interior scope, preferred materials, and questions…" value={form.requirement} onChange={event=>setField('requirement',event.target.value)}/></label>
                </div>
                <label className="pq-consent"><input type="checkbox" required checked={form.consent} onChange={event=>setField('consent',event.target.checked)}/> I agree that ProPulse may use my details to coordinate this project-specific quotation.</label>
                <input className="pq-honeypot" tabIndex={-1} aria-hidden="true" autoComplete="off" value={form.website} onChange={event=>setField('website',event.target.value)}/>
                {requestError&&<p className="pq-error" role="alert">{requestError}</p>}
                <button className="pq-submit" type="submit" disabled={saving}>{saving?'Sending your request…':'Request Professional Quote →'}</button>
                <small className="pq-privacy">Your number and email are protected in the professional dashboard. A final price is provided only after reviewing the scope.</small>
              </form>
            </section>
          </div>
          <aside className="pq-aside">
            <div className="pq-summary">
              <span className="pq-eyebrow">THE PROJECT YOU SELECTED</span>
              {project.image&&<img src={project.image} alt={project.title+' project photograph'} className="pq-summary-photo"/>}
              <h2>{project.title}</h2>
              {project.businessName&&<p>By <strong>{project.businessName}</strong></p>}
              <dl>
                <div><dt>Type</dt><dd>{project.type}</dd></div>
                {project.area&&<div><dt>Reference project area</dt><dd>{project.area}</dd></div>}
                {project.location&&<div><dt>Reference location</dt><dd>{project.location}</dd></div>}
                <div><dt>Selected package</dt><dd>{picked?.title||'Custom quote'}</dd></div>
                <div className="pq-summary-price"><dt>Published starting rate</dt><dd>{picked?rupees(picked.price_from,picked.price_unit):'To be confirmed'}</dd></div>
              </dl>
              {project.cost&&<p className="pq-historic"><strong>Reported past project value:</strong> {project.cost}. This is not your quotation and is not used to calculate your price.</p>}
              <div className="pq-summary-links"><Link to={'/projects/'+projectId}>← View project details</Link>{project.businessProfileId&&<Link to={'/experts/'+project.businessProfileId}>View professional profile ↗</Link>}</div>
              <p className="pq-info-footer">Package pricing is maintained by the professional through their business profile. Final pricing is confirmed separately.</p>
            </div>
          </aside>
        </div>
      </>}
    </div>
    <PublicFooter/>
  </main>
}
