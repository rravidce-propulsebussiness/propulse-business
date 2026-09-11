import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { authRequest } from '../utils/auth'
import '../components/InvestorPayoutTransfers.css'
import './InvestorInvestmentSection.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const date = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
const rows = value => Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : Array.isArray(value?.rows) ? value.rows : []
const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '—'
const prettyLabel = key => String(key || '').replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').replace(/\b\w/g, x => x.toUpperCase())
const stringify = value => {
  if (value === null || value === undefined || value === '') return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return Object.entries(value).map(([k,v]) => `${prettyLabel(k)}: ${stringify(v)}`).join(' · ')
  return String(value)
}
const hiddenCustomKeys = new Set(['pricing','leadPricing','leadPrice','price','exclusivePricing','exclusivePrice','buyerCapacity'])
const customDetails = fields => Object.entries(fields || {}).filter(([key,value]) => !hiddenCustomKeys.has(key) && hasValue(value)).map(([key,value]) => ({ key, label:prettyLabel(key), value:stringify(value) }))
const contactHref = (kind, value) => kind === 'phone' ? `tel:${String(value).replace(/[^+\d]/g,'')}` : `mailto:${String(value).trim()}`

// Buyer capacity is the source of truth: it is the maximum number of buyers that may purchase the lead.
const buyerCapacity = item => Math.max(1, Number(item.buyer_capacity ?? 1))
const buyerCount = item => Math.max(0, Number(item.purchased_buyer_count ?? item.paid_sale_count ?? 0))
const remainingCapacity = item => Math.max(0, buyerCapacity(item) - buyerCount(item))
const isSold = item => buyerCount(item) >= buyerCapacity(item)

const pageMeta = {
  leads: { kicker:'AVAILABLE LEADS', title:'Leads from your investment', text:'Open any assigned lead to view the complete marketplace information. All details are read-only.' },
  sold: { kicker:'SOLD LEADS', title:'Sold leads', text:'Leads that have reached their full buyer capacity are moved here automatically.' },
  history: { kicker:'INVESTMENT HISTORY', title:'Your investment history', text:'Review every cycle, invested amount, realized revenue, payout and maturity.' },
  payouts: { kicker:'PAYOUTS', title:'Your payout transfers', text:'Track revenue made available for payout and transfers completed by Propulse.' },
}

function ReadOnlyField({ label, value, className='' }) {
  if (!hasValue(value)) return null
  return <div className={`investor-lead-field ${className}`}><span>{label}</span><b>{value}</b></div>
}

function LeadDetails({ item, sold }) {
  const [open,setOpen] = useState(false)
  const custom = useMemo(() => customDetails(item.custom_fields), [item.custom_fields])
  const location = [item.city_name, item.state_name].filter(hasValue).join(', ')
  const capacity = buyerCapacity(item)
  const purchased = Math.min(capacity, buyerCount(item))
  const remaining = remainingCapacity(item)
  return <article className={`investor-lead-card ${open ? 'is-open' : ''}`}>
    <div className="investor-lead-summary">
      <div className="investor-lead-summary-main">
        <div className="investor-lead-kicker">{sold ? 'SOLD LEAD' : 'AVAILABLE LEAD'} · #{item.id}</div>
        <h2>{item.name || 'Customer lead'}</h2>
        <p>{[item.industry_name, item.service_name, item.subservice_name].filter(hasValue).join(' · ') || 'Investment opportunity'}</p>
        <div className="investor-lead-summary-contacts">
          {hasValue(item.phone) && <a href={contactHref('phone',item.phone)} onClick={e=>e.stopPropagation()}>☎ {item.phone}</a>}
          {hasValue(item.email) && <a href={contactHref('email',item.email)} onClick={e=>e.stopPropagation()}>✉ {item.email}</a>}
        </div>
      </div>
      <div className="investor-lead-summary-side">
        <span className={`investor-sale-badge ${sold ? 'sold' : ''}`}>{sold ? 'SOLD' : 'AVAILABLE'}</span>
        <div className="investor-share-count"><b>{purchased}/{capacity}</b><span>BUYERS</span></div>
        <small>{sold ? 'Buyer capacity reached' : `${remaining} buyer${remaining === 1 ? '' : 's'} still available`}</small>
        <button type="button" className="investor-lead-open" onClick={()=>setOpen(value=>!value)}>{open ? 'Hide details ↑' : 'View full details →'}</button>
      </div>
    </div>

    {open && <div className="investor-lead-expanded">
      <div className="investor-readonly-strip">READ ONLY · INVESTOR VIEW · CUSTOMER CONTACT DETAILS ARE AVAILABLE</div>
      <section className="investor-lead-contact">
        <div className="investor-lead-section-title">CUSTOMER CONTACT</div>
        <div className="investor-lead-contact-grid">
          {hasValue(item.phone) && <div className="investor-contact-item"><span>PHONE</span><a href={contactHref('phone',item.phone)}>{item.phone}</a></div>}
          {hasValue(item.email) && <div className="investor-contact-item"><span>EMAIL</span><a href={contactHref('email',item.email)}>{item.email}</a></div>}
        </div>
      </section>
      <section className="investor-lead-section">
        <div className="investor-lead-section-title">LEAD DETAILS</div>
        <div className="investor-lead-fields">
          <ReadOnlyField label="Industry" value={item.industry_name}/><ReadOnlyField label="Service" value={item.service_name}/><ReadOnlyField label="Subservice" value={item.subservice_name}/>
          <ReadOnlyField label="Location" value={location}/><ReadOnlyField label="Pincode" value={item.pincode}/><ReadOnlyField label="Budget" value={item.budget}/>
          <ReadOnlyField label="Property Type" value={item.property_type}/><ReadOnlyField label="Lead Type" value={item.lead_type}/><ReadOnlyField label="Buyer Capacity" value={capacity}/>
          <ReadOnlyField label="Status" value={item.status}/><ReadOnlyField label="Source" value={item.source}/><ReadOnlyField label="Created" value={date(item.created_at)}/>
          <ReadOnlyField label="Updated" value={date(item.updated_at)}/><ReadOnlyField label="Exclusive" value={item.is_exclusive ? `Yes · ${item.exclusive_delay_days || 0} day delay` : 'No'}/>
        </div>
      </section>
      {hasValue(item.requirements) && <section className="investor-lead-section"><div className="investor-lead-section-title">REQUIREMENT</div><div className="investor-lead-requirement">{item.requirements}</div></section>}
      {custom.length > 0 && <section className="investor-lead-section"><div className="investor-lead-section-title">ADDITIONAL DETAILS</div><div className="investor-lead-fields">{custom.map(detail=><ReadOnlyField key={detail.key} label={detail.label} value={detail.value}/>)}</div></section>}
      {hasValue(item.notes) && <section className="investor-lead-section"><div className="investor-lead-section-title">NOTES</div><div className="investor-lead-requirement">{item.notes}</div></section>}
      <section className="investor-lead-sales">
        <div><span>PURCHASED BY</span><b>{purchased} / {capacity}</b></div><div><span>BUYERS REMAINING</span><b>{remaining}</b></div><div><span>GROSS SALES</span><b>{money(item.gross_sale_amount)}</b></div><div><span>YOUR REVENUE</span><b>{money(item.investor_revenue)}</b></div>
      </section>
    </div>}
  </article>
}

export default function InvestorInvestmentSection({ type }) {
  const [investments,setInvestments]=useState([]),[leads,setLeads]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{let active=true;setLoading(true);setError('');const endpoint=type==='leads'?'/investments/assigned-leads':type==='sold'?'/investments/sold-leads':'/investments';authRequest(endpoint).then(result=>{if(!active)return;if(type==='leads'||type==='sold')setLeads(rows(result));else setInvestments(rows(result))}).catch(e=>{if(active)setError(e.message||'Unable to load investor data')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[type])
  const available=leads.filter(item=>!isSold(item))
  const sold=leads.filter(isSold)
  const visibleLeads=type==='leads'?available:sold
  const paid=investments.filter(x=>String(x.status).toLowerCase()==='paid'&&Number(x.payout_amount||0)>0&&x.payout_transfer_reference)
  const meta=pageMeta[type]
  return <main className="investor-section-page"><div className="investor-section-shell"><header className="investor-section-head"><div><span>{meta.kicker}</span><h1>{meta.title}</h1><p>{meta.text}</p></div><Link className="investor-section-invest" to="/investment?new=1">＋ New Investment</Link></header>
    {error&&<div className="investor-section-error">{error}</div>}
    {type==='leads'||type==='sold'?<>
      <section className="investor-lead-stats"><div><strong>{available.length}</strong><span>AVAILABLE TOTAL LEADS</span></div><div><strong>{sold.length}</strong><span>SOLD LEADS</span></div><div><strong>{leads.length}</strong><span>TOTAL ASSIGNED</span></div></section>
      {loading?<div className="investor-section-card">Loading…</div>:<section className="investor-section-card"><div className="investor-section-count">{visibleLeads.length} {type==='leads'?'AVAILABLE':'SOLD'}</div>{visibleLeads.length?<div className="investor-lead-list">{visibleLeads.map(item=><LeadDetails item={item} sold={type==='sold'} key={item.id}/>)}</div>:<div className="investor-section-empty">{type==='leads'?'No available leads are currently assigned to your investment.':'No sold leads yet. A lead moves here automatically when buyer capacity is reached.'}</div>}</section>}
    </>:loading?<div className="investor-section-card">Loading…</div>:type==='history'?<section className="investor-section-card"><div className="investor-section-count">{investments.length} CYCLES</div>{investments.length?<div className="investor-detail-list">{investments.map(item=><article className="investor-history-row" key={item.id}><div><strong>{item.industry_name||'Investment cycle'}</strong><span>Cycle #{item.id} · {[item.city_name,item.state_name].filter(Boolean).join(', ')||'Location not set'}</span></div><span className="investor-status">{item.status}</span><div className="investor-history-metrics"><span>INVESTED <b>{money(item.amount)}</b></span><span>GENERATED <b>{money(item.realized_revenue)}</b></span><span>PAYOUT <b>{money(item.payout_amount)}</b></span><span>MATURES <b>{date(item.matures_at)}</b></span></div></article>)}</div>:<div className="investor-section-empty">No investment cycles yet. Start your first cycle with the New Investment button.</div>}</section>:<section className="investor-section-card"><div className="investor-section-count">{paid.length} PAID TRANSFERS</div>{paid.length?<div className="investor-detail-list">{paid.map(item=><article className="investor-payout-row" key={item.id}><div><strong>{item.industry_name||'Investment cycle'}</strong><small>Cycle #{item.id} · {date(item.payout_transferred_at||item.updated_at)}</small></div><div><span>AMOUNT PAID</span><b>{money(item.payout_amount)}</b></div><div><span>TRANSFER / UTR</span><b>{item.payout_transfer_reference}</b></div><div>{item.payout_proof_url?<a href={item.payout_proof_url} target="_blank" rel="noreferrer">View proof ↗</a>:<span className="investor-payout-no-proof">No proof</span>}</div></article>)}</div>:<div className="investor-section-empty">No payout transfers recorded yet. Available revenue will appear here after a payout is processed.</div>}</section>}
  </div></main>
}
