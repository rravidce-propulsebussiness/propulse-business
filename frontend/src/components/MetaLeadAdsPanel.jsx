import { useCallback, useEffect, useMemo, useState } from 'react'
import { authRequest, publicRequest } from '../utils/auth'
import SheetImportPreview from './SheetImportPreview'
import './MetaLeadAdsPanel.css'

// Connect Facebook/Instagram Lead Ads forms as a real-time lead source.
// scope: 'admin' (ProPulse admin leads) or 'partner' (Lead Partner inventory).
const fmtDate = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function MetaLeadAdsPanel({ scope = 'partner' }) {
  const base = scope === 'admin' ? '/meta-leads/admin' : '/meta-leads/partner'
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState(null)
  const [industries, setIndustries] = useState([])
  const [pageId, setPageId] = useState('')
  const [forms, setForms] = useState([])
  const [formId, setFormId] = useState('')
  const [defaultIndustryId, setDefaultIndustryId] = useState('')
  const [preview, setPreview] = useState(null)
  const [mappings, setMappings] = useState({})
  const [stale, setStale] = useState(false)

  const load = useCallback(async () => {
    try { setLoading(true); setStatus(await authRequest(base + '/status')) }
    catch (e) { setMessage({ type: 'error', text: e.message }) }
    finally { setLoading(false) }
  }, [base])

  useEffect(() => {
    let active = true
    queueMicrotask(() => { if (active) load() })
    publicRequest('/industries').then(rows => { if (active) setIndustries(Array.isArray(rows) ? rows : []) }).catch(() => {})
    // Result of the Facebook login redirect (?meta=connected|cancelled|error&reason=...)
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('meta')
    if (outcome) {
      const reason = params.get('reason')
      queueMicrotask(() => {
        if (!active) return
        document.querySelector('.mla-panel')?.scrollIntoView({ block: 'start' })
        setMessage(outcome === 'connected'
          ? { type: 'success', text: 'Meta connected. Choose a Page and lead form below.' }
          : { type: 'error', text: reason || (outcome === 'cancelled' ? 'Meta login was cancelled.' : 'Meta connection failed.') })
      })
      params.delete('meta'); params.delete('reason')
      const query = params.toString()
      window.history.replaceState(window.history.state, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash)
    }
    return () => { active = false }
  }, [load])

  const pages = useMemo(() => status?.pages || [], [status])
  const connections = status?.connections || []

  async function run(label, fn, success) {
    setBusy(label); setMessage(null)
    try { const result = await fn(); if (success) setMessage({ type: 'success', text: typeof success === 'function' ? success(result) : success }); return result }
    catch (e) { setMessage({ type: 'error', text: e.message }); return null }
    finally { setBusy('') }
  }

  async function connectMeta() {
    const result = await run('oauth', () => authRequest(base + '/oauth/start', { method: 'POST', body: JSON.stringify({}) }))
    if (result?.url) window.location.assign(result.url)
  }

  async function choosePage(id) {
    setPageId(id); setForms([]); setFormId(''); setPreview(null)
    if (!id) return
    const result = await run('forms', () => authRequest(`${base}/pages/${encodeURIComponent(id)}/forms`))
    if (Array.isArray(result)) setForms(result)
  }

  async function analyze(nextMappings = mappings) {
    if (!pageId || !formId) return setMessage({ type: 'error', text: 'Choose a Page and a lead form first.' })
    const result = await run('preview', () => authRequest(base + '/preview', { method: 'POST', body: JSON.stringify({ pageId, formId, columnMappings: nextMappings, defaultIndustryId: defaultIndustryId || null }) }))
    if (result) { setPreview(result); setMappings(result.columnMappings || {}); setStale(false) }
  }

  async function connectForm() {
    const result = await run('connect', () => authRequest(base + '/connections', { method: 'POST', body: JSON.stringify({ pageId, formId, columnMappings: mappings, defaultIndustryId: defaultIndustryId || null }) }),
      'Lead form connected. New leads will arrive automatically; leads from the last 30 days are being imported now.')
    if (result) { setPreview(null); setFormId(''); setForms(f => f.map(x => x.formId === result.formId ? { ...x, connectedHere: true } : x)); load() }
  }

  async function syncConnection(id) {
    await run('sync-' + id, () => authRequest(`${base}/connections/${id}/sync`, { method: 'POST', body: JSON.stringify({ days: 30 }) }),
      r => `Checked ${r.checked} recent leads: ${r.imported} imported, ${r.duplicate} duplicates, ${r.failed} failed, ${r.skipped} already processed.`)
    load()
  }

  async function disconnectConnection(id) {
    if (!window.confirm('Disconnect this lead form? Leads already imported stay in place.')) return
    await run('disconnect-' + id, () => authRequest(`${base}/connections/${id}`, { method: 'DELETE' }), 'Lead form disconnected.')
    load()
  }

  async function disconnectAccount() {
    if (!window.confirm('Disconnect Meta completely? All connected lead forms stop importing and stored Page access is deleted.')) return
    await run('account', () => authRequest(base + '/disconnect', { method: 'POST', body: JSON.stringify({}) }), 'Meta disconnected and Page access removed.')
    setPageId(''); setForms([]); setPreview(null); load()
  }

  const selectedForm = forms.find(f => f.formId === formId)

  return <section className="mla-panel">
    <header className="mla-head">
      <div>
        <span className="mla-kicker">META LEAD ADS</span>
        <h2>Facebook &amp; Instagram lead forms</h2>
        <p>Leads arrive in real time from Meta. No sheet refresh or polling is needed, and the same duplicate, quality and pricing rules apply.</p>
      </div>
      <span className={'mla-badge ' + (status?.configured ? 'ok' : 'off')}>{status?.configured ? 'Live webhook' : 'Not set up'}</span>
    </header>

    {message && <div className={'mla-alert ' + message.type}>{message.text}</div>}
    {loading && !status && <p className="mla-muted">Loading Meta connections…</p>}

    {status && !status.configured && <div className="mla-setup">
      <strong>Meta Lead Ads is not switched on yet.</strong>
      {scope === 'admin'
        ? <span>Add these server settings on Hostinger, then reload: {status.missing.join(', ')}. In the Meta app, register the login redirect <code>{status.redirectUri}</code> and the Page webhook <code>{status.webhookUrl}</code> (field: leadgen).</span>
        : <span>ProPulse is finishing the Meta setup. This option will open here once it is ready.</span>}
    </div>}

    {status?.configured && <>
      <div className="mla-account">
        {pages.length
          ? <span>Meta connected · {pages.length} Page{pages.length === 1 ? '' : 's'} shared</span>
          : <span>Log in with Facebook and share the Pages that run your lead ads.</span>}
        <div className="mla-actions">
          <button type="button" className="mla-btn primary" disabled={Boolean(busy)} onClick={connectMeta}>{pages.length ? 'Reconnect / add Pages' : 'Connect Meta'}</button>
          {pages.length > 0 && <button type="button" className="mla-btn ghost" disabled={Boolean(busy)} onClick={disconnectAccount}>Disconnect Meta</button>}
        </div>
      </div>

      {pages.length > 0 && <div className="mla-setup-form">
        <label>Facebook Page
          <select value={pageId} disabled={Boolean(busy)} onChange={e => choosePage(e.target.value)}>
            <option value="">Choose a Page</option>
            {pages.map(p => <option key={p.pageId} value={p.pageId}>{p.name || p.pageId}</option>)}
          </select>
        </label>
        <label>Lead form
          <select value={formId} disabled={!pageId || Boolean(busy)} onChange={e => { setFormId(e.target.value); setPreview(null) }}>
            <option value="">{busy === 'forms' ? 'Loading forms…' : forms.length ? 'Choose a lead form' : 'No lead forms on this Page'}</option>
            {forms.map(f => <option key={f.formId} value={f.formId} disabled={f.connectedElsewhere || f.connectedHere}>
              {f.name}{f.status && f.status !== 'ACTIVE' ? ` (${f.status.toLowerCase()})` : ''}{f.connectedHere ? ' — connected' : f.connectedElsewhere ? ' — used by another account' : ''}
            </option>)}
          </select>
        </label>
        <label>Default industry
          <select value={defaultIndustryId} disabled={Boolean(busy)} onChange={e => { setDefaultIndustryId(e.target.value); if (preview) setStale(true) }}>
            <option value="">Use the form's answer</option>
            {industries.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
        <button type="button" className="mla-btn" disabled={!formId || Boolean(busy)} onClick={() => analyze()}>{busy === 'preview' ? 'Analyzing…' : preview ? 'Re-analyze' : 'Analyze form'}</button>
      </div>}

      {preview && <div className="mla-preview">
        <p className="mla-muted">{preview.sampleCount ? `Checked ${preview.sampleCount} recent leads from “${preview.formName || selectedForm?.name}”.` : `No leads on “${preview.formName || selectedForm?.name}” yet. Map its questions now; new leads will follow this mapping.`} Make sure Pincode or City is mapped so leads can be placed.</p>
        <SheetImportPreview preview={preview} mappings={mappings} stale={stale} disabled={Boolean(busy)} onMappingsChange={next => { setMappings(next); setStale(true) }}/>
        <div className="mla-actions end">
          {stale && <button type="button" className="mla-btn" disabled={Boolean(busy)} onClick={() => analyze(mappings)}>Re-analyze with this mapping</button>}
          <button type="button" className="mla-btn primary" disabled={stale || Boolean(busy)} onClick={connectForm}>{busy === 'connect' ? 'Connecting…' : 'Connect this lead form'}</button>
        </div>
      </div>}

      <div className="mla-connections">
        <h3>Connected lead forms</h3>
        {!connections.length && <p className="mla-muted">No lead forms connected yet.</p>}
        {connections.map(c => <article key={c.id} className="mla-connection">
          <div className="mla-connection-main">
            <strong>{c.formName || c.formId}</strong>
            <small>{c.pageName || c.pageId} · connected {fmtDate(c.createdAt)} · last lead {fmtDate(c.lastLeadAt)}</small>
            {c.lastError && <small className="mla-error">Last problem ({fmtDate(c.lastErrorAt)}): {c.lastError}</small>}
          </div>
          <div className="mla-stats">
            <span><b>{c.leadsCreated}</b>imported</span>
            <span><b>{c.leadsDuplicate}</b>duplicates</span>
            <span><b>{c.leadsFailed}</b>failed</span>
          </div>
          <div className="mla-actions">
            <button type="button" className="mla-btn" disabled={Boolean(busy)} onClick={() => syncConnection(c.id)}>{busy === 'sync-' + c.id ? 'Importing…' : 'Import last 30 days'}</button>
            <button type="button" className="mla-btn ghost" disabled={Boolean(busy)} onClick={() => disconnectConnection(c.id)}>Disconnect</button>
          </div>
        </article>)}
      </div>
    </>}
  </section>
}
