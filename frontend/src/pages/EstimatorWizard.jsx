import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import CustomerFlowQuestion, { isEmptyAnswer, isQuestionVisible } from '../components/CustomerFlowQuestion'
import './EstimatorWizard.css'

const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value||0))
const emptyContact={name:'',phone:'',email:''}

const THEMES={
  'construction-cost-estimator':{
    eyebrow:'CONSTRUCTION COST ESTIMATOR',
    title:'Plan Your',
    accent:'Construction Budget',
    copy:'Answer a few questions to get an indicative construction cost range based on your project details.',
    hero:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2200&q=92',
    icon:'home',
    color:'#ef5a22',
  },
  'interior-cost-estimator':{
    eyebrow:'INTERIOR COST ESTIMATOR',
    title:'Plan Your',
    accent:'Interior Budget',
    copy:'Tell us about your home and scope to get an indicative interior cost range before requesting actual quotations.',
    hero:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=2200&q=92',
    icon:'sofa',
    color:'#ef5a22',
  },
}

function makeSubmissionKey(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()
  return 'est_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12)
}
function collection(value){
  if(Array.isArray(value))return value
  if(Array.isArray(value?.data))return value.data
  if(Array.isArray(value?.rows))return value.rows
  return []
}
function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='home')return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='sofa')return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/></svg>
  if(name==='calculator')return <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='receipt')return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if(name==='people')return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  return null
}

function answerLabel(question,value){
  if(!question||isEmptyAnswer(value))return 'Not selected'
  if(Array.isArray(value))return value.map(v=>question.options?.find(o=>o.value===v)?.label||v).join(', ')
  if(typeof value==='boolean')return value?'Yes':'No'
  return question.options?.find(o=>o.value===value)?.label||String(value)
}

export default function EstimatorWizard({flowKey}){
  const navigate=useNavigate()
  const [flow,setFlow]=useState(null)
  const [cities,setCities]=useState([])
  const [contactData,setContactData]=useState({})
  const [cityId,setCityId]=useState('')
  const [answers,setAnswers]=useState({})
  const [step,setStep]=useState(0)
  const [result,setResult]=useState(null)
  const [quoteMode,setQuoteMode]=useState(false)
  const [contact,setContact]=useState(emptyContact)
  const [consent,setConsent]=useState(false)
  const [website,setWebsite]=useState('')
  const [submissionKey,setSubmissionKey]=useState(makeSubmissionKey)
  const [state,setState]=useState({loading:true,saving:false,error:'',success:false})
  const mounted=useRef(true)
  const theme=THEMES[flowKey]||THEMES['construction-cost-estimator']

  useEffect(()=>{
    mounted.current=true
    setState({loading:true,saving:false,error:'',success:false})
    Promise.all([
      publicRequest('/customer-flows/'+flowKey),
      publicRequest('/cities').catch(()=>[]),
      publicRequest('/contact?audience=website').catch(()=>({})),
    ]).then(([data,cityData,websiteContact])=>{
      if(data?.flowType!=='estimator')throw new Error('This calculator is not available.')
      if(!mounted.current)return
      setFlow(data)
      const loadedCities = collection(cityData)
      setCities(loadedCities)
      setContactData(websiteContact||{})

      let initialAnswers = {}
      let initialCityId = ''
      let initialStep = 0
      try {
        const saved = JSON.parse(sessionStorage.getItem('propulse_estimator_prefill') || 'null')
        const recent = saved && Date.now() - Number(saved.createdAt || 0) < 60 * 60 * 1000
        if (recent && saved.flowKey === flowKey) {
          initialAnswers = saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers) ? saved.answers : {}
          initialCityId = saved.cityId ? String(saved.cityId) : ''
          sessionStorage.removeItem('propulse_estimator_prefill')
          const visible = (data.questions || []).filter(question => isQuestionVisible(question, initialAnswers))
          const firstMissing = visible.findIndex(question => question.isRequired && isEmptyAnswer(initialAnswers[question.questionKey]))
          initialStep = firstMissing >= 0 ? firstMissing : Math.max(0, visible.length - 1)
        }
      } catch {}

      setAnswers(initialAnswers)
      setCityId(initialCityId)
      setStep(initialStep)
      setResult(null)
      setQuoteMode(false)
      setContact(emptyContact)
      setConsent(false)
      setWebsite('')
      setSubmissionKey(makeSubmissionKey())
      setState({loading:false,saving:false,error:'',success:false})
    }).catch(error=>mounted.current&&setState({loading:false,saving:false,error:error.message,success:false}))
    return()=>{mounted.current=false}
  },[flowKey])

  const questions=useMemo(()=>(flow?.questions||[]).filter(question=>isQuestionVisible(question,answers)),[flow,answers])
  useEffect(()=>{if(step>=questions.length&&questions.length)setStep(questions.length-1)},[questions.length,step])
  const question=questions[step]
  const locationQuestion=questions.find(q=>q.questionType==='location')
  const selectedCity=useMemo(()=>cities.find(city=>String(city.id)===String(cityId)),[cities,cityId])
  const cityPincodes=useMemo(()=>{
    const rows=Array.isArray(selectedCity?.pincodes)?selectedCity.pincodes:[]
    const map=new Map()
    rows.forEach(item=>{
      const pin=String(typeof item==='string'?item:item?.pincode||'')
      if(/^\d{6}$/.test(pin)&&!map.has(pin))map.set(pin,typeof item==='string'?{pincode:pin}:item)
    })
    return [...map.values()]
  },[selectedCity])
  const progress=result?100:questions.length?Math.round(((step+1)/questions.length)*92):0
  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''

  function setAnswer(key,value){
    setAnswers(current=>({...current,[key]:value}))
    setState(current=>({...current,error:''}))
  }
  function setCity(value){
    const city=cities.find(item=>String(item.id)===String(value))
    setCityId(value)
    if(locationQuestion){
      const pins=(city?.pincodes||[]).map(item=>String(typeof item==='string'?item:item?.pincode||'')).filter(pin=>/^\d{6}$/.test(pin))
      setAnswer(locationQuestion.questionKey,pins.length===1?pins[0]:'')
    }
  }
  async function next(){
    if(!question)return
    if(question.questionType==='location'&&!cityId){
      setState(current=>({...current,error:'Select your city to continue.'}))
      return
    }
    if(question.isRequired&&isEmptyAnswer(answers[question.questionKey])){
      setState(current=>({...current,error:'Please answer this question to continue.'}))
      return
    }
    setState(current=>({...current,error:''}))
    if(step<questions.length-1){setStep(step+1);window.scrollTo({top:0,behavior:'smooth'});return}
    try{
      setState(current=>({...current,saving:true,error:''}))
      const calculation=await publicRequest('/customer-flows/'+flowKey+'/calculate',{method:'POST',body:JSON.stringify({flowToken:flow.flowToken,answers})})
      setResult(calculation)
      setState({loading:false,saving:false,error:'',success:false})
      window.scrollTo({top:0,behavior:'smooth'})
    }catch(error){setState(current=>({...current,saving:false,error:error.message}))}
  }
  async function requestQuotes(event){
    event.preventDefault()
    const digits=contact.phone.replace(/\D/g,'')
    if(!contact.name.trim()||!/^[6-9]\d{9}$/.test(digits)||!consent){
      setState(current=>({...current,error:'Enter your name, valid 10-digit mobile number and accept the contact consent.'}))
      return
    }
    try{
      setState(current=>({...current,saving:true,error:''}))
      await publicRequest('/customer-flows/estimates/'+result.calculationId+'/convert',{method:'POST',body:JSON.stringify({contact:{...contact,phone:digits},consent,submissionKey,website})})
      setState({loading:false,saving:false,error:'',success:true})
    }catch(error){setState(current=>({...current,saving:false,error:error.message}))}
  }
  function restart(){
    setAnswers({});setCityId('');setStep(0);setResult(null);setQuoteMode(false);setContact(emptyContact);setConsent(false);setWebsite('');setSubmissionKey(makeSubmissionKey());setState({loading:false,saving:false,error:'',success:false});window.scrollTo({top:0,behavior:'smooth'})
  }

  if(state.loading)return <main className="pe-page"><div className="pe-status">Loading calculator…</div></main>
  if(!flow)return <main className="pe-page"><div className="pe-status error">{state.error||'This calculator is unavailable.'}<Link to="/">Back home</Link></div></main>

  return <main className="pe-page">
    <header className="pe-header">
      <Link to="/" className="pe-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/build">Construction</Link><Link to="/design">Interiors</Link><Link to="/property">Real Estate</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></nav>
      <button onClick={()=>navigate(flowKey==='interior-cost-estimator'?'/design':'/build')}>Free Consultation <Icon name="arrow" size={15}/></button>
    </header>

    <section className="pe-hero">
      <img src={theme.hero} alt=""/>
      <div className="pe-hero-wash"/>
      <div className="pe-hero-copy"><span>{theme.eyebrow}</span><h1>{theme.title}<em>{theme.accent}</em></h1><p>{theme.copy}</p></div>
      <div className="pe-hero-benefits">
        <article><span><Icon name="calculator"/></span><div><b>Quick Estimate</b><small>Answer a few questions</small></div></article>
        <article><span><Icon name="receipt"/></span><div><b>Transparent Range</b><small>Understand the budget first</small></div></article>
        <article><span><Icon name="pin"/></span><div><b>Location Aware</b><small>City adjustments supported</small></div></article>
        <article><span><Icon name="shield"/></span><div><b>No Login Required</b><small>Start instantly</small></div></article>
      </div>
    </section>

    <section className="pe-switch">
      <button className={flowKey==='construction-cost-estimator'?'active':''} onClick={()=>navigate('/construction-estimator')}><Icon name="home"/><div><b>Construction</b><small>Estimate home construction</small></div></button>
      <button className={flowKey==='interior-cost-estimator'?'active':''} onClick={()=>navigate('/interior-estimator')}><Icon name="sofa"/><div><b>Interiors</b><small>Estimate interior work</small></div></button>
    </section>

    {!result?<section className="pe-workspace">
      <aside className="pe-progress-card">
        <div className="pe-progress-head"><span>YOUR PROGRESS</span><b>{progress}%</b></div>
        <div className="pe-progress-bar"><i style={{width:progress+'%'}}/></div>
        <div className="pe-step-list">{questions.map((item,index)=>{
          const answered=!isEmptyAnswer(answers[item.questionKey])
          const active=index===step
          return <button type="button" key={item.questionKey} className={active?'active':answered?'done':''} onClick={()=>index<=step||answered?setStep(index):null}><span>{answered?<Icon name="check" size={13}/>:index+1}</span><div><b>{item.label}</b><small>{answered?answerLabel(item,answers[item.questionKey]):active?'Current step':'Not answered'}</small></div></button>
        })}</div>
      </aside>

      <section className="pe-question-card">
        <div className="pe-question-kicker">QUESTION {String(step+1).padStart(2,'0')} / {String(questions.length).padStart(2,'0')}</div>
        <h2>{question?.label}</h2>
        {question?.helpText&&<p>{question.helpText}</p>}
        <div className="pe-control">
          {question?.questionType==='location'?<div className="pe-location-grid">
            <label><span>City / Location</span><select value={cityId} onChange={e=>setCity(e.target.value)}><option value="">Select City / Location</option>{cities.map(city=><option key={city.id} value={city.id}>{city.name}{city.state_name?' · '+city.state_name:''}</option>)}</select></label>
            <label><span>PIN Code</span>{cityPincodes.length?<select value={answers[question.questionKey]||''} onChange={e=>setAnswer(question.questionKey,e.target.value)}><option value="">Select PIN Code</option>{cityPincodes.map(item=><option key={item.pincode} value={item.pincode}>{item.pincode}{item.officeName?' · '+item.officeName:''}</option>)}</select>:<input inputMode="numeric" maxLength="6" value={answers[question.questionKey]||''} onChange={e=>setAnswer(question.questionKey,e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter 6-digit PIN"/>}</label>
          </div>:<CustomerFlowQuestion question={question} value={answers[question?.questionKey]} onChange={value=>setAnswer(question.questionKey,value)}/>}
        </div>
        {state.error&&<div className="pe-error">{state.error}</div>}
        <div className="pe-question-actions">
          <button type="button" className="secondary" disabled={step===0||state.saving} onClick={()=>setStep(Math.max(0,step-1))}>← Back</button>
          <button type="button" className="primary" disabled={state.saving} onClick={next}>{state.saving?'Calculating…':step===questions.length-1?'Calculate Estimate':'Next'} <Icon name="arrow" size={15}/></button>
        </div>
      </section>

      <aside className="pe-summary-card">
        <span>ESTIMATE SUMMARY</span>
        <h3>{flow.name}</h3>
        <div>{questions.filter(q=>!isEmptyAnswer(answers[q.questionKey])).slice(0,7).map(q=><p key={q.questionKey}><span>{q.label}</span><b>{answerLabel(q,answers[q.questionKey])}</b></p>)}</div>
        <section><Icon name="receipt"/><div><b>Indicative estimate only</b><small>Final pricing depends on drawings, scope, materials, site conditions and professional quotation.</small></div></section>
      </aside>
    </section>:<section className="pe-result-wrap">
      {state.success?<div className="pe-success">
        <div className="pe-success-mark">✓</div><span>QUOTE REQUEST RECEIVED</span><h1>Your estimate is now a requirement.</h1><p>Relevant businesses may contact you with actual quotations. Your indicative estimate is preserved with the requirement for context.</p><div><Link to="/">Back Home</Link><button onClick={restart}>Estimate Another Project</button></div>
      </div>:<div className="pe-result-grid">
        <section className="pe-result-main">
          <span>INDICATIVE ESTIMATE</span><h2>{flow.config?.resultTitle||'Estimated project cost'}</h2>
          <div className="pe-range"><strong>{money(result.minimum)}</strong><i>to</i><strong>{money(result.maximum)}</strong></div>
          {result.cityName&&<p className="pe-city"><Icon name="pin" size={14}/>Adjusted for {result.cityName}</p>}
          {Array.isArray(result.breakdown)&&result.breakdown.length>0&&<div className="pe-breakdown"><b>What shaped this range</b>{result.breakdown.map(item=><div key={item.kind+':'+item.key}><span>{item.label}</span><em>{item.minimum===item.maximum?money(item.minimum):money(item.minimum)+' – '+money(item.maximum)}</em></div>)}</div>}
          <div className="pe-disclaimer">{result.disclaimer}</div>
          {!quoteMode?<div className="pe-result-actions"><button className="secondary" onClick={restart}>Recalculate</button>{result.quoteEligible?<button className="primary" onClick={()=>{setQuoteMode(true);setState(current=>({...current,error:''}))}}>{flow.config?.quoteCtaLabel||'Get Actual Quotes'} <Icon name="arrow" size={15}/></button>:<Link to="/">Done</Link>}</div>:null}
        </section>

        <aside className="pe-result-side">
          {!quoteMode?<><div className="pe-next-card"><span><Icon name="people"/></span><h3>Want Actual Quotations?</h3><p>Convert this estimate into a customer requirement so relevant businesses can respond.</p>{result.quoteEligible?<button onClick={()=>setQuoteMode(true)}>Request Actual Quotes <Icon name="arrow" size={14}/></button>:<small>Add a supported PIN code to make quotation requests available.</small>}</div>{phone&&<a className="pe-call" href={'tel:'+phone.replace(/\s/g,'')}><Icon name="phone" size={16}/>Need help? {phone}</a>}</>:<form className="pe-quote-form" onSubmit={requestQuotes}>
            <span>GET ACTUAL QUOTES</span><h3>Where should relevant businesses reach you?</h3><label>Name<input value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} required/></label><label>Mobile Number<div><b>+91</b><input value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} inputMode="tel" required/></div></label><label>Email <small>Optional</small><input type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/></label><label className="pe-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree that ProPulse may share my contact information and project details with relevant businesses so they can provide actual quotations or callbacks.</span></label><label className="pe-honeypot">Website<input tabIndex="-1" autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>{state.error&&<div className="pe-error">{state.error}</div>}<button type="submit" className="primary" disabled={state.saving}>{state.saving?'Submitting…':'Request Quotes'} <Icon name="arrow" size={14}/></button><button type="button" className="secondary" onClick={()=>setQuoteMode(false)}>Back to Estimate</button>
          </form>}
        </aside>
      </div>}
    </section>}

    <footer className="pe-footer">
      <div><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your customer starting point for construction, interiors and real-estate requirements.</p></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/build">Construction</Link><Link to="/design">Interiors</Link><Link to="/property">Real Estate</Link><Link to="/projects">Projects</Link></div>
      <div><b>Our Services</b><Link to="/construction-estimator">Construction Estimator</Link><Link to="/interior-estimator">Interior Estimator</Link><Link to="/build">Free Consultation</Link></div>
      <div><b>Support</b><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact Us</Link></div>
    </footer>
  </main>
}
