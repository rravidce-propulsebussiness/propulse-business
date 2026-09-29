import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './PublicContact.css'

const HERO='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=92'
const OFFICE='https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=90'
const CTA='https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=90'

function collection(value){
  if(Array.isArray(value)) return value
  if(Array.isArray(value?.data)) return value.data
  if(Array.isArray(value?.rows)) return value.rows
  if(Array.isArray(value?.items)) return value.items
  return []
}

function makeSubmissionKey(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()
  return 'contact_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,14)
}

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='mail')return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
  if(name==='user')return <svg {...p}><circle cx="12" cy="7" r="3"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='clock')return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
  if(name==='support')return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='receipt')return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  return null
}

export default function PublicContact(){
  const navigate=useNavigate()
  const [data,setData]=useState({company_name:'',email:'',phone:'',whatsapp:'',address:'',business_hours:'',support_email:'',careers_email:'',maps_url:'',social_handles:[]})
  const [cities,setCities]=useState([])
  const [faqs,setFaqs]=useState([])
  const [openFaq,setOpenFaq]=useState(null)
  const [form,setForm]=useState({name:'',phone:'',email:'',interest:'',cityId:'',message:'',website:''})
  const [submissionKey,setSubmissionKey]=useState(makeSubmissionKey)
  const [status,setStatus]=useState({saving:false,error:'',success:false})

  useEffect(()=>{
    window.scrollTo(0,0)
    Promise.allSettled([
      publicRequest('/contact?audience=website'),
      publicRequest('/cities'),
      publicRequest('/faqs?audience=website'),
    ]).then(([contactResult,cityResult,faqResult])=>{
      if(contactResult.status==='fulfilled')setData(v=>({...v,...contactResult.value}))
      if(cityResult.status==='fulfilled')setCities(collection(cityResult.value))
      if(faqResult.status==='fulfilled')setFaqs(collection(faqResult.value))
    })
  },[])

  const socials=useMemo(()=>Array.isArray(data.social_handles)?data.social_handles.filter(s=>s.enabled&&s.url):[],[data.social_handles])
  const shownFaqs=useMemo(()=>faqs.filter(f=>f?.is_active!==false).slice(0,6),[faqs])
  const phoneDigits=String(data.phone||'').replace(/[^+\d]/g,'')
  const whatsappDigits=String(data.whatsapp||'').replace(/\D/g,'')
  const mainEmail=data.email||data.support_email||''
  const mapSrc=data.address?'https://www.google.com/maps?q='+encodeURIComponent(data.address)+'&output=embed':''
  const officeTitle=data.company_name||'ProPulse'
  const address=data.address||'Hyderabad, India'
  const hours=data.business_hours||'Business hours available on request'

  async function submit(event){
    event.preventDefault()
    if(form.name.trim().length<2)return setStatus({saving:false,error:'Enter your name.',success:false})
    if(!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g,'')))return setStatus({saving:false,error:'Enter a valid 10-digit mobile number.',success:false})
    if(!form.interest)return setStatus({saving:false,error:'Select what you are interested in.',success:false})
    if(form.message.trim().length<10)return setStatus({saving:false,error:'Tell us a little more about your requirement.',success:false})
    try{
      setStatus({saving:true,error:'',success:false})
      await publicRequest('/contact/inquiries',{
        method:'POST',
        idempotency:true,
        body:JSON.stringify({...form,submissionKey})
      })
      setForm({name:'',phone:'',email:'',interest:'',cityId:'',message:'',website:''})
      setSubmissionKey(makeSubmissionKey())
      setStatus({saving:false,error:'',success:true})
    }catch(error){
      setStatus({saving:false,error:error.message||'Unable to send your message. Please try again.',success:false})
    }
  }

  const fallbackFaqs=[
    {id:'f1',question:'How can I get a free consultation?',answer:'Choose Construction, Interiors or Real Estate and submit your requirement. You can also send us a message from this page.'},
    {id:'f2',question:'How long does it take to get a response?',answer:'Response time depends on the requirement and the businesses available for your location.'},
    {id:'f3',question:'What areas do you serve?',answer:'The public forms use the active cities and PIN codes configured by the ProPulse Admin team.'},
    {id:'f4',question:'Can I discuss multiple requirements?',answer:'Yes. You can submit separate structured requirements for construction, interiors and real estate.'},
    {id:'f5',question:'Do you charge for starting a consultation?',answer:'The public requirement intake can be started without a consultation fee.'},
    {id:'f6',question:'How do I start a project with ProPulse?',answer:'Choose a category, add your city and project details, then submit the requirement for relevant responses.'},
  ]
  const faqList=shownFaqs.length?shownFaqs:fallbackFaqs

  return <main className="pc-page">
    <header className="pc-header">
      <Link to="/" className="pc-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/build">Construction</Link><Link to="/design">Interiors</Link><Link to="/property">Real Estate</Link><Link to="/projects">Projects</Link><Link to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link className="active" to="/contact">Contact</Link></nav>
      <button onClick={()=>navigate('/build')}>Get Free Consultation <Icon name="arrow" size={15}/></button>
    </header>

    <section className="pc-hero">
      <img src={HERO} alt="Premium modern home"/>
      <div className="pc-hero-wash"/>
      <div className="pc-hero-copy"><span>CONTACT US</span><h1>We’re Here<em>To Help You</em></h1><p>Have a question or need guidance? Reach out for help with construction, interiors, real estate or your project requirement.</p></div>
      <div className="pc-hero-benefits">
        <article><span><Icon name="phone"/></span><div><b>Direct Contact</b><small>Use phone, email or WhatsApp</small></div></article>
        <article><span><Icon name="user"/></span><div><b>Expert Guidance</b><small>Talk through your requirement</small></div></article>
        <article><span><Icon name="shield"/></span><div><b>No Obligation</b><small>Start with a free consultation</small></div></article>
        <article><span><Icon name="support"/></span><div><b>End-to-End Journey</b><small>From idea to next step</small></div></article>
      </div>
    </section>

    <section className="pc-main">
      <div className="pc-left">
        <div className="pc-section-head"><h2>Get in <em>Touch</em></h2><p>Reach out through any of the channels configured by the ProPulse team.</p></div>
        <div className="pc-contact-grid">
          <a href={phoneDigits?'tel:'+phoneDigits:'#'}><span><Icon name="phone"/></span><div><b>Call Us</b><strong>{data.phone||'Contact number coming soon'}</strong><small>{hours}</small></div></a>
          <a href={mainEmail?'mailto:'+mainEmail:'#'}><span><Icon name="mail"/></span><div><b>Email Us</b><strong>{mainEmail||'Email coming soon'}</strong><small>Send us your requirement or question</small></div></a>
          <a href={whatsappDigits?'https://wa.me/'+whatsappDigits:'#'} target={whatsappDigits?'_blank':undefined} rel="noreferrer"><span><Icon name="support"/></span><div><b>Need Help?</b><strong>{data.whatsapp||'Talk to Our Expert'}</strong><small>Free consultation</small></div></a>
          <a href={data.maps_url||'#'} target={data.maps_url?'_blank':undefined} rel="noreferrer"><span><Icon name="pin"/></span><div><b>Our Location</b><strong>{address}</strong><small>Open location details</small></div></a>
        </div>

        <div className="pc-office-head"><h2>Our <em>Office</em></h2><p>Visit our office or get in touch with our team. Office information is controlled from Admin → Contact & Social.</p></div>
        <div className="pc-office-card">
          <img src={OFFICE} alt="Modern office interior"/>
          <div className="pc-office-info">
            <p><span><Icon name="pin" size={16}/></span><div><b>Address</b><small>{address}</small></div></p>
            <p><span><Icon name="clock" size={16}/></span><div><b>Working Hours</b><small>{hours}</small></div></p>
            <p><span><Icon name="phone" size={16}/></span><div><b>Phone</b><small>{data.phone||'—'}</small></div></p>
            <p><span><Icon name="mail" size={16}/></span><div><b>Email</b><small>{mainEmail||'—'}</small></div></p>
          </div>
        </div>
      </div>

      <div className="pc-right">
        <form className="pc-form-card" onSubmit={submit}>
          <div className="pc-section-head"><h2>Send Us a <em>Message</em></h2><p>Fill in the details below and our team will get back to you.</p></div>
          <div className="pc-form-grid">
            <label><span>Your Name *</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Enter your full name"/></label>
            <label><span>Mobile Number *</span><div className="pc-phone-field"><b>+91</b><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} inputMode="tel" placeholder="Enter 10-digit number"/></div></label>
            <label><span>Email Address <small>(Optional)</small></span><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Enter your email address"/></label>
            <label><span>Interested In *</span><select value={form.interest} onChange={e=>setForm({...form,interest:e.target.value})}><option value="">Select Option</option><option value="construction">Construction</option><option value="interiors">Interior Design</option><option value="real_estate">Real Estate</option><option value="general">General Enquiry</option></select></label>
            <label className="wide"><span>City / Location</span><select value={form.cityId} onChange={e=>setForm({...form,cityId:e.target.value})}><option value="">Select City / Location</option>{cities.map(city=><option key={city.id} value={city.id}>{city.name}{city.state_name?' · '+city.state_name:''}</option>)}</select></label>
            <label className="wide"><span>Message *</span><textarea rows="5" maxLength="3000" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Tell us about your requirement, project idea or any questions…"/></label>
            <label className="pc-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></label>
          </div>
          {status.error&&<div className="pc-form-alert error">{status.error}</div>}
          {status.success&&<div className="pc-form-alert success">Your message has been sent successfully. We’ll get back to you shortly.</div>}
          <button className="pc-send" type="submit" disabled={status.saving}>{status.saving?'Sending…':'Send Message'} <Icon name="arrow" size={15}/></button>
        </form>

        <div className="pc-map-card">
          {mapSrc?<iframe title="ProPulse office map" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>:<div className="pc-map-empty"><Icon name="pin" size={28}/><b>{officeTitle}</b><span>{address}</span></div>}
          <div className="pc-map-label"><span><Icon name="pin" size={17}/></span><div><b>{officeTitle}</b><small>{address}</small></div>{data.maps_url&&<a href={data.maps_url} target="_blank" rel="noreferrer">Open ↗</a>}</div>
        </div>
      </div>
    </section>

    <section className="pc-faq">
      <div className="pc-faq-head"><div><h2>Frequently Asked <em>Questions</em></h2><p>Quick answers to common questions. Can’t find what you’re looking for? Send us a message above.</p></div><Link to="/contact?audience=users">View All FAQs <Icon name="arrow" size={14}/></Link></div>
      <div className="pc-faq-grid">{faqList.slice(0,6).map((item,index)=>{const key=item.id??index;const open=openFaq===key;return <article key={key} className={open?'open':''}><button onClick={()=>setOpenFaq(open?null:key)}><span>{item.question}</span><b>{open?'−':'⌄'}</b></button>{open&&<p>{item.answer}</p>}</article>})}</div>
    </section>

    <section className="pc-cta">
      <img src={CTA} alt="Premium residential project"/>
      <div><h2>Ready to Start Your Project?</h2><p>Get a free consultation and create a structured requirement for construction, interiors or real estate.</p></div>
      <button onClick={()=>navigate('/build')}>Get Free Consultation <Icon name="arrow" size={15}/></button>
      <div className="pc-cta-points"><span><Icon name="shield" size={13}/>No Obligation</span><span><Icon name="support" size={13}/>Guided Requirement</span><span><Icon name="receipt" size={13}/>Clear Information</span></div>
    </section>

    <footer className="pc-footer">
      <div className="pc-footer-brand"><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your customer starting point for construction, interiors and real-estate requirements.</p><div>{socials.map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer" title={s.platform}>{String(s.platform||'?').slice(0,1).toUpperCase()}</a>)}</div></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/build">Construction</Link><Link to="/design">Interiors</Link><Link to="/property">Real Estate</Link><Link to="/projects">Projects</Link></div>
      <div><b>Our Services</b><Link to="/build">Home Construction</Link><Link to="/design">Interior Design</Link><Link to="/property">Real Estate</Link><Link to="/construction-estimator">Cost Estimator</Link><Link to="/build">Free Consultation</Link></div>
      <div><b>Support</b><Link to="/contact?audience=users">FAQ</Link><Link to="/contact">Contact Us</Link><Link to="/contact?audience=users">Privacy Policy</Link><Link to="/contact?audience=users">Terms & Conditions</Link></div>
      <div><b>Contact Info</b>{data.phone&&<span><Icon name="phone" size={13}/>{data.phone}</span>}{mainEmail&&<span><Icon name="mail" size={13}/>{mainEmail}</span>}<span><Icon name="pin" size={13}/>{address}</span></div>
    </footer>
  </main>
}
