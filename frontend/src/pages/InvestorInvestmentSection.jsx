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

const pageMeta = {
  leads: { kicker:'INVESTED LEADS', title:'Leads generated from your investment', text:'Every lead assigned to your investment is shown here with the same information available in the marketplace, including full customer contact details.' },
  history: { kicker:'INVESTMENT HISTORY', title:'Your investment history', text:'Review every cycle, invested amount, realized revenue, payout and maturity.' },
  payouts: { kicker:'PAYOUTS', title:'Your payout transfers', text:'Track revenue made available for payout and transfers completed by Propulse.' },
}

function ReadOnlyField({ label, value, className='' }) {
  if (!hasValue(value)) return null
  return <div className={`investor-lead-field ${className}`}><span>{label}</span><b>{value}</b></div>
}

function LeadDetails({ item }) {
  const custom = useMemo(() => customDetails(item.custom_fields), [item.custom_fields])
  const location = [item.city_name, item.state_name].filter(hasValue).join(', ')
  return <article className="investor-lead-card">
    <div className="investor-lead-card-head">
      <div>
        <div className="investor-lead-kicker">INVESTED LEAD · #{item.id}</div>
        <h2>{item.name || 'Customer lead'}</h2>
        <p>{[item.industry_name, item.service_name, item.subservice_name].filter(hasValue).join(' · ') || 'Investment opportunity'}</p>
      </div>
      <span className="investor-readonly-badge">READ ONLY</span>
    </div>

    <section className="investor-lead-contact">
      <div className="investor-lead-section-title">CUSTOMER CONTACT</div>
      <div className="investor-lead-contact-grid">
        {hasValue(item.phone) && <div className="investor-contact-item"><span>PHONE</span><a href={contactHref('phone', item.phone)}>{item.phone}</a></div>}
        {hasValue(item.email) && <div className="investor-contact-item"><span>EMAIL</span><a href={contactHref('email', item.email)}>{item.email}</a></div>}
      </div>
    </section>

    <section className="investor-lead-section">
      <div className="investor-lead-section-title">LEAD DETAILS</div>
      <div className="investor-lead-fields">
        <ReadOnlyField label="Industry" value={item.industry_name} />
        <ReadOnlyField label="Service" value={item.service_name} />
        <ReadOnlyField label="Subservice" value={item.subservice_name} />
        <ReadOnlyField label="Location" value={location} />
        <ReadOnlyField label="Pincode" value={item.pincode} />
        <ReadOnlyField label="Budget" value={item.budget} />
        <ReadOnlyField label="Property Type" value={item.property_type} />
        <ReadOnlyField label="Lead Type" value={item.lead_type} />
        <ReadOnlyField label="Buyer Capacity" value={item.buyer_capacity} />
        <ReadOnlyField label="Status" value={item.status} />
        <ReadOnlyField label="Source" value={item.source} />
        <ReadOnlyField label="Created" value={date(item.created_at)} />
        <ReadOnlyField label="Updated" value={date(item.updated_at)} />
        <ReadOnlyField label="Exclusive" value={item.is_exclusive ? `Yes · ${item.exclusive_delay_days || 0} day delay` : 'No'} />
      </div>
    </section>

    {hasValue(item.requirements) && <section className="investor-lead-section"><div className="investor-lead-section-title">REQUIREMENT</div><div className="investor-lead-requirement">{item.requirements}</div></section>}
    {custom.length > 0 && <section className="investor-lead-section"><div className="investor-lead-section-title">ADDITIONAL DETAILS</div><div className="investor-lead-fields">{custom.map(detail => <ReadOnlyField key={detail.key} label={detail.label} value={detail.value} className="investor-lead-field-wide" />)}</div></section>}
    {hasValue(item.notes) && <section className="investor-lead-section"><div className="investor-lead-section-title">NOTES</div><div className="investor-lead-requirement">{item.notes}</div></section>}

    <section className="investor-lead-sales">
      <div><span>PAID SALES</span><b>{item.paid_sale_count || 0}</b></div>
      <div><span>GROSS SALES</span><b>{money(item.gross_sale_amount)}</b></div>
      <div><span>YOUR REVENUE</span><b>{money(item.investor_revenue)}</b></div>
    </section>
  </article>
}

export default function InvestorInvestmentSection({ type }) {
  const [investments,setInvestments]=useState([]),[soldLeads,setSoldLeads]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  useEffect(()=>{let active=true;setLoading(true);setError('');const request=type==='leads'?authRequest('/investments/sold-leads'):authRequest('/investments');request.then(result=>{if(!active)return;if(type==='leads')setSoldLeads(rows(result));else setInvestments(rows(result))}).catch(e=>{if(active)setError(e.message||'Unable to load investor data')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[type])
  const paid=investments.filter(x=>String(x.status).toLowerCase()==='paid'&&Number(x.payout_amount||0)>0&&x.payout_transfer_reference)
  const meta=pageMeta[type]
  return <main className="investor-section-page"><div className="investor-section-shell"><header className="investor-section-head"><div><span>{meta.kicker}</span><h1>{meta.title}</h1><p>{meta.text}</p></div><Link className="investor-section-invest" to="/investment?new=1">＋ New Investment</Link></header>{error&&<div className="investor-section-error">{error}</div>}{loading?<div className="investor-section-card">Loading…</div>:type==='leads'?<section className="investor-section-card"><div className="investor-section-count">{soldLeads.length} INVESTED LEADS</div>{soldLeads.length?<div className="investor-lead-list">{soldLeads.map(item=><LeadDetails item={item} key={item.id}/>)}</div>:<div className="investor-section-empty">No leads have been assigned to your investment yet.</div>}</section>:type==='history'?<section className="investor-section-card"><div className="investor-section-count">{investments.length} CYCLES</div>{investments.length?<div className="investor-detail-list">{investments.map(item=><article className="investor-history-row" key={item.id}><div><strong>{item.industry_name||'Investment cycle'}</strong><span>Cycle #{item.id} · {[item.city_name,item.state_name].filter(Boolean).join(', ')||'Location not set'}</span></div><span className="investor-status">{item.status}</span><div className="investor-history-metrics"><span>INVESTED <b>{money(item.amount)}</b></span><span>GENERATED <b>{money(item.realized_revenue)}</b></span><span>PAYOUT <b>{money(item.payout_amount)}</b></span><span>MATURES <b>{date(item.matures_at)}</b></span></div></article>)}</div>:<div className="investor-section-empty">No investment cycles yet. Start your first cycle with the New Investment button.</div>}</section>:<section className="investor-section-card"><div className="investor-section-count">{paid.length} PAID TRANSFERS</div>{paid.length?<div className="investor-detail-list">{paid.map(item=><article className="investor-payout-row" key={item.id}><div><strong>{item.industry_name||'Investment cycle'}</strong><small>Cycle #{item.id} · {date(item.payout_transferred_at||item.updated_at)}</small></div><div><span>AMOUNT PAID</span><b>{money(item.payout_amount)}</b></div><div><span>TRANSFER / UTR</span><b>{item.payout_transfer_reference}</b></div><div>{item.payout_proof_url?<a href={item.payout_proof_url} target="_blank" rel="noreferrer">View proof ↗</a>:<span className="investor-payout-no-proof">No proof</span>}</div></article>)}</div>:<div className="investor-section-empty">No payout transfers recorded yet. Available revenue will appear here after a payout is processed.</div>}</section>}</div></main>
}
