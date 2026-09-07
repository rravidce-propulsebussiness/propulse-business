import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import { authRequest } from '../utils/auth'
import './PurchasedLeads.css'

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '—'
const norm = value => String(value ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const formatDate = value => { const d = new Date(value || 0); return d.getTime() ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' }
const label = key => String(key).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())
const money = value => { if (!hasValue(value)) return ''; const text = String(value).trim(); if (/₹|rs\.?|inr/i.test(text)) return text; const n = Number(text.replace(/,/g, '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : text }
const flatten = (lead) => ({ ...(lead?.custom_fields && typeof lead.custom_fields === 'object' ? lead.custom_fields : {}), ...(lead?.customFields && typeof lead.customFields === 'object' ? lead.customFields : {}) })
const findField = (fields, exact = [], fuzzy = []) => { const entries = Object.entries(fields).filter(([,v]) => hasValue(v)); const exactSet = exact.map(norm); const hit = entries.find(([k]) => exactSet.includes(norm(k))); if (hit) return String(hit[1]).trim(); const patterns = fuzzy.map(norm); const fuzzyHit = entries.find(([k]) => patterns.some(p => norm(k).includes(p))); return fuzzyHit ? String(fuzzyHit[1]).trim() : '' }
const contactKey = key => /(phone|mobile|whatsapp|email|mail|contact|website|url)/i.test(String(key))
const hiddenKey = key => /(pricing|price|buyer.?capacity|normal|pro)/i.test(String(key))
const phoneDigits = value => {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.length === 10 ? `91${digits}` : digits
}

export default function PurchasedLeads() {
  const [leads,setLeads]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[active,setActive]=useState(null)
  useEffect(()=>{let live=true;authRequest('/leads/purchased').then(data=>{if(!live)return;setLeads(Array.isArray(data)?data:(Array.isArray(data?.items)?data.items:[]))}).catch(e=>{if(live)setError(e.message||'Failed to load your leads')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[])
  const stats=useMemo(()=>({total:leads.length,membership:leads.filter(x=>x.pricing_tier==='membership'||x.payment_method==='membership').length,purchased:leads.filter(x=>x.pricing_tier!=='membership'&&x.payment_method!=='membership').length}),[leads])
  return <div className="purchased-page"><UserHeader/><main className="purchased-main">
    <section className="purchased-hero"><div className="purchased-hero-copy"><div className="purchased-eyebrow"><span className="purchased-eyebrow-dot"/> MY LEADS</div><h1>Your business opportunities.</h1><p>Every lead you have purchased or unlocked through your membership, organized in one premium workspace.</p></div><Link className="purchased-market-btn" to="/leads"><span>+</span> Explore marketplace</Link></section>
    {!loading&&!error&&leads.length>0&&<section className="purchased-stats"><div><span className="stat-icon">◈</span><b>{stats.total}</b><small>Total access</small></div><div><span className="stat-icon">◆</span><b>{stats.purchased}</b><small>Purchased</small></div><div><span className="stat-icon">✦</span><b>{stats.membership}</b><small>Membership</small></div><div className="purchased-stats-note"><span>●</span><div><b>Ready to work</b><small>Your unlocked leads are available below</small></div></div></section>}
    {error&&<div className="purchased-error"><strong>Unable to load your leads</strong><span>{error}</span></div>}
    {loading?<div className="purchased-empty"><div className="purchased-loader"/><strong>Preparing your lead workspace…</strong><p>Loading your unlocked opportunities.</p></div>:!leads.length?<div className="purchased-empty purchased-empty-rich"><div className="empty-orb">✦</div><span>YOUR LEAD WORKSPACE</span><strong>No leads yet</strong><p>Browse the marketplace and purchase or claim a lead included with your membership.</p><Link to="/leads">Browse available leads →</Link></div>:<section className="purchased-grid">{leads.map((lead,index)=>{
      const membership=lead.pricing_tier==='membership'||lead.payment_method==='membership',tier=membership?'MEMBERSHIP':lead.pricing_tier==='pro'?'PRO':'NORMAL',fields=flatten(lead),location=[lead.city_name,lead.state_name].filter(hasValue).join(', '),
      budget=hasValue(lead.budget)?money(lead.budget):findField(fields,['Budget','Budget Range','Project Budget','Project Budget Range','Expected Budget','Approx Budget','Approximate Budget','Investment Budget'],['budget']),
      workNumbers=findField(fields,['Work Number','Work Numbers','Work No','Work Nos','Number Of Works','Number Of Work','No. Of Works','No Of Works','Works','Quantity','Project Quantity','Work Quantity','Number Of Projects'],['worknumber','worknumbers','numberofworks','noofworks','workquantity','projectquantity','numberofprojects','quantity']),
      workPhone=findField(fields,['Work Phone Number','Work Phone','Office Phone Number','Office Phone','Business Phone','Business Phone Number','Alternate Work Phone','Alternate Phone'],['workphone','officephone','businessphone']),
      timeline=findField(fields,['Timeline','Timeframe','Project Timeline','Expected Timeline','How Soon Required','When Required'],['timeline','timeframe','howsoon','required']),
      property=hasValue(lead.property_type)?lead.property_type:findField(fields,['Property Type','Property'],['property']),
      baseEntries=Object.entries(fields).filter(([k,v])=>hasValue(v)&&!hiddenKey(k)),
      dynamic=baseEntries.filter(([k])=>!contactKey(k)),open=active===(lead.access_id||lead.claim_id||lead.lead_id),key=`${lead.lead_id}-${lead.access_id||lead.claim_id||index}`,initial=String(lead.customer_name||lead.service_name||lead.industry_name||'L').trim().charAt(0).toUpperCase(),
      contactPhone=hasValue(lead.customer_phone)?String(lead.customer_phone).trim():workPhone,
      whatsappNumber=phoneDigits(contactPhone),
      whatsappHref=whatsappNumber?`https://wa.me/${whatsappNumber}`:''
      return <article className={`purchased-card ${membership?'membership-card':''}`} key={key}><div className="purchased-card-glow"/><div className="purchased-card-top"><div className="purchased-card-id"><span>LEAD</span><strong>#{String(lead.lead_id).padStart(4,'0')}</strong></div><span className={`purchased-tier ${membership?'free':tier.toLowerCase()}`}>{membership?'✦ ':''}{tier}</span></div>
        <div className="purchased-title-row"><div className="purchased-avatar">{initial}</div><div><h2>{lead.service_name||lead.industry_name||'Business opportunity'}</h2><p>{lead.industry_name||'Verified business opportunity'}</p></div></div>
        <div className="purchased-status"><span><i/> ACCESS ACTIVE</span><small>{membership?'Included with membership':`${tier} purchase`}</small></div>
        <div className="purchased-contact purchased-contact-top"><div className="contact-heading"><span>CONTACT DETAILS</span><small>UNLOCKED</small></div><strong>{lead.customer_name||'Customer details available'}</strong><div className="contact-lines">{contactPhone&&<a href={`tel:${contactPhone}`}>☎ {contactPhone}</a>}{workPhone&&contactPhone!==workPhone&&<a href={`tel:${workPhone}`}>⌕ Work {workPhone}</a>}{lead.customer_email&&<a href={`mailto:${lead.customer_email}`}>✉ {lead.customer_email}</a>}</div><div className="contact-actions">{contactPhone&&<a className="contact-action call" href={`tel:${contactPhone}`}>☎ Call</a>}{whatsappHref&&<a className="contact-action whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">◉ WhatsApp</a>}</div></div>
        {hasValue(lead.requirement)&&<p className="purchased-requirement">{lead.requirement}</p>}
        <div className="purchased-detail-grid">{location&&<div><small>LOCATION</small><strong>⌖ {location}</strong></div>}{property&&<div><small>PROPERTY</small><strong>{property}</strong></div>}{budget&&<div><small>BUDGET</small><strong>{budget}</strong></div>}{workNumbers&&<div><small>WORK NUMBERS</small><strong>{workNumbers}</strong></div>}{timeline&&<div><small>TIMELINE</small><strong>{timeline}</strong></div>}{hasValue(lead.shares)&&<div><small>SHARES</small><strong>{lead.shares} share{Number(lead.shares)===1?'':'s'}</strong></div>}</div>
        {dynamic.length>0&&<div className="purchased-dynamic"><small>ALL LEAD DETAILS</small><div>{dynamic.map(([k,v])=><span key={k}><b>{label(k)}</b>{String(v)}</span>)}</div></div>}
        <div className="purchased-card-footer"><div><small>{membership?'CLAIMED':'PURCHASED'}</small><strong>{formatDate(lead.created_at)}</strong></div>{membership&&lead.expires_at?<div><small>ACCESS EXPIRES</small><strong>{formatDate(lead.expires_at)}</strong></div>:<div><small>ACCESS</small><strong>Full lead</strong></div>}<button onClick={()=>setActive(open?null:(lead.access_id||lead.claim_id||lead.lead_id))}>{open?'Hide access ↑':'View access →'}</button></div>
        {open&&<div className="purchased-expanded"><div><span>LEAD ID</span><strong>#{lead.lead_id}</strong></div><div><span>ACCESS TYPE</span><strong>{tier}</strong></div><div><span>STATUS</span><strong>Active</strong></div><div><span>DETAILS</span><strong>{baseEntries.length} fields available</strong></div></div>}
      </article>})}</section>}
  </main></div>
}
