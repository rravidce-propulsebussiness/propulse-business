import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import ProfessionalRequestUnlock from '../components/ProfessionalRequestUnlock'
import ProfessionalProjectQuotes from '../components/ProfessionalProjectQuotes'
import { authRequest } from '../utils/auth'
import './ProfessionalRequests.css'

const STAGES = [
  { key: 'all', label: 'All requests' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'In follow-up' },
  { key: 'closed', label: 'Closed' },
]

const formatDate = value => {
  if (!value) return 'Date not supplied'
  const time = new Date(value)
  return Number.isNaN(time.getTime()) ? 'Date not supplied' : time.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const stageLabel = status => status === 'contacted' ? 'In follow-up' : status === 'closed' ? 'Closed' : 'New'
const stageKey = status => status === 'contacted' || status === 'closed' ? status : 'new'

function RequestsIcon({ name, className = '' }) {
  const shapes = {
    callback: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4.2-1L3 21l1.9-5.3A9 9 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M9 11.5h7M9 14.5h4"/></>,
    new: <><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></>,
    followup: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.8 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 12.2-2"/></>,
    quote: <><path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 7l2 5M4 12l2 5a7 7 0 0 0 12.5 3"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  }
  return <svg className={className} aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{shapes[name] || shapes.callback}</svg>
}

export default function ProfessionalRequests() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('tab') === 'quotes' ? 'quotes' : 'callbacks'
  const [requests, setRequests] = useState([])
  const [quotes, setQuotes] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [quoteError, setQuoteError] = useState('')
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  async function load({ initial = false } = {}) {
    if (initial) setLoading(true)
    else setRefreshing(true)
    const [callbacksResult, quoteResult] = await Promise.allSettled([
      authRequest('/profile/project-callbacks'),
      authRequest('/profile/project-quote-requests'),
    ])
    if (callbacksResult.status === 'fulfilled') {
      const items = Array.isArray(callbacksResult.value?.data) ? callbacksResult.value.data : []
      setRequests(items)
      setSelectedId(current => items.some(item => item.id === current) ? current : (items[0]?.id ?? null))
      setError('')
    } else {
      setError(callbacksResult.reason?.message || 'Unable to load callback requests. Please retry.')
    }
    if (quoteResult.status === 'fulfilled') {
      setQuotes(Array.isArray(quoteResult.value?.data) ? quoteResult.value.data : [])
      setQuoteError('')
    } else {
      setQuoteError(quoteResult.reason?.message || 'Unable to check quotation requests.')
    }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    let active = true
    Promise.allSettled([
      authRequest('/profile/project-callbacks'),
      authRequest('/profile/project-quote-requests'),
    ]).then(([callbackResult, quoteResult]) => {
      if (!active) return
      if (callbackResult.status === 'fulfilled') {
        const items = Array.isArray(callbackResult.value?.data) ? callbackResult.value.data : []
        setRequests(items)
        setSelectedId(items[0]?.id ?? null)
      } else setError(callbackResult.reason?.message || 'Unable to load callback requests.')
      if (quoteResult.status === 'fulfilled') {
        setQuotes(Array.isArray(quoteResult.value?.data) ? quoteResult.value.data : [])
      } else setQuoteError(quoteResult.reason?.message || 'Unable to check quotation requests.')
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (view !== 'quotes') return undefined
    let active = true
    authRequest('/profile')
      .then(data => {
        if (!active) return
        setPlans((data?.service_plans || []).map(plan => ({
          id: plan.id,
          title: plan.title,
          isPublished: plan.is_published === true,
          priceFrom: plan.price_from,
          priceUnit: plan.price_unit,
        })))
      })
      .catch(() => { if (active) setPlans([]) })
    return () => { active = false }
  }, [view])

  const counts = useMemo(() => ({
    all: requests.length,
    new: requests.filter(item => stageKey(item.status) === 'new').length,
    contacted: requests.filter(item => stageKey(item.status) === 'contacted').length,
    closed: requests.filter(item => stageKey(item.status) === 'closed').length,
  }), [requests])
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase()
    return requests.filter(item =>
      (stage === 'all' || stageKey(item.status) === stage) &&
      (!term || [item.customer_name, item.project_title, item.message, String(item.id)]
        .some(value => String(value || '').toLowerCase().includes(term)))
    )
  }, [requests, search, stage])
  const chosen = shown.find(item => item.id === selectedId) || shown[0] || null

  return <div className="prc-shell">
    <UserHeader />
    <main className="prc-main">
      <header className="prc-heading">
        <div className="prc-hero-orb prc-hero-orb-one" aria-hidden="true"/>
        <div className="prc-hero-orb prc-hero-orb-two" aria-hidden="true"/>
        <div className="prc-heading-copy">
          <span className="prc-eyebrow"><span className="prc-eyebrow-line" aria-hidden="true"/>PROFESSIONAL WORKSPACE / CUSTOMER CRM</span>
          <h1>Requests <span>Inbox</span></h1>
          <p>Track enquiries from your professional profile and completed projects. Prepare quotations in one dedicated workspace.</p>
          <div className="prc-hero-security"><RequestsIcon name="shield"/> Customer details stay protected</div>
        </div>
        <div className="prc-hero-actions">
          <span className="prc-hero-caption">YOUR PRIVATE CRM WORKSPACE</span>
          <button className="prc-refresh" type="button" aria-busy={refreshing} disabled={refreshing || loading} onClick={() => load()}>
            <RequestsIcon name="refresh" className={refreshing ? 'prc-rotate' : ''}/> {refreshing ? 'Refreshing…' : 'Refresh requests'}
          </button>
        </div>
      </header>

      <div className="prc-overview" aria-label="Request overview">
        <div className="prc-summary-card prc-summary-callbacks">
          <div className="prc-metric-top"><span>Callback requests</span><span className="prc-metric-icon"><RequestsIcon name="callback"/></span></div>
          <strong>{loading ? '—' : counts.all}</strong><small>Profile and project enquiries</small>
        </div>
        <div className="prc-summary-card prc-summary-new">
          <div className="prc-metric-top"><span>New requests</span><span className="prc-metric-icon"><RequestsIcon name="new"/></span></div>
          <strong>{loading ? '—' : counts.new}</strong><small>Awaiting coordination</small>
        </div>
        <div className="prc-summary-card prc-summary-followup">
          <div className="prc-metric-top"><span>In follow-up</span><span className="prc-metric-icon"><RequestsIcon name="followup"/></span></div>
          <strong>{loading ? '—' : counts.contacted}</strong><small>Being coordinated by ProPulse</small>
        </div>
        <div className="prc-summary-card prc-summary-quotes">
          <div className="prc-metric-top"><span>Quote enquiries</span><span className="prc-metric-icon"><RequestsIcon name="quote"/></span></div>
          <strong>{loading ? '—' : quotes.length}</strong><small>Prepare pricing and scope</small>
        </div>
      </div>

      <div className="prc-sections" role="tablist" aria-label="Request type">
        <button type="button" role="tab" aria-selected={view === 'callbacks'} className={view === 'callbacks' ? 'selected' : ''} onClick={() => setSearchParams({})}><RequestsIcon name="callback"/> Callback requests <span>{counts.all}</span></button>
        <button type="button" role="tab" aria-selected={view === 'quotes'} className={view === 'quotes' ? 'selected' : ''} onClick={() => setSearchParams({ tab: 'quotes' })}><RequestsIcon name="quote"/> Quotation requests <span>{quotes.length}</span></button>
      </div>

      {view === 'quotes' ? <section className="prc-quotes" aria-label="Quotation requests">
        {quoteError && <p className="prc-alert" role="alert">{quoteError}</p>}
        <ProfessionalProjectQuotes plans={plans}/>
      </section> : <section className="prc-workspace" aria-label="Callback request CRM">
        <div className="prc-inbox">
          <div className="prc-inbox-head">
            <div><span className="prc-section-kicker">YOUR CUSTOMER INBOX</span><h2>Callback pipeline</h2><p>Enquiries assigned to your business</p></div>
            <span className="prc-count">{shown.length} shown</span>
          </div>
          <label className="prc-search">
            <span className="prc-visually-hidden">Search callback requests</span>
            <span aria-hidden="true">⌕</span>
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, project, request ID…"/>
          </label>
          <div className="prc-filters" role="group" aria-label="Filter by request status">
            {STAGES.map(option => <button type="button" key={option.key} aria-pressed={stage === option.key} className={stage === option.key ? 'selected' : ''} onClick={() => setStage(option.key)}>{option.label} <span>{counts[option.key]}</span></button>)}
          </div>
          {error && <div className="prc-alert" role="alert">{error}</div>}
          <div className="prc-request-list" aria-busy={loading}>
            {loading ? <div className="prc-loading-rows" role="status" aria-label="Loading customer requests"><span className="prc-visually-hidden">Loading customer requests…</span>{[0, 1, 2].map(index => <div key={index} className="prc-loading-row" aria-hidden="true"><i/><span><b/><b/></span><em/></div>)}</div> :
              shown.length === 0 ? <div className="prc-empty">
                <strong>{counts.all ? 'No requests match these filters' : 'No callback requests yet'}</strong>
                <p>{counts.all ? 'Try a different search or stage.' : 'When a customer requests a callback from your profile or project, it will appear here.'}</p>
                {counts.all > 0 && <button type="button" onClick={() => { setSearch(''); setStage('all') }}>Clear filters</button>}
              </div> : shown.map((item, index) => <button type="button" key={item.id} style={{ '--prc-order': Math.min(index, 8) }} className={'prc-request-item' + (chosen?.id === item.id ? ' chosen' : '')} aria-pressed={chosen?.id === item.id} onClick={() => setSelectedId(item.id)}>
                <span className="prc-request-line"><span className="prc-customer-avatar" aria-hidden="true">{String(item.customer_name || 'C').trim().charAt(0).toUpperCase() || 'C'}</span><strong>{item.customer_name || 'Customer'}</strong><small>#{item.id}</small></span>
                <span className="prc-request-project">{item.project_id ? item.project_title : 'Professional profile enquiry'}</span>
                <span className="prc-request-foot"><span className={'prc-stage prc-stage-' + stageKey(item.status)}>{stageLabel(item.status)}</span><time>{formatDate(item.created_at)}</time></span>
              </button>)}
          </div>
        </div>

        <article className="prc-detail" aria-label="Selected request details">
          {chosen ? <div className="prc-detail-content" key={chosen.id}>
            <div className="prc-detail-top"><div><span className="prc-detail-eyebrow">REQUEST #{chosen.id} · {chosen.project_id ? 'PROJECT CALLBACK' : 'PROFILE CALLBACK'}</span><h2>{chosen.customer_name || 'Customer request'}</h2><p>Received {formatDate(chosen.created_at)}</p></div><span className={'prc-stage prc-stage-' + stageKey(chosen.status)}>{stageLabel(chosen.status)}</span></div>
            <div className="prc-detail-section">
              <span className="prc-detail-label">Request source</span>
              <h3>{chosen.project_id ? chosen.project_title : 'Your professional profile'}</h3>
              {chosen.project_id && <Link to={'/projects/project-' + chosen.project_id}>View published project ↗</Link>}
            </div>
            {Object.entries(chosen.requirement_fields||{}).filter(([key,value])=>!key.startsWith('_')&&String(value||'').trim()).length>0&&<div className="prc-detail-section">
              <span className="prc-detail-label">Form requirements</span>
              <dl className="prc-contact-grid">{Object.entries(chosen.requirement_fields||{}).filter(([key,value])=>!key.startsWith('_')&&String(value||'').trim()).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>
            </div>}
            {String(chosen.message||'').trim()&&<div className="prc-detail-section">
              <span className="prc-detail-label">Additional Information</span>
              <p className="prc-message">{chosen.message}</p>
            </div>}
            <div className="prc-detail-section">
              <span className="prc-detail-label">Protected contact</span>
              <dl className="prc-contact-grid">
                <div><dt>Phone number</dt><dd>{chosen.customer_phone || 'Protected'}</dd></div>
                <div><dt>Email address</dt><dd>{chosen.customer_email || 'Not supplied'}</dd></div>
              </dl>
            </div>
            <ProfessionalRequestUnlock kind={chosen.project_id?'callback':'profile'} item={chosen} onUnlocked={()=>load()}/>
            <div className="prc-contact-notice"><RequestsIcon name="shield"/><p>{chosen.access?.unlocked?'Accepted enquiry · customer contact is unlocked.':'Contact stays protected until confirmed payment or an active Pro membership acceptance.'}</p></div>
            <div className="prc-detail-actions">
              <Link to="/profile/brochures">Manage brochures <RequestsIcon name="arrow"/></Link>
              <button type="button" disabled={refreshing} onClick={() => load()}>Check for updates</button>
            </div>
          </div> : <div className="prc-detail-placeholder"><span aria-hidden="true">▤</span><h2>{loading ? 'Loading request details…' : 'Select a request'}</h2><p>{counts.all ? 'Choose an enquiry from the inbox to see its details.' : 'Customer callback details will appear here as requests arrive.'}</p></div>}
        </article>
      </section>}
    </main>
  </div>
}
