import {useEffect,useMemo,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {publicRequest} from '../utils/auth'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {openLeadPopup} from '../utils/leadPopup'
import {CONCEPTS,normalizeProject,projectPhotos,categoryLabel,playableProjectVideo,Icon} from './Projects'
import './Projects.css'
import './ProjectDetail.css'

const emptyCallback={name:'',phone:'',email:'',message:'',consent:false,website:''}
const similarQuoteHash=project=>project.category==='design'?'interiors':project.category==='property'?'property':'construction'
const isPdf=value=>/\.pdf(?:[?#]|$)/i.test(value||'')

export default function ProjectDetail(){
  const {projectId}=useParams()
  const sample=useMemo(()=>CONCEPTS.find(item=>item.id===projectId)||null,[projectId])
  const realId=/^project-([1-9]\d*)$/.exec(projectId||'')?.[1]||''
  const [project,setProject]=useState(sample)
  const [loading,setLoading]=useState(!sample&&Boolean(realId))
  const [error,setError]=useState('')
  const [photoIndex,setPhotoIndex]=useState(0)
  const [showVideo,setShowVideo]=useState(false)
  const [linkedPlan,setLinkedPlan]=useState(null)
  const [contactData,setContactData]=useState({})
  const [callbackForm,setCallbackForm]=useState(emptyCallback)
  const [callbackSending,setCallbackSending]=useState(false)
  const [callbackFeedback,setCallbackFeedback]=useState('')
  const [callbackSuccess,setCallbackSuccess]=useState(false)
  const [packageDownloading,setPackageDownloading]=useState(false)
  const [packageError,setPackageError]=useState('')

  useEffect(()=>{
    let active=true
    publicRequest('/contact?audience=website')
      .then(value=>{if(active)setContactData(value||{})}).catch(()=>{})
    return()=>{active=false}
  },[])

  useEffect(()=>{
    let active=true
    setProject(sample)
    setError('')
    setPhotoIndex(0)
    setShowVideo(false)
    setLinkedPlan(null)
    setCallbackForm(emptyCallback)
    setCallbackFeedback('')
    setCallbackSuccess(false)
    setPackageError('')
    setPackageDownloading(false)
    setLoading(!sample&&Boolean(realId))
    if(sample||!realId){
      if(!sample)setError('That project could not be found or is no longer published.')
      return()=>{active=false}
    }
    const refresh=async(initial=false)=>{
      try{
        const value=await publicRequest('/experts/projects/'+realId)
        if(!active)return
        setProject(normalizeProject(value))
        setError('')
      }catch(err){
        if(!active)return
        if(initial){setProject(null);setError(err?.status===404?'That project is no longer available.':'Unable to load the project. Please try again.')}
      }finally{if(active&&initial)setLoading(false)}
    }
    refresh(true)
    const onVisible=()=>{if(document.visibilityState==='visible')refresh(false)}
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh(false)},120000)
    document.addEventListener('visibilitychange',onVisible)
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)}
  },[sample,realId])

  useEffect(()=>{
    if(!project||project.sample||!project.businessProfileId||!project.packageName)return undefined
    let active=true
    publicRequest('/experts/'+project.businessProfileId)
      .then(data=>{
        if(!active)return
        const plans=Array.isArray(data?.service_plans)?data.service_plans:[]
        setLinkedPlan(plans.find(plan=>String(plan.title||'').trim().toLowerCase()===project.packageName.toLowerCase())||null)
      }).catch(()=>{})
    return()=>{active=false}
  },[project?.businessProfileId,project?.packageName,project?.sample])

  useEffect(()=>{
    if(!project)return undefined
    const original=document.title
    document.title=project.title+' | ProPulse Projects'
    return()=>{document.title=original}
  },[project?.title])

  const photos=project?projectPhotos(project):[]
  const activePhoto=photos[photoIndex]||photos[0]||''
  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''
  const email=contactData.email||contactData.support_email||''

  async function submitCallback(event){
    event.preventDefault()
    if(!project||project.sample||!project.businessProfileId)return
    setCallbackFeedback('')
    setCallbackSending(true)
    try{
      await publicRequest('/experts/projects/'+encodeURIComponent(project.id)+'/callback',{
        method:'POST',body:JSON.stringify(callbackForm),
      })
      setCallbackSuccess(true)
      setCallbackFeedback('Callback request received. ProPulse will coordinate your enquiry with '+(project.businessName||'this professional')+'.')
    }catch(err){setCallbackFeedback(err.message||'Unable to send your request. Please try again.')}
    finally{setCallbackSending(false)}
  }

  async function downloadPackage(){
    if(!project||packageDownloading)return
    setPackageDownloading(true);setPackageError('')
    try{
      const {downloadProjectPackagePdf}=await import('../utils/requirementQuotePdf')
      await downloadProjectPackagePdf({project,plan:linkedPlan})
    }catch(err){
      setPackageError(err?.message||'Unable to prepare the PDF. Please try again.')
    }finally{setPackageDownloading(false)}
  }

  function requestCallback(){
    if(!project)return
    if(project.sample){
      openLeadPopup(similarQuoteHash(project)==='interiors'?'design':similarQuoteHash(project)==='property'?'property':'build',{
        intent:'callback',
        projectTitle:project.title,
        packageName:project.packageName,
      })
      return
    }
    document.getElementById('pjd-contact-form')?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  const relatedProjects=CONCEPTS.filter(item=>item.id!==projectId&&item.category===(project?.category||'construction')).slice(0,3)

  return <main className="pj-page pjd-page">
    <PublicHeader/>
    <section className="pjd-content">
      <div className="pjd-container">
        <nav className="pjd-breadcrumb" aria-label="Breadcrumb">
          <Link to="/projects">Projects</Link><span aria-hidden="true">/</span>
          <span>{project?.title||'Project details'}</span>
        </nav>
        {loading?<div className="pjd-status" role="status"><span className="pj-inline-spinner"/>Loading project details…</div>:
        !project?<div className="pjd-status"><h1>Project not available</h1><p role="alert">{error}</p><Link to="/projects">← View all projects</Link></div>:
        <>
          <header className="pjd-heading pjd-hero-intro">
            <div>
              <span className="pjd-overline"><span className="pjd-kicker-dot"/>{project.sample?'THE DESIGN COLLECTION · INSPIRATION':categoryLabel(project.category).toUpperCase()+' · PROFESSIONAL PORTFOLIO'}</span>
              <h1>{project.title}</h1>
              <p>{project.description||'Explore the project gallery, specifications and published details.'}</p>
              <div className="pjd-hero-micro"><span>01 / Architecture</span><span>02 / Materiality</span><span>03 / Your next move</span></div>
            </div>
            <div className="pjd-heading-tags">
              {project.sample?<span className="pjd-sample-label">Illustrative project</span>:<span className="pjd-published-label">Professional portfolio</span>}
              {!project.sample&&project.verified&&<span className="pjd-verified">Verified professional</span>}
              <span className="pjd-collection-index">FEATURED PROJECT GUIDE&nbsp; ↗</span>
            </div>
          </header>
          <div className="pjd-main-grid">
            <div className="pjd-gallery-block">
              <div className="pjd-main-image">
                {showVideo&&project.video&&playableProjectVideo(project.video)
                  ?<video key={project.video} poster={activePhoto||undefined} src={project.video} controls playsInline preload="metadata" className="pjd-feature-media"/>
                  :activePhoto?<img className="pjd-feature-media" src={activePhoto} alt={project.title+' image '+(photoIndex+1)}/>
                  :<div className="pjd-no-photo">Photographs for this project are not available yet.</div>}
                {activePhoto&&!showVideo&&<div className="pjd-image-caption"><span className="pjd-caption-line"/><span>{project.sample?'CURATED VISUAL REFERENCE':'PROJECT PORTFOLIO'}<small>{String(photoIndex+1).padStart(2,'0')} / {String(photos.length).padStart(2,'0')}</small></span></div>}
                {photos.length>1&&!showVideo&&<div className="pjd-photo-nav">
                  <button type="button" aria-label="Previous image" onClick={()=>setPhotoIndex(n=>(n+photos.length-1)%photos.length)}>‹</button>
                  <span>{photoIndex+1} / {photos.length}</span>
                  <button type="button" aria-label="Next image" onClick={()=>setPhotoIndex(n=>(n+1)%photos.length)}>›</button>
                </div>}
              </div>
              {(photos.length>1||project.video)&&<div className="pjd-thumbnails" aria-label="Project media gallery">
                {photos.map((url,index)=><button key={url+index} type="button" className={!showVideo&&photoIndex===index?'active':''} onClick={()=>{setPhotoIndex(index);setShowVideo(false)}} aria-label={'View image '+(index+1)} aria-pressed={!showVideo&&photoIndex===index}><img src={url} alt=""/></button>)}
                {project.video&&(playableProjectVideo(project.video)
                  ?<button type="button" className={'pjd-video-thumb'+(showVideo?' active':'')} aria-pressed={showVideo} onClick={()=>setShowVideo(true)}>▶ Video</button>
                  :<a className="pjd-video-thumb" href={project.video} target="_blank" rel="noopener noreferrer">▶ Video ↗</a>)}
              </div>}
              {project.sample&&<p className="pjd-photo-note">Visual references only. These images do not document a verified completed client project.</p>}
            </div>
            <aside className="pjd-summary">
              <div className="pjd-summary-top"><div className="pjd-summary-icon">⌂</div><div><span>THE PROJECT AT A GLANCE</span><h2>{project.sample?'Your inspiration board':'Project information'}</h2></div></div>
              <dl className="pjd-fact-grid">
                <div><dt>Project type</dt><dd>{project.type}</dd></div>
                {project.location&&<div><dt>{project.sample?'Illustrative location':'Location'}</dt><dd>{project.location}</dd></div>}
                {project.area&&<div><dt>Project area</dt><dd>{project.area}</dd></div>}
                {project.packageName&&<div><dt>{project.sample?'Example package':'Selected package'}</dt><dd>{project.packageName}</dd></div>}
                {!project.sample&&project.completionYear&&<div><dt>Completion year</dt><dd>{project.completionYear}</dd></div>}
                {!project.sample&&project.businessName&&<div><dt>Published by</dt><dd>{project.businessName}</dd></div>}
              </dl>
              {project.cost&&<div className="pjd-price"><small>{project.sample?'ILLUSTRATIVE COST · NOT A QUOTATION':'REPORTED PROJECT COST / BUDGET'}</small><strong>{project.cost}</strong></div>}
              <div className="pjd-action-intro"><span>YOUR NEXT STEP</span><strong>Love this space? Bring yours to life.</strong><small>Explore the guide, speak to us, or plan your own quote.</small></div>
              <div className="pjd-action-stack" aria-label="Project next steps">
                <button type="button" className="pjd-download pjd-action-button" disabled={packageDownloading} onClick={downloadPackage}>
                  <span className="pjd-cta-symbol"><Icon name="file" size={21}/></span>
                  <span className="pjd-cta-copy"><strong>{packageDownloading?'Preparing PDF…':'Download Package'}</strong><small>{project.sample?'Illustrative package guide · PDF':'Published information guide · PDF'}</small></span>
                  <span className="pjd-cta-arrow" aria-hidden="true">↧</span>
                </button>
                <button type="button" className="pjd-callback pjd-action-button" onClick={requestCallback}>
                  <span className="pjd-cta-symbol" aria-hidden="true">☎</span>
                  <span className="pjd-cta-copy"><strong>{callbackSuccess?'Callback Requested':'Request a Callback'}</strong><small>{project.sample?'Consult with the ProPulse team':'Ask about this project'}</small></span>
                  <span className="pjd-cta-arrow" aria-hidden="true">↗</span>
                </button>
                <Link className="pjd-main-cta pjd-action-button" to={'/quote#'+similarQuoteHash(project)}>
                  <span className="pjd-cta-symbol" aria-hidden="true">✧</span>
                  <span className="pjd-cta-copy"><strong>Get Quote</strong><small>Plan a similar space</small></span>
                  <span className="pjd-cta-arrow" aria-hidden="true">↗</span>
                </Link>
              </div>
              {packageError&&<p className="pjd-error" role="alert">{packageError}</p>}
              {!project.sample&&project.document&&<a className="pjd-document-link" href={project.document} target="_blank" rel="noopener noreferrer"><Icon name="file" size={16}/>{isPdf(project.document)?'View published project PDF':'View published drawing / document'} ↗</a>}
              <div className="pjd-privacy"><span aria-hidden="true">✓</span><span>{project.sample?'Illustrative reference only. Request your own site-specific quotation.':'Private enquiry through ProPulse. Contact information stays protected.'}</span></div>
            </aside>
          </div>
          <div className="pjd-bottom-grid">
            <section className="pjd-information">
              <span className="pjd-overline">PROJECT DETAILS</span>
              <h2>{project.sample?'Inspiration and example scope':'Scope and specifications'}</h2>
              {project.description&&<p>{project.description}</p>}
              {project.sample&&project.sampleSpecs?.length>0&&<ul className="pjd-spec-list">{project.sampleSpecs.map(spec=><li key={spec}><Icon name="check" size={17}/>{spec}</li>)}</ul>}
              {!project.sample&&linkedPlan&&Array.isArray(linkedPlan.inclusions)&&linkedPlan.inclusions.length>0&&<ul className="pjd-spec-list">{linkedPlan.inclusions.map((spec,i)=><li key={i}><Icon name="check" size={17}/>{spec}</li>)}</ul>}
              {!project.sample&&<p>These details were supplied by the publishing professional. Confirm material brands, exact scope and costs before proceeding.</p>}
              {project.sample&&<p>Sample imagery, locations, costs and package specifications are illustrative and are not claims of completed client work.</p>}
            </section>
            <section className="pjd-contact" id="pjd-contact-form">
              {project.sample?<><span className="pjd-overline">LOVE THIS CONCEPT?</span><h2>Make room for your dream home.</h2><p>Like the details? ProPulse can help you explore a site-specific scope, materials and budget for your own home. This is an inspiration image, not a bookable contractor project.</p><button type="button" className="pjd-main-cta" onClick={requestCallback}><span aria-hidden="true">☎</span> Request a Callback <Icon name="arrow" size={16}/></button><Link className="pjd-contact-outline" to={'/quote#'+similarQuoteHash(project)}>Get Your Custom Quote <Icon name="arrow" size={16}/></Link><p className="pjd-form-assurance">Free consultation · No obligation · Contact details handled by ProPulse</p></>:
              <>
                <span className="pjd-overline">YOUR PROJECT STARTS HERE</span>
                <h2>Talk to {project.businessName||'this professional'}</h2>
                <p>Request a private callback about this project. ProPulse coordinates the introduction; your phone and email stay protected.</p>
                {callbackSuccess?<p className="pj-callback-success" role="status">{callbackFeedback}</p>:
                  <form className="pjd-callback-form" onSubmit={submitCallback}>
                    <div className="pjd-field-pair">
                      <label>Your name<input required maxLength={160} autoComplete="name" placeholder="Full name" value={callbackForm.name} onChange={e=>setCallbackForm(v=>({...v,name:e.target.value}))}/></label>
                      <label>Mobile number<input required type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+ ()-]{10,18}" placeholder="10-digit mobile" value={callbackForm.phone} onChange={e=>setCallbackForm(v=>({...v,phone:e.target.value}))}/></label>
                    </div>
                    <label>Email (optional)<input type="email" maxLength={255} autoComplete="email" placeholder="you@example.com" value={callbackForm.email} onChange={e=>setCallbackForm(v=>({...v,email:e.target.value}))}/></label>
                    <label>Your requirement (optional)<textarea rows={3} maxLength={1000} placeholder="Tell the professional what you'd like to discuss" value={callbackForm.message} onChange={e=>setCallbackForm(v=>({...v,message:e.target.value}))}/></label>
                    <label className="pjd-consent"><input type="checkbox" required checked={callbackForm.consent} onChange={e=>setCallbackForm(v=>({...v,consent:e.target.checked}))}/> I agree that ProPulse may use my details to coordinate this callback.</label>
                    <input className="pjd-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={callbackForm.website} onChange={e=>setCallbackForm(v=>({...v,website:e.target.value}))}/>
                    {callbackFeedback&&<p className="pjd-error" role="alert">{callbackFeedback}</p>}
                    <button type="submit" className="pjd-main-cta" disabled={callbackSending}>{callbackSending?'Sending…':'Send Callback Request'} <Icon name="arrow" size={17}/></button>
                  </form>}
              </>}
            </section>
          </div>
          <section className="pjd-process" aria-label="From inspiration to construction">
            <div className="pjd-process-heading"><span className="pjd-overline">DESIGN. PLAN. BUILD.</span><h2>Your next chapter starts here.</h2><p>Use the concept as inspiration, then get a personalized plan for your real project.</p></div>
            <div className="pjd-process-steps">
              <article><span>01</span><strong>Explore the design</strong><p>Browse the project gallery and download the guide.</p></article>
              <article><span>02</span><strong>Discuss your ideas</strong><p>Request a call and share your needs with ProPulse.</p></article>
              <article><span>03</span><strong>Plan with confidence</strong><p>Request a project-specific scope and estimate.</p></article>
            </div>
          </section>
          {relatedProjects.length>0&&<section className="pjd-related" aria-labelledby="pjd-related-title">
            <div className="pjd-related-heading"><div><span className="pjd-overline">MORE DESIGN INSPIRATION</span><h2 id="pjd-related-title">Spaces worth exploring.</h2></div><Link to="/projects">View all projects ↗</Link></div>
            <div className="pjd-related-grid">{relatedProjects.map(item=><Link className="pjd-related-card" key={item.id} to={'/projects/'+item.id}>
              <img src={item.image} alt={item.title+' inspiration'} loading="lazy"/>
              <div><small>ILLUSTRATIVE DESIGN</small><strong>{item.title}</strong><span>Explore concept ↗</span></div>
            </Link>)}</div>
          </section>}
          <div className="pjd-back-row"><Link to="/projects">← Back to all projects</Link></div>
          <div className="pjd-mobile-actions" aria-label="Quick project actions">
            <button type="button" onClick={downloadPackage} disabled={packageDownloading}><Icon name="file" size={17}/><span>{packageDownloading?'Preparing…':'Package'}</span></button>
            <button type="button" onClick={requestCallback}><span aria-hidden="true">☎</span><span>Callback</span></button>
            <Link to={'/quote#'+similarQuoteHash(project)}>Get Quote <Icon name="arrow" size={14}/></Link>
          </div>
        </>}
      </div>
    </section>
    <PublicFooter phone={phone} email={email}/>
  </main>
}
