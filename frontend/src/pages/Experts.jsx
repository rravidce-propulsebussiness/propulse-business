import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Experts.css'

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
  return null
}

function initials(name){
  return String(name||'Business').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'B'
}

function unique(values){
  return [...new Set(values.filter(Boolean))]
}

export default function Experts(){
  const [experts,setExperts]=useState([])
  const [industries,setIndustries]=useState([])
  const [cities,setCities]=useState([])
  const [pagination,setPagination]=useState({page:1,total:0,totalPages:0})
  const [filters,setFilters]=useState({search:'',industryId:'',cityId:'',verified:false})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [selected,setSelected]=useState(null)

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
      setLoading(true)
      setError('')
      const params=new URLSearchParams({page:String(pagination.page),pageSize:'12'})
      if(filters.search.trim())params.set('search',filters.search.trim())
      if(filters.industryId)params.set('industryId',filters.industryId)
      if(filters.cityId)params.set('cityId',filters.cityId)
      if(filters.verified)params.set('verified','true')
      publicRequest('/experts?'+params.toString())
        .then(value=>{
          if(!live)return
          setExperts(collection(value))
          setPagination(current=>({...current,...(value?.pagination||{})}))
        })
        .catch(err=>{if(live)setError(err.message||'Unable to load registered businesses.')})
        .finally(()=>{if(live)setLoading(false)})
    },filters.search?250:0)
    return()=>{live=false;clearTimeout(timer)}
  },[filters,pagination.page])

  function updateFilter(key,value){
    setFilters(current=>({...current,[key]:value}))
    setPagination(current=>({...current,page:1}))
  }

  const visibleCities=useMemo(()=>cities.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))),[cities])

  return <main className="experts-page">
    <header className="experts-header">
      <Link to="/" className="experts-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/packages">Packages</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/how-it-works">How It Works</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link className="active" to="/experts">Find Professionals</Link>
      </nav>
      <div className="experts-header-actions">
        <Link className="experts-quote" to="/quote">Get Free Quote <Icon name="arrow" size={15}/></Link>
        <Link className="experts-pro" to="/professionals">For Professionals</Link>
      </div>
    </header>

    <section className="experts-hero">
      <div className="experts-hero-copy">
        <span className="experts-kicker"><i/> REGISTERED PROPULSE BUSINESSES</span>
        <h1>Find the Right <em>Experts</em> for Your Home.</h1>
        <p>Explore registered construction, interior and real-estate businesses on ProPulse. Compare services and service areas before you create your requirement.</p>
        <div className="experts-hero-actions">
          <a href="#expert-directory">Explore Experts <Icon name="arrow" size={15}/></a>
          <Link to="/quote">Tell Us Your Requirement</Link>
        </div>
        <div className="experts-hero-points">
          <span><Icon name="shield" size={17}/> Verification status shown clearly</span>
          <span><Icon name="briefcase" size={17}/> Services listed from business profiles</span>
          <span><Icon name="pin" size={17}/> Service locations visible</span>
        </div>
      </div>

      <div className="experts-hero-visual">
        <img src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1500&q=90" alt="Construction and design professionals discussing a project"/>
        <div className="experts-hero-overlay"/>
        <article className="experts-floating-card one"><span><Icon name="shield" size={21}/></span><div><b>Verified Businesses</b><small>Verification badge where approved</small></div></article>
        <article className="experts-floating-card two"><span><Icon name="home" size={21}/></span><div><b>Home Specialists</b><small>Construction, interiors & property</small></div></article>
        <article className="experts-floating-card three"><span><Icon name="pin" size={21}/></span><div><b>Location Relevant</b><small>Find businesses serving your area</small></div></article>
      </div>
    </section>

    <section className="experts-directory" id="expert-directory">
      <div className="experts-directory-head">
        <div>
          <span>EXPERT DIRECTORY</span>
          <h2>Registered Businesses on <em>ProPulse</em></h2>
          <p>Business contact details remain protected. Submit a requirement when you want ProPulse to help connect you with relevant professionals.</p>
        </div>
        <div className="experts-count"><b>{loading?'—':pagination.total||0}</b><span>Registered businesses</span></div>
      </div>

      <div className="experts-filter-bar">
        <label className="experts-search"><Icon name="search" size={18}/><input value={filters.search} onChange={event=>updateFilter('search',event.target.value)} placeholder="Search business, service or location"/></label>
        <label><Icon name="briefcase" size={17}/><select value={filters.industryId} onChange={event=>updateFilter('industryId',event.target.value)}><option value="">All industries</option>{industries.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label><Icon name="pin" size={17}/><select value={filters.cityId} onChange={event=>updateFilter('cityId',event.target.value)}><option value="">All cities</option>{visibleCities.map(item=><option value={item.id} key={item.id}>{item.name}{item.state_name?' · '+item.state_name:''}</option>)}</select></label>
        <button className={filters.verified?'active':''} type="button" onClick={()=>updateFilter('verified',!filters.verified)}><Icon name="shield" size={17}/> Verified only</button>
      </div>

      {error&&<div className="experts-state error">{error}</div>}
      {loading&&<div className="experts-loading-grid">{Array.from({length:8}).map((_,index)=><i key={index}/>)}</div>}

      {!loading&&!error&&experts.length===0&&<div className="experts-state"><Icon name="filter" size={30}/><h3>No businesses match these filters</h3><p>Try another city, industry or search term.</p></div>}

      {!loading&&!error&&experts.length>0&&<div className="experts-grid">
        {experts.map(expert=>{
          const services=Array.isArray(expert.services)?expert.services:[]
          const locations=Array.isArray(expert.locations)?expert.locations:[]
          const industriesForExpert=unique(services.map(item=>item.industryName))
          const serviceNames=unique(services.map(item=>item.subserviceName||item.serviceName))
          const cityNames=unique(locations.map(item=>item.cityName))
          return <article className="expert-card" key={expert.business_profile_id||expert.user_id}>
            <div className="expert-card-top">
              <div className="expert-avatar">{initials(expert.business_name)}</div>
              <div className="expert-card-title"><h3>{expert.business_name}</h3><div>{expert.is_verified?<span className="verified"><Icon name="shield" size={13}/> Verified business</span>:<span className="registered"><Icon name="check" size={13}/> Registered business</span>}</div></div>
            </div>

            <div className="expert-industries">{industriesForExpert.slice(0,3).map(name=><span key={name}>{name}</span>)}{industriesForExpert.length===0&&<span>Professional services</span>}</div>
            <p className="expert-description">Registered ProPulse business offering the services shown on this profile.</p>

            <div className="expert-meta">
              <div><Icon name="briefcase" size={15}/><span><b>{serviceNames.length||0}</b> listed service{serviceNames.length===1?'':'s'}</span></div>
              <div><Icon name="pin" size={15}/><span>{cityNames.slice(0,2).join(', ')||'Service areas configured'}{cityNames.length>2?' +'+(cityNames.length-2):''}</span></div>
            </div>

            <div className="expert-service-preview">{serviceNames.slice(0,3).map(name=><span key={name}>{name}</span>)}</div>
            <button type="button" className="expert-view" onClick={()=>setSelected(expert)}>View Business Profile <Icon name="arrow" size={14}/></button>
          </article>
        })}
      </div>}

      {!loading&&pagination.totalPages>1&&<div className="experts-pagination">
        <button disabled={!pagination.hasPreviousPage} onClick={()=>setPagination(current=>({...current,page:Math.max(1,current.page-1)}))}>← Previous</button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button disabled={!pagination.hasNextPage} onClick={()=>setPagination(current=>({...current,page:current.page+1}))}>Next →</button>
      </div>}
    </section>

    <section className="experts-trust-note">
      <div><Icon name="shield" size={28}/></div>
      <div><h2>Registered does not always mean verified.</h2><p>ProPulse shows a separate verification badge when a business proof has been reviewed and approved. Always review scope, quotation, warranty terms, materials and agreements before choosing a professional.</p></div>
      <Link to="/quote">Get Free Consultation <Icon name="arrow" size={15}/></Link>
    </section>

    {selected&&<div className="expert-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}>
      <section className="expert-modal" role="dialog" aria-modal="true" aria-label={selected.business_name}>
        <button className="expert-modal-close" type="button" onClick={()=>setSelected(null)}>×</button>
        <div className="expert-modal-head">
          <div className="expert-modal-avatar">{initials(selected.business_name)}</div>
          <div><span>{selected.is_verified?'VERIFIED BUSINESS':'REGISTERED BUSINESS'}</span><h2>{selected.business_name}</h2><p>Review this business's listed services and service areas before starting your requirement.</p></div>
        </div>
        <div className="expert-modal-columns">
          <div><span>SERVICES</span><h3>What they offer</h3><div className="expert-detail-list">{unique((selected.services||[]).map(item=>item.subserviceName||item.serviceName)).map(name=><b key={name}>{name}</b>)}</div></div>
          <div><span>SERVICE AREAS</span><h3>Where they serve</h3><div className="expert-detail-list">{unique((selected.locations||[]).map(item=>[item.cityName,item.stateName].filter(Boolean).join(', '))).map(name=><b key={name}>{name}</b>)}</div></div>
        </div>
        <div className="expert-modal-note"><Icon name="shield" size={18}/><span>Direct phone and email details are not displayed publicly. Create your requirement to connect through the ProPulse lead process.</span></div>
        <div className="expert-modal-actions"><Link to="/quote" onClick={()=>setSelected(null)}>Start Your Requirement <Icon name="arrow" size={14}/></Link><button type="button" onClick={()=>setSelected(null)}>Continue Browsing</button></div>
      </section>
    </div>}

    <footer className="experts-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Helping homeowners discover registered businesses and start structured project requirements.</p></div>
      <div><b>Homeowners</b><Link to="/">Home</Link><Link to="/experts">Find Professionals</Link><Link to="/projects">Projects</Link><Link to="/packages">Packages</Link></div>
      <div><b>Support</b><Link to="/how-it-works">How It Works</Link><Link to="/contact">Contact</Link></div>
      <div><b>Professionals</b><Link to="/professionals">Professional Home</Link><Link to="/login">Login</Link><Link to="/signup">Sign Up</Link></div>
    </footer>
  </main>
}
