import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicRequest } from '../utils/auth'
import './Pricing.css'

const fallback=[
  {category:'Marketing',name:'Marketing Growth',tagline:'Build visibility. Create demand.',description:'Marketing support for businesses that need stronger reach and a clearer path to enquiries.',price_label:'Custom quote',billing_note:'Scope-based pricing',features:['Digital marketing strategy','Social media & content','SEO and local visibility','Campaign support'],cta_label:'Talk to Sales',cta_url:'/contact',highlighted:false},
  {category:'Lead Sales',name:'Lead Marketplace',tagline:'Buy leads. Reach real opportunities.',description:'Find relevant project enquiries, review available lead information and purchase eligible access through the Propulse marketplace.',price_label:'Pay per lead',billing_note:'Exact price shown before purchase',features:['Location-based lead discovery','Protected customer contact data','Configured lead pricing','Purchased-lead management'],cta_label:'Explore Leads',cta_url:'/leads',highlighted:true},
  {category:'Government Compliance',name:'Government Compliance Support',tagline:'Stay organised for registrations and filings.',description:'Support with compliance documentation, registration workflows and filing coordination. Applicable requirements depend on the authority and your business.',price_label:'Custom quote',billing_note:'Scope and authority dependent',features:['Document preparation support','Registration workflow support','Filing coordination','Compliance status tracking'],cta_label:'Talk to Compliance Team',cta_url:'/contact',highlighted:false}
]

export default function Pricing(){
  const [items,setItems]=useState(fallback)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;publicRequest('/service-pricing').then(data=>{if(!active)return;setItems(Array.isArray(data)&&data.length?data:fallback)}).catch(e=>{if(active)setError(e.message||'Unable to load pricing')}).finally(()=>active&&setLoading(false));return()=>{active=false}},[])
  return <div className="pricing-page">
    <header className="pricing-public-header">
      <Link className="pricing-brand" to="/"><img src="/brand/propulse-logo.png" alt="Propulse"/></Link>
      <nav><Link to="/">Home</Link><Link to="/leads">Buy Leads</Link><a href="#services">Services</a><Link className="active" to="/pricing">Pricing</Link><Link to="/contact">Contact</Link></nav>
      <div className="pricing-actions"><Link className="pricing-login" to="/login">Login</Link><Link className="pricing-start" to="/signup">Get Started <span>→</span></Link></div>
    </header>
    <main>
      <section className="pricing-hero">
        <span>PROPULSE BUSINESS · SERVICES &amp; PRICING</span>
        <h1>Build demand. Buy leads. <em>Stay compliant.</em></h1>
        <p>Propulse brings digital marketing and technology, lead sales, and business compliance support into one clear service marketplace.</p>
        <div className="pricing-hero-points"><span>✓ Transparent options</span><span>✓ Business-ready support</span><span>✓ Admin-managed pricing</span></div>
      </section>
      <section className="pricing-section" id="services">
        <div className="pricing-section-head"><div><span>WHAT YOU CAN BUY</span><h2>Pricing that stays clear as you scale.</h2></div><Link to="/leads">Browse live leads →</Link></div>
        {error&&<div className="pricing-alert">{error}</div>}
        {loading?<div className="pricing-loading">Loading current pricing…</div>:<div className="pricing-grid">{items.filter(item=>item?.is_active!==false).map(item=><article className={item.highlighted?'pricing-card featured':'pricing-card'} key={item.id||item.slug||item.name}>
          {item.highlighted&&<div className="pricing-featured">MOST RELEVANT FOR LEAD BUYERS</div>}
          <div className="pricing-card-image"><img src={item.image_url || 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85'} alt="" /></div>
          <div className="pricing-card-top"><span>{item.category}</span>{item.highlighted&&<b>Featured</b>}</div>
          <h3>{item.name}</h3><strong className="pricing-tagline">{item.tagline}</strong><p>{item.description}</p>
          <div className="price-line"><strong>{item.price_label}</strong><small>{item.billing_note}</small></div>
          <ul>{(Array.isArray(item.features)?item.features:[]).map((feature,i)=><li key={i}><b>✓</b><span>{feature}</span></li>)}</ul>
          <Link className={item.highlighted?'pricing-cta primary':'pricing-cta'} to={item.cta_url||'/contact'}>{item.cta_label||'Get Started'} <span>→</span></Link>
        </article>)}</div>}
      </section>
      <section className="pricing-note"><div><span>IMPORTANT</span><h2>Compliance support is scoped to the applicable requirement.</h2><p>Propulse can support documentation and workflow coordination, but regulatory requirements, fees, approvals and timelines remain dependent on the relevant government authority and your specific case.</p></div><Link to="/contact">Discuss your requirement →</Link></section>
    </main>
    <footer className="pricing-footer"><div><Link to="/"><img src="/brand/propulse-logo.png" alt="Propulse"/></Link><p>Quality Leads. Real Growth.</p></div><div><b>Marketplace</b><Link to="/leads">Buy Leads</Link><Link to="/pricing">Pricing</Link><Link to="/industries">Industries</Link></div><div><b>Company</b><Link to="/contact">Contact</Link><a href="#services">Services</a><Link to="/login">Login</Link></div><span>© {new Date().getFullYear()} Propulse Business</span></footer>
  </div>
}
