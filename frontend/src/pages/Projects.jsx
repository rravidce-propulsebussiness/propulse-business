import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './Projects.css'

export const CONCEPTS = [
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
  return '/projects/'+(project.sample?project.id:'project-'+project.id)
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

  // Completed project entries from professionals (including Verified professional labels) always lead.
  const filtered=useMemo(()=>{
    const term=query.trim().toLowerCase()
    return [...professionalProjects,...CONCEPTS].filter(project=>{
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
        <div className="pj-toolbar">
          <div className="pj-tabs" role="group" aria-label="Project categories">
            {CATEGORIES.map(item=><button key={item.id} type="button" className={category===item.id?'active':''} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label}</button>)}
          </div>
          <label className="pj-search"><Icon name="search"/><span className="pj-sr-only">Search projects</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search projects or locations"/></label>
        </div>
        {loading&&<div className="pj-loading-inline" role="status" aria-label="Checking for published business projects"><span className="pj-inline-spinner" aria-hidden="true"/></div>}
        <div className="pj-project-grid">
          {filtered.map((project,index)=><article key={(project.sample?'sample-':'business-')+project.id} className="pj-project-card">
            <Link to={projectPath(project)} className="pj-card-open" aria-label={'View '+(project.sample?'sample ':'')+'details for '+project.title}>
              <div className="pj-project-photo">
                {projectPhotos(project).length?<img src={projectPhotos(project)[0]} loading={index<3?'eager':'lazy'} alt={project.title}/>:<div className="pj-image-placeholder"><Icon name="layers" size={30}/>Project photo not provided</div>}
                {projectPhotos(project).length>1&&<span className="pj-card-photo-count">{projectPhotos(project).length} Photos</span>}
                {!project.sample&&project.video&&<span className="pj-card-video-badge">Video Available</span>}
                <span className="pj-category-badge">{project.sample?'COMPLETED STYLE · DEMO':categoryLabel(project.category)}</span>
              </div>
              <div className="pj-project-copy">
                <span className="pj-card-type">{categoryLabel(project.category)}{!project.sample&&project.completionYear?' · '+project.completionYear:''}</span>
                <div className="pj-project-title-row"><h3>{project.title}</h3></div>
                {project.description&&<p className="pj-card-description">{project.description}</p>}
                <div className="pj-project-facts">
                  {project.location&&<div><small>Location</small><b>{project.location}</b></div>}
                  {project.area&&<div><small>Area</small><b>{project.area}</b></div>}
                  {project.packageName&&<div><small>{project.sample?'Sample Package':'Package'}</small><b>{project.packageName}</b></div>}
                  {project.businessName&&<div><small>Professional</small><b>{project.businessName}</b></div>}
                </div>
                {project.cost&&<div className="pj-cost"><div><small>{project.sample?'ILLUSTRATIVE COST':'REPORTED COST / BUDGET'}</small><strong>{project.cost}</strong></div></div>}
                <span className="pj-single-action">View Project <Icon name="arrow" size={16}/></span>
              </div>
            </Link>
          </article>)}
        </div>
        {!filtered.length&&!loading&&<div className="pj-empty"><h3>No matching projects</h3><button type="button" onClick={()=>{setCategory('all');setQuery('')}}>Clear filters</button></div>}
        {loadError&&<p className="pj-load-error" role="status">{loadError} Sample projects remain available below.</p>}
        {hasNext&&<button type="button" className="pj-load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore?'Loading…':'Load More Business Projects'} <Icon name="arrow" size={15}/></button>}
        <p className="pj-gallery-disclaimer">Sample concepts are illustrative only — photos, locations, costs, packages and specifications are examples, not completed professional work or quotations. Published business projects appear first automatically.</p>
      </div>
    </section>
    <PublicFooter phone={phone} email={email}/>
  </main>
}
