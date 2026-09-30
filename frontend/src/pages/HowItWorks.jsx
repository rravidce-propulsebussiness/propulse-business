import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './HowItWorks.css'

const HERO='https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=92'

const FLOWS=[
  {
    key:'construction',
    label:'Construction',
    subtitle:'Build Your Dream Home',
    route:'/quote#construction',
    sectionTitle:'Construction – How It Works',
    sectionText:'Build your dream home with a clear requirement, estimated planning and relevant businesses.',
    image:'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=88',
    imageTitle:'From Plan to Your Dream Home',
    imageText:'Start with a structured requirement and move forward with clarity.',
    steps:[
      ['clipboard','Share Your Requirement','Tell us about your plot, budget and preferences.'],
      ['calculator','Get Estimated Plan','Use the estimator to understand an indicative budget range.'],
      ['people','Connect with Businesses','Relevant businesses can understand the same structured brief.'],
      ['home','Start Construction','Compare real quotations and move forward with the option you choose.'],
    ],
  },
  {
    key:'interiors',
    label:'Interiors',
    subtitle:'Design Beautiful Spaces',
    route:'/quote#interiors',
    sectionTitle:'Interiors – How It Works',
    sectionText:'Create a clearer interior brief for your home, office or commercial space.',
    image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=88',
    imageTitle:'Turn Your Space into Something Special',
    imageText:'Define rooms, style, scope and preferences before requesting responses.',
    steps:[
      ['sofa','Share Your Space Details','Tell us about the property, rooms, area and preferred scope.'],
      ['spark','Get Design Options','Describe the styles, finishes and budget you are considering.'],
      ['people','Meet Interior Businesses','Relevant interior businesses can respond to the same brief.'],
      ['chair','Get It Done','Compare quotations and choose how you want to proceed.'],
    ],
  },
  {
    key:'realestate',
    label:'Real Estate',
    subtitle:'Buy, Sell or Invest',
    route:'/quote#property',
    sectionTitle:'Real Estate – How It Works',
    sectionText:'Create a structured requirement for residential, commercial or plot properties.',
    image:'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=88',
    imageTitle:'Better Decisions Start with Clear Requirements',
    imageText:'Define property type, location, budget and preferences in one place.',
    steps:[
      ['search','Tell Us What You Need','Choose the location, property type, budget and intent.'],
      ['building','Get Relevant Options','Your brief helps narrow responses to what actually matches.'],
      ['people','Connect with Businesses','Talk to relevant real-estate businesses using the same requirement.'],
      ['handshake','Finalize & Proceed','Review the actual details and choose your own next step.'],
    ],
  },
]

function collection(value){
  if(Array.isArray(value)) return value
  if(Array.isArray(value?.data)) return value.data
  if(Array.isArray(value?.rows)) return value.rows
  return []
}

function Icon({name,size=20}){
  const p={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true}
  if(name==='home')return <svg {...p}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
  if(name==='sofa')return <svg {...p}><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M4 10a2 2 0 0 0-2 2v5h20v-5a2 2 0 0 0-2-2"/></svg>
  if(name==='building')return <svg {...p}><path d="M4 21V4h10v17"/><path d="M14 8h6v13"/><path d="M7 8h3M7 12h3M7 16h3M17 12h1M17 16h1"/></svg>
  if(name==='clipboard')return <svg {...p}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/></svg>
  if(name==='calculator')return <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/></svg>
  if(name==='people')return <svg {...p}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 21a6 6 0 0 1 12 0M14 16a5 5 0 0 1 7 5"/></svg>
  if(name==='spark')return <svg {...p}><path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z"/></svg>
  if(name==='chair')return <svg {...p}><path d="M7 12V7a2 2 0 0 1 4 0v5M17 12V7a2 2 0 0 0-4 0v5"/><path d="M5 12h14v5H5zM7 17v4M17 17v4"/></svg>
  if(name==='search')return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
  if(name==='handshake')return <svg {...p}><path d="m8 11 3 3c1 1 2 .8 3 0l3-3"/><path d="m3 8 4-4 4 4-4 4zM21 8l-4-4-4 4 4 4z"/><path d="M9 16l2 2c1 1 2 1 3 0l3-3"/></svg>
  if(name==='shield')return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
  if(name==='receipt')return <svg {...p}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>
  if(name==='support')return <svg {...p}><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v5h3v-5H4ZM17 13h3v5h-3v-5ZM17 20c-1 1-2.5 1-4 1"/></svg>
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  return null
}

export default function HowItWorks(){
  const navigate=useNavigate()
  const [active,setActive]=useState('construction')
  const [faqs,setFaqs]=useState([])
  const [openFaq,setOpenFaq]=useState(null)
  const [cities,setCities]=useState([])
  const [contactData,setContactData]=useState({})

  useEffect(()=>{
    window.scrollTo(0,0)
    Promise.allSettled([
      publicRequest('/faqs?audience=website'),
      publicRequest('/cities'),
      publicRequest('/contact?audience=website'),
    ]).then(([faqResult,cityResult,contactResult])=>{
      if(faqResult.status==='fulfilled')setFaqs(collection(faqResult.value))
      if(cityResult.status==='fulfilled')setCities(collection(cityResult.value))
      if(contactResult.status==='fulfilled')setContactData(contactResult.value||{})
    })
  },[])

  const visibleFaqs=useMemo(()=>faqs.filter(item=>item?.is_active!==false).slice(0,4),[faqs])

  function goToFlow(key){
    setActive(key)
    document.getElementById('hiw-'+key)?.scrollIntoView({behavior:'smooth',block:'start'})
  }

  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''
  const email=contactData.email||contactData.support_email||''

  return <main className="hiw-page">
    <header className="hiw-header">
      <Link to="/" className="hiw-logo"><img src="/brand/propulse-logo.svg" alt="ProPulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/packages">Packages</Link><Link to="/projects">Projects</Link><Link className="active" to="/how-it-works">How It Works</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></nav>
      <div className="public-header-actions">
        <button className="public-quote-button" onClick={()=>navigate('/quote#construction')}>Get Free Quote <Icon name="arrow" size={15}/></button>
        <Link className="public-professional-btn" to="/contact?audience=users">Professionals</Link>
      </div>
    </header>

    <section className="hiw-hero">
      <img src={HERO} alt="Premium modern home"/>
      <div className="hiw-hero-wash"/>
      <div className="hiw-hero-copy"><span>HOW IT WORKS</span><h1>From Your Idea<em>to Reality</em></h1><p>A simple and transparent process to help you build, design or define the property you need.</p></div>
      <div className="hiw-hero-benefits">
        <article><span><Icon name="shield"/></span><div><b>Simple Process</b><small>Easy and hassle-free</small></div></article>
        <article><span><Icon name="people"/></span><div><b>Relevant Businesses</b><small>Matched to your requirement</small></div></article>
        <article><span><Icon name="receipt"/></span><div><b>Transparent Estimates</b><small>Understand the budget first</small></div></article>
        <article><span><Icon name="support"/></span><div><b>End-to-End Journey</b><small>From requirement onward</small></div></article>
      </div>
    </section>

    <section className="hiw-tabs">
      {FLOWS.map(flow=><button key={flow.key} className={active===flow.key?'active':''} onClick={()=>goToFlow(flow.key)}><span><Icon name={flow.key==='construction'?'home':flow.key==='interiors'?'sofa':'building'} size={20}/></span><div><b>{flow.label}</b><small>{flow.subtitle}</small></div></button>)}
    </section>

    <section className="hiw-flow-list">
      {FLOWS.map((flow,index)=><article className="hiw-flow" id={'hiw-'+flow.key} key={flow.key}>
        <div className="hiw-flow-head"><span>{String(index+1).padStart(2,'0')}</span><div><h2>{flow.sectionTitle}</h2><p>{flow.sectionText}</p></div></div>
        <div className="hiw-flow-layout">
          <div className="hiw-step-grid">
            {flow.steps.map(([icon,title,text],stepIndex)=><div className="hiw-step-card" key={title}>
              <span><Icon name={icon} size={23}/></span><h3>{title}</h3><p>{text}</p>
              {stepIndex<flow.steps.length-1&&<i><Icon name="arrow" size={15}/></i>}
            </div>)}
          </div>
          <button className="hiw-visual-card" onClick={()=>navigate(flow.route)}>
            <img src={flow.image} alt={flow.imageTitle}/><div><b>{flow.imageTitle}</b><small>{flow.imageText}</small></div><span><Icon name="arrow" size={15}/></span>
          </button>
        </div>
      </article>)}
    </section>

    <section className="hiw-trust-strip">
      <article><span><Icon name="chat"/></span><div><b>FREE CONSULTATION</b><small>No obligation</small></div></article>
      <article><span><Icon name="receipt"/></span><div><b>TRANSPARENT ESTIMATES</b><small>Compare actual options</small></div></article>
      <article><span><Icon name="people"/></span><div><b>RELEVANT BUSINESSES</b><small>Matched by category & location</small></div></article>
      <article><span><Icon name="support"/></span><div><b>END-TO-END JOURNEY</b><small>From planning to next step</small></div></article>
    </section>

    <section className="hiw-why">
      <div><h2>Why Homeowners<br/>Choose <em>ProPulse</em></h2><p>A customer-first starting point for construction, interiors and real-estate requirements.</p></div>
      <article><span><Icon name="home"/></span><div><b>3</b><small>Core Categories</small></div></article>
      <article><span><Icon name="people"/></span><div><b>Admin</b><small>Managed Flows</small></div></article>
      <article><span><Icon name="pin"/></span><div><b>{cities.length||'City + PIN'}</b><small>{cities.length?'Active Cities':'Location-aware Intake'}</small></div></article>
      <article><span><Icon name="check"/></span><div><b>Free</b><small>Consultation Start</small></div></article>
    </section>

    <section className="hiw-faq">
      <div className="hiw-section-head"><div><h2>Frequently Asked <em>Questions</em></h2><p>Quick answers about the ProPulse customer journey.</p></div><Link to="/contact?audience=users">View All FAQs <Icon name="arrow" size={14}/></Link></div>
      <div className="hiw-faq-grid">
        {(visibleFaqs.length?visibleFaqs:[
          {id:'a',question:'Is the consultation free?',answer:'You can start the public requirement flow without paying a consultation fee.'},
          {id:'b',question:'Are estimates final quotations?',answer:'No. Estimators provide indicative ranges. Final quotations depend on the actual scope and business response.'},
          {id:'c',question:'How are businesses matched?',answer:'Your category, location and requirement details help relevant businesses understand whether they can serve the request.'},
          {id:'d',question:'Do you support documentation?',answer:'The requirement flow keeps your project details structured so the same brief can be understood consistently.'},
        ]).map((item,index)=>{const key=item.id??index;const open=openFaq===key;return <article className={open?'open':''} key={key}><button onClick={()=>setOpenFaq(open?null:key)}><span>{item.question}</span><b>{open?'−':'⌄'}</b></button>{open&&<p>{item.answer}</p>}</article>})}
      </div>
    </section>

    <section className="hiw-cta">
      <img src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=90" alt="Premium villa"/>
      <div><h2>Ready to Start Your Project?</h2><p>Get a free consultation and create a personalized requirement for your project.</p></div>
      <button onClick={()=>navigate('/quote#construction')}>Get Free Consultation <Icon name="arrow" size={15}/></button>
      <div className="hiw-cta-note"><span>○ No Obligation</span><span>○ Guided Requirement</span><span>○ Location Aware</span></div>
    </section>

    <footer className="hiw-footer">
      <div className="hiw-footer-brand"><img src="/brand/propulse-logo.svg" alt="ProPulse"/><p>Your customer starting point for construction, interiors and real-estate requirements.</p><div>f&nbsp;&nbsp;◎&nbsp;&nbsp;▶&nbsp;&nbsp;in</div></div>
      <div><b>Quick Links</b><Link to="/">Home</Link><Link to="/quote#construction">Construction</Link><Link to="/quote#interiors">Interiors</Link><Link to="/packages">Packages</Link><Link to="/quote#property">Real Estate</Link><Link to="/projects">Projects</Link></div>
      <div><b>Our Services</b><Link to="/quote#construction">Home Construction</Link><Link to="/quote#interiors">Interior Design</Link><Link to="/quote#property">Real Estate</Link><Link to="/quote#construction">Construction Quote</Link><Link to="/quote#construction">Free Consultation</Link></div>
      <div><b>Support</b><Link to="/contact?audience=users">FAQ</Link><Link to="/#contact">Contact Us</Link><Link to="/contact?audience=users">Privacy Policy</Link><Link to="/contact?audience=users">Terms & Conditions</Link></div>
      <div><b>Contact Info</b>{phone&&<span><Icon name="phone" size={13}/>{phone}</span>}{email&&<span>{email}</span>}<span><Icon name="pin" size={13}/>Hyderabad, India</span></div>
    </footer>
  </main>
}
