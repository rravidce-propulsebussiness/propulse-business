import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { authRequest, getToken, getUser } from '../utils/auth'
import { claimLead, getLead, listLeads, purchaseLead } from '../api/leads'
import UserHeader from '../components/UserHeader'
import './LeadsV2.css'

const money = (v) => {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return ''
  return `₹${Number(v).toLocaleString('en-IN')}`
}
const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim() !== '—'
const norm = (v) => String(v ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const label = (k) => String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())
const isContactKey = (k) => /(phone|mobile|whatsapp|contact|email|mail|tel|telephone|alternate|website|url|social|instagram|facebook|linkedin|address|pincode|zipcode|postal)/i.test(String(k || ''))
const isPricingField = (k) => /^(normal|pro)\d+(share|shares)(price)?$/.test(norm(k)) || ['pricing', 'leadpricing', 'leadprice', 'price'].includes(norm(k))
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
const visibleCustomFields = (fields) => Object.entries(fields || {}).filter(([k, v]) => !isPricingField(k) && hasValue(v))
const getCustom = (fields, names) => {
  const wanted = names.map(norm)
  const found = Object.entries(fields || {}).find(([key, value]) => wanted.includes(norm(key)) && hasValue(value))
  return found ? displayValue(found[0], found[1]) : ''
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
  const [buying, setBuying] = useState(null)
  const [claiming, setClaiming] = useState(null)
  const [notice, setNotice] = useState('')
  const [payment, setPayment] = useState(null)
  const [paymentLead, setPaymentLead] = useState(null)
  const [paymentShares, setPaymentShares] = useState(0)
  const [directSubmitting, setDirectSubmitting] = useState(false)

  useEffect(() => { setPage(1) }, [search, tier, category])
  useEffect(() => {
    let live = true
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const terms = [category?.replaceAll('-', ' '), search.trim()].filter(Boolean).join(' ')
        const d = await listLeads({ status: 'available', page, limit: 20, ...(tier !== 'all' ? { leadType: tier } : {}), ...(terms ? { search: terms } : {}) }, token)
        if (live) {
          setLeads(Array.isArray(d) ? d : (d.items || []))
          setPagination(d.pagination || { page, limit: 20, total: Array.isArray(d) ? d.length : d.items?.length || 0, hasNext: false, hasPrevious: page > 1 })
        }
      } catch (e) { if (live) setError(e.message) }
      finally { if (live) setLoading(false) }
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [token, page, search, tier, category])

  const isPro = Boolean(user?.is_pro_member || user?.membership_type === 'pro')
  const title = category ? `${category.replaceAll('-', ' ')} leads` : 'Available Leads'
  const topIndustry = useMemo(() => leads.find(l => hasValue(l.industry_name))?.industry_name || '', [leads])
  const topLocation = useMemo(() => {
    const lead = leads.find(l => hasValue(l.state_name) || hasValue(l.city_name))
    return [lead?.city_name, lead?.state_name].filter(hasValue).join(', ')
  }, [leads])

  const openBuyModal = (lead) => {
    if (!logged) { window.location.href = '/login'; return }
    if (!lead.pricing?.shares?.length) {
      setError('Pricing is not available for this lead.')
      return
    }
    setError('')
    setNotice('')
    setBuyModal(lead)
  }

  const claim = async (lead) => {
    if (!logged) { window.location.href = '/login'; return }
    setClaiming(lead.id); setNotice(''); setError('')
    try {
      const d = await claimLead(lead.id)
      const privateLead = await getLead(lead.id)
      setLeads(current => current.map(x => x.id === lead.id ? { ...x, ...privateLead, purchased: true, access: { ...(x.access || {}), claimed: true, canClaim: false, remaining: d.remaining } } : x))
      setNotice(`Lead #${lead.id} claimed successfully.`); setExpanded(lead.id)
    } catch (e) { setError(e.message) }
    finally { setClaiming(null) }
  }

  const buy = async (lead, shares, plan = 'normal') => {
    if (!logged) { window.location.href = '/login'; return }
    if (plan === 'pro' && !isPro) { setBuyModal(null); setUpgrade(true); return }
    const key = `${lead.id}-${shares}-${plan}`
    setBuying(key); setNotice(''); setError('')
    try {
      const d = await purchaseLead(lead.id, shares)
      if (d.requires_external_payment) {
        setBuyModal(null)
        setPayment(d); setPaymentLead(lead); setPaymentShares(shares); return
      }
      const privateLead = await getLead(lead.id)
      setLeads(current => current.map(x => x.id === lead.id ? { ...x, ...privateLead, purchased: true, access: { ...(x.access || {}), claimed: true, canClaim: false } } : x))
      setBuyModal(null)
      setNotice(`Lead #${lead.id} purchased successfully from ${plan === 'pro' ? 'Pro' : 'Normal'} pricing.`)
      setExpanded(lead.id)
    } catch (e) {
      if (e.code === 'PRO_REQUIRED') { setBuyModal(null); setUpgrade(true) }
      else setError(e.message)
    } finally { setBuying(null) }
  }

  const submitDirect = async () => {
    const reference = document.getElementById('lead-payment-utr')?.value?.trim()
    const file = document.getElementById('lead-payment-proof')?.files?.[0]
    if (!reference) return setError('Enter the payment reference / UTR first.')
    if (!file) return setError('Upload the payment screenshot or PDF first.')
    if (file.size > 5 * 1024 * 1024) return setError('Payment proof must be 5 MB or smaller.')
    if (!payment?.payment?.id) return setError('Payment session is unavailable. Please try again.')
    try {
      setDirectSubmitting(true); setError('')
      const proofUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Unable to read payment proof')); reader.readAsDataURL(file) })
      await authRequest(`/payments/${payment.payment.id}/reference`, { method: 'POST', body: JSON.stringify({ manualReference: reference, proofUrl, notes: `Lead #${paymentLead?.id} direct payment${Number(payment.walletAmount) > 0 ? ` after wallet payment of ${money(payment.walletAmount)}` : ''}` }) })
      setNotice(`Wallet payment of ${money(payment.walletAmount)} applied. Remaining ${money(payment.externalAmount)} submitted for verification.`); setPayment(null); setPaymentLead(null)
    } catch (e) { setError(e.message || 'Unable to submit payment.') }
    finally { setDirectSubmitting(false) }
  }

  if (user?.role === 'admin') return <main className="lv2-page"><section className="lv2-empty"><span>ADMIN ACCOUNT</span><h1>Lead management is in the Admin Panel.</h1><Link to="/admin/leads">Open Admin Leads →</Link></section></main>

  return <div className="lv2-shell">
    <UserHeader />
    <main className="lv2-page">
      <section className="lv2-market-head">
        <div className="lv2-title-block"><span></span><div><h1>{title}</h1><p>High quality, verified leads to grow your business</p></div></div>
        <div className="lv2-controls">
          <div className="lv2-search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by industry, service, location..." aria-label="Search leads"/><b>⌕</b></div>
          <button className="lv2-filter-button" onClick={() => setTier(tier === 'all' ? 'premium' : tier === 'premium' ? 'basic' : 'all')}><span>☷</span> Filters</button>
          <div className="lv2-sort"><small>Sort by</small><strong>Newest</strong><span>⌄</span></div>
        </div>
      </section>

      <section className="lv2-stats">
        <div className="lv2-stat orange"><span>▣</span><div><b>{pagination.total}</b><small>Total Leads</small></div></div>
        <div className="lv2-stat blue"><span>♟</span><div><b>{topIndustry || 'Verified opportunities'}</b><small>Top Industry</small></div></div>
        <div className="lv2-stat green"><span>●</span><div><b>{topLocation || 'India'}</b><small>Top Location</small></div></div>
        <div className="lv2-stat purple"><span>★</span><div><b>4.8</b><small>Avg. Quality Score</small></div></div>
        <div className="lv2-verified">✓ &nbsp; Verified Opportunities Only</div>
      </section>

      {error && <div className="lv2-error">{error}</div>}
      {notice && <div className="lv2-error">{notice}</div>}
      {loading ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>Loading opportunities...</strong></div> : !leads.length ? <div className="lv2-empty"><span>PROPULSE MARKETPLACE</span><strong>No matching leads</strong><p>Try another search or filter.</p></div> : <div className="lv2-grid">
        {leads.map(lead => {
          const shares = lead.pricing?.shares || []
          const dynamic = visibleCustomFields(lead.custom_fields)
          const open = expanded === lead.id
          const exclusive = Boolean(lead.has_exclusive_option)
          const leadAccess = lead.access || {}
          const claimed = Boolean(leadAccess.claimed || leadAccess.purchased)
          const location = [lead.city_name, lead.state_name].filter(hasValue).join(', ')
          const timeline = getCustom(lead.custom_fields, ['Timeline', 'Timeframe', 'Project Timeline', 'Expected Timeline', 'When'])
          const property = hasValue(lead.property_type) ? lead.property_type : getCustom(lead.custom_fields, ['Property Type', 'Property'])
          const initials = String(lead.customer_name || lead.service_name || lead.industry_name || 'L').trim().charAt(0).toUpperCase()
          return <article className={`lv2-card ${lead.lead_type || 'basic'} ${exclusive ? 'has-exclusive' : ''}`} key={lead.id}>
            <div className="lv2-card-top"><span className="lv2-new">New</span><span className="lv2-id">#L-{String(lead.id).padStart(6, '0')}</span><small>{timeAgo(lead.created_at)}</small></div>
            <div className="lv2-person"><div className="lv2-avatar">{initials}</div><div className="lv2-person-copy"><div><h2>{hasValue(lead.customer_name) ? lead.customer_name : (lead.service_name || lead.industry_name || 'Business opportunity')}</h2><span className="lv2-verified-mini">✓ Verified</span></div><p>{lead.requirement || 'Verified business requirement'}</p></div></div>
            <div className="lv2-facts">
              {hasValue(lead.industry_name) && <div><span>▣</span><b>{lead.industry_name}</b></div>}
              {hasValue(lead.service_name) && <div><span>⌁</span><b>{lead.service_name}{hasValue(lead.subservice_name) ? `, ${lead.subservice_name}` : ''}</b></div>}
              {hasValue(location) && <div><span>⌖</span><b>{location}</b></div>}
              {hasValue(lead.budget) && money(lead.budget) && <div><span>₹</span><b>{money(lead.budget)}</b></div>}
              {hasValue(property) && <div><span>⌂</span><b>{property}</b></div>}
              {hasValue(timeline) && <div><span>▦</span><b>{timeline}</b></div>}
            </div>
            <div className="lv2-contact"><span>Contact Details (Masked)</span><div>
              {hasValue(lead.customer_phone) && <b>⌕ &nbsp; {maskContact(lead.customer_phone)}</b>}
              {hasValue(lead.customer_email) && <b>✉ &nbsp; {maskContact(lead.customer_email)}</b>}
              {!hasValue(lead.customer_phone) && !hasValue(lead.customer_email) && <b>Contact available after purchase</b>}
            </div></div>
            <div className="lv2-card-actions"><button className="lv2-details-link" onClick={() => setExpanded(open ? null : lead.id)}>{open ? 'Hide Full Details' : 'View Full Details'} <b>→</b></button><button className="lv2-buy" onClick={() => openBuyModal(lead)} disabled={!shares.length}>{claimed ? 'Purchased' : '🛒  Buy Lead'}</button></div>

            {open && <div className="lv2-details"><div className="lv2-details-head"><h3>Lead details</h3><span>{claimed ? 'Access granted' : 'Verified opportunity'}</span></div><div className="lv2-detail-grid">
              {[['Industry', lead.industry_name], ['Service', lead.service_name], ['Subservice', lead.subservice_name], ['Location', location], ['Property type', property], ['Budget', money(lead.budget)], ['Source', lead.source], ['Customer', lead.customer_name], ['Phone', lead.customer_phone ? maskContact(lead.customer_phone) : ''], ['Email', lead.customer_email ? maskContact(lead.customer_email) : '']].filter(([, v]) => hasValue(v)).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
              {dynamic.filter(([k]) => !isContactKey(k)).map(([k, v]) => <div key={k}><small>{label(k)}</small><b>{displayValue(k, typeof v === 'object' ? JSON.stringify(v) : v)}</b></div>)}
            </div>{hasValue(lead.notes) && <p className="lv2-notes"><b>Notes</b>{maskContact(lead.notes)}</p>}</div>}

            {logged && !claimed && leadAccess.canClaim && <div className="lv2-exclusive"><div><b>Membership access</b><span>Included in your current plan{leadAccess.remaining !== undefined ? ` · ${leadAccess.remaining} remaining` : ''}</span></div><button disabled={claiming === lead.id} onClick={() => claim(lead)}>{claiming === lead.id ? 'Claiming…' : 'Claim free →'}</button></div>}
            {logged && !claimed && leadAccess.reason && !leadAccess.canClaim && <div className="lv2-card-cta"><div><b>Membership access</b><span>{leadAccess.reason}</span></div></div>}
            {claimed && <div className="lv2-card-cta"><div><b>Lead access granted</b><span>You can use this lead from your account.</span></div><Link to="/dashboard">Open dashboard →</Link></div>}
            {exclusive && logged && !claimed && <div className="lv2-exclusive"><div><b>Exclusive access</b><span>{lead.exclusive_action === 'upgrade_to_pro' ? 'Pro members get first access' : 'Available for purchase'}</span></div>{lead.exclusive_action === 'upgrade_to_pro' ? <button onClick={() => setUpgrade(true)}>Get Pro →</button> : <button onClick={() => openBuyModal(lead)}>Buy →</button>}</div>}
            {!logged && <div className="lv2-card-cta"><div><b>Interested in this lead?</b><span>Sign in to view purchase options.</span></div><button onClick={() => openBuyModal(lead)}>Login to buy →</button></div>}
          </article>
        })}
      </div>}

      {!loading && (pagination.hasPrevious || pagination.hasNext) && <div className="lv2-pagination"><button disabled={!pagination.hasPrevious} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button><span>Page {pagination.page} · {pagination.total} leads</span><button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button></div>}
      <section className="lv2-bottom-cta"><div><span className="lv2-kicker">GROW WITH PROPULSE</span><h2>Find the right opportunity for your business.</h2><p>Browse, compare and choose leads with transparent pricing.</p></div>{logged ? <Link to="/dashboard">Go to dashboard →</Link> : <Link to="/signup">Create business account →</Link>}</section>
    </main>

    {buyModal && <div className="lv2-overlay" onClick={() => setBuyModal(null)}><div className="lv2-buy-modal" onClick={e => e.stopPropagation()}>
      <button className="lv2-modal-close" onClick={() => setBuyModal(null)}>×</button>
      <span className="lv2-modal-kicker">LEAD PRICING</span>
      <h2>Choose your share pack</h2>
      <p className="lv2-modal-subtitle">Select how many shares you want for Lead #{buyModal.id}.</p>
      <div className="lv2-modal-lead"><div className="lv2-avatar">{String(buyModal.customer_name || buyModal.service_name || buyModal.industry_name || 'L').trim().charAt(0).toUpperCase()}</div><div><strong>{buyModal.customer_name || buyModal.service_name || buyModal.industry_name || 'Business opportunity'}</strong><small>{[buyModal.service_name, buyModal.city_name, buyModal.state_name].filter(hasValue).join(' · ')}</small></div></div>
      <div className={`lv2-modal-pricing ${isPro ? 'pro-only' : ''}`}>
        <div className="lv2-modal-price-head"><span>SHARES</span><span>{isPro ? 'PRO PRICE' : 'NORMAL PRICE'}</span>{!isPro && <span>PRO PRICE</span>}</div>
        {(buyModal.pricing?.shares || []).map(p => {
          const n = Number(p.shares)
          const normal = Number(p.normal)
          const pro = Number(p.pro)
          const saving = Number.isFinite(normal) && Number.isFinite(pro) && normal > pro ? normal - pro : 0
          const normalKey = `${buyModal.id}-${n}-normal`
          const proKey = `${buyModal.id}-${n}-pro`
          return <div className="lv2-modal-price-row" key={n}>
            <div className="lv2-share-badge"><strong>{n}</strong><small>{n === 1 ? 'Single share' : `${n} shares`}</small></div>
            <button className="lv2-modal-price normal" disabled={claimed || buying === normalKey} onClick={() => buy(buyModal, n, 'normal')}>{buying === normalKey ? 'Buying…' : money(normal)}</button>
            {!isPro && <button className="lv2-modal-price pro" disabled={claimed || buying === proKey} onClick={() => buy(buyModal, n, 'pro')}><span>{buying === proKey ? 'Buying…' : money(pro)}</span>{saving > 0 && <small>Save {money(saving)}</small>}</button>}
            {isPro && <button className="lv2-modal-price pro selected-pro" disabled={claimed || buying === proKey} onClick={() => buy(buyModal, n, 'pro')}><span>{buying === proKey ? 'Buying…' : money(pro)}</span></button>}
          </div>
        })}
      </div>
      {!isPro && <div className="lv2-pro-hint"><strong>Pro members save more</strong><span>Compare the Pro price above. Upgrade to Pro to unlock Pro pricing.</span><button onClick={() => { setBuyModal(null); setUpgrade(true) }}>View Pro →</button></div>}
      {claimed && <div className="lv2-modal-owned">This lead is already purchased and available in your account.</div>}
    </div></div>}

    {payment && paymentLead && <div className="lv2-overlay" onClick={() => setPayment(null)}><div className="lv2-upgrade" onClick={e => e.stopPropagation()}><button onClick={() => setPayment(null)}>×</button><span>PAYMENT</span><h2>Complete Lead #{paymentLead.id}</h2><p>{Number(payment.walletAmount) > 0 ? `₹${Number(payment.walletAmount).toLocaleString('en-IN')} from your wallet was applied automatically.` : 'No wallet balance was available.'} Pay the remaining amount directly.</p><div className="lv2-detail-grid"><div><small>Shares</small><b>{paymentShares}</b></div><div><small>Total</small><b>{money(payment.payment.amount)}</b></div><div><small>Wallet paid</small><b>{money(payment.walletAmount)}</b></div><div><small>Direct payment</small><b>{money(payment.externalAmount)}</b></div></div><label>Payment reference / UTR<input id="lead-payment-utr" placeholder="Enter UTR or transaction ID" /></label><label>Payment proof<input id="lead-payment-proof" type="file" accept="image/*,.pdf" /></label><button className="lv2-more" onClick={submitDirect} disabled={directSubmitting}>{directSubmitting ? 'Submitting…' : `Submit ${money(payment.externalAmount)} payment`}</button></div></div>}
    {upgrade && <div className="lv2-overlay"><div className="lv2-upgrade"><button onClick={() => setUpgrade(false)}>×</button><span>PRO ACCESS</span><h2>Unlock Exclusive access.</h2><p>Pro members get first access during the configured Pro-first period.</p><div><Link to="/dashboard">View Pro options →</Link><button onClick={() => setUpgrade(false)}>Not now</button></div></div></div>}
  </div>
}
