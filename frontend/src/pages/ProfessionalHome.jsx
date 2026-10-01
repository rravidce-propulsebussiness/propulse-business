import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLeads } from '../api/leads'
import { publicRequest } from '../utils/auth'
import './ProfessionalHome.css'

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='briefcase')return <svg {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='filter')return <svg {...p}><path d="M4 5h16M7 12h10M10 19h4"/></svg>
  if(name==='wallet')return <svg {...p}><path d="M3 7h16a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h12v4M16 12h5"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='user')return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
  if(name==='lock')return <svg {...p}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
  if(name==='star')return <svg {...p}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>
  return null
}

function toItems(value){
  if(Array.isArray(value))return value
  if(Array.isArray(value?.items))return value.items
  if(Array.isArray(value?.data))return value.data
  return []
}

function toCollection(value){
  if(Array.isArray(value))return value
  if(Array.isArray(value?.data))return value.data
  if(Array.isArray(value?.rows))return value.rows
  return []
}

function cityLabel(city){
  return [city?.name,city?.state_name].filter(Boolean).join(', ')
}

function leadLabel(value){
  const key=String(value||'basic').toLowerCase()
  return key==='exclusive'?'Exclusive':key==='premium'?'Premium':'Basic'
}

export default function ProfessionalHome(){
  const [leads,setLeads]=useState([])
  const [cities,setCities]=useState([])
  const [selectedCityId,setSelectedCityId]=useState('')
  const [loading,setLoading]=useState(true)
  const [locationState,setLocationState]=useState({
    status:'detecting',
    cityId:'',
    cityName:'',
    stateName:'',
    pincode:'',
    localityName:'',
    message:'Detecting your city…',
  })

  useEffect(()=>{
    let live=true
    publicRequest('/cities')
      .then(value=>{if(live)setCities(toCollection(value))})
      .catch(()=>{if(live)setCities([])})
    return()=>{live=false}
  },[])

  useEffect(()=>{
    let live=true
    setLoading(true)
    const params={status:'available',page:1,limit:8}
    if(selectedCityId)params.cityId=selectedCityId
    listLeads(params)
      .then(data=>{if(live)setLeads(toItems(data).slice(0,8))})
      .catch(()=>{if(live)setLeads([])})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[selectedCityId])

  function applyDetectedLocation(result){
    const cityId=result?.cityId ? String(result.cityId) : ''
    setLocationState({
      status:cityId?'matched':'partial',
      cityId,
      cityName:result?.cityName||'',
      stateName:result?.stateName||'',
      pincode:result?.pincode||'',
      localityName:result?.localityName||'',
      message:cityId
        ? 'Showing available leads near your detected city.'
        : 'Location detected. Choose your city to filter available leads.',
    })
    if(cityId)setSelectedCityId(cityId)
  }

  function detectLocation(){
    if(!navigator.geolocation){
      setLocationState(current=>({...current,status:'unsupported',message:'Automatic location is not supported in this browser. Choose your city below.'}))
      return
    }

    setLocationState(current=>({...current,status:'detecting',message:'Detecting your city…'}))
    navigator.geolocation.getCurrentPosition(
      position=>{
        publicRequest('/pincodes/reverse-location',{
          method:'POST',
          body:JSON.stringify({
            latitude:position.coords.latitude,
            longitude:position.coords.longitude,
          }),
        })
          .then(result=>{
            applyDetectedLocation(result)
            try{
              sessionStorage.setItem('propulse_professional_location',JSON.stringify({...result,savedAt:Date.now()}))
            }catch{}
          })
          .catch(()=>{
            setLocationState(current=>({...current,status:'error',message:'We could not match your location to a supported city. Choose your city below.'}))
          })
      },
      error=>{
        const denied=error?.code===1
        setLocationState(current=>({...current,status:denied?'denied':'error',message:denied?'Location permission was not allowed. Choose your city below.':'Unable to detect your location. Choose your city below.'}))
      },
      {enableHighAccuracy:false,timeout:9000,maximumAge:300000},
    )
  }

  useEffect(()=>{
    try{
      const cached=JSON.parse(sessionStorage.getItem('propulse_professional_location')||'null')
      if(cached?.savedAt && Date.now()-Number(cached.savedAt)<6*60*60*1000){
        applyDetectedLocation(cached)
        return
      }
    }catch{}
    detectLocation()
  },[])

  const visibleCities=useMemo(()=>[...cities].sort((a,b)=>cityLabel(a).localeCompare(cityLabel(b))),[cities])
  const selectedCity=useMemo(()=>visibleCities.find(city=>String(city.id)===String(selectedCityId))||null,[visibleCities,selectedCityId])
  const preview=useMemo(()=>leads.slice(0,4),[leads])

  return <main className="pro-home">
    <header className="pro-home-header">
      <Link className="pro-home-logo" to="/"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav>
        <a href="#opportunities">Leads</a>
        <a href="#how">How It Works</a>
        <a href="#benefits">Benefits</a>
        <a href="/">Homeowners</a>
      </nav>
      <div className="pro-home-actions">
        <Link className="pro-login" to="/login">Login</Link>
        <Link className="pro-signup" to="/signup">Create Business Account <Icon name="arrow" size={15}/></Link>
      </div>
    </header>

    <section className="pro-hero">
      <div className="pro-hero-copy">
        <span className="pro-kicker"><i/> PROPULSE FOR PROFESSIONALS</span>
        <h1>Turn Customer Requirements Into <em>Business Opportunities.</em></h1>
        <p>Discover relevant construction, interior and real-estate leads, review the requirement before you buy, and grow your business through one focused marketplace.</p>
        <div className="pro-hero-actions">
          <Link className="pro-primary" to={selectedCityId?'/leads?cityId='+selectedCityId:'/leads'}>Browse Live Leads <Icon name="arrow" size={16}/></Link>
          <Link className="pro-secondary" to="/signup">Sign Up Free</Link>
        </div>
        <div className="pro-hero-trust">
          <span><Icon name="shield" size={17}/> Business verification</span>
          <span><Icon name="filter" size={17}/> Service & location matching</span>
          <span><Icon name="lock" size={17}/> Protected customer contact</span>
        </div>
      </div>

      <div className="pro-hero-market">
        <div className="pro-market-head">
          <div><span>LIVE LEADS {selectedCity||locationState.cityName?'· NEAR YOU':''}</span><h2>{selectedCity?.name||locationState.cityName ? 'Opportunities around '+(selectedCity?.name||locationState.cityName)+'.' : 'Relevant opportunities, in one place.'}</h2></div>
          <Link to={selectedCityId?'/leads?cityId='+selectedCityId:'/leads'}>View all <Icon name="arrow" size={14}/></Link>
        </div>
        <div className="pro-market-grid">
          {loading?<div className="pro-market-loading">Loading available leads…</div>:preview.length===0?<div className="pro-market-loading">No live leads found for this city right now.</div>:preview.map((lead,index)=>{
            const location=[lead.city_name,lead.state_name].filter(Boolean).join(', ')||'Location available'
            return <article className="pro-lead-card" key={lead.id||index}>
              <div className="pro-lead-top"><span className={'pro-lead-type '+String(lead.lead_type||'basic').toLowerCase()}>{leadLabel(lead.lead_type)}</span><small>Available</small></div>
              <div className="pro-lead-icon"><Icon name="briefcase" size={23}/></div>
              <h3>{lead.service_name||lead.industry_name||'Business Opportunity'}</h3>
              <p>{lead.industry_name||'Customer requirement'}</p>
              <div className="pro-lead-location"><Icon name="pin" size={13}/>{location}</div>
              <div className="pro-lead-foot"><span>Contact protected</span><b>View lead <Icon name="arrow" size={12}/></b></div>
            </article>
          })}
        </div>
      </div>
    </section>

    <section className="pro-value-strip" id="benefits">
      <article><span><Icon name="filter"/></span><div><b>Relevant Leads</b><small>Filter by industry, service and location.</small></div></article>
      <article><span><Icon name="shield"/></span><div><b>Verified Business Profile</b><small>Build trust with your professional account.</small></div></article>
      <article><span><Icon name="wallet"/></span><div><b>Flexible Lead Access</b><small>Use wallet, offers and available access options.</small></div></article>
      <article><span><Icon name="star"/></span><div><b>Grow Consistently</b><small>Track purchased leads and follow up from one place.</small></div></article>
    </section>

    <section className="pro-opportunities" id="opportunities">
      <div className="pro-section-head pro-leads-head">
        <div>
          <span>LIVE LEAD MARKETPLACE</span>
          <h2>Available leads <em>{selectedCity?.name||locationState.cityName ? 'near '+(selectedCity?.name||locationState.cityName) : 'for professionals'}.</em></h2>
          <p>We use your city only to make the marketplace more relevant. You can change the city or view all available leads at any time.</p>
        </div>
        <Link className="pro-view-all" to={selectedCityId?'/leads?cityId='+selectedCityId:'/leads'}>View all leads <Icon name="arrow" size={14}/></Link>
      </div>

      <div className="pro-location-panel">
        <div className={'pro-location-status '+locationState.status}>
          <i><Icon name="pin" size={18}/></i>
          <div>
            <small>AUTO LOCATION</small>
            <b>{selectedCity ? cityLabel(selectedCity) : locationState.cityName ? [locationState.cityName,locationState.stateName].filter(Boolean).join(', ') : locationState.status==='detecting' ? 'Detecting your city…' : 'Choose your city'}</b>
            <span>{locationState.localityName ? locationState.localityName+(locationState.pincode?' · '+locationState.pincode:'') : locationState.message}</span>
          </div>
        </div>
        <label className="pro-city-select">
          <span>City</span>
          <select value={selectedCityId} onChange={event=>{
            const value=event.target.value
            setSelectedCityId(value)
            const city=visibleCities.find(item=>String(item.id)===String(value))
            setLocationState(current=>({...current,status:value?'manual':'all',cityId:value,cityName:city?.name||'',stateName:city?.state_name||'',message:value?'Showing leads for your selected city.':'Showing available leads from all cities.'}))
          }}>
            <option value="">All cities</option>
            {visibleCities.map(city=><option key={city.id} value={city.id}>{cityLabel(city)}</option>)}
          </select>
        </label>
        <button className="pro-detect-location" type="button" onClick={detectLocation} disabled={locationState.status==='detecting'}>
          <Icon name="pin" size={16}/>{locationState.status==='detecting'?'Detecting…':'Use my location'}
        </button>
      </div>

      {loading?<div className="pro-live-loading">Loading available leads…</div>:leads.length===0?<div className="pro-live-empty">
        <span><Icon name="briefcase" size={25}/></span>
        <div><h3>No live leads in this city right now</h3><p>Choose another city or view all leads. New customer requirements will appear here automatically.</p></div>
        {selectedCityId&&<button type="button" onClick={()=>setSelectedCityId('')}>Show all cities</button>}
      </div>:<div className="pro-live-grid">
        {leads.map((lead,index)=>{
          const location=[lead.city_name,lead.state_name].filter(Boolean).join(', ')||'Location available'
          return <article className="pro-live-card" key={lead.id||index}>
            <div className="pro-live-card-top">
              <span className={'pro-lead-type '+String(lead.lead_type||'basic').toLowerCase()}>{leadLabel(lead.lead_type)}</span>
              <small>Available</small>
            </div>
            <div className="pro-live-icon"><Icon name="briefcase" size={20}/></div>
            <h3>{lead.service_name||lead.industry_name||'Business Opportunity'}</h3>
            <p>{lead.industry_name||'Customer requirement'}</p>
            <div className="pro-live-location"><Icon name="pin" size={14}/><span>{location}</span></div>
            <div className="pro-live-meta"><span><Icon name="lock" size={13}/> Contact protected</span><b>{lead.pincode?'PIN '+lead.pincode:'Structured requirement'}</b></div>
            <Link to={selectedCityId?'/leads?cityId='+selectedCityId:'/leads'}>View lead <Icon name="arrow" size={13}/></Link>
          </article>
        })}
      </div>}
    </section>

    <section className="pro-how" id="how">
      <div className="pro-section-head centered">
        <span>SIMPLE PROFESSIONAL FLOW</span>
        <h2>From signup to opportunity <em>in four clear steps.</em></h2>
      </div>
      <div className="pro-how-grid">
        <article><b>01</b><span><Icon name="user"/></span><h3>Create Your Business Account</h3><p>Add your services and locations so ProPulse can show more relevant opportunities.</p></article>
        <i>→</i>
        <article><b>02</b><span><Icon name="shield"/></span><h3>Complete Verification</h3><p>Submit the required business details and proof documents for your professional profile.</p></article>
        <i>→</i>
        <article><b>03</b><span><Icon name="briefcase"/></span><h3>Review Available Leads</h3><p>See structured project information and choose opportunities that fit your business.</p></article>
        <i>→</i>
        <article><b>04</b><span><Icon name="check"/></span><h3>Access & Follow Up</h3><p>Purchase or claim eligible lead access, then continue the customer conversation from your account.</p></article>
      </div>
    </section>

    <section className="pro-account-cta">
      <div>
        <span>READY TO GROW?</span>
        <h2>Your next customer opportunity could already be waiting.</h2>
        <p>Create your business profile or sign in to explore available leads.</p>
      </div>
      <div className="pro-account-actions">
        <Link to="/signup">Create Business Account <Icon name="arrow" size={15}/></Link>
        <Link to="/login">Login</Link>
      </div>
    </section>

    <footer className="pro-home-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Lead opportunities and business growth tools for professionals.</p></div>
      <div><b>Marketplace</b><Link to="/leads">Browse Leads</Link><Link to="/signup">Create Account</Link><Link to="/login">Login</Link></div>
      <div><b>Homeowners</b><Link to="/">Home</Link><Link to="/packages">Packages</Link><Link to="/projects">Projects</Link></div>
      <div><b>Support</b><Link to="/professional-contact">Professional Contact</Link></div>
    </footer>
  </main>
}
