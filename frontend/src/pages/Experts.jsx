import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Experts.css'
import { openLeadPopup } from '../utils/leadPopup'

function collection(value){
  if(Array.isArray(value))return value
  if(Array.isArray(value?.data))return value.data
  if(Array.isArray(value?.rows))return value.rows
  return []
}

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='search')return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='briefcase')return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18"/></svg>
  if(name==='filter')return <svg {...p}><path d="M4 5h16M7 12h10M10 19h4"/></svg>
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='home')return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='play')return <svg {...p}><path d="m8 5 11 7-11 7Z"/></svg>
  if(name==='file')return <svg {...p}><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/></svg>
  if(name==='star')return <svg {...p}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>
  if(name==='users')return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  return null
}

function initials(name){return String(name||'Business').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'B'}
function unique(values){return [...new Set(values.filter(Boolean))]}
function money(value){if(value==null||value==='')return null;const n=Number(value);return Number.isFinite(n)?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n):null}

export default function Experts(){
  const [experts,setExperts]=useState([])
  const [industries,setIndustries]=useState([])
  const [cities,setCities]=useState([])
  const [settings,setSettings]=useState(null)
  const [pagination,setPagination]=useState({page:1,total:0,totalPages:0})
  const [filters,setFilters]=useState({search:'',industryId:'',cityId:'',verified:false})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [selected,setSelected]=useState(null)
  const [selectedLoading,setSelectedLoading]=useState(false)

  useEffect(()=>{
    window.scrollTo(0,0)
    Promise.allSettled([publicRequest('/industries'),publicRequest('/cities')]).then(([industryResult,cityResult])=>{
      if(industryResult.status==='fulfilled')setIndustries(collection(industryResult.value))
      if(cityResult.status==='fulfilled')setCities(collection(cityResult.value))
    })
  },[])

  useEffect(()=>{
    let live=true
    const timer=setTimeout(()=>{
      setLoading(true);setError('')
      const params=new URLSearchParams({page:String(pagination.page),pageSize:'12'})
      if(filters.search.trim())params.set('search',filters.search.trim())
      if(filters.industryId)params.set('industryId',filters.industryId)
      if(filters.cityId)params.set('cityId',filters.cityId)
      if(filters.verified)params.set('verified','true')
      publicRequest('/experts?'+params.toString()).then(value=>{
        if(!live)return
        setExperts(collection(value));setSettings(value?.settings||null);setPagination(current=>({...current,...(value?.pagination||{})}))
      }).catch(err=>{if(live)setError(err.message||'Unable to load subscribed professionals.')}).finally(()=>{if(live)setLoading(false)})
    },filters.search?250:0)
    return()=>{live=false;clearTimeout(timer)}
  },[filters,pagination.page])

  function updateFilter(key,value){setFilters(current=>({...current,[key]:value}));setPagination(current=>({...current,page:1}))}
  async function viewExpert(expert){
    try{
      setSelectedLoading(true);setError('')
      const value=await publicRequest('/experts/'+expert.business_profile_id)
      setSelected(value)
    }catch(err){setError(err.message||'Unable to load business profile.')}finally{setSelectedLoading(false)}
  }

  const visibleCities=useMemo(()=>cities.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))),[cities])

  return <main className="experts-page">
    <header className="experts-header">
      <Link to="/" className="experts-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/packages">Packages</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link className="active" to="/experts">Find Professionals</Link></nav>
      <div className="experts-header-actions"><Link className="experts-quote" to="/quote#interiors">Get Free Quote <Icon name="arrow" size={15}/></Link><Link className="experts-pro" to="/professionals">For Professionals</Link></div>
    </header>

    <section className="experts-directory" id="expert-directory">
      <div className="experts-directory-intro">
        <div className="experts-intro-pill"><Icon name="users" size={17}/><span>TRUSTED PROFESSIONALS</span></div>
        <h1><span>Expert</span> <em>Engineers</em></h1>
        <i aria-hidden="true"/>
        <p>Find trusted construction, interior and real-estate professionals.</p>
      </div>

      <div className="experts-filter-bar"><label className="experts-search"><Icon name="search" size={18}/><input value={filters.search} onChange={event=>updateFilter('search',event.target.value)} placeholder="Search by name, service, or location..."/></label><label><Icon name="briefcase" size={17}/><select value={filters.industryId} onChange={event=>updateFilter('industryId',event.target.value)}><option value="">All categories</option>{industries.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label><Icon name="pin" size={17}/><select value={filters.cityId} onChange={event=>updateFilter('cityId',event.target.value)}><option value="">All cities</option>{visibleCities.map(item=><option value={item.id} key={item.id}>{item.name}{item.state_name?' · '+item.state_name:''}</option>)}</select></label><button className={filters.verified?'active':''} type="button" onClick={()=>updateFilter('verified',!filters.verified)}><Icon name="filter" size={17}/>{filters.verified?'Verified only':'More Filters'}</button></div>

      {error&&<div className="experts-state error">{error}</div>}
      {loading&&<div className="experts-loading-grid">{Array.from({length:8}).map((_,index)=><i key={index}/>)}</div>}
      {!loading&&!error&&settings?.directoryEnabled===false&&<div className="experts-state"><Icon name="filter" size={30}/><h3>Professional directory is currently unavailable</h3><p>ProPulse Admin has temporarily disabled public business profiles.</p></div>}
      {!loading&&!error&&settings?.directoryEnabled!==false&&experts.length===0&&<div className="experts-state"><Icon name="filter" size={30}/><h3>No subscribed professionals match these filters</h3><p>Try another city, industry or search term.</p></div>}

      {!loading&&!error&&experts.length>0&&<div className="experts-grid">{experts.map(expert=>{
        const services=Array.isArray(expert.services)?expert.services:[]
        const locations=Array.isArray(expert.locations)?expert.locations:[]
        const industriesForExpert=unique(services.map(item=>item.industryName))
        const serviceNames=unique(services.map(item=>item.subserviceName||item.serviceName))
        const cityNames=unique(locations.map(item=>item.cityName))
        return <article className={`expert-card ${expert.is_featured?'featured':''}`} key={expert.business_profile_id||expert.user_id}>
          <div className={`expert-card-cover ${expert.cover_image_url?'has-image':'fallback'}`}>
            {expert.cover_image_url?<img src={expert.cover_image_url} alt={`${expert.business_name} project`}/>:<div className="expert-cover-placeholder"><Icon name="home" size={38}/><span>Project showcase</span></div>}
            <span className={expert.is_verified?'verified-badge':'subscribed-badge'}>{expert.is_verified?<><Icon name="check" size={13}/> Verified</>:<><Icon name="check" size={13}/> Subscribed</>}</span>
            {expert.is_featured&&<span className="featured-badge"><Icon name="star" size={12}/> Featured</span>}
          </div>
          <div className="expert-card-identity">
            <div className="expert-avatar">{initials(expert.business_name)}</div>
            <div className="expert-card-title"><h3>{expert.business_name}</h3><p>{expert.public_headline||industriesForExpert[0]||'Professional services'}</p></div>
            <span className={`expert-membership ${expert.plan_group||'grow'}`}>{String(expert.plan_group||'member').toUpperCase()}</span>
          </div>
          <div className="expert-industries">{industriesForExpert.slice(0,3).map(name=><span key={name}>{name}</span>)}{industriesForExpert.length===0&&serviceNames.slice(0,3).map(name=><span key={name}>{name}</span>)}</div>
          <div className="expert-location"><Icon name="pin" size={16}/><span>{cityNames.slice(0,2).join(', ')||'Service areas configured'}{cityNames.length>2?' +'+(cityNames.length-2):''}</span></div>
          <p className="expert-description">{expert.public_summary||'Trusted ProPulse professional offering the listed services and project support.'}</p>
          <div className="expert-proof-stats"><span><b>{expert.project_count||0}</b> Projects</span><span><b>{serviceNames.length||0}</b> Services</span><span><b>{expert.years_experience||'—'}</b> Years</span></div>
          <div className="expert-card-actions">
            <button type="button" className="expert-view" disabled={selectedLoading} onClick={()=>viewExpert(expert)}>{selectedLoading?'Loading…':'View Profile'}</button>
            <button type="button" className="expert-requirement" onClick={()=>openLeadPopup('')}>Send Requirement <Icon name="arrow" size={14}/></button>
          </div>
        </article>
      })}</div>}

      {!loading&&pagination.totalPages>1&&<div className="experts-pagination"><button disabled={!pagination.hasPreviousPage} onClick={()=>setPagination(current=>({...current,page:Math.max(1,current.page-1)}))}>← Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button disabled={!pagination.hasNextPage} onClick={()=>setPagination(current=>({...current,page:current.page+1}))}>Next →</button></div>}
    </section>

    <section className="experts-trust-note"><div><Icon name="shield" size={28}/></div><div><h2>Subscription and verification are different signals.</h2><p>The directory can require an active GROW or SCALE membership. A verification badge appears only when company proof has separately been reviewed and approved. Always review scope, quotation, warranty, materials and agreements before choosing a professional.</p></div><Link to="/quote" onClick={event=>{event.preventDefault();openLeadPopup('')}}>Get Free Consultation <Icon name="arrow" size={15}/></Link></section>

    {selected&&<div className="expert-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}><section className="expert-modal expert-rich-modal" role="dialog" aria-modal="true" aria-label={selected.business_name}>
      <button className="expert-modal-close" type="button" onClick={()=>setSelected(null)}>×</button>
      <div className="expert-modal-head"><div className="expert-modal-avatar">{initials(selected.business_name)}</div><div><span>{selected.is_verified?'VERIFIED SUBSCRIBED BUSINESS':'SUBSCRIBED BUSINESS'}</span><h2>{selected.business_name}</h2><p>{selected.public_headline||selected.public_summary||'Review this business profile before creating your requirement.'}</p><div className="expert-modal-membership"><b>{String(selected.plan_group||'member').toUpperCase()}</b>{selected.years_experience!=null&&<small>{selected.years_experience} years experience</small>}</div></div></div>
      {selected.public_summary&&<div className="expert-about"><span>ABOUT</span><p>{selected.public_summary}</p></div>}
      <div className="expert-modal-columns"><div><span>SERVICES</span><h3>What they offer</h3><div className="expert-detail-list">{unique((selected.services||[]).map(item=>item.subserviceName||item.serviceName)).map(name=><b key={name}>{name}</b>)}</div></div><div><span>SERVICE AREAS</span><h3>Where they serve</h3><div className="expert-detail-list">{unique((selected.locations||[]).map(item=>[item.cityName,item.stateName].filter(Boolean).join(', '))).map(name=><b key={name}>{name}</b>)}</div></div></div>
      {(selected.projects||[]).length>0&&<section className="expert-portfolio"><div className="expert-section-title"><span>COMPLETED PROJECTS</span><h3>Project portfolio</h3></div><div className="expert-project-grid">{selected.projects.map(project=><article key={project.id}>{project.cover_image_url&&<div className="expert-project-image"><img src={project.cover_image_url} alt={project.title}/></div>}<div className="expert-project-body"><div className="expert-project-kicker">{[project.project_type,project.completion_year].filter(Boolean).join(' · ')||'Completed project'}</div><h4>{project.title}</h4>{project.description&&<p>{project.description}</p>}<div className="expert-project-meta">{project.location_text&&<span>{project.location_text}</span>}{project.area_text&&<span>{project.area_text}</span>}{project.budget_text&&<span>{project.budget_text}</span>}</div><div className="expert-project-links">{project.video_url&&<a href={project.video_url} target="_blank" rel="noreferrer"><Icon name="play" size={13}/> Watch video</a>}{project.plan_url&&<a href={project.plan_url} target="_blank" rel="noreferrer"><Icon name="file" size={13}/> View plan</a>}</div></div></article>)}</div></section>}
      {(selected.service_plans||[]).length>0&&<section className="expert-plans"><div className="expert-section-title"><span>SERVICE PLANS</span><h3>Public packages</h3></div><div className="expert-plan-grid">{selected.service_plans.map(plan=><article key={plan.id}><span>PLAN</span><h4>{plan.title}</h4>{money(plan.price_from)&&<strong>From {money(plan.price_from)}</strong>}{plan.duration_label&&<small>{plan.duration_label}</small>}{plan.description&&<p>{plan.description}</p>}{Array.isArray(plan.inclusions)&&plan.inclusions.length>0&&<ul>{plan.inclusions.map((item,index)=><li key={`${plan.id}-${index}`}><Icon name="check" size={12}/>{item}</li>)}</ul>}</article>)}</div></section>}
      <div className="expert-modal-note"><Icon name="shield" size={18}/><span>Direct phone and email details are not displayed publicly. Create your requirement to connect through the ProPulse lead process.</span></div>
      <div className="expert-modal-actions"><Link to="/quote" onClick={event=>{event.preventDefault();setSelected(null);openLeadPopup('')}}>Start Your Requirement <Icon name="arrow" size={14}/></Link><button type="button" onClick={()=>setSelected(null)}>Continue Browsing</button></div>
    </section></div>}

    <footer className="experts-footer"><div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Helping homeowners compare subscribed professional profiles and start structured project requirements.</p></div><div><b>Homeowners</b><Link to="/">Home</Link><Link to="/experts">Find Professionals</Link><Link to="/projects">Projects</Link><Link to="/packages">Packages</Link></div><div><b>Support</b><Link to="/how-it-works">How It Works</Link><Link to="/contact">Contact</Link></div><div><b>Professionals</b><Link to="/professionals">Professional Home</Link><Link to="/login">Login</Link><Link to="/signup">Sign Up</Link></div></footer>
  </main>
}