import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './HowItWorks.css'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'

const FLOWS=[
  {
    key:'construction',
    label:'Construction',
    subtitle:'Build Your Dream Home',
    route:'/quote#construction',
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
  if(name==='chat')return <svg {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>
  if(name==='arrow')return <svg {...p}><path d="M5 12h14M14 7l5 5-5 5"/></svg>
  if(name==='pin')return <svg {...p}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  if(name==='phone')return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if(name==='check')return <svg {...p}><path d="m5 12 4 4L19 6"/></svg>
  return null
}


export default function HowItWorks(){
  const navigate=useNavigate()
  const [active,setActive]=useState(()=>{
    const hash=typeof window!=='undefined'?window.location.hash.replace('#',''):''
    return FLOWS.some(flow=>flow.key===hash)?hash:'construction'
  })
  const [contactData,setContactData]=useState({})

  useEffect(()=>{
    window.scrollTo(0,0)
    publicRequest('/contact?audience=website')
      .then(value=>setContactData(value||{}))
      .catch(()=>setContactData({}))
  },[])

  function goToFlow(key){
    setActive(key)
    if(typeof window!=='undefined')window.history.replaceState({},'',`/how-it-works#${key}`)
  }

  const activeFlow=FLOWS.find(flow=>flow.key===active)||FLOWS[0]
  const phone=contactData.phone||contactData.phone_number||contactData.mobile||''
  const email=contactData.email||contactData.support_email||''

  return <main className="hiw-page">
    <PublicHeader />
    <section className="premium-page-intro" aria-labelledby="premium-howitworks-title">
      <span className="premium-eyebrow">THE PROPULSE JOURNEY</span>
      <h1 id="premium-howitworks-title">Your vision. A clear way forward.</h1>
      <p>From your first idea to the right professional, take the next step with confidence.</p>
    </section>

    <section className="hiw-tabs">
      {FLOWS.map(flow=><button key={flow.key} className={active===flow.key?'active':''} onClick={()=>goToFlow(flow.key)}><span><Icon name={flow.key==='construction'?'home':flow.key==='interiors'?'sofa':'building'} size={20}/></span><div><b>{flow.label}</b><small>{flow.subtitle}</small></div></button>)}
    </section>

    <section className="hiw-flow-list">
      <article className="hiw-flow hiw-flow-active" id="hiw-active-flow" key={activeFlow.key}>
        <div className="hiw-flow-layout">
          <div className="hiw-step-grid">
            {activeFlow.steps.map(([icon,title,text],stepIndex)=><div className="hiw-step-card" key={title}>
              <span><Icon name={icon} size={23}/></span><h3>{title}</h3><p>{text}</p>
              {stepIndex<activeFlow.steps.length-1&&<i><Icon name="arrow" size={15}/></i>}
            </div>)}
          </div>
          <button className="hiw-visual-card" onClick={()=>navigate(activeFlow.route)}>
            <img src={activeFlow.image} alt={activeFlow.imageTitle}/><div><b>{activeFlow.imageTitle}</b><small>{activeFlow.imageText}</small></div><span><Icon name="arrow" size={15}/></span>
          </button>
        </div>
      </article>
    </section>

    <section className="hiw-trust-strip">
      <article><span><Icon name="chat"/></span><div><b>FREE CONSULTATION</b><small>No obligation</small></div></article>
      <article><span><Icon name="receipt"/></span><div><b>TRANSPARENT ESTIMATES</b><small>Compare actual options</small></div></article>
      <article><span><Icon name="people"/></span><div><b>RELEVANT BUSINESSES</b><small>Matched by category & location</small></div></article>
      <article><span><Icon name="support"/></span><div><b>END-TO-END JOURNEY</b><small>From planning to next step</small></div></article>
    </section>

    <PublicFooter phone={phone} email={email} />
  </main>
}
