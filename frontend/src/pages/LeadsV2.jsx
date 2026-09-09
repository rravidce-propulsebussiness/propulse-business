import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { authRequest, getToken, getUser } from '../utils/auth'
import { claimLead, getLead, listLeads, purchaseLead } from '../api/leads'
import LeadPurchaseModal from './LeadPurchaseModal'
import UserHeader from '../components/UserHeader'
import './LeadsV2.css'
import './LeadsV2Payment.css'

const money = (v) => {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return ''
  return `₹${Number(v).toLocaleString('en-IN')}`
}
const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '—'
const norm = (v) => String(v ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const label = (k) => String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())
const isContactKey = (k) => /(phone|mobile|whatsapp|contact|email|mail|tel|telephone|alternate|website|url|social|instagram|facebook|linkedin|address|pincode|zipcode|postal)/i.test(String(k || ''))
const isPricingField = (k) => /^(normal|pro)\d+(share|shares)(price)?$/.test(norm(k)) || ['pricing', 'leadpricing', 'leadprice', 'price'].includes(norm(k))
const isCanonicalField = (k) => {
  const n = norm(k)
  return [
    'requirement', 'requirements', 'requirementdetails', 'sharemoredetailsandrequirement',
    'location', 'city', 'state', 'budget', 'budgetrange', 'projectbudget', 'projectbudgetrange', 'budgetfromto', 'expectedbudget',
    'propertytype', 'property', 'interiortype', 'typeofproperty',
    'timeline', 'timeframe', 'projecttimeline', 'expectedtimeline', 'planningdate', 'howsoonrequired', 'when',
    'worknumbers', 'worknumber', 'numberofworks', 'numberofwork', 'noofworks', 'works', 'quantity', 'projectquantity', 'numberofprojects', 'projectcount',
    'buyercapacity', 'customerphone', 'customeremail'
  ].includes(n) || n.includes('requirement') || n.includes('budget') || n.includes('workphone') || n.includes('officephone') || n.includes('businessphone')
}
const maskContact = (value) => {
  if (!hasValue(value)) return ''
  let text = String(value)
  text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, 'xxxx@xxxx.com')
  text = text.replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, match => {
    const digits = match.replace(/\D/g, '')
    if (digits.length < 8) return 'xxxx'
    const tail = digits.length >= 10 ? 2 : 1
    return `${digits.slice(0, 2)}${'x'.repeat(Math.max(4, digits.length - 2 - tail))}${digits.slice(-tail)}`
  })
  return text.replace(/https?:\/\/\S+|www\.\S+/gi, 'xxxx')
}
const displayValue = (key, value) => isContactKey(key) ? maskContact(value) : maskContact(value)
const visibleCustomFields = (fields) => Object.entries(fields || {}).filter(([k, v]) => !isPricingField(k) && !isCanonicalField(k) && hasValue(v))
const getCustom = (fields, names, contains = []) => {
  const entries = Object.entries(fields || {}).filter(([, value]) => hasValue(value))
  const wanted = names.map(norm)
  const exact = entries.find(([key]) => wanted.includes(norm(key)))
  if (exact) return displayValue(exact[0], exact[1])
  const patterns = contains.map(norm).filter(Boolean)
  const fuzzy = entries.find(([key]) => patterns.some(pattern => norm(key).includes(pattern)))
  return fuzzy ? displayValue(fuzzy[0], fuzzy[1]) : ''
}
const timeAgo = (value) => {
  const time = new Date(value || 0).getTime()
  if (!time) return ''
  const diff = Math.max(0, Date.now() - time)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function LeadsV2() {
  const [params] = useSearchParams()
  const category = params.get('category')
  const user = getUser()
  const token = getToken()
  const logged = Boolean(token && user)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [buyModal, setBuyModal] = useState(null)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, hasNext: false, hasPrevious: false })
  const [claiming, setClaiming] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => { setPage(1) }, [search, tier, category])
  useEffect(() => {
    let live = true
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const terms = [category?.replaceAll('-', ' '), search.trim()].filter(Boolean).join(' ')
        const d = await listLeads({ status: 'available', page, limit: 20, ...(tier !== 'all' ? { leadType: tier } : {}), ...(terms ? { search: terms } : {}) }, token)
        if (live) {
          const items = Array.isArray(d) ? d : (d.items || [])
          const marketplaceItems = items.filter(l => !l.is_purchased && !l.purchased && !l.access?.claimed && !l.access?.purchased)
          setLeads(marketplaceItems)
          setPagination(d.pagination ? { ...d.pagination, total: Math.max(0, Number(d.pagination.total || 0) - (items.length - marketplaceItems.length)) } : { page, limit: 20, total: marketplaceItems.length, hasNext: false, hasPrevious: page > 1 })
        }
      } catch (e) { if (live) setError(e.message) }
      finally { if (live) setLoading(false) }
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [token, page, search, tier, category])

  const isPro = Boolean(user?.is_pro_member || user?.membership_type === 'pro')
  const buyModalClaimed = Boolean(buyModal?.access?.claimed || buyModal?.access?.purchased)
  const title = category ? `${category.replaceAll('-', ' ')} leads` : 'Available Leads'
  const topIndustry = useMemo(() => leads.find(l => hasValue(l.industry_name))?.industry_name || '', [leads])
  const topLocation = useMemo(() => {
    const lead = leads.find(l => hasValue(l.state_name) || hasValue(l.city_name))
    return [lead?.city_name, lead?.state_name].filter(hasValue).join(', ')
  }, [leads])

  const openBuyModal = (lead) => {
    if (!logged) { window.location.href = '/login'; return }
    if (!lead.pricing?.shares?.length) { setError('Pricing is not available for this lead.'); return }
    setError(''); setNotice(''); setBuyModal(lead)
  }
  const claim = async (lead) => {
    if (!logged) { window.location.href = '/login'; return }
    setClaiming(lead.id); setNotice(''); setError('')
    try {
      await claimLead(lead.id)
      await getLead(lead.id)
      setLeads(current => current.filter(x => x.id !== lead.id))
      setNotice(`Lead #${lead.id} claimed successfully.`); setExpanded(null)
    } catch (e) { setError(e.message) }
    finally { setClaiming(null) }
  }
  const handlePurchased = async (_, leadId) => {
    try { await getLead(leadId) } catch {}
    setLeads(current => current.map(x => x.id === leadId ? {...x, purchase_status:'pending_payment', pending_payment:true} : x))
    setNotice(`Lead #${leadId} is pending approval. It will move to your purchased leads after payment approval.`)
    setExpanded(null)
  }

  if (user?.role === 'admin') return <main className="lv2-page"><section className="lv2-empty"><span>ADMIN ACCOUNT</span><h1>Lead management is in the Admin Panel.</h1><Link to="/admin/leads">Open Admin Leads →</Link></section></main>

  return <div className="lv2-shell">
    <UserHeader />
    <main className="lv2-page">
      <section className="lv2-market-head"><div className="lv2-title-block"><span></span><div><h1>{title}</h1><p>High quality, verified leads to grow your business</p></div></div><div className="lv2-controls"><div className="lv2-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by industry, service, location..." aria-label="Search leads"/><b>⌕</b></div><button className="lv2-filter-button" onClick={() => setTier(tier === 'all' ? 'premium' : tier === 'premium' ? 'basic' : 'all')}><span>☷</span> Filters</button><div className="lv2-sort"><small>Sort by</small><strong>Newest</strong><span>⌄</span></div></div></section>
      <section className="lv2-stats"><div className="lv2-stat orange"><span>▣</span><div><b>{pagination.total}</b><small>Total Leads</small></div></div><div className="lv2-stat blue"><span>♟</span><div><b>{topIndustry || 'Verified opportunities'}</b><small>Top Industry</small></div></div><div className="lv2-stat green"><span>●</span><div><b>{topLocation || 'India'}</b><small>Top Location</small></div></div><div className="lv2-stat purple"><span>★</span><div><b>4.8</b><small>Avg. Quality Score</small></div></div><div className="lv2-verified">✓ &nbsp; Verified Opportunities Only</div></section>
      {error && <div className="lv2-error">{error}</div>}{notice && <div className="lv2-error">{notice}</div>}
      {loading ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>Loading opportunities...</strong></div> : !leads.length ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>No matching leads</strong><p>Try another search or filter.</p></div> : <div className="lv2-grid">
        {leads.map(lead => {
          const shares = lead.pricing?.shares || []
          const dynamic = visibleCustomFields(lead.custom_fields)
          const open = expanded === lead.id
          const exclusive = Boolean(lead.has_exclusive_option)
          const leadAccess = lead.access || {}
          const claimed = Boolean(leadAccess.claimed || leadAccess.purchased)
          const pendingApproval = lead.purchase_status === 'pending_payment' || lead.pending_payment === true
          const location = [lead.city_name, lead.state_name].filter(hasValue).join(', ')
          const timeline = getCustom(lead.custom_fields, ['Timeline', 'Timeframe', 'Project Timeline', 'Expected Timeline', 'When'], ['timeline', 'timeframe'])
          const property = hasValue(lead.property_type) ? lead.property_type : getCustom(lead.custom_fields, ['Property Type', 'Property'], ['property'])
          const workNumbers = getCustom(lead.custom_fields, ['Work Numbers', 'Work Number', 'Number of Works', 'Number of Work', 'No. of Works', 'No of Works', 'Works', 'Quantity', 'Project Quantity'], ['worknumber', 'worknumbers', 'numberofworks', 'noofworks', 'quantity', 'projectquantity'])
          const workPhone = getCustom(lead.custom_fields, ['Work Phone Number', 'Work Phone', 'Office Phone Number', 'Office Phone', 'Business Phone', 'Business Phone Number', 'Alternate Work Phone', 'Alternate Phone'], ['workphone', 'officephone', 'businessphone'])
          const budgetRange = getCustom(lead.custom_fields, ['Budget', 'Budget Range', 'Project Budget', 'Project Budget Range', 'Budget From To', 'Expected Budget'], ['budget'])
          const budgetDisplay = budgetRange || (hasValue(lead.budget) ? money(lead.budget) : '')
          const buyerCapacity = Math.max(2, Number(lead.buyer_capacity) || 3)
          const purchasedBuyers = Math.min(buyerCapacity, Math.max(0, Number(lead.purchased_buyer_count) || 0))
          const initials = String(lead.customer_name || lead.service_name || lead.industry_name || 'L').trim().charAt(0).toUpperCase()
          return <article className={`lv2-card ${lead.lead_type || 'basic'} ${exclusive ? 'has-exclusive' : ''} ${pendingApproval ? 'pending-approval' : ''}`} key={lead.id}>
            <div className="lv2-card-top"><span className={pendingApproval ? 'lv2-pending-badge' : 'lv2-new'}>{pendingApproval ? 'Pending approval' : 'New'}</span><span className="lv2-id">#L-{String(lead.id).padStart(6, '0')}</span><small>{timeAgo(lead.created_at)}</small></div>
            <div className="lv2-person"><div className="lv2-avatar">{initials}</div><div className="lv2-person-copy"><div><h2>{hasValue(lead.customer_name) ? lead.customer_name : (lead.service_name || lead.industry_name || 'Business opportunity')}</h2><span className="lv2-verified-mini">✓ Verified</span></div><p>{lead.requirement || 'Verified business requirement'}</p></div></div>
            <div className="lv2-facts">
              {hasValue(lead.industry_name) && <div><span>▣</span><b>{lead.industry_name}</b></div>}
              {hasValue(lead.service_name) && <div><span>⌁</span><b>{lead.service_name}{hasValue(lead.subservice_name) ? `, ${lead.subservice_name}` : ''}</b></div>}
              {hasValue(location) && <div><span>⌖</span><b>{location}</b></div>}
              {hasValue(budgetDisplay) && <div><span>₹</span><b>{budgetDisplay}</b></div>}
              {hasValue(workNumbers) && <div><span>▦</span><b>{workNumbers} work{norm(workNumbers) === '1' ? '' : 's'}</b></div>}
              {hasValue(property) && <div><span>⌂</span><b>{property}</b></div>}
              {hasValue(timeline) && <div><span>▦</span><b>{timeline}</b></div>}
              <div><span>◉</span><b>Purchased {purchasedBuyers}/{buyerCapacity}</b></div>
            </div>
            <div className="lv2-contact"><span>Contact Details (Masked)</span><div>{hasValue(lead.customer_phone) && <b>⌕ &nbsp; {maskContact(lead.customer_phone)}</b>}{hasValue(workPhone) && <b>⌖ &nbsp; Work {workPhone}</b>}{hasValue(lead.customer_email) && <b>✉ &nbsp; {maskContact(lead.customer_email)}</b>}{!hasValue(lead.customer_phone) && !hasValue(workPhone) && !hasValue(lead.customer_email) && <b>Contact available after purchase</b>}</div></div>
            <div className="lv2-card-actions"><button className="lv2-details-link" onClick={() => setExpanded(open ? null : lead.id)}>{open ? 'Hide Full Details' : 'View Full Details'} <b>→</b></button><button className="lv2-buy" onClick={() => openBuyModal(lead)} disabled={!shares.length || pendingApproval}>{pendingApproval ? 'Pending Approval' : (claimed ? 'Purchased' : '🛒  Buy Lead')}</button></div>
            {open && <div className="lv2-details"><div className="lv2-details-head"><h3>Lead details</h3><span>{pendingApproval ? 'Purchase pending approval' : (claimed ? 'Access granted' : 'Verified opportunity')}</span></div><div className="lv2-detail-grid">{[['Industry', lead.industry_name], ['Service', lead.service_name], ['Subservice', lead.subservice_name], ['Location', location], ['Property type', property], ['Budget', budgetDisplay], ['Work numbers', workNumbers], ['Work phone', workPhone], ['Purchased', `${purchasedBuyers}/${buyerCapacity}`], ['Source', lead.source], ['Customer', lead.customer_name], ['Phone', lead.customer_phone ? maskContact(lead.customer_phone) : ''], ['Email', lead.customer_email ? maskContact(lead.customer_email) : '']].filter(([, v]) => hasValue(v)).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}{dynamic.map(([k, v]) => <div key={k}><small>{label(k)}</small><b>{displayValue(k, typeof v === 'object' ? JSON.stringify(v) : v)}</b></div>)}</div>{hasValue(lead.notes) && <p className="lv2-notes"><b>Notes</b>{maskContact(lead.notes)}</p>}</div>}
            {pendingApproval && <div className="lv2-card-cta pending-approval-cta"><div><b>Payment submitted</b><span>Your lead purchase is waiting for admin payment approval.</span></div><span>Pending approval</span></div>}
            {logged && !claimed && !pendingApproval && leadAccess.canClaim && <div className="lv2-exclusive"><div><b>Membership access</b><span>Included in your current plan{leadAccess.remaining !== undefined ? ` · ${leadAccess.remaining} remaining` : ''}</span></div><button disabled={claiming === lead.id} onClick={() => claim(lead)}>{claiming === lead.id ? 'Claiming…' : 'Claim free →'}</button></div>}
            {logged && !claimed && !pendingApproval && leadAccess.reason && !leadAccess.canClaim && <div className="lv2-card-cta"><div><b>Membership access</b><span>{leadAccess.reason}</span></div></div>}
            {claimed && <div className="lv2-card-cta"><div><b>Lead access granted</b><span>You can use this lead from your account.</span></div><Link to="/dashboard">Open dashboard →</Link></div>}
            {exclusive && logged && !claimed && !pendingApproval && <div className="lv2-exclusive"><div><b>Exclusive access</b><span>{lead.exclusive_action === 'upgrade_to_pro' ? 'Pro members get first access' : 'Available for purchase'}</span></div>{lead.exclusive_action === 'upgrade_to_pro' ? <button onClick={() => setUpgrade(true)}>Get Pro →</button> : <button onClick={() => openBuyModal(lead)}>Buy →</button>}</div>}
            {!logged && <div className="lv2-card-cta"><div><b>Interested in this lead?</b><span>Sign in to view purchase options.</span></div><button onClick={() => openBuyModal(lead)}>Login to buy →</button></div>}
          </article>
        })}
      </div>}
      {!loading && (pagination.hasPrevious || pagination.hasNext) && <div className="lv2-pagination"><button disabled={!pagination.hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button><span>Page {pagination.page} · {pagination.total} leads</span><button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button></div>}
      <section className="lv2-bottom-cta"><div><span className="lv2-kicker">GROW WITH PROPULSE</span><h2>Find the right opportunity for your business.</h2><p>Browse, compare and choose leads with transparent pricing.</p></div>{logged ? <Link to="/dashboard">Go to dashboard →</Link> : <Link to="/signup">Create business account →</Link>}</section>
    </main>
    {buyModal && !buyModalClaimed && <LeadPurchaseModal lead={buyModal} isPro={isPro} onClose={() => setBuyModal(null)} onPurchased={handlePurchased} onUpgrade={() => setUpgrade(true)} />}
    {upgrade && <div className="lv2-overlay"><div className="lv2-upgrade"><button onClick={() => setUpgrade(false)}>×</button><span>PRO ACCESS</span><h2>Unlock Exclusive access.</h2><p>Pro members get first access during the configured Pro-first period.</p><div><Link to="/dashboard">View Pro options →</Link><button onClick={() => setUpgrade(false)}>Not now</button></div></div></div>}
  </div>
}