import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './Projects.css'

const CONCEPTS = [
  {
    id:'sample-courtyard',sample:true,category:'construction',type:'Residential Construction',
    title:'The Courtyard Residence',location:'Illustrative location · Hyderabad',
    area:'3,250 sq ft',packageName:'Signature Construction',cost:'₹82.0L',completionYear:'2025',
    description:'An airy modern family home with warm materials and thoughtful natural light.',
    image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=85',
    images:['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1100&q=83'],
    sampleSpecs:['RCC structural planning','Space and elevation coordination','Flooring and material selection','Electrical and plumbing planning','Exterior finishing schedule'],
  },
  {
    id:'sample-warm-home',sample:true,category:'design',type:'Residential Interiors',
    title:'The Warm Minimal Home',location:'Illustrative location · Hyderabad',
    area:'1,580 sq ft',packageName:'Premium Interiors',cost:'₹16.8L',completionYear:'2025',
    description:'Natural oak tones, integrated storage and layered lighting for a comfortable home.',
    image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=85',
    images:['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1100&q=83'],
    sampleSpecs:['Modular kitchen design','Wardrobe and TV unit planning','False ceiling with cove lighting','Storage layout','Finish and hardware selection'],
  },
  {
    id:'sample-kitchen',sample:true,category:'design',type:'Interior Design',
    title:'A Kitchen Made for Living',location:'Illustrative location · Hyderabad',
    area:'220 sq ft',packageName:'Modular Kitchen',cost:'₹4.4L',completionYear:'2024',
    description:'A considered kitchen with clean finishes, practical storage and a refined palette.',
    image:'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=85',
    images:['https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1100&q=83'],
    sampleSpecs:['Modular cabinet design','Countertop and backsplash selection','Drawer and pantry storage','Task lighting','Appliance provisions'],
  },
  {
    id:'sample-duplex',sample:true,category:'construction',type:'Residential Construction',
    title:'The Contemporary Duplex',location:'Illustrative location · Hyderabad',
    area:'2,940 sq ft',packageName:'Classic Construction',cost:'₹64.0L',completionYear:'2025',
    description:'A spacious duplex concept balancing family living and refined architecture.',
    image:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85',
    images:['https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1100&q=83'],
    sampleSpecs:['RCC and masonry planning','Interior plaster and flooring','Doors and windows','Staircase and balcony','Waterproofing and painting'],
  },
  {
    id:'sample-villa',sample:true,category:'design',type:'Residential Interiors',
    title:'Quiet Luxury Living',location:'Illustrative location · Hyderabad',
    area:'1,880 sq ft',packageName:'Elite Interiors',cost:'₹22.5L',completionYear:'2025',
    description:'Subtle textures, elegant finishes and integrated lighting for a calm home.',
    image:'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85',
    images:['https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=1100&q=83'],
    sampleSpecs:['Fixed furniture layout','Kitchen and utility storage','Veneer-look finish selection','Decorative lighting','Wardrobes and media wall'],
  },
  {
    id:'sample-workspace',sample:true,category:'design',type:'Commercial Interiors',
    title:'The Modern Workspace',location:'Illustrative location · Hyderabad',
    area:'2,300 sq ft',packageName:'Commercial Fit-Out',cost:'₹31.0L',completionYear:'2024',
    description:'An efficient workspace with inviting collaborative zones and a polished reception.',
    image:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=85',
    images:['https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=83','https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1100&q=83'],
    sampleSpecs:['Reception and waiting area','Workstations and partitions','Meeting room planning','Data and lighting provision','Storage and finish schedule'],
  },
]

// These are not claimed as completed client projects; all sample costs and specifications are illustrative.
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

function categoryLabel(category) {
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

function normalizeProject(project, index) {
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
    video: publicMediaUrl(project.video_url),
    publishedAt: clean(project.published_at),
    sample:false,
    packageName: clean(project.package_name || project.package_title),
  }
}

function projectPhotos(project){
  const photos=[project.image,...(Array.isArray(project.images)?project.images:[])].filter(Boolean)
  const seen=new Set()
  return photos.filter(photo=>{
    const key=photo.split('?')[0]
    if(seen.has(key))return false
    seen.add(key)
    return true
  })
}

function playableProjectVideo(url){
  return Boolean(url)&&!/(youtube\.com|youtu\.be|vimeo\.com)/i.test(url)
}

function Icon({ name, size = 18 }) {
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

export default function Projects() {
  const [professionalProjects, setProfessionalProjects] = useState([])
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [contactData, setContactData] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [galleryIndex,setGalleryIndex] = useState(0)
  const [showProjectVideo,setShowProjectVideo] = useState(false)
  const dialogRef = useRef(null)

  useEffect(() => {
    let active = true
    publicRequest('/contact?audience=website')
      .then(value => { if (active) setContactData(value || {}) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    publicRequest('/experts/projects?page=1&pageSize=' + PAGE_SIZE)
      .then(value => {
        if (!active) return
        const rows = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []
        setProfessionalProjects(rows.map(normalizeProject))
        setHasNext(Boolean(value?.pagination?.hasNextPage))
        setPage(1)
        setLoadError('')
      })
      .catch(() => { if (active) setLoadError('Projects could not be loaded. Please try again shortly.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Refresh the first page quietly so newly published professional images/videos surface.
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
      }catch{/* Keep the existing public gallery visible on transient network failure. */}
    }
    const handleFocus=()=>{if(document.visibilityState==='visible')refresh()}
    const timer=window.setInterval(refresh,120000)
    document.addEventListener('visibilitychange',handleFocus)
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',handleFocus)}
  },[page])

  async function loadMore() {
    if (loadingMore || !hasNext) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const value = await publicRequest('/experts/projects?page=' + next + '&pageSize=' + PAGE_SIZE)
      const rows = Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []
      setProfessionalProjects(current => {
        const found = new Set(current.map(project => project.id))
        return [...current, ...rows.map(normalizeProject).filter(project => !found.has(project.id))]
      })
      setHasNext(Boolean(value?.pagination?.hasNextPage))
      setPage(next)
      setLoadError('')
    } catch {
      setLoadError('More projects could not be loaded. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  // Completed project entries from professionals (including Verified professional labels) always lead.
  // Published business projects always lead; sample concepts appear afterward.
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return [...professionalProjects, ...CONCEPTS].filter(project => {
      if (category !== 'all' && project.category !== category) return false
      if (!term) return true
      return [project.title, project.location, project.businessName || '', project.type, project.description, project.packageName || '']
        .some(value => String(value).toLowerCase().includes(term))
    })
  }, [professionalProjects, category, query])

  function downloadSampleSpecifications(project) {
    if (!project.sample || !project.sampleSpecs?.length) return
    const details = [
      'SAMPLE PROJECT SPECIFICATIONS — ILLUSTRATIVE ONLY',
      project.title,
      'Sample package: ' + project.packageName,
      'Illustrative project area: ' + project.area,
      'Illustrative cost: ' + project.cost,
      '',
      ...project.sampleSpecs.map((item, index) => (index + 1) + '. ' + item),
      '',
      'This file describes a sample concept, not an actual completed client project or quotation.',
    ].join('\n')
    const url = URL.createObjectURL(new Blob([details], {type:'text/plain;charset=utf-8'}))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = project.id + '-sample-specifications.txt'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  useEffect(() => {
    if (!selectedProject) return undefined
    const previous=document.body.style.overflow
    const originalFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector('button')?.focus()
    const handleKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSelectedProject(null)
      }
      if (event.key !== 'Tab') return
      const elements = [...(dialogRef.current?.querySelectorAll('a[href],button:not([disabled])') || [])]
        .filter(element => element.getClientRects().length)
      if (!elements.length) return
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return()=>{
      document.removeEventListener('keydown',handleKey)
      document.body.style.overflow=previous
      if (originalFocus?.isConnected) originalFocus.focus()
    }
  }, [selectedProject])

  function openProject(project){
    setGalleryIndex(0)
    setShowProjectVideo(false)
    setSelectedProject(project)
  }
  const selectedPhotos=selectedProject?projectPhotos(selectedProject):[]
  const activePhoto=selectedPhotos[galleryIndex]||selectedPhotos[0]||''

  const phone = contactData.phone || contactData.phone_number || contactData.mobile || ''
  const email = contactData.email || contactData.support_email || ''
  const isPdf = value => /\.pdf(?:[?#]|$)/i.test(value)
  const similarQuoteHash = project => project.category === 'design' ? 'interiors' : project.category === 'property' ? 'property' : 'construction'

  return <main className="pj-page">
    <PublicHeader />
    <section className="pj-portfolio-section" aria-label="Projects gallery">
      <div className="pj-container">
        <div className="pj-toolbar">
          <div className="pj-tabs" role="group" aria-label="Project categories">
            {CATEGORIES.map(item=><button key={item.id} type="button" className={category===item.id?'active':''} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label}</button>)}
          </div>
          <label className="pj-search"><Icon name="search"/><span className="pj-sr-only">Search projects</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search projects or locations"/></label>
        </div>

        {loading && <div className="pj-loading-inline" role="status" aria-label="Checking for published business projects"><span className="pj-inline-spinner" aria-hidden="true" /></div>}
        <div className="pj-project-grid">
          {filtered.map((project,index)=><article key={(project.sample?'sample-':'business-')+project.id} className="pj-project-card">
            <button type="button" className="pj-card-open" onClick={()=>openProject(project)} aria-label={'View '+(project.sample?'sample ':'')+'details for '+project.title}>
              <div className="pj-project-photo">
                {projectPhotos(project).length?<img src={projectPhotos(project)[0]} loading={index<3?'eager':'lazy'} alt={project.title}/>:<div className="pj-image-placeholder"><Icon name="layers" size={30}/>Project photo not provided</div>}
                {projectPhotos(project).length>1&&<div className="pj-card-photo-stack" aria-hidden="true">{projectPhotos(project).slice(1,3).map((photo,i)=><img key={photo+i} src={photo} loading="lazy" alt=""/>)}</div>}
                {projectPhotos(project).length>1&&<span className="pj-card-photo-count">{projectPhotos(project).length} Photos</span>}
                {!project.sample&&project.video&&<span className="pj-card-video-badge">Video Available</span>}
                <span className="pj-category-badge">{project.sample?'COMPLETED STYLE · DEMO':categoryLabel(project.category)}</span>
                <span className="pj-photo-cue">View Details <Icon name="arrow" size={15}/></span>
              </div>
              <div className="pj-project-copy">
                <span className="pj-card-type">{categoryLabel(project.category)}{!project.sample&&project.completionYear?' · '+project.completionYear:''}</span>
                <div className="pj-project-title-row"><h3>{project.title}</h3><Icon name="arrow" size={19}/></div>
                {project.description&&<p className="pj-card-description">{project.description}</p>}
                <div className="pj-project-facts">
                  {project.location&&<div><small>Location</small><b>{project.location}</b></div>}
                  {project.area&&<div><small>Area</small><b>{project.area}</b></div>}
                  {project.packageName&&<div><small>{project.sample?'Sample Package':'Package'}</small><b>{project.packageName}</b></div>}
                  {project.businessName&&<div><small>Professional</small><b>{project.businessName}</b></div>}
                </div>
                {project.cost&&<div className="pj-cost"><div><small>{project.sample?'ILLUSTRATIVE COST':'REPORTED COST / BUDGET'}</small><strong>{project.cost}</strong></div><span className="pj-card-arrow"><Icon name="arrow" size={18}/></span></div>}
                {!project.cost&&<span className="pj-view-link">View Project <Icon name="arrow" size={16}/></span>}
              </div>
            </button>
          </article>)}
        </div>
        {!filtered.length&&!loading&&<div className="pj-empty"><h3>No matching projects</h3><button type="button" onClick={()=>{setCategory('all');setQuery('')}}>Clear filters</button></div>}
        {loadError&&<p className="pj-load-error" role="status">{loadError} Sample projects remain available below.</p>}
        {hasNext&&<button type="button" className="pj-load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore?'Loading…':'Load More Business Projects'} <Icon name="arrow" size={15}/></button>}
        <p className="pj-gallery-disclaimer">Sample concepts are illustrative only — photos, locations, costs, packages and specifications are examples, not completed professional work or quotations. Published business projects appear first automatically.</p>
      </div>
    </section>

    {selectedProject&&<div className="pj-detail-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedProject(null)}}>
      <section className="pj-detail-modal" role="dialog" aria-modal="true" aria-label={selectedProject.title+' details'} ref={dialogRef} tabIndex={-1}>
        <button type="button" className="pj-detail-close" onClick={()=>setSelectedProject(null)} aria-label="Close project details">×</button>
        <div className="pj-detail-media">
          <div className="pj-gallery-viewer">
            {showProjectVideo&&selectedProject.video&&playableProjectVideo(selectedProject.video)
              ? <video key={selectedProject.video} className="pj-gallery-main-image" controls playsInline preload="metadata" poster={activePhoto||undefined} src={selectedProject.video}/>
              : activePhoto?<img className="pj-gallery-main-image" src={activePhoto} alt={selectedProject.title+' photo '+(galleryIndex+1)}/>
              : <div className="pj-image-placeholder">Project photo not provided</div>}
            <span className="pj-category-badge">{selectedProject.sample?'COMPLETED STYLE · DEMO':categoryLabel(selectedProject.category)}</span>
            {!showProjectVideo&&selectedPhotos.length>1&&<div className="pj-gallery-arrows">
              <button type="button" aria-label="Previous project photo" onClick={()=>setGalleryIndex(i=>(i+selectedPhotos.length-1)%selectedPhotos.length)}>‹</button>
              <span>{galleryIndex+1} / {selectedPhotos.length}</span>
              <button type="button" aria-label="Next project photo" onClick={()=>setGalleryIndex(i=>(i+1)%selectedPhotos.length)}>›</button>
            </div>}
          </div>
          {(selectedPhotos.length>1||selectedProject.video)&&<div className="pj-gallery-thumbnails">
            {selectedPhotos.map((photo,i)=><button key={photo+i} type="button" className={!showProjectVideo&&galleryIndex===i?'active':''} onClick={()=>{setGalleryIndex(i);setShowProjectVideo(false)}} aria-label={'Show project photo '+(i+1)} aria-pressed={!showProjectVideo&&galleryIndex===i}><img src={photo} alt=""/></button>)}
            {selectedProject.video&&<button type="button" className={'pj-gallery-video-thumb'+(showProjectVideo?' active':'')} aria-label="Play project video" aria-pressed={showProjectVideo} onClick={()=>setShowProjectVideo(true)}>▶ <small>Video</small></button>}
          </div>}
        </div>
        <div className="pj-detail-content">
          <span className="pj-overline">{selectedProject.sample?'COMPLETED PROJECT PRESENTATION · DEMO ONLY':'PROFESSIONAL PROJECT'}</span>
          <h2>{selectedProject.title}</h2>
          {selectedProject.description&&<p className="pj-detail-intro">{selectedProject.description}</p>}
          <div className="pj-facts">
            <div><span>Project type</span><strong>{selectedProject.type}</strong></div>
            {selectedProject.location&&<div><span>{selectedProject.sample?'Example Location':'Location'}</span><strong>{selectedProject.location}</strong></div>}
            {selectedProject.area&&<div><span>{selectedProject.sample?'Example Area':'Project Area'}</span><strong>{selectedProject.area}</strong></div>}
            {selectedProject.packageName&&<div><span>{selectedProject.sample?'Sample Package':'Package'}</span><strong>{selectedProject.packageName}</strong></div>}
            {!selectedProject.sample&&selectedProject.completionYear&&<div><span>Completed</span><strong>{selectedProject.completionYear}</strong></div>}
            {!selectedProject.sample&&selectedProject.businessName&&<div><span>Professional</span><strong>{selectedProject.businessName}{selectedProject.verified?' · Verified professional':''}</strong></div>}
          </div>
          {selectedProject.cost&&<div className="pj-modal-cost"><small>{selectedProject.sample?'EXAMPLE PROJECT COST · NOT A QUOTATION':'REPORTED COST / BUDGET'}</small><strong>{selectedProject.cost}</strong></div>}
          {selectedProject.sample&&selectedProject.sampleSpecs?.length>0&&<div className="pj-specs-section"><h3>Illustrative Package Specifications</h3><ul>{selectedProject.sampleSpecs.map(item=><li key={item}><Icon name="check" size={17}/>{item}</li>)}</ul></div>}
          <div className="pj-detail-buttons">
            {selectedProject.sample&&<button type="button" onClick={()=>downloadSampleSpecifications(selectedProject)}><Icon name="file" size={17}/> Download Sample Specs</button>}
            {!selectedProject.sample&&selectedProject.document&&<a href={selectedProject.document} target="_blank" rel="noopener noreferrer"><Icon name="file" size={17}/>{isPdf(selectedProject.document)?'Download Project PDF':'View Project Document'}</a>}
            {!selectedProject.sample&&selectedProject.video&&<a href={selectedProject.video} target="_blank" rel="noopener noreferrer">Open Project Video <Icon name="arrow" size={15}/></a>}
            <Link to="/packages" onClick={()=>setSelectedProject(null)}>View Packages <Icon name="layers" size={16}/></Link>
          </div>
          <div className="pj-modal-cta"><div><strong>Planning something similar?</strong><span>Get a quote for your actual requirements.</span></div><Link to={'/quote#'+similarQuoteHash(selectedProject)} onClick={()=>setSelectedProject(null)}>Get Quote <Icon name="arrow" size={17}/></Link></div>
          <p className="pj-data-disclaimer">{selectedProject.sample?'This is an illustrative sample only. Photos, names, locations, package specifications and price are not verified completed projects.':'Project information is supplied by the publishing professional. Confirm specifications, package and actual cost before proceeding.'}</p>
        </div>
      </section>
    </div>}
    <PublicFooter phone={phone} email={email}/>
  </main>
}
