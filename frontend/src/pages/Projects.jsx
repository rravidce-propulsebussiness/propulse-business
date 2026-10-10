import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './Projects.css'

// Completed-project cards come exclusively from eligible published business records.
// Historic illustrative concepts are retired rather than presented as completed work.
const PAGE_SIZE = 48
const CATEGORIES = [
  { id: 'all', label: 'All Projects' },
  { id: 'construction', label: 'Construction' },
  { id: 'design', label: 'Interiors' },
  { id: 'property', label: 'Real Estate' },
]

function categoryOf(value) {
  const type = String(value || '').toLowerCase()
  if (type.includes('interior') || type.includes('design')) return 'design'
  if (type.includes('estate') || type.includes('property') || type.includes('plot')) return 'property'
  return 'construction'
}

export function categoryLabel(category) {
  return category === 'design' ? 'Interior Design' : category === 'property' ? 'Real Estate' : 'Construction'
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

function publicMediaUrl(value) {
  const valueText = clean(value)
  if (!valueText) return ''
  try {
    const url = new URL(valueText, window.location.origin)
    return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : ''
  } catch {
    return ''
  }
}

export function normalizeProject(project, index) {
  const category = categoryOf(project.project_type)
  return {
    id: clean(project.project_id || project.id || ('entry-' + index)),
    category,
    type: clean(project.project_type) || categoryLabel(category),
    title: clean(project.title) || 'Professional Project',
    description: clean(project.description),
    location: clean(project.location_text),
    area: clean(project.area_text),
    cost: clean(project.budget_text),
    completionYear: clean(project.completion_year),
    businessName: clean(project.business_name),
    verified: project.is_verified === true,
    image: publicMediaUrl(project.cover_image_url),
    images:Array.isArray(project.image_urls)?project.image_urls.map(publicMediaUrl).filter(Boolean):[],
    document: publicMediaUrl(project.plan_url),
    brochure: publicMediaUrl(project.brochure_url),
    video: publicMediaUrl(project.video_url),
    publishedAt: clean(project.published_at),
    sample:false,
    packageName: clean(project.package_name || project.package_title),
    businessProfileId:Number(project.business_profile_id)||null,
  }
}

export function projectPhotos(project){
  const photos=[project.image,...(Array.isArray(project.images)?project.images:[])].filter(Boolean)
  const seen=new Set()
  return photos.filter(photo=>{
    const key=photo.split('?')[0]
    if(seen.has(key))return false
    seen.add(key)
    return true
  })
}

export function playableProjectVideo(url){
  return Boolean(url)&&!/(youtube\.com|youtu\.be|vimeo\.com)/i.test(url)
}

export function Icon({ name, size = 18 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  if (name === 'pin') return <svg {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if (name === 'arrow') return <svg {...props}><path d="M5 12h14m-5-5 5 5-5 5"/></svg>
  if (name === 'search') return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if (name === 'file') return <svg {...props}><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/></svg>
  if (name === 'check') return <svg {...props}><path d="m5 12 4 4L19 6"/></svg>
  if (name === 'shield') return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if (name === 'layers') return <svg {...props}><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5m-18 0 9 5 9-5"/></svg>
  return null
}

export function projectPath(project){
  return '/projects/project-'+project.id
}

export default function Projects() {
  const [professionalProjects,setProfessionalProjects]=useState([])
  const [category,setCategory]=useState('all')
  const [query,setQuery]=useState('')
  const [contactData,setContactData]=useState({})
  const [loading,setLoading]=useState(true)
  const [loadingMore,setLoadingMore]=useState(false)
  const [loadError,setLoadError]=useState('')
  const [page,setPage]=useState(1)
  const [hasNext,setHasNext]=useState(false)

  useEffect(()=>{
    let active=true
    publicRequest('/contact?audience=website').then(value=>{if(active)setContactData(value||{})}).catch(()=>{})
    return()=>{active=false}
  },[])
  useEffect(()=>{
    let active=true
    publicRequest('/experts/projects?page=1&pageSize='+PAGE_SIZE)
      .then(value=>{
        if(!active)return
        const rows=Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[]
        setProfessionalProjects(rows.map(normalizeProject))
        setHasNext(Boolean(value?.pagination?.hasNextPage))
        setPage(1);setLoadError('')
      }).catch(()=>{if(active)setLoadError('Projects could not be loaded. Please try again shortly.')})
      .finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[])
  useEffect(()=>{
    if(page!==1)return undefined
    let active=true
    const refresh=async()=>{
      if(document.visibilityState==='hidden')return
      try{
        const value=await publicRequest('/experts/projects?page=1&pageSize='+PAGE_SIZE)
        if(!active)return
        const rows=Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[]
        setProfessionalProjects(rows.map(normalizeProject))
        setHasNext(Boolean(value?.pagination?.hasNextPage))
      }catch{/* Keep existing portfolio while the network reconnects. */}
    }
    const onVisible=()=>{if(document.visibilityState==='visible')refresh()}
    const timer=window.setInterval(refresh,120000)
    document.addEventListener('visibilitychange',onVisible)
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)}
  },[page])
  async function loadMore(){
    if(loadingMore||!hasNext)return
    setLoadingMore(true)
    try{
      const next=page+1
      const value=await publicRequest('/experts/projects?page='+next+'&pageSize='+PAGE_SIZE)
      const rows=Array.isArray(value)?value:Array.isArray(value?.data)?value.data:[]
      setProfessionalProjects(current=>{
        const found=new Set(current.map(project=>project.id))
        return [...current,...rows.map(normalizeProject).filter(project=>!found.has(project.id))]
      })
      setHasNext(Boolean(value?.pagination?.hasNextPage))
      setPage(next);setLoadError('')
    }catch{setLoadError('More projects could not be loaded. Please try again.')}
    finally{setLoadingMore(false)}
  }

  // Only eligible completed projects returned from the professional portfolio API.
  const filtered=useMemo(()=>{
    const term=query.trim().toLowerCase()
    return professionalProjects.filter(project=>{
      if(category!=='all'&&project.category!==category)return false
      if(!term)return true
      return [project.title,project.location,project.businessName||'',project.type,project.description,project.packageName||'']
        .some(value=>String(value).toLowerCase().includes(term))
    })
  },[professionalProjects,category,query])

  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''
  const email=contactData.email||contactData.support_email||''
  return <main className="pj-page">
    <PublicHeader/>
    <section className="pj-portfolio-section" aria-label="Projects gallery">
      <div className="pj-container">
        <h1 className="pj-sr-only">Projects</h1>
        <div className="pj-toolbar">
          <div className="pj-tabs" role="group" aria-label="Project categories">
            {CATEGORIES.map(item=><button key={item.id} type="button" className={category===item.id?'active':''} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label}</button>)}
          </div>
          <label className="pj-search"><Icon name="search"/><span className="pj-sr-only">Search projects</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search projects or locations"/></label>
        </div>
        {loading&&<div className="pj-loading-inline" role="status" aria-label="Checking for published business projects"><span className="pj-inline-spinner" aria-hidden="true"/></div>}
        <div className="pj-project-grid">
          {filtered.map((project,index)=><article key={'business-'+project.id} className="pj-project-card">
            <Link to={projectPath(project)} className="pj-card-open" aria-label={'View details for '+project.title}>
              <div className="pj-project-photo">
                {projectPhotos(project).length?<img src={projectPhotos(project)[0]} loading={index<3?'eager':'lazy'} alt={project.title}/>:<div className="pj-image-placeholder"><Icon name="layers" size={30}/>Project photo not provided</div>}
                {projectPhotos(project).length>1&&<span className="pj-card-photo-count">{projectPhotos(project).length} Photos</span>}
                {project.video&&<span className="pj-card-video-badge">Video Available</span>}
                {project.verified&&<span className="pj-card-verified">Verified professional</span>}
                <span className="pj-category-badge">{'COMPLETED · '+categoryLabel(project.category).toUpperCase()}</span>
              </div>
              <div className="pj-project-copy">
                <span className="pj-card-type">{categoryLabel(project.category)}{' · Completed '+project.completionYear}</span>
                <div className="pj-project-title-row"><h3>{project.title}</h3></div>
                {project.description&&<p className="pj-card-description">{project.description}</p>}
                <div className="pj-project-facts">
                  {project.location&&<div><small>Location</small><b>{project.location}</b></div>}
                  {project.area&&<div><small>Area</small><b>{project.area}</b></div>}
                  {project.packageName&&<div><small>Package</small><b>{project.packageName}</b></div>}
                  {project.businessName&&<div><small>Professional</small><b>{project.businessName}</b></div>}
                </div>
                {project.cost&&<div className="pj-cost"><div><small>PROFESSIONAL-REPORTED PROJECT BUDGET</small><strong>{project.cost}</strong></div></div>}
                <span className="pj-single-action">View Completed Project <Icon name="arrow" size={16}/></span>
              </div>
            </Link>
          </article>)}
        </div>
        {!filtered.length&&!loading&&<div className="pj-empty"><h3>{query||category!=='all'?'No completed projects match your search':'Completed projects are coming soon'}</h3><p>{query||category!=='all'?'Try another category or search term.':'No eligible completed projects have been published yet. Professionals can add their actual finished work through their business profiles.'}</p>{query||category!=='all'?<button type="button" onClick={()=>{setCategory('all');setQuery('')}}>Clear filters</button>:<div className="pj-empty-actions"><Link className="pj-empty-link" to="/experts">Explore professionals →</Link><Link className="pj-empty-link pj-empty-professional" to="/profile?tab=projects">Publish your completed work ↗</Link></div>}</div>}
        {loadError&&<p className="pj-load-error" role="status">{loadError}</p>}
        {hasNext&&<button type="button" className="pj-load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore?'Loading…':'Load More Completed Projects'} <Icon name="arrow" size={15}/></button>}
        <p className="pj-gallery-disclaimer">These projects are published by professionals, with declared completion years. ProPulse does not independently certify every project photo or scope; verify completed work before hiring.</p>
      </div>
    </section>
    <PublicFooter phone={phone} email={email}/>
  </main>
}
