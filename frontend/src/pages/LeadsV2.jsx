import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getToken, getUser } from '../utils/auth'
import UserHeader from '../components/UserHeader'
import './LeadsV2.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const money = (v) => v === null || v === undefined || v === '' ? '—' : `₹${Number(v).toLocaleString('en-IN')}`
const label = (k) => String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())

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
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState('all')
  const [buying, setBuying] = useState(null)
  const [claiming, setClaiming] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      setLoading(true); setError('')
      try {
        const q = new URLSearchParams({ status: 'available' })
        const r = await fetch(`${API}/leads?${q}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const d = await r.json()
        if (!r.ok) throw Error(d.error || 'Failed to load leads')
        if (live) setLeads(Array.isArray(d) ? d : [])
      } catch (e) { if (live) setError(e.message) }
      finally { if (live) setLoading(false) }
    })()
    return () => { live = false }
  }, [token])

  const filtered = useMemo(() => {
    const categoryText = category ? category.replaceAll('-', ' ').toLowerCase() : ''
    const query = search.trim().toLowerCase()
    return leads.filter((lead) => {
      const text = `${lead.industry_name || ''} ${lead.service_name || ''} ${lead.subservice_name || ''} ${lead.requirement || ''} ${lead.city_name || ''} ${lead.state_name || ''}`.toLowerCase()
      return (!categoryText || text.includes(categoryText)) && (!query || text.includes(query)) && (tier === 'all' || (lead.lead_type || 'basic') === tier)
    })
  }, [leads, category, search, tier])

  const isPro = Boolean(user?.is_pro_member || user?.membership_type === 'pro')
  const claim = async (lead) => {
    if (!logged) { window.location.href = '/login'; return }
    setClaiming(lead.id); setNotice(''); setError('')
    try {
      const r = await fetch(`${API}/leads/${lead.id}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
      const d = await r.json()
      if (!r.ok) throw Error(d.error || 'Claim failed')
      const refreshed = await fetch(`${API}/leads/${lead.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const privateLead = await refreshed.json()
      if (refreshed.ok) setLeads(current => current.map(x => x.id === lead.id ? { ...x, ...privateLead, purchased: true, access: { ...(x.access || {}), claimed: true, canClaim: false, remaining: d.remaining } } : x))
      setNotice(`Lead #${lead.id} claimed successfully.`)
      setExpanded(lead.id)
    } catch (e) { setError(e.message) } finally { setClaiming(null) }
  }

  const buy = async (lead, shares) => {
    if (!logged) { window.location.href = '/login'; return }
    setBuying(`${lead.id}-${shares}`); setNotice(''); setError('')
    try {
      const r = await fetch(`${API}/leads/${lead.id}/purchase`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ shares }) })
      const d = await r.json()
      if (!r.ok) { if (d.code === 'PRO_REQUIRED') { setUpgrade(true); return } throw Error(d.error || 'Purchase failed') }
      const refreshed = await fetch(`${API}/leads/${lead.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const privateLead = await refreshed.json()
      if (refreshed.ok) setLeads(current => current.map(x => x.id === lead.id ? { ...x, ...privateLead, purchased: true, access: { ...(x.access || {}), claimed: true, canClaim: false } } : x))
      setNotice(`Lead #${lead.id} purchased successfully.`)
      setExpanded(lead.id)
    } catch (e) { setError(e.message) } finally { setBuying(null) }
  }

  const proAction = (lead, shares) => {
    if (!isPro) { setUpgrade(true); return }
    buy(lead, shares)
  }

  const title = category ? `${category.replaceAll('-', ' ')} leads` : 'Available leads'

  if (user?.role === 'admin') return <main className="lv2-page"><section className="lv2-empty"><span>ADMIN ACCOUNT</span><h1>Lead management is in the Admin Panel.</h1><Link to="/admin/leads">Open Admin Leads →</Link></section></main>

  return (
    <div className="lv2-shell">
      <UserHeader />
      <main className="lv2-page">
        <section className="lv2-hero"><div className="lv2-hero-copy"><span className="lv2-kicker">PROPULSE MARKETPLACE</span><h1>{title}</h1><p>Real opportunities. Clear pricing. Buy the leads that fit your business.</p><div className="lv2-hero-meta"><span><i /> Live opportunities</span><span>{filtered.length} available now</span></div></div><div className="lv2-hero-side">{logged ? <><span className="lv2-member-label">YOUR ACCESS</span><strong>{isPro ? 'PRO MEMBER' : 'STANDARD MEMBER'}</strong><small>{isPro ? 'Priority access enabled' : 'Standard marketplace access'}</small></> : <><span className="lv2-member-label">READY TO BUY?</span><strong>Sign in to purchase</strong><Link to="/login">Login →</Link></>}</div></section>
        <section className="lv2-toolbar"><div className="lv2-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search industry, service, location..." aria-label="Search leads" /></div><div className="lv2-filters"><button className={tier === 'all' ? 'active' : ''} onClick={() => setTier('all')}>All leads</button><button className={tier === 'basic' ? 'active' : ''} onClick={() => setTier('basic')}>Basic</button><button className={tier === 'premium' ? 'active' : ''} onClick={() => setTier('premium')}>Premium</button></div></section>
        {error && <div className="lv2-error">{error}</div>}{notice && <div className="lv2-error">{notice}</div>}
        {loading ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>Loading opportunities...</strong></div> : !filtered.length ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>No matching leads</strong><p>Try another search or filter.</p></div> : <div className="lv2-grid">
          {filtered.map((lead) => { const shares = lead.pricing?.shares || []; const dynamic = Object.entries(lead.custom_fields || {}); const open = expanded === lead.id; const exclusive = Boolean(lead.has_exclusive_option); const leadAccess = lead.access || {}; const claimed = Boolean(leadAccess.claimed || lead.purchased); return <article className={`lv2-card ${lead.lead_type || 'basic'} ${exclusive ? 'has-exclusive' : ''}`} key={lead.id}>
            <div className="lv2-card-top"><span className={`lv2-tier ${lead.lead_type || 'basic'}`}>{lead.lead_type === 'premium' ? 'PREMIUM' : 'BASIC'}</span>{exclusive && <span className="lv2-exclusive-mini">EXCLUSIVE</span>}<span className="lv2-status"><i /> AVAILABLE</span></div><div className="lv2-id">LEAD #{lead.id}</div><h2>{lead.service_name || lead.industry_name || 'Business opportunity'}</h2><p className="lv2-req">{lead.requirement || 'Requirement details available after selection.'}</p><div className="lv2-location"><span>⌖</span><div><b>{lead.city_name || 'Location available'}</b><small>{lead.state_name || 'India'}</small></div></div><div className="lv2-detail-summary"><span>{lead.industry_name || 'Industry'}</span>{lead.service_name && <span>{lead.service_name}</span>}{lead.subservice_name && <span>{lead.subservice_name}</span>}{lead.property_type && <span>{lead.property_type}</span>}{lead.budget !== null && lead.budget !== undefined && lead.budget !== '' && <span>Budget {money(lead.budget)}</span>}</div>
            <button className="lv2-more" onClick={() => setExpanded(open ? null : lead.id)}><span>{open ? 'Hide lead details' : 'View lead details'}</span><b>{open ? '↑' : '↓'}</b></button>{open && <div className="lv2-details"><div className="lv2-details-head"><h3>Lead details</h3><span>{claimed ? 'Access granted' : 'Verified opportunity'}</span></div><div className="lv2-detail-grid">{[['Industry', lead.industry_name], ['Service', lead.service_name], ['Subservice', lead.subservice_name], ['Location', `${lead.city_name || '—'}, ${lead.state_name || '—'}`], ['Property type', lead.property_type], ['Budget', lead.budget === null || lead.budget === '' ? '—' : money(lead.budget)], ['Source', lead.source], ['Customer', lead.customer_name], ['Phone', lead.customer_phone], ['Email', lead.customer_email]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v || '—'}</b></div>)}{dynamic.map(([k, v]) => <div key={k}><small>{label(k)}</small><b>{typeof v === 'object' ? JSON.stringify(v) : String(v || '—')}</b></div>)}</div>{lead.notes && <p className="lv2-notes"><b>Notes</b>{lead.notes}</p>}</div>}
            {logged && !claimed && leadAccess.canClaim && <div className="lv2-exclusive"><div><b>Membership access</b><span>Included in your current plan{leadAccess.remaining !== undefined ? ` · ${leadAccess.remaining} remaining` : ''}</span></div><button disabled={claiming === lead.id} onClick={() => claim(lead)}>{claiming === lead.id ? 'Claiming…' : 'Claim free →'}</button></div>}
            {logged && !claimed && leadAccess.reason && !leadAccess.canClaim && <div className="lv2-card-cta"><div><b>Membership access</b><span>{leadAccess.reason}</span></div></div>}
            {claimed && <div className="lv2-card-cta"><div><b>Lead access granted</b><span>You can use this lead from your account.</span></div><Link to="/dashboard">Open dashboard →</Link></div>}
            <div className="lv2-pricing"><div className="lv2-price-title"><div><span>LEAD PRICING</span><b>Choose your plan</b></div><span>INR</span></div><div className="lv2-price-head"><span>Shares</span><span>Normal</span><span className="pro-head">Pro</span></div>{[1,3,5].map(n => { const p=shares.find(x=>Number(x.shares)===n)||{}; const key=`${lead.id}-${n}`; return <div className="lv2-price-row" key={n}><strong>{n}</strong><span>{n===1?'Single':`${n} shares`}</span><button disabled={buying===key || claimed} onClick={() => buy(lead,n)}>{claimed?'Claimed':buying===key?'Buying…':money(p.normal)}</button><button disabled={buying===key || claimed} onClick={() => proAction(lead,n)} className="pro-price">{claimed?'Claimed':buying===key?'Buying…':isPro?money(p.pro):'Get Pro'}</button></div> })}</div>
            {exclusive && logged && !claimed && <div className="lv2-exclusive"><div><b>Exclusive access</b><span>{lead.exclusive_action === 'upgrade_to_pro' ? 'Pro members get first access' : 'Available for purchase'}</span></div>{lead.exclusive_action === 'upgrade_to_pro' ? <button onClick={() => setUpgrade(true)}>Get Pro →</button> : <button onClick={() => buy(lead,1)}>Buy →</button>}</div>}{!logged && <div className="lv2-card-cta"><div><b>Interested in this lead?</b><span>Sign in to view purchase options.</span></div><button onClick={() => buy(lead,1)}>Login to buy →</button></div>}
          </article> })}</div>}
        <section className="lv2-bottom-cta"><div><span className="lv2-kicker">GROW WITH PROPULSE</span><h2>Find the right opportunity for your business.</h2><p>Browse, compare and choose leads with transparent Normal and Pro pricing.</p></div>{logged ? <Link to="/dashboard">Go to dashboard →</Link> : <Link to="/signup">Create business account →</Link>}</section>
      </main>
      {upgrade && <div className="lv2-overlay"><div className="lv2-upgrade"><button onClick={() => setUpgrade(false)}>×</button><span>PRO ACCESS</span><h2>Unlock Exclusive access.</h2><p>Pro members get first access during the configured Pro-first period.</p><div><Link to="/dashboard">View Pro options →</Link><button onClick={() => setUpgrade(false)}>Not now</button></div></div></div>}
    </div>
  )
}
