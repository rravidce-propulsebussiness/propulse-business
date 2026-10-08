import {useEffect,useMemo,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {publicRequest} from '../utils/auth'
import {PublicHeader,PublicFooter} from '../components/PublicSiteChrome'
import {CONCEPTS,normalizeProject,projectPhotos,categoryLabel,playableProjectVideo,Icon} from './Projects'
import './Projects.css'
import './ProjectDetail.css'

const emptyCallback={name:'',phone:'',email:'',message:'',consent:false,website:''}
const similarQuoteHash=project=>project.category==='design'?'interiors':project.category==='property'?'property':'construction'
const isPdf=value=>/\.pdf(?:[?#]|$)/i.test(value||'')

function downloadPackage(project,plan){
  const inclusions=Array.isArray(plan?.inclusions)?plan.inclusions:(project.sampleSpecs||[])
  const lines=[
    project.sample?'ILLUSTRATIVE SAMPLE PACKAGE — NOT A QUOTATION':'PROFESSIONALLY PUBLISHED PACKAGE DETAILS',
    plan?.title||project.packageName||'Package',
    'Project: '+project.title,
    project.businessName?'Published by: '+project.businessName:'',
    plan?.description||project.description||'',
    plan?.duration_label?'Estimated duration: '+plan.duration_label:'',
    plan?.price_from?'Published starting price: ₹'+Number(plan.price_from).toLocaleString('en-IN'):'',
    '',
    'Specifications / Inclusions',
    ...inclusions.map((item,i)=>(i+1)+'. '+String(item)),
    '',
    project.sample?'Example specifications only; actual project scope, materials and cost vary.':'Confirm actual brands, inclusions, exclusions and costs with the publishing professional.',
  ].join('\n')
  const url=URL.createObjectURL(new Blob([lines],{type:'text/plain;charset=utf-8'}))
  const link=document.createElement('a')
  link.href=url
  link.download=(project.sample?project.id:'project-'+project.id)+'-package-details.txt'
  link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

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
  const [callbackOpen,setCallbackOpen]=useState(false)
  const [callbackForm,setCallbackForm]=useState(emptyCallback)
  const [callbackSending,setCallbackSending]=useState(false)
  const [callbackFeedback,setCallbackFeedback]=useState('')
  const [callbackSuccess,setCallbackSuccess]=useState(false)

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
    setCallbackOpen(false)
    setCallbackForm(emptyCallback)
    setCallbackFeedback('')
    setCallbackSuccess(false)
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
      setCallbackFeedback('Your callback request has been sent to '+(project.businessName||'this professional')+'.')
    }catch(err){setCallbackFeedback(err.message||'Unable to send your request. Please try again.')}
    finally{setCallbackSending(false)}
  }

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
          <header className="pjd-heading">
            <div>
              <span className="pjd-overline">{project.sample?'DESIGN INSPIRATION · SAMPLE':categoryLabel(project.category)+' PROJECT'}</span>
              <h1>{project.title}</h1>
              <p>{project.description||'Explore the project gallery, specifications and published details.'}</p>
            </div>
            <div className="pjd-heading-tags">
              {project.sample?<span className="pjd-sample-label">Illustrative project</span>:<span className="pjd-published-label">Professional portfolio</span>}
              {!project.sample&&project.verified&&<span className="pjd-verified">Verified professional</span>}
            </div>
          </header>
          <div className="pjd-main-grid">
            <div className="pjd-gallery-block">
              <div className="pjd-main-image">
                {showVideo&&project.video&&playableProjectVideo(project.video)
                  ?<video key={project.video} poster={activePhoto||undefined} src={project.video} controls playsInline preload="metadata" className="pjd-feature-media"/>
                  :activePhoto?<img className="pjd-feature-media" src={activePhoto} alt={project.title+' image '+(photoIndex+1)}/>
                  :<div className="pjd-no-photo">Photographs for this project are not available yet.</div>}
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
              <div className="pjd-summary-top"><span>PROJECT OVERVIEW</span><h2>{project.sample?'Concept specifications':'Project information'}</h2></div>
              <dl className="pjd-fact-grid">
                <div><dt>Project type</dt><dd>{project.type}</dd></div>
                {project.location&&<div><dt>{project.sample?'Illustrative location':'Location'}</dt><dd>{project.location}</dd></div>}
                {project.area&&<div><dt>Project area</dt><dd>{project.area}</dd></div>}
                {project.packageName&&<div><dt>{project.sample?'Example package':'Selected package'}</dt><dd>{project.packageName}</dd></div>}
                {!project.sample&&project.completionYear&&<div><dt>Completion year</dt><dd>{project.completionYear}</dd></div>}
                {!project.sample&&project.businessName&&<div><dt>Published by</dt><dd>{project.businessName}</dd></div>}
              </dl>
              {project.cost&&<div className="pjd-price"><small>{project.sample?'ILLUSTRATIVE COST · NOT A QUOTATION':'REPORTED PROJECT COST / BUDGET'}</small><strong>{project.cost}</strong></div>}
              <div className="pjd-action-stack">
                {(project.sample||linkedPlan)&&<button type="button" className="pjd-download" onClick={()=>downloadPackage(project,linkedPlan)}><Icon name="file" size={17}/> Download {project.sample?'Example Specifications':'Related Package'}</button>}
                {!project.sample&&project.document&&<a className="pjd-download" href={project.document} target="_blank" rel="noopener noreferrer"><Icon name="file" size={17}/>{isPdf(project.document)?'Download Project PDF':'View Project Document'}</a>}
                {project.sample
                  ?<Link className="pjd-main-cta" to={'/quote#'+similarQuoteHash(project)}>Get Quote for Similar Work <Icon name="arrow" size={17}/></Link>
                  :<button className="pjd-main-cta" type="button" disabled={callbackSuccess} onClick={()=>setCallbackOpen(x=>!x)}>{callbackSuccess?'Callback Requested':'Request a Callback'} <Icon name="arrow" size={17}/></button>}
              </div>
              {!project.sample&&!linkedPlan&&!project.document&&<p className="pjd-package-note">The professional hasn't published a downloadable package for this project. Request a callback to ask for exact specifications.</p>}
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
            <section className="pjd-contact">
              {project.sample?<><span className="pjd-overline">BUILD SOMETHING SIMILAR</span><h2>Start your own project</h2><p>Tell us what you're planning, and explore matching packages and professionals.</p><Link className="pjd-main-cta" to={'/quote#'+similarQuoteHash(project)}>Get Your Quotation <Icon name="arrow" size={16}/></Link></>:
              <>
                <span className="pjd-overline">DIRECT PROFESSIONAL ENQUIRY</span>
                <h2>Talk to {project.businessName||'this professional'}</h2>
                <p>Request a callback about this specific project. Your details will be shared with the publishing professional.</p>
                {callbackSuccess?<p className="pj-callback-success" role="status">{callbackFeedback}</p>:
                  <form className="pjd-callback-form" onSubmit={submitCallback}>
                    <div className="pjd-field-pair">
                      <label>Your name<input required maxLength={160} autoComplete="name" placeholder="Full name" value={callbackForm.name} onChange={e=>setCallbackForm(v=>({...v,name:e.target.value}))}/></label>
                      <label>Mobile number<input required type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+ ()-]{10,18}" placeholder="10-digit mobile" value={callbackForm.phone} onChange={e=>setCallbackForm(v=>({...v,phone:e.target.value}))}/></label>
                    </div>
                    <label>Email (optional)<input type="email" maxLength={255} autoComplete="email" placeholder="you@example.com" value={callbackForm.email} onChange={e=>setCallbackForm(v=>({...v,email:e.target.value}))}/></label>
                    <label>Your requirement (optional)<textarea rows={3} maxLength={1000} placeholder="Tell the professional what you'd like to discuss" value={callbackForm.message} onChange={e=>setCallbackForm(v=>({...v,message:e.target.value}))}/></label>
                    <label className="pjd-consent"><input type="checkbox" required checked={callbackForm.consent} onChange={e=>setCallbackForm(v=>({...v,consent:e.target.checked}))}/> I agree to share my contact details with this professional for a callback.</label>
                    <input className="pjd-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={callbackForm.website} onChange={e=>setCallbackForm(v=>({...v,website:e.target.value}))}/>
                    {callbackFeedback&&<p className="pjd-error" role="alert">{callbackFeedback}</p>}
                    <button type="submit" className="pjd-main-cta" disabled={callbackSending}>{callbackSending?'Sending…':'Send Callback Request'} <Icon name="arrow" size={17}/></button>
                  </form>}
              </>}
            </section>
          </div>
          <div className="pjd-back-row"><Link to="/projects">← Back to all projects</Link></div>
        </>}
      </div>
    </section>
    <PublicFooter phone={phone} email={email}/>
  </main>
}
