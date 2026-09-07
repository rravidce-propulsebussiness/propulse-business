import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import { authRequest } from '../utils/auth'
import './PurchasedLeads.css'

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '—'
const norm = (value) => String(value ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const money = (value) => Number.isFinite(Number(value)) ? `₹${Number(value).toLocaleString('en-IN')}` : ''
const formatDate = (value) => { const date = new Date(value || 0); return date.getTime() ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' }
const getCustom = (fields, names, contains = []) => {
  const entries = Object.entries(fields || {}).filter(([, value]) => hasValue(value))
  const exact = entries.find(([key]) => names.map(norm).includes(norm(key)))
  if (exact) return String(exact[1]).trim()
  const patterns = contains.map(norm)
  const fuzzy = entries.find(([key]) => patterns.some(pattern => norm(key).includes(pattern)))
  return fuzzy ? String(fuzzy[1]).trim() : ''
}
const detailLabel = (key) => String(key).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())

export default function PurchasedLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)

  useEffect(() => {
    let live = true
    authRequest('/leads/purchased').then(data => {
      if (!live) return
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
      setLeads(items)
    }).catch(e => { if (live) setError(e.message || 'Failed to load your leads') }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])

  const stats = useMemo(() => ({
    total: leads.length,
    membership: leads.filter(x => x.pricing_tier === 'membership' || x.payment_method === 'membership').length,
    purchased: leads.filter(x => x.pricing_tier !== 'membership' && x.payment_method !== 'membership').length
  }), [leads])

  return <div className="purchased-page">
    <UserHeader />
    <main className="purchased-main">
      <section className="purchased-hero">
        <div className="purchased-hero-copy">
          <div className="purchased-eyebrow"><span className="purchased-eyebrow-dot" /> MY LEADS</div>
          <h1>Your business opportunities.</h1>
          <p>Every lead you have purchased or unlocked through your membership, organized in one premium workspace.</p>
        </div>
        <Link className="purchased-market-btn" to="/leads"><span>+</span> Explore marketplace</Link>
      </section>

      {!loading && !error && leads.length > 0 && <section className="purchased-stats">
        <div><span className="stat-icon">◈</span><b>{stats.total}</b><small>Total access</small></div>
        <div><span className="stat-icon">◆</span><b>{stats.purchased}</b><small>Purchased</small></div>
        <div><span className="stat-icon">✦</span><b>{stats.membership}</b><small>Membership</small></div>
        <div className="purchased-stats-note"><span>●</span><div><b>Ready to work</b><small>Your unlocked leads are available below</small></div></div>
      </section>}

      {error && <div className="purchased-error"><strong>Unable to load your leads</strong><span>{error}</span></div>}
      {loading ? <div className="purchased-empty"><div className="purchased-loader" /><strong>Preparing your lead workspace…</strong><p>Loading your unlocked opportunities.</p></div> : !leads.length ? <div className="purchased-empty purchased-empty-rich"><div className="empty-orb">✦</div><span>YOUR LEAD WORKSPACE</span><strong>No leads yet</strong><p>Browse the marketplace and purchase or claim a lead included with your membership.</p><Link to="/leads">Browse available leads →</Link></div> : <section className="purchased-grid">
        {leads.map((lead, index) => {
          const membership = lead.pricing_tier === 'membership' || lead.payment_method === 'membership'
          const tier = membership ? 'MEMBERSHIP' : lead.pricing_tier === 'pro' ? 'PRO' : 'NORMAL'
          const custom = lead.custom_fields || {}
          const location = [lead.city_name, lead.state_name].filter(hasValue).join(', ')
          const budget = hasValue(lead.budget) ? money(lead.budget) : getCustom(custom, ['Budget', 'Budget Range', 'Project Budget', 'Project Budget Range', 'Expected Budget'], ['budget'])
          const workNumbers = getCustom(custom, ['Work Number', 'Work Numbers', 'Number of Works', 'Number of Work', 'No. of Works', 'No of Works', 'Works', 'Quantity', 'Project Quantity'], ['worknumber', 'worknumbers', 'numberofworks', 'noofworks', 'quantity', 'projectquantity'])
          const timeline = getCustom(custom, ['Timeline', 'Timeframe', 'Project Timeline', 'Expected Timeline', 'When'], ['timeline', 'timeframe'])
          const property = lead.property_type || getCustom(custom, ['Property Type', 'Property'], ['property'])
          const title = lead.service_name || lead.industry_name || 'Business opportunity'
          const initial = String(lead.customer_name || title).trim().charAt(0).toUpperCase()
          const open = active === (lead.access_id || lead.claim_id || lead.lead_id)
          const key = `${lead.lead_id}-${lead.access_id || lead.claim_id || index}`
          const dynamic = Object.entries(custom).filter(([keyName, value]) => hasValue(value) && !['pricing', 'leadPricing', 'leadPrice', 'price', 'buyerCapacity'].includes(norm(keyName)) && !/(phone|mobile|whatsapp|email|mail|contact|website|url|address)/i.test(keyName) && !/(budget|worknumber|worknumbers|numberofworks|noofworks|quantity|projectquantity|timeline|timeframe|property)/i.test(norm(keyName)))
          return <article className={`purchased-card ${membership ? 'membership-card' : ''}`} key={key}>
            <div className="purchased-card-glow" />
            <div className="purchased-card-top"><div className="purchased-card-id"><span>LEAD</span><strong>#{String(lead.lead_id).padStart(4, '0')}</strong></div><span className={`purchased-tier ${membership ? 'free' : tier.toLowerCase()}`}>{membership ? '✦ ' : ''}{tier}</span></div>
            <div className="purchased-title-row"><div className="purchased-avatar">{initial}</div><div><h2>{title}</h2><p>{lead.industry_name || 'Verified business opportunity'}</p></div></div>
            <div className="purchased-status"><span><i /> ACCESS ACTIVE</span><small>{membership ? 'Included with membership' : `${tier} purchase`}</small></div>
            <p className="purchased-requirement">{lead.requirement || 'Verified business requirement — review the opportunity details below.'}</p>
            <div className="purchased-detail-grid">
              {location && <div><small>LOCATION</small><strong>⌖ {location}</strong></div>}
              {property && <div><small>PROPERTY</small><strong>{property}</strong></div>}
              {budget && <div><small>BUDGET</small><strong>{budget}</strong></div>}
              {workNumbers && <div><small>WORK NUMBERS</small><strong>{workNumbers}</strong></div>}
              {timeline && <div><small>TIMELINE</small><strong>{timeline}</strong></div>}
              {hasValue(lead.shares) && <div><small>SHARES</small><strong>{lead.shares} share{Number(lead.shares) === 1 ? '' : 's'}</strong></div>}
            </div>
            {dynamic.length > 0 && <div className="purchased-dynamic"><small>MORE DETAILS</small><div>{dynamic.slice(0, 6).map(([keyName, value]) => <span key={keyName}><b>{detailLabel(keyName)}</b>{String(value)}</span>)}</div></div>}
            <div className="purchased-contact"><div className="contact-heading"><span>CONTACT ACCESS</span><small>UNLOCKED</small></div><strong>{lead.customer_name || 'Customer details available'}</strong><div className="contact-lines"><a href={lead.customer_phone ? `tel:${lead.customer_phone}` : undefined}>☎ {lead.customer_phone || 'Phone unavailable'}</a><a href={lead.customer_email ? `mailto:${lead.customer_email}` : undefined}>✉ {lead.customer_email || 'Email unavailable'}</a></div></div>
            <div className="purchased-card-footer"><div><small>{membership ? 'CLAIMED' : 'PURCHASED'}</small><strong>{formatDate(lead.created_at)}</strong></div>{membership && lead.expires_at ? <div><small>ACCESS EXPIRES</small><strong>{formatDate(lead.expires_at)}</strong></div> : <div><small>ACCESS</small><strong>Full lead</strong></div>}<button onClick={() => setActive(open ? null : (lead.access_id || lead.claim_id || lead.lead_id))}>{open ? 'Hide details ↑' : 'View details →'}</button></div>
            {open && <div className="purchased-expanded"><div><span>LEAD ID</span><strong>#{lead.lead_id}</strong></div><div><span>ACCESS TYPE</span><strong>{tier}</strong></div><div><span>STATUS</span><strong>Active</strong></div></div>}
          </article>
        })}
      </section>}
    </main>
  </div>
}
