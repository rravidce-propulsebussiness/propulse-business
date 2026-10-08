import {useEffect,useRef,useState} from 'react'
import {Link,Navigate,useParams} from 'react-router-dom'
import {publicRequest} from '../utils/auth'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {normalizeProject,projectPhotos,categoryLabel,playableProjectVideo,Icon} from './Projects'
import './Projects.css'
import './ProjectDetail.css'

const emptyCallback={name:'',phone:'',email:'',message:'',consent:false,website:''}

export default function ProjectDetail(){
  const {projectId}=useParams()
  const archived=/^sample-[a-z0-9-]+$/.test(projectId||'')
  const realId=/^project-([1-9]\d*)$/.exec(projectId||'')?.[1]||''
  const [project,setProject]=useState(null)
  const [loading,setLoading]=useState(Boolean(realId))
  const [error,setError]=useState('')
  const [photoIndex,setPhotoIndex]=useState(0)
  const [showVideo,setShowVideo]=useState(false)
  const [linkedPlan,setLinkedPlan]=useState(null)
  const [contactData,setContactData]=useState({})
  const [callbackOpen,setCallbackOpen]=useState(false)
  const [callbackForm,setCallbackForm]=useState(emptyCallback)
  const [callbackSending,setCallbackSending]=useState(false)
  const [callbackFeedback,setCallbackFeedback]=useState('')
  const [callbackSuccess,setCallbackSuccess]=useState(false)
  const [packageDownloading,setPackageDownloading]=useState(false)
  const [packageError,setPackageError]=useState('')
  const dialogRef=useRef(null)
  const callbackTriggerRef=useRef(null)

  useEffect(()=>{
    let active=true
    publicRequest('/contact?audience=website')
      .then(value=>{if(active)setContactData(value||{})})
      .catch(()=>{})
    return()=>{active=false}
  },[])

  useEffect(()=>{
    let active=true
    setProject(null);setError('');setPhotoIndex(0);setShowVideo(false);setLinkedPlan(null)
    setCallbackOpen(false);setCallbackForm(emptyCallback);setCallbackFeedback('');setCallbackSuccess(false)
    setPackageDownloading(false);setPackageError('')
    setLoading(Boolean(realId))
    if(!realId){
      if(!archived)setError('This completed project could not be found.')
      return()=>{active=false}
    }
    const refresh=async(initial=false)=>{
      try{
        const value=await publicRequest('/experts/projects/'+realId)
        if(!active)return
        setProject(normalizeProject(value))
        setError('')
      }catch(err){
        if(active&&initial){setError(err?.status===404?'This completed project is no longer published.':'Unable to load this project. Please try again.');setProject(null)}
      }finally{if(active&&initial)setLoading(false)}
    }
    refresh(true)
    const onVisible=()=>{if(document.visibilityState==='visible')refresh(false)}
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')refresh(false)},120000)
    document.addEventListener('visibilitychange',onVisible)
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)}
  },[realId,archived])

  useEffect(()=>{
    if(!project?.businessProfileId||!project?.packageName)return undefined
    let active=true
    publicRequest('/experts/'+project.businessProfileId)
      .then(data=>{
        if(!active)return
        const plans=Array.isArray(data?.service_plans)?data.service_plans:[]
        setLinkedPlan(plans.find(plan=>plan.industry===project.category&&String(plan.title||'').trim().toLowerCase()===project.packageName.toLowerCase())||null)
      })
      .catch(()=>{})
    return()=>{active=false}
  },[project?.businessProfileId,project?.packageName])

  useEffect(()=>{
    if(!project)return undefined
    const original=document.title
    document.title=project.title+' | Completed Projects | ProPulse'
    return()=>{document.title=original}
  },[project?.title])

  useEffect(()=>{
    if(!callbackOpen)return undefined
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    dialogRef.current?.focus()
    const onEscape=event=>{if(event.key==='Escape')setCallbackOpen(false)}
    window.addEventListener('keydown',onEscape)
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onEscape)}
  },[callbackOpen])

  const photos=project?projectPhotos(project):[]
  const activePhoto=photos[photoIndex]||photos[0]||''
  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''
  const email=contactData.email||contactData.support_email||''

  function closeCallback(){
    setCallbackOpen(false)
    callbackTriggerRef.current?.focus()
  }

  async function submitCallback(event){
    event.preventDefault()
    if(!project?.businessProfileId||callbackSending)return
    setCallbackFeedback('');setCallbackSending(true)
    try{
      const response=await publicRequest('/experts/projects/'+encodeURIComponent(project.id)+'/callback',{
        method:'POST',body:JSON.stringify(callbackForm),
      })
      setCallbackSuccess(true)
      setCallbackFeedback((response.duplicate?'Your recent callback request is already recorded. ':'Callback lead created successfully. ')+(response.requestId?'Reference #'+response.requestId+'. ':'')+'ProPulse will coordinate this enquiry with '+(project.businessName||'the professional')+'.')
    }catch(err){setCallbackFeedback(err.message||'Unable to send your request. Please try again.')}
    finally{setCallbackSending(false)}
  }

  async function downloadPackage(){
    if(!project||packageDownloading)return
    // A business-authored PDF takes priority over an automatically generated guide.
    const authoredBrochure=project.brochure||linkedPlan?.brochure_url
    if(authoredBrochure){
      window.open(authoredBrochure,'_blank','noopener,noreferrer')
      return
    }
    setPackageDownloading(true);setPackageError('')
    try{
      const {downloadProjectPackagePdf}=await import('../utils/requirementQuotePdf')
      await downloadProjectPackagePdf({project,plan:linkedPlan})
    }catch(err){
      setPackageError(err?.message||'Unable to prepare your PDF. Please try again.')
    }finally{setPackageDownloading(false)}
  }

  // Old stock-photo concept links are retired, never presented as completed work.
  if(archived)return <Navigate to="/projects" replace/>

  return <main className="pj-page pjd-page">
    <PublicHeader/>
    <section className="pjd-content">
      <div className="pjd-container">
        <nav className="pjd-breadcrumb" aria-label="Breadcrumb">
          <Link to="/projects">Completed Projects</Link><span aria-hidden="true">/</span>
          <span>{project?.title||'Project details'}</span>
        </nav>

        {loading?<div className="pjd-status" role="status"><span className="pj-inline-spinner"/>Loading completed project…</div>:
        !project?<div className="pjd-status"><h1>Project unavailable</h1><p role="alert">{error}</p><Link to="/projects">← Browse completed projects</Link></div>:
        <>
          <header className="pjd-heading pjd-hero-intro">
            <div>
              <span className="pjd-overline"><span className="pjd-kicker-dot"/>COMPLETED PROJECT · {categoryLabel(project.category).toUpperCase()}</span>
              <h1>{project.title}</h1>
              <p>{project.description||'Explore this completed project, review published specifications and connect through ProPulse.'}</p>
              <div className="pjd-hero-micro">
                <span>Completed {project.completionYear}</span>
                {project.location&&<span>{project.location}</span>}
                {project.businessName&&<span>By {project.businessName}</span>}
              </div>
            </div>
            <div className="pjd-heading-tags">
              <span className="pjd-published-label">PROFESSIONAL PORTFOLIO</span>
              {project.verified&&<span className="pjd-verified">Verified professional</span>}
              <span className="pjd-collection-index">PUBLISHED COMPLETED WORK</span>
            </div>
          </header>

          <div className="pjd-main-grid">
            <section className="pjd-gallery-block" aria-label="Completed project photos">
              <div className="pjd-main-image">
                {showVideo&&project.video&&playableProjectVideo(project.video)
                  ?<video key={project.video} poster={activePhoto||undefined} src={project.video} controls playsInline preload="metadata" className="pjd-feature-media"/>
                  :activePhoto?<img className="pjd-feature-media" src={activePhoto} alt={project.title+' completed work photo '+(photoIndex+1)}/>
                  :<div className="pjd-no-photo"><Icon name="layers" size={34}/><strong>Photos not published yet</strong><span>This professional has not added project images.</span></div>}
                {activePhoto&&!showVideo&&<div className="pjd-image-caption">
                  <span className="pjd-caption-line"/>
                  <span>PROJECT GALLERY<small>{String(photoIndex+1).padStart(2,'0')} / {String(photos.length).padStart(2,'0')}</small></span>
                </div>}
                {photos.length>1&&!showVideo&&<div className="pjd-photo-nav">
                  <button type="button" aria-label="Previous image" onClick={()=>setPhotoIndex(n=>(n+photos.length-1)%photos.length)}>‹</button>
                  <span>{photoIndex+1} / {photos.length}</span>
                  <button type="button" aria-label="Next image" onClick={()=>setPhotoIndex(n=>(n+1)%photos.length)}>›</button>
                </div>}
              </div>
              {(photos.length>1||project.video)&&<div className="pjd-thumbnails" aria-label="Choose project photo or video">
                {photos.map((url,index)=><button key={url+index} type="button" className={!showVideo&&photoIndex===index?'active':''} onClick={()=>{setPhotoIndex(index);setShowVideo(false)}} aria-label={'View image '+(index+1)} aria-pressed={!showVideo&&photoIndex===index}><img src={url} alt=""/></button>)}
                {project.video&&(playableProjectVideo(project.video)
                  ?<button type="button" className={'pjd-video-thumb'+(showVideo?' active':'')} aria-pressed={showVideo} onClick={()=>setShowVideo(true)}>▶ Video</button>
                  :<a className="pjd-video-thumb" href={project.video} target="_blank" rel="noopener noreferrer">▶ Video ↗</a>)}
              </div>}
              <div className="pjd-gallery-caption">
                <span aria-hidden="true">▣</span> Images and project details are supplied by the publishing professional.
              </div>
            </section>

            <aside className="pjd-summary">
              <div className="pjd-summary-top"><div className="pjd-summary-icon">⌂</div><div><span>PROJECT OVERVIEW</span><h2>At a glance</h2></div></div>
              <dl className="pjd-fact-grid">
                <div><dt>Project type</dt><dd>{project.type}</dd></div>
                <div><dt>Completed</dt><dd>{project.completionYear}</dd></div>
                {project.location&&<div><dt>Location</dt><dd>{project.location}</dd></div>}
                {project.area&&<div><dt>Project area</dt><dd>{project.area}</dd></div>}
                {project.packageName&&<div><dt>Related package</dt><dd>{project.packageName}</dd></div>}
                {project.businessName&&<div><dt>Published by</dt><dd>{project.businessName}</dd></div>}
              </dl>
              {project.cost&&<div className="pjd-price"><small>REPORTED PROJECT COST / BUDGET</small><strong>{project.cost}</strong></div>}
              <div className="pjd-action-intro"><span>INTERESTED IN A PROJECT LIKE THIS?</span><strong>Take the next step.</strong><small>Choose one of the three options below.</small></div>
              <div className="pjd-action-stack" aria-label="Project next steps">
                <button type="button" className="pjd-action-button pjd-download" disabled={packageDownloading} onClick={downloadPackage}>
                  <span className="pjd-cta-symbol"><Icon name="file" size={20}/></span>
                  <span className="pjd-cta-copy"><strong>{packageDownloading?'Preparing PDF…':'Download Package'}</strong><small>{project.brochure||linkedPlan?.brochure_url?'Professional specifications · PDF':'Published project guide · PDF'}</small></span>
                  <span className="pjd-cta-arrow" aria-hidden="true">↧</span>
                </button>
                <button ref={callbackTriggerRef} type="button" className="pjd-action-button pjd-callback" onClick={()=>setCallbackOpen(true)}>
                  <span className="pjd-cta-symbol" aria-hidden="true">☎</span>
                  <span className="pjd-cta-copy"><strong>{callbackSuccess?'Callback Requested':'Request a Callback'}</strong><small>ProPulse coordinates your enquiry</small></span>
                  <span className="pjd-cta-arrow" aria-hidden="true">↗</span>
                </button>
                <Link className="pjd-action-button pjd-main-cta" to={'/projects/'+projectId+'/quote'}>
                  <span className="pjd-cta-symbol" aria-hidden="true">✧</span>
                  <span className="pjd-cta-copy"><strong>Get Quote</strong><small>Submit requirements to this professional</small></span>
                  <span className="pjd-cta-arrow" aria-hidden="true">↗</span>
                </Link>
              </div>
              {packageError&&<p className="pjd-error" role="alert">{packageError}</p>}
              <div className="pjd-privacy"><span aria-hidden="true">✓</span><span>Customer contact information stays protected. Verify project claims and scope directly before hiring.</span></div>
            </aside>
          </div>

          <div className="pjd-mobile-actions" aria-label="Quick project actions">
            <button type="button" onClick={downloadPackage} disabled={packageDownloading}><Icon name="file" size={17}/><span>{packageDownloading?'Preparing…':'Package'}</span></button>
            <button type="button" onClick={()=>setCallbackOpen(true)}><span aria-hidden="true">☎</span><span>Callback</span></button>
            <Link to={'/projects/'+projectId+'/quote'}>Get Quote <Icon name="arrow" size={14}/></Link>
          </div>
        </>}
      </div>
    </section>
    <PublicFooter phone={phone} email={email}/>
    {project&&callbackOpen&&<div className="pjd-dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closeCallback()}}>
      <section ref={dialogRef} tabIndex={-1} className="pjd-dialog" role="dialog" aria-modal="true" aria-labelledby="pjd-dialog-heading">
        <button type="button" className="pjd-dialog-close" onClick={closeCallback} aria-label="Close callback form">×</button>
        <span className="pjd-overline">PRIVATE PROJECT ENQUIRY</span>
        <h2 id="pjd-dialog-heading">Request a Callback</h2>
        <p>Ask about <strong>{project.title}</strong>. ProPulse coordinates your callback; the professional sees masked contact details.</p>
        {callbackSuccess?<div className="pj-callback-success" role="status"><strong>Callback lead received</strong><p>{callbackFeedback}</p><button type="button" className="pjd-dialog-done" onClick={closeCallback}>Done</button></div>:
          <form className="pjd-callback-form" onSubmit={submitCallback}>
            <div className="pjd-field-pair">
              <label>Your name<input required maxLength={160} autoComplete="name" placeholder="Full name" value={callbackForm.name} onChange={e=>setCallbackForm(v=>({...v,name:e.target.value}))}/></label>
              <label>Mobile number<input required type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+ ()-]{10,18}" placeholder="10-digit mobile" value={callbackForm.phone} onChange={e=>setCallbackForm(v=>({...v,phone:e.target.value}))}/></label>
            </div>
            <label>Email (optional)<input type="email" maxLength={255} autoComplete="email" placeholder="you@example.com" value={callbackForm.email} onChange={e=>setCallbackForm(v=>({...v,email:e.target.value}))}/></label>
            <label>Your requirement (optional)<textarea rows={3} maxLength={1000} placeholder="Tell us your locality, project type and questions" value={callbackForm.message} onChange={e=>setCallbackForm(v=>({...v,message:e.target.value}))}/></label>
            <label className="pjd-consent"><input type="checkbox" required checked={callbackForm.consent} onChange={e=>setCallbackForm(v=>({...v,consent:e.target.checked}))}/> I agree that ProPulse may use my details to coordinate this callback.</label>
            <input className="pjd-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={callbackForm.website} onChange={e=>setCallbackForm(v=>({...v,website:e.target.value}))}/>
            {callbackFeedback&&<p className="pjd-error" role="alert">{callbackFeedback}</p>}
            <button type="submit" className="pjd-dialog-submit" disabled={callbackSending}>{callbackSending?'Sending…':'Send Callback Request →'}</button>
          </form>}
      </section>
    </div>}
  </main>
}
