import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './GlobalLeadPopup.css'

const AUTO_POPUP_DELAY_MS=5*60*1000

const FLOORS = [
  { value:'1', label:'Ground Floor' },
  { value:'2', label:'G+1' },
  { value:'3', label:'G+2' },
  { value:'4', label:'G+3' },
  { value:'5', label:'Above G+3' },
]

const EMPTY = {
  flowKey:'',
  cityId:'',
  pincode:'',
  name:'',
  phone:'',
  website:'',
  projectType:'',
  floors:'',
  plotArea:'',
  propertyType:'',
  bhk:'',
  propertyIntent:'',
  budget:'',
  additional:'',
}

const EXCLUDED_PREFIXES = [
  '/admin','/login','/signup','/forgot-password','/reset-password',
  '/leads','/dashboard','/purchased-leads','/my-leads','/wallet',
  '/membership','/notifications','/profile','/investment','/lead-partner',
  '/professionals','/professional-contact',
]

function makeSubmissionKey(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()
  return 'global_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12)
}
function collection(value){
  if(Array.isArray(value))return value
  if(Array.isArray(value?.data))return value.data
  if(Array.isArray(value?.rows))return value.rows
  if(Array.isArray(value?.items))return value.items
  return []
}
function prefillAnswers(form){
  const answers={}
  if(form.flowKey==='build'){
    if(form.projectType)answers.project_type=form.projectType
    if(form.floors)answers.floors=String(form.floors)
    if(form.plotArea)answers.plot_area=String(form.plotArea)
  }
  if(form.flowKey==='design'){
    if(form.propertyType)answers.property_type=form.propertyType
    if(form.bhk)answers.bhk=form.bhk
  }
  if(form.flowKey==='property'){
    if(form.propertyIntent)answers.property_intent=form.propertyIntent
    if(form.propertyType)answers.property_type=form.propertyType
    if(form.budget)answers.budget=form.budget
  }
  if(form.additional.trim())answers.additional_requirement=form.additional.trim()
  return answers
}
function Icon({name,size=18}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.9',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  return null
}

export default function GlobalLeadPopup(){
  const location=useLocation()
  const navigate=useNavigate()
  const eligible=!EXCLUDED_PREFIXES.some(prefix=>location.pathname.startsWith(prefix))
  const [open,setOpen]=useState(false)
  const [cycle,setCycle]=useState(0)
  const [cities,setCities]=useState([])
  const [loadingCities,setLoadingCities]=useState(false)
  const [form,setForm]=useState(EMPTY)
  const [citySearch,setCitySearch]=useState('')
  const [detected,setDetected]=useState(null)
  const [pinBusy,setPinBusy]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [submitted,setSubmitted]=useState(null)
  const [submissionKey,setSubmissionKey]=useState(makeSubmissionKey)
  const pinSeq=useRef(0)

  const cityList=useMemo(()=>[...cities].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))),[cities])
  function cityLabel(city){
    return city?city.name+(city.state_name?' · '+city.state_name:''):''
  }
  function exactCity(value){
    const normalized=String(value||'').trim().toLowerCase()
    if(!normalized)return null
    return cityList.find(city=>{
      const name=String(city.name||'').trim().toLowerCase()
      const full=cityLabel(city).trim().toLowerCase()
      return normalized===name||normalized===full
    })||null
  }

  const closePopup=useCallback(()=>{
    setOpen(false)
    setError('')
    if(!submitted)setCycle(value=>value+1)
  },[submitted])

  useEffect(()=>{
    if(!eligible)return undefined
    let active=true
    queueMicrotask(()=>{if(active)setLoadingCities(true)})
    publicRequest('/cities').then(value=>{if(active)setCities(collection(value))}).catch(()=>{}).finally(()=>{if(active)setLoadingCities(false)})
    return()=>{active=false}
  },[eligible])

  useEffect(()=>{
    if(!eligible||open||submitted)return undefined
    let submittedBefore=false
    try{submittedBefore=sessionStorage.getItem('propulse_basic_lead_submitted')==='1'}catch{}
    if(submittedBefore)return undefined
    const timer=window.setTimeout(()=>setOpen(true),AUTO_POPUP_DELAY_MS)
    return()=>window.clearTimeout(timer)
  },[eligible,location.pathname,location.hash,cycle,open,submitted])

  useEffect(()=>{
    const handler=event=>{
      if(!eligible)return
      const detail=event.detail||{}
      const hasFlow=Object.prototype.hasOwnProperty.call(detail,'flowKey')
      const nextFlow=['build','design','property'].includes(detail.flowKey)?detail.flowKey:''
      const packageNote=detail.packageName
        ? (nextFlow==='design'?'Interior package preference: ':'Package preference: ')+detail.packageName
        : ''
      setForm(current=>({
        ...EMPTY,
        flowKey:hasFlow?nextFlow:current.flowKey,
        name:current.name,
        phone:current.phone,
        additional:packageNote,
      }))
      setCitySearch('')
      setDetected(null)
      setError('')
      setSubmitted(null)
      setSubmissionKey(makeSubmissionKey())
      setOpen(true)
    }
    window.addEventListener('propulse:open-lead-popup',handler)
    return()=>window.removeEventListener('propulse:open-lead-popup',handler)
  },[eligible])

  useEffect(()=>{
    if(!open)return undefined
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKey=event=>{if(event.key==='Escape')closePopup()}
    window.addEventListener('keydown',onKey)
    return()=>{
      document.body.style.overflow=previous
      window.removeEventListener('keydown',onKey)
    }
  },[open,closePopup])
  function setFlow(flowKey){
    setForm(current=>({...EMPTY,flowKey,name:current.name,phone:current.phone}))
    setCitySearch('')
    setDetected(null)
    setError('')
    setSubmitted(null)
    setSubmissionKey(makeSubmissionKey())
  }
  function changeCity(value){
    setCitySearch(value)
    const match=exactCity(value)
    setForm(current=>({...current,cityId:match?String(match.id):''}))
    setError('')
  }
  async function lookupPin(raw){
    const pincode=String(raw||'').replace(/\D/g,'').slice(0,6)
    pinSeq.current+=1
    const seq=pinSeq.current
    setForm(current=>({...current,pincode}))
    setDetected(null)
    setError('')
    if(pincode.length!==6)return
    try{
      setPinBusy(true)
      const result=await publicRequest('/pincodes/location/'+pincode)
      if(seq!==pinSeq.current)return
      let city=result?.cityId?cityList.find(item=>String(item.id)===String(result.cityId)):null
      if(!city&&result?.cityName){
        city=cityList.find(item=>String(item.name||'').trim().toLowerCase()===String(result.cityName||'').trim().toLowerCase()
          &&(!result.stateName||String(item.state_name||'').trim().toLowerCase()===String(result.stateName||'').trim().toLowerCase()))||null
      }
      setForm(current=>({...current,pincode,cityId:city?String(city.id):current.cityId}))
      if(city)setCitySearch(cityLabel(city))
      setDetected({
        cityName:city?.name||result?.cityName||'',
        stateName:city?.state_name||result?.stateName||'',
        districtName:result?.districtName||'',
      })
    }catch(err){
      if(seq===pinSeq.current)setError(err.message||'Unable to detect location from this PIN code.')
    }finally{
      if(seq===pinSeq.current)setPinBusy(false)
    }
  }

  async function submit(event){
    event.preventDefault()
    const mobile=form.phone.replace(/\D/g,'')
    const name=form.name.trim()
    const typed=exactCity(citySearch)
    const cityId=Number(form.cityId||typed?.id||0)
    const city=cityList.find(item=>Number(item.id)===cityId)||typed
    if(!form.flowKey)return setError('Select what you need help with.')
    if(!cityId)return setError('Enter and select a valid city or location.')
    if(!/^\d{6}$/.test(form.pincode))return setError('Enter a valid 6-digit PIN code.')
    if(form.flowKey==='build'&&!form.projectType)return setError('Select the construction project type.')
    if(form.flowKey==='build'&&!form.floors)return setError('Select the planned number of floors.')
    if(form.flowKey==='design'&&!form.propertyType)return setError('Select the property type.')
    if(form.flowKey==='property'&&!form.propertyIntent)return setError('Select whether you want to buy, rent, sell or invest.')
    if(form.flowKey==='property'&&!form.propertyType)return setError('Select the property type.')
    if(name.length<2)return setError('Enter your name.')
    if(!/^[6-9]\d{9}$/.test(mobile))return setError('Enter a valid 10-digit mobile number.')

    const details={
      projectType:form.projectType,
      floors:form.floors,
      plotArea:form.plotArea,
      propertyType:form.propertyType,
      bhk:form.bhk,
      propertyIntent:form.propertyIntent,
      budget:form.budget,
      additional:form.additional,
    }
    try{
      setSaving(true)
      setError('')
      const query=new URLSearchParams(window.location.search)
      const result=await publicRequest('/customer-flows/'+form.flowKey+'/consultation',{
        method:'POST',
        body:JSON.stringify({
          cityId,
          pincode:form.pincode,
          details,
          contact:{name,phone:mobile,email:''},
          consent:true,
          submissionKey,
          website:form.website,
          attribution:{
            utmSource:query.get('utm_source')||'',
            utmMedium:query.get('utm_medium')||'',
            utmCampaign:query.get('utm_campaign')||'',
            utmContent:query.get('utm_content')||'',
            utmTerm:query.get('utm_term')||'',
            referrer:document.referrer||'',
            landingPath:window.location.pathname+window.location.search+window.location.hash,
          },
        }),
      })
      try{
        sessionStorage.setItem('propulse_intake_prefill',JSON.stringify({
          flowKey:form.flowKey,
          cityId,
          cityName:city?.name||'',
          pincode:form.pincode,
          answers:prefillAnswers(form),
          name,
          phone:mobile,
          submissionKey,
          createdAt:Date.now(),
        }))
        sessionStorage.setItem('propulse_basic_lead_submitted','1')
      }catch{}
      setSubmitted({leadId:result?.leadId||null,flowKey:form.flowKey,name})
    }catch(err){
      setError(err.message||'Unable to submit your requirement.')
    }finally{
      setSaving(false)
    }
  }

  function continueDetailed(){
    const hash=submitted?.flowKey==='design'?'interiors':submitted?.flowKey==='property'?'property':'construction'
    setOpen(false)
    navigate('/quote#'+hash)
  }

  if(!eligible||!open)return null

  return <div className="glp-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)closePopup()}}>
    <aside className="glp-modal" role="dialog" aria-modal="true" aria-label="Tell us your requirement">
      <button className="glp-close" type="button" onClick={closePopup} aria-label="Close">×</button>
      <div className="glp-head">
        <span><Icon name="phone" size={20}/></span>
        <div><small>FREE REQUIREMENT REQUEST</small><h3>Tell Us Your Requirement</h3><p>Share a few details and we’ll connect your requirement to the right flow.</p></div>
      </div>

      {submitted?<div className="glp-success">
        <span><Icon name="check" size={28}/></span>
        <h4>Requirement received</h4>
        <p>Thanks {submitted.name}. Your request has been saved{submitted.leadId?<> as <b>#L-{String(submitted.leadId).padStart(6,'0')}</b></>:null}.</p>
        <button type="button" className="glp-primary" onClick={continueDetailed}>Continue to Detailed Requirement <Icon name="arrow" size={15}/></button>
        <button type="button" className="glp-secondary" onClick={closePopup}>Done</button>
      </div>:<form onSubmit={submit}>
        <div className="glp-two">
          <label><span>PIN Code {pinBusy?<small>Detecting…</small>:null}</span><input inputMode="numeric" maxLength="6" value={form.pincode} onChange={event=>lookupPin(event.target.value)} placeholder="6-digit PIN"/></label>
          <label><span>City / Location</span><input list="glp-city-list" value={citySearch} onChange={event=>changeCity(event.target.value)} onBlur={event=>{const match=exactCity(event.target.value);if(match){setCitySearch(cityLabel(match));setForm(current=>({...current,cityId:String(match.id)}))}}} placeholder={loadingCities?'Loading cities…':'Type city name'} disabled={loadingCities}/><datalist id="glp-city-list">{cityList.map(city=><option key={city.id} value={cityLabel(city)}/>)}</datalist></label>
        </div>

        <label className="glp-full"><span>I am looking for</span><select value={form.flowKey} onChange={event=>setFlow(event.target.value)}><option value="">Select requirement</option><option value="build">Home Construction</option><option value="design">Interior Design</option><option value="property">Real Estate</option></select></label>

        {detected&&<div className="glp-location"><Icon name="pin" size={14}/><span>{[detected.cityName,detected.districtName,detected.stateName].filter(Boolean).join(' · ')}</span></div>}

        {form.flowKey==='build'&&<div className="glp-two glp-detail">
          <label><span>Project Type</span><select value={form.projectType} onChange={event=>setForm({...form,projectType:event.target.value})}><option value="">Select project</option><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="renovation">Renovation</option><option value="extension">Extension</option></select></label>
          <label><span>No. of Floors</span><select value={form.floors} onChange={event=>setForm({...form,floors:event.target.value})}><option value="">Select floors</option>{FLOORS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label><span>Plot Area <small>Optional</small></span><div className="glp-unit"><input type="number" min="10" value={form.plotArea} onChange={event=>setForm({...form,plotArea:event.target.value})} placeholder="e.g. 200"/><i>sq yards</i></div></label>
        </div>}

        {form.flowKey==='design'&&<div className="glp-two glp-detail">
          <label><span>Property Type</span><select value={form.propertyType} onChange={event=>setForm({...form,propertyType:event.target.value,bhk:''})}><option value="">Select property</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="independent_house">Independent House</option><option value="office">Office</option><option value="commercial_space">Commercial Space</option></select></label>
          {!['office','commercial_space'].includes(form.propertyType)&&<label><span>BHK <small>Optional</small></span><select value={form.bhk} onChange={event=>setForm({...form,bhk:event.target.value})}><option value="">Select BHK</option><option value="1bhk">1 BHK</option><option value="2bhk">2 BHK</option><option value="3bhk">3 BHK</option><option value="4bhk">4 BHK</option><option value="5plus">5+ BHK</option></select></label>}
        </div>}

        {form.flowKey==='property'&&<div className="glp-two glp-detail">
          <label><span>I want to</span><select value={form.propertyIntent} onChange={event=>setForm({...form,propertyIntent:event.target.value})}><option value="">Select intent</option><option value="buy">Buy</option><option value="rent">Rent</option><option value="sell">Sell</option><option value="invest">Invest</option></select></label>
          <label><span>Property Type</span><select value={form.propertyType} onChange={event=>setForm({...form,propertyType:event.target.value})}><option value="">Select property</option><option value="apartment">Apartment</option><option value="villa">Villa</option><option value="independent_house">Independent House</option><option value="commercial">Commercial</option><option value="plot">Plot / Land</option></select></label>
          <label><span>Budget <small>Optional</small></span><select value={form.budget} onChange={event=>setForm({...form,budget:event.target.value})}><option value="">Select budget</option><option value="Under ₹20 Lakhs">Under ₹20 Lakhs</option><option value="₹20 - 50 Lakhs">₹20 - 50 Lakhs</option><option value="₹50 Lakhs - 1 Crore">₹50 Lakhs - 1 Crore</option><option value="₹1 - 2 Crore">₹1 - 2 Crore</option><option value="Above ₹2 Crore">Above ₹2 Crore</option></select></label>
        </div>}

        <div className="glp-two">
          <label><span>Your Name</span><input value={form.name} onChange={event=>setForm({...form,name:event.target.value})} placeholder="Enter your name" autoComplete="name"/></label>
          <label><span>Mobile Number</span><div className="glp-phone"><i>+91</i><input value={form.phone} onChange={event=>setForm({...form,phone:event.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="10-digit mobile" inputMode="tel" autoComplete="tel"/></div></label>
        </div>

        <label className="glp-full"><span>Additional Information <small>Optional</small></span><textarea value={form.additional} onChange={event=>setForm({...form,additional:event.target.value})} placeholder="Locality, rooms, materials, parking, preferred package or anything important…"/></label>
        <input className="glp-honeypot" tabIndex="-1" autoComplete="off" value={form.website} onChange={event=>setForm({...form,website:event.target.value})}/>
        {error&&<div className="glp-error">{error}</div>}
        <button className="glp-primary" type="submit" disabled={saving}>{saving?'Submitting…':'Submit Requirement'} <Icon name="arrow" size={15}/></button>
      </form>}
    </aside>
  </div>
}
