import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import UserHeader from '../components/UserHeader'
import { API_BASE_URL, authRequest, getToken } from '../utils/auth'
import './PurchasedLeads.css'

const CRM_STATUSES = [
  ['new', 'New'], ['contacted', 'Contacted'], ['follow_up', 'Follow-up'], ['interested', 'Interested'],
  ['meeting', 'Meeting'], ['won', 'Won'], ['lost', 'Lost'], ['not_interested', 'Not interested']
]
const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '—'
const norm = value => String(value ?? '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const formatDate = value => { const d = new Date(value || 0); return d.getTime() ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '' }
const toDateInput = value => { const d = new Date(value || 0); return d.getTime() ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '' }
const label = key => String(key).replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, x => x.toUpperCase())
const money = value => { if (!hasValue(value)) return ''; const text = String(value).trim(); if (/₹|rs\.?|inr/i.test(text)) return text; const n = Number(text.replace(/,/g, '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : text }
const flatten = lead => ({ ...(lead?.custom_fields && typeof lead.custom_fields === 'object' ? lead.custom_fields : {}), ...(lead?.customFields && typeof lead.customFields === 'object' ? lead.customFields : {}) })
const findField = (fields, exact = [], fuzzy = []) => { const entries = Object.entries(fields).filter(([,v]) => hasValue(v)); const exactSet = exact.map(norm); const hit = entries.find(([k]) => exactSet.includes(norm(k))); if (hit) return String(hit[1]).trim(); const patterns = fuzzy.map(norm); const fuzzyHit = entries.find(([k]) => patterns.some(p => norm(k).includes(p))); return fuzzyHit ? String(fuzzyHit[1]).trim() : '' }
const contactKey = key => /(phone|mobile|whatsapp|email|mail|contact|website|url)/i.test(String(key))
const hiddenKey = key => /(pricing|price|buyer.?capacity|normal|pro)/i.test(String(key))
const phoneDigits = value => { const digits = String(value || '').replace(/\D/g, ''); return !digits ? '' : digits.length === 10 ? `91${digits}` : digits }

function crmDefaults(lead) {
  return { status: lead.crm_status || 'new', remarks: lead.crm_remarks || '', nextFollowupAt: toDateInput(lead.next_followup_at), markFollowedUp: false }
}

export default function PurchasedLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [crmOpen, setCrmOpen] = useState(null)
  const [crmForms, setCrmForms] = useState({})
  const [savingCrm, setSavingCrm] = useState(null)
  const [crmMessage, setCrmMessage] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadLeads = () => authRequest('/leads/purchased').then(data => setLeads(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []))
  useEffect(() => { let live = true; loadLeads().catch(e => live && setError(e.message || 'Failed to load your leads')).finally(() => live && setLoading(false)); return () => { live = false } }, [])

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    return {
      total: leads.length,
      membership: leads.filter(x => x.pricing_tier === 'membership' || x.payment_method === 'membership').length,
      purchased: leads.filter(x => x.pricing_tier !== 'membership' && x.payment_method !== 'membership').length,
      due: leads.filter(x => x.next_followup_at && new Date(x.next_followup_at) <= new Date(today.getTime() + 86400000)).length,
      overdue: leads.filter(x => x.next_followup_at && new Date(x.next_followup_at) < today).length,
    }
  }, [leads])

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter(lead => {
      const text = [lead.customer_name, lead.customer_phone, lead.customer_email, lead.service_name, lead.industry_name, lead.city_name, lead.state_name, lead.requirement, lead.crm_remarks].join(' ').toLowerCase()
      const matchesSearch = !q || text.includes(q)
      const matchesStatus = statusFilter === 'all' || (lead.crm_status || 'new') === statusFilter
      const matchesMonth = !monthFilter || String(lead.created_at || '').slice(0, 7) === monthFilter
      return matchesSearch && matchesStatus && matchesMonth
    })
  }, [leads, search, statusFilter, monthFilter])

  const updateForm = (lead, patch) => setCrmForms(prev => ({ ...prev, [lead.lead_id]: { ...crmDefaults(lead), ...(prev[lead.lead_id] || {}), ...patch } }))
  const openCrm = lead => { updateForm(lead, {}); setCrmOpen(crmOpen === lead.lead_id ? null : lead.lead_id); setCrmMessage('') }
  const saveCrm = async lead => {
    const form = { ...crmDefaults(lead), ...(crmForms[lead.lead_id] || {}) }
    setSavingCrm(lead.lead_id); setCrmMessage('')
    try {
      const data = await authRequest(`/leads/${lead.lead_id}/crm`, { method: 'PATCH', body: JSON.stringify({ status: form.status, remarks: form.remarks, nextFollowupAt: form.nextFollowupAt ? `${form.nextFollowupAt}T09:00:00` : null, markFollowedUp: Boolean(form.markFollowedUp) }) })
      setLeads(prev => prev.map(x => x.lead_id === lead.lead_id ? { ...x, crm_status: data.status, crm_remarks: data.remarks || '', last_followed_up_at: data.last_followed_up_at, next_followup_at: data.next_followup_at, followup_count: data.followup_count, contacted_by_name: data.contacted_by_name } : x))
      setCrmForms(prev => ({ ...prev, [lead.lead_id]: crmDefaults({ ...lead, ...data }) }))
      setCrmMessage('CRM updated')
    } catch (e) { setCrmMessage(e.message || 'Could not update CRM') } finally { setSavingCrm(null) }
  }

  const downloadExcel = async mode => {
    setExporting(true); setExportOpen(false)
    try {
      const params = new URLSearchParams()
      if (mode === 'month' && monthFilter) params.set('month', monthFilter)
      if (mode === 'month' && !monthFilter) params.set('month', new Date().toISOString().slice(0,7))
      if (mode === 'filtered' && monthFilter) params.set('month', monthFilter)
      const token = getToken()
      const response = await fetch(`${API_BASE_URL}/leads/purchased/export${params.toString() ? `?${params}` : ''}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Export failed') }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url
      const disposition = response.headers.get('content-disposition') || ''; const match = disposition.match(/filename="?([^";]+)"?/i); a.download = match?.[1] || 'propulse-my-leads.xlsx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e) { setCrmMessage(e.message || 'Could not export leads') } finally { setExporting(false) }
  }

  return <div className="purchased-page"><UserHeader/><main className="purchased-main">
    <section className="purchased-hero">
      <div className="purchased-hero-copy"><div className="purchased-eyebrow"><span className="purchased-eyebrow-dot"/> MY LEADS · CRM</div><h1>Your business opportunities.</h1><p>Work your unlocked leads, keep follow-up notes, set the next action, and export your pipeline whenever you need it.</p></div>
      <div className="purchased-hero-actions"><div className="export-wrap"><button className="purchased-export-btn" onClick={() => setExportOpen(x => !x)} disabled={exporting}>▣ {exporting ? 'Preparing…' : 'Download Excel'} <span>⌄</span></button>{exportOpen&&<div className="export-menu"><button onClick={() => downloadExcel('all')}>All my leads</button><button onClick={() => downloadExcel('month')}>Current month</button><button onClick={() => downloadExcel('filtered')}>Selected month</button></div>}</div><Link className="purchased-market-btn" to="/leads"><span>+</span> Explore marketplace</Link></div>
    </section>

    {!loading&&!error&&leads.length>0&&<section className="purchased-stats"><div><span className="stat-icon">◈</span><b>{stats.total}</b><small>Total access</small></div><div><span className="stat-icon">◆</span><b>{stats.purchased}</b><small>Purchased</small></div><div><span className="stat-icon">✦</span><b>{stats.membership}</b><small>Membership</small></div><div className="purchased-stats-note"><span>●</span><div><b>{stats.overdue ? `${stats.overdue} overdue` : 'Pipeline ready'}</b><small>{stats.due} follow-up{stats.due === 1 ? '' : 's'} due today</small></div></div></section>}

    {!loading&&!error&&leads.length>0&&<section className="crm-toolbar"><div className="crm-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, phone, service, city…"/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{CRM_STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input className="crm-month" type="month" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)} title="Filter by lead month"/><button className="crm-clear" onClick={()=>{setSearch('');setStatusFilter('all');setMonthFilter('')}}>Clear</button><strong>{filteredLeads.length} lead{filteredLeads.length===1?'':'s'}</strong></section>}

    {error&&<div className="purchased-error"><strong>Unable to load your leads</strong><span>{error}</span></div>}
    {loading?<div className="purchased-empty"><div className="purchased-loader"/><strong>Preparing your lead workspace…</strong><p>Loading your unlocked opportunities.</p></div>:!leads.length?<div className="purchased-empty purchased-empty-rich"><div className="empty-orb">✦</div><span>YOUR LEAD WORKSPACE</span><strong>No leads yet</strong><p>Browse the marketplace and purchase or claim a lead included with your membership.</p><Link to="/leads">Browse available leads →</Link></div>:!filteredLeads.length?<div className="purchased-empty"><strong>No leads match these filters</strong><p>Clear the search, status, or month filter and try again.</p></div>:<section className="purchased-grid">{filteredLeads.map((lead,index)=>{
      const membership=lead.pricing_tier==='membership'||lead.payment_method==='membership', tier=membership?'MEMBERSHIP':lead.pricing_tier==='pro'?'PRO':'NORMAL', fields=flatten(lead), location=[lead.city_name,lead.state_name].filter(hasValue).join(', '), budget=hasValue(lead.budget)?money(lead.budget):findField(fields,['Budget','Budget Range','Project Budget','Project Budget Range','Expected Budget','Approx Budget','Approximate Budget','Investment Budget'],['budget']), workNumbers=findField(fields,['Work Number','Work Numbers','Work No','Work Nos','Number Of Works','Number Of Work','No. Of Works','No Of Works','Works','Quantity','Project Quantity','Work Quantity','Number Of Projects'],['worknumber','worknumbers','numberofworks','noofworks','workquantity','projectquantity','numberofprojects','quantity']), workPhone=findField(fields,['Work Phone Number','Work Phone','Office Phone Number','Office Phone','Business Phone','Business Phone Number','Alternate Work Phone','Alternate Phone'],['workphone','officephone','businessphone']), timeline=findField(fields,['Timeline','Timeframe','Project Timeline','Expected Timeline','Planning Date','How Soon Required','When Required'],['timeline','timeframe','planningdate','howsoonrequired']), property=hasValue(lead.property_type)?lead.property_type:findField(fields,['Property Type','Property'],['property']), baseEntries=Object.entries(fields).filter(([k,v])=>hasValue(v)&&!hiddenKey(k)), dynamic=baseEntries.filter(([k])=>!contactKey(k)), open=active===(lead.access_id||lead.claim_id||lead.lead_id), crmIsOpen=crmOpen===lead.lead_id, initial=String(lead.customer_name||lead.service_name||lead.industry_name||'L').trim().charAt(0).toUpperCase(), contactPhone=hasValue(lead.customer_phone)?String(lead.customer_phone).trim():workPhone, whatsappNumber=phoneDigits(contactPhone), whatsappHref=whatsappNumber?`https://wa.me/${whatsappNumber}`:'', crmStatus=lead.crm_status||'new', crmForm={...crmDefaults(lead),...(crmForms[lead.lead_id]||{})}
      return <article className={`purchased-card ${membership?'membership-card':''}`} key={`${lead.lead_id}-${lead.access_id||lead.claim_id||index}`}><div className="purchased-card-glow"/><div className="purchased-card-top"><div className="purchased-card-id"><span>LEAD</span><strong>#{String(lead.lead_id).padStart(4,'0')}</strong></div><div className="card-badges"><span className={`crm-status-badge status-${crmStatus}`}>{CRM_STATUSES.find(x=>x[0]===crmStatus)?.[1]||'New'}</span><span className={`purchased-tier ${membership?'free':tier.toLowerCase()}`}>{membership?'✦ ':''}{tier}</span></div></div>
        <div className="purchased-title-row"><div className="purchased-avatar">{initial}</div><div><h2>{lead.service_name||lead.industry_name||'Business opportunity'}</h2><p>{lead.customer_name||lead.industry_name||'Verified business opportunity'}</p></div></div>
        <div className="purchased-status"><span><i/> ACCESS ACTIVE</span><small>{membership?'Included with membership':`${tier} purchase`}</small></div>
        <div className="purchased-contact purchased-contact-top"><div className="contact-heading"><span>CONTACT DETAILS</span><small>UNLOCKED</small></div><strong>{lead.customer_name||'Customer details available'}</strong><div className="contact-lines">{contactPhone&&<a href={`tel:${contactPhone}`}>☎ {contactPhone}</a>}{workPhone&&contactPhone!==workPhone&&<a href={`tel:${workPhone}`}>⌕ Work {workPhone}</a>}{lead.customer_email&&<a href={`mailto:${lead.customer_email}`}>✉ {lead.customer_email}</a>}</div><div className="contact-actions">{contactPhone&&<a className="contact-action call" href={`tel:${contactPhone}`}>☎ Call</a>}{whatsappHref&&<a className="contact-action whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">◉ WhatsApp</a>}</div></div>
        {hasValue(lead.requirement)&&<p className="purchased-requirement">{lead.requirement}</p>}
        <div className="purchased-detail-grid">{location&&<div><small>LOCATION</small><strong>⌖ {location}</strong></div>}{property&&<div><small>PROPERTY</small><strong>{property}</strong></div>}{budget&&<div><small>BUDGET</small><strong>{budget}</strong></div>}{workNumbers&&<div><small>WORK NUMBERS</small><strong>{workNumbers}</strong></div>}{timeline&&<div><small>TIMELINE</small><strong>{timeline}</strong></div>}{hasValue(lead.shares)&&<div><small>SHARES</small><strong>{lead.shares} share{Number(lead.shares)===1?'':'s'}</strong></div>}</div>
        {dynamic.length>0&&<div className="purchased-dynamic"><small>ALL LEAD DETAILS</small><div>{dynamic.map(([k,v])=><span key={k}><b>{label(k)}</b>{String(v)}</span>)}</div></div>}
        <div className="crm-summary"><div><small>STATUS</small><strong>{CRM_STATUSES.find(x=>x[0]===crmStatus)?.[1]||'New'}</strong></div><div><small>LAST FOLLOWED</small><strong>{lead.last_followed_up_at?formatDate(lead.last_followed_up_at):'Not yet'}</strong></div><div><small>NEXT FOLLOW-UP</small><strong className={lead.next_followup_at&&new Date(lead.next_followup_at)<new Date()?'overdue':''}>{lead.next_followup_at?formatDate(lead.next_followup_at):'Not set'}</strong></div><div><small>FOLLOW-UPS</small><strong>{lead.followup_count||0}</strong></div></div>
        <button className="crm-open-btn" onClick={()=>openCrm(lead)}>{crmIsOpen?'Close CRM':'Open CRM · Update follow-up'} <span>→</span></button>
        {crmIsOpen&&<div className="crm-panel"><div className="crm-panel-head"><div><small>LEAD CRM</small><strong>Follow-up workspace</strong></div>{crmMessage&&<span className={crmMessage==='CRM updated'?'ok':''}>{crmMessage}</span>}</div><div className="crm-form-grid"><label>Status<select value={crmForm.status} onChange={e=>updateForm(lead,{status:e.target.value})}>{CRM_STATUSES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>Next follow-up<input type="date" value={crmForm.nextFollowupAt||''} onChange={e=>updateForm(lead,{nextFollowupAt:e.target.value})}/></label></div><label className="crm-remarks">Remarks<textarea rows="3" value={crmForm.remarks} onChange={e=>updateForm(lead,{remarks:e.target.value})} placeholder="What happened on the call? What does the customer need next?"/></label><label className="crm-check"><input type="checkbox" checked={Boolean(crmForm.markFollowedUp)} onChange={e=>updateForm(lead,{markFollowedUp:e.target.checked})}/><span>Mark as followed up now</span></label><div className="crm-panel-actions"><button className="crm-save" disabled={savingCrm===lead.lead_id} onClick={()=>saveCrm(lead)}>{savingCrm===lead.lead_id?'Saving…':'Save CRM update'}</button>{lead.contacted_by_name&&<small>Last handled by {lead.contacted_by_name}</small>}</div></div>}
        <div className="purchased-card-footer"><div><small>{membership?'CLAIMED':'PURCHASED'}</small><strong>{formatDate(lead.created_at)}</strong></div>{membership&&lead.expires_at?<div><small>ACCESS EXPIRES</small><strong>{formatDate(lead.expires_at)}</strong></div>:<div><small>ACCESS</small><strong>Full lead</strong></div>}<button onClick={()=>setActive(open?null:(lead.access_id||lead.claim_id||lead.lead_id))}>{open?'Hide access ↑':'View access →'}</button></div>
        {open&&<div className="purchased-expanded"><div><span>LEAD ID</span><strong>#{lead.lead_id}</strong></div><div><span>ACCESS TYPE</span><strong>{tier}</strong></div><div><span>STATUS</span><strong>Active</strong></div><div><span>DETAILS</span><strong>{baseEntries.length} fields available</strong></div></div>}
      </article>})}</section>}
  </main></div>
}
