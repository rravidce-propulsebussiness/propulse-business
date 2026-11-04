import { useCallback, useEffect, useMemo, useState } from 'react'
import { authRequest, API_BASE_URL } from '../../utils/auth'
import './AdminMessagingApi.css'

const dateLabel = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const errorText = error => error?.message || 'Something went wrong. Please try again.'

function Metric({ label, value, note, icon }) {
  return <article className="messaging-metric">
    <span className="messaging-metric-icon">{icon}</span>
    <div><small>{label}</small><strong>{value}</strong><p>{note}</p></div>
  </article>
}

function StatePill({ children, tone = 'neutral' }) {
  return <span className={'messaging-pill ' + tone}><i />{children}</span>
}

function CopyButton({ value, onCopied, children = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      onCopied?.()
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return <button type="button" className="messaging-copy-button" onClick={copy}>{copied ? 'Copied' : children}</button>
}

function OverviewTab({ overview, clients, messages, onRefresh, onChangeTab }) {
  const meta = overview?.meta || {}
  return <>
    <section className="messaging-hero-card">
      <div className="messaging-hero-copy">
        <span className="messaging-eyebrow"><i /> DEVELOPER PLATFORM · TEST ENVIRONMENT</span>
        <h2>Build and test WhatsApp integrations in Propulse.</h2>
        <p>Provision a test key for a partner company, send API requests to the sandbox, and review request logs from one workspace.</p>
        <div className="messaging-hero-actions">
          <button type="button" className="messaging-primary-button" onClick={() => onChangeTab('keys')}>Create test API key <b>→</b></button>
          <button type="button" className="messaging-secondary-button" onClick={() => onChangeTab('docs')}>Open API docs</button>
        </div>
      </div>
      <div className="messaging-orbit-art" aria-hidden="true">
        <div className="messaging-orbit messaging-orbit-one" />
        <div className="messaging-orbit messaging-orbit-two" />
        <div className="messaging-orbit-core"><span>p</span></div>
        <span className="messaging-orbit-node node-one">API</span>
        <span className="messaging-orbit-node node-two">WA</span>
        <span className="messaging-orbit-node node-three">↗</span>
      </div>
    </section>

    <section className="messaging-metrics-grid">
      <Metric label="Active test companies" value={overview?.activeClients ?? '—'} note="API keys currently enabled" icon="⌘" />
      <Metric label="Sandbox requests · 24h" value={overview?.messages24h ?? '—'} note="Requests safely simulated" icon="↗" />
      <Metric label="Test API keys" value={clients.length} note="Keys are stored as hashes" icon="⚿" />
      <Metric label="Recent API activity" value={messages.length} note="Latest requests in the log" icon="◷" />
    </section>

    <div className="messaging-overview-grid">
      <section className="messaging-panel">
        <div className="messaging-panel-heading">
          <div><span className="messaging-section-kicker">CHANNEL SETUP</span><h3>Meta connection</h3></div>
          <StatePill tone={meta.productionReady ? 'good' : 'warn'}>{meta.productionReady ? 'Ready for live setup' : 'Test mode'}</StatePill>
        </div>
        <p className="messaging-panel-intro">The Meta app is connected to the SG HOMES portfolio. The current account has a test number and is not ready for production delivery.</p>
        <div className="messaging-readiness">
          <div><span className="messaging-check">{meta.appIdConfigured ? '✓' : '1'}</span><div><strong>Meta app</strong><small>{meta.appIdConfigured ? 'App ID configured on the server' : 'App ID server setting is not configured'}</small></div><StatePill tone={meta.appIdConfigured ? 'good' : 'warn'}>{meta.appIdConfigured ? 'Configured' : 'Pending'}</StatePill></div>
          <div><span className="messaging-check">2</span><div><strong>Business phone number</strong><small>{meta.phoneNumberConfigured ? 'Production phone number is configured' : 'One Meta test number is available; no production number is connected'}</small></div><StatePill tone={meta.phoneNumberConfigured ? 'good' : 'warn'}>{meta.phoneNumberConfigured ? 'Configured' : 'Test number'}</StatePill></div>
          <div><span className="messaging-check">3</span><div><strong>Access and webhook secrets</strong><small>Keep these in the backend environment. Propulse never displays secret values here.</small></div><StatePill tone={meta.productionReady ? 'good' : 'warn'}>{meta.productionReady ? 'Configured' : 'Pending'}</StatePill></div>
        </div>
        <div className="messaging-info-note"><b>Sandbox protection</b><span>Every test request returns a simulated result. It does not send a WhatsApp message.</span></div>
        <button type="button" className="messaging-text-button" onClick={onRefresh}>Refresh connection status <span>↻</span></button>
      </section>

      <section className="messaging-panel">
        <div className="messaging-panel-heading">
          <div><span className="messaging-section-kicker">PARTNER ACCESS</span><h3>Test API keys</h3></div>
          <button type="button" className="messaging-small-button" onClick={() => onChangeTab('keys')}>Manage</button>
        </div>
        {clients.length ? <div className="messaging-client-list">
          {clients.slice(0, 4).map(client => <div className="messaging-client-row" key={client.id}>
            <span className="messaging-client-avatar">{client.companyName.slice(0, 1).toUpperCase()}</span>
            <div className="messaging-client-copy"><strong>{client.companyName}</strong><small>{client.keyPrefix}</small></div>
            <StatePill tone={client.status === 'active' ? 'good' : 'neutral'}>{client.status}</StatePill>
          </div>)}
        </div> : <div className="messaging-empty">
          <span>⌘</span><strong>No partner keys yet</strong><p>Create a test key to give a company a safe way to try the API.</p>
          <button type="button" className="messaging-secondary-button" onClick={() => onChangeTab('keys')}>Add a test company</button>
        </div>}
      </section>
    </div>

    <section className="messaging-panel">
      <div className="messaging-panel-heading">
        <div><span className="messaging-section-kicker">LATEST ACTIVITY</span><h3>Sandbox request log</h3></div>
        <button type="button" className="messaging-small-button" onClick={() => onChangeTab('playground')}>Open playground</button>
      </div>
      {messages.length ? <div className="messaging-table-wrap">
        <table className="messaging-table">
          <thead><tr><th>Request</th><th>Company</th><th>Recipient</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>{messages.slice(0, 6).map(message => <tr key={message.id}>
            <td><code>{message.id}</code></td><td>{message.companyName}</td><td>{message.recipient}</td>
            <td><StatePill tone="blue">Simulated</StatePill></td><td>{dateLabel(message.createdAt)}</td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="messaging-log-empty">No sandbox requests yet. Send one from the API playground to see it here.</div>}
    </section>
  </>
}

function KeysTab({ clients, loading, onCreate, onRevoke, issuedKey, onDismissKey }) {
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onCreate({ companyName, contactEmail })
      setCompanyName('')
      setContactEmail('')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return <>
    <section className="messaging-tab-intro">
      <div><span className="messaging-section-kicker">PARTNER ONBOARDING</span><h2>Test API keys</h2><p>Create one scoped sandbox key for each company. Keys can only create simulated messages and can be revoked at any time.</p></div>
      <StatePill tone="blue">Test only</StatePill>
    </section>

    {issuedKey && <section className="messaging-issued-key" role="status">
      <div className="messaging-issued-icon">✓</div>
      <div className="messaging-issued-content"><strong>Test key created</strong><p>Copy it now. Propulse stores only a one-way hash, so the key cannot be shown again.</p>
        <div className="messaging-secret-row"><code>{issuedKey.apiKey}</code><CopyButton value={issuedKey.apiKey}>Copy key</CopyButton></div>
      </div>
      <button type="button" className="messaging-dismiss" aria-label="Dismiss key notice" onClick={onDismissKey}>×</button>
    </section>}

    <div className="messaging-keys-layout">
      <section className="messaging-panel messaging-create-client">
        <div className="messaging-panel-heading"><div><span className="messaging-section-kicker">NEW PARTNER</span><h3>Provision a test key</h3></div><span className="messaging-form-mark">＋</span></div>
        <form onSubmit={submit}>
          <label>Company name<input required minLength="2" maxLength="160" value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Example: Acme Integrations" /></label>
          <label>Contact email <span>Optional</span><input type="email" maxLength="254" value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="developer@company.com" /></label>
          <div className="messaging-key-mode"><div><strong>Environment</strong><small>Test sandbox · 60 requests per minute</small></div><StatePill tone="blue">TEST</StatePill></div>
          {error && <div className="messaging-inline-error">{error}</div>}
          <button type="submit" className="messaging-primary-button" disabled={busy}>{busy ? 'Creating key…' : 'Create test API key'} <b>→</b></button>
        </form>
        <div className="messaging-security-footnote"><span>▣</span><small>API keys are hashed at rest, shown once, and never grant live WhatsApp delivery.</small></div>
      </section>

      <section className="messaging-panel messaging-key-list-panel">
        <div className="messaging-panel-heading"><div><span className="messaging-section-kicker">ACCESS CONTROL</span><h3>Partner keys <span className="messaging-count">{clients.length}</span></h3></div></div>
        {loading ? <div className="messaging-log-empty">Loading API keys…</div> : clients.length ? <div className="messaging-table-wrap">
          <table className="messaging-table">
            <thead><tr><th>Company</th><th>API key</th><th>Created</th><th>Last used</th><th>Status</th><th></th></tr></thead>
            <tbody>{clients.map(client => <tr key={client.id}>
              <td><strong>{client.companyName}</strong><small className="messaging-table-sub">{client.contactEmail || 'No contact email'}</small></td>
              <td><code>{client.keyPrefix}</code></td><td>{dateLabel(client.createdAt)}</td><td>{dateLabel(client.lastUsedAt)}</td>
              <td><StatePill tone={client.status === 'active' ? 'good' : 'neutral'}>{client.status}</StatePill></td>
              <td>{client.status === 'active' && <button type="button" className="messaging-revoke" onClick={() => onRevoke(client)} aria-label={'Revoke key for ' + client.companyName}>Revoke</button>}</td>
            </tr>)}</tbody>
          </table>
        </div> : <div className="messaging-empty compact"><span>⚿</span><strong>No companies onboarded</strong><p>Partner test keys will appear here.</p></div>}
      </section>
    </div>
    <div className="messaging-info-note"><b>Partner data boundary</b><span>Each API key is isolated to its company. The sandbox stores a masked phone number and message length for debugging, never the message text.</span></div>
  </>
}

function PlaygroundTab({ clients, issuedKey }) {
  const activeClients = clients.filter(client => client.status === 'active')
  const [apiKey, setApiKey] = useState(issuedKey?.apiKey || '')
  const [to, setTo] = useState('+919876543210')
  const [message, setMessage] = useState('Hello from the Propulse Messaging test sandbox.')
  const [response, setResponse] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (issuedKey?.apiKey) setApiKey(issuedKey.apiKey) }, [issuedKey?.apiKey])

  async function send(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setResponse(null)
    try {
      const result = await fetch(API_BASE_URL + '/v1/messaging/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Propulse-API-Key': apiKey },
        credentials: 'omit',
        body: JSON.stringify({ to, text: message }),
      })
      const payload = await result.json().catch(() => ({}))
      if (!result.ok) throw new Error(payload.error || 'API request failed')
      setResponse(payload)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return <>
    <section className="messaging-tab-intro">
      <div><span className="messaging-section-kicker">REQUEST BUILDER</span><h2>API playground</h2><p>Try the same endpoint that partner companies use. Requests are simulated and do not reach WhatsApp.</p></div>
      <StatePill tone="blue">Sandbox safe</StatePill>
    </section>
    <div className="messaging-playground-grid">
      <section className="messaging-panel messaging-request-panel">
        <div className="messaging-panel-heading"><div><span className="messaging-section-kicker">POST REQUEST</span><h3>Send a test message</h3></div><span className="messaging-method">POST</span></div>
        <form onSubmit={send}>
          <label>Test API key<input type="password" autoComplete="off" required value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={activeClients.length ? 'Paste a one-time test key' : 'Create a test key first'} /></label>
          <label>Recipient <span>E.164 format</span><input required value={to} onChange={event => setTo(event.target.value)} placeholder="+919876543210" /></label>
          <label>Message text<textarea required maxLength="4096" value={message} onChange={event => setMessage(event.target.value)} rows="4" /></label>
          {error && <div className="messaging-inline-error">{error}</div>}
          <button className="messaging-primary-button" type="submit" disabled={busy}>{busy ? 'Sending test request…' : 'Send sandbox request'} <b>→</b></button>
        </form>
      </section>
      <section className="messaging-panel messaging-response-panel">
        <div className="messaging-panel-heading"><div><span className="messaging-section-kicker">RESPONSE</span><h3>Request result</h3></div><StatePill tone={response ? 'good' : 'neutral'}>{response ? '200 / 202' : 'Waiting'}</StatePill></div>
        {response ? <pre className="messaging-response-code"><code>{JSON.stringify(response, null, 2)}</code></pre> : <div className="messaging-response-empty"><span>↗</span><strong>Response will appear here</strong><p>Use a test key to inspect the sandbox response and request ID.</p></div>}
        <div className="messaging-simulation-warning"><b>⚠ Test mode only</b><span>A successful response means Propulse accepted the simulated request. It does not mean a message was delivered.</span></div>
      </section>
    </div>
  </>
}

function DocsTab({ overview }) {
  const endpoint = overview?.endpoints?.messages || (window.location.origin + '/api/v1/messaging/messages')
  const sample = 'curl -X POST ' + endpoint + ' \\\n  -H "X-Propulse-API-Key: pma_test_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: order-123" \\\n  -d \'{"to":"+919876543210","text":"Hello from my app"}\''
  return <>
    <section className="messaging-tab-intro">
      <div><span className="messaging-section-kicker">DEVELOPER DOCUMENTATION</span><h2>Connect to Propulse Messaging</h2><p>Use the test endpoint to validate your integration before connecting live WhatsApp business assets.</p></div>
      <CopyButton value={sample}>Copy cURL</CopyButton>
    </section>
    <div className="messaging-docs-grid">
      <section className="messaging-panel">
        <span className="messaging-section-kicker">01 · AUTHENTICATION</span><h3>Use a test key</h3>
        <p>Send your key with the X-Propulse-API-Key header. Propulse stores only a one-way hash and shows the secret once when it is created.</p>
        <pre className="messaging-code-block"><code>X-Propulse-API-Key: pma_test_YOUR_KEY</code></pre>
      </section>
      <section className="messaging-panel">
        <span className="messaging-section-kicker">02 · SEND A TEST MESSAGE</span><h3>POST /messages</h3>
        <p>Provide the recipient in E.164 format and a text body. The sandbox validates the request and returns a simulated message ID.</p>
        <pre className="messaging-code-block"><code>{sample}</code></pre>
      </section>
      <section className="messaging-panel messaging-docs-wide">
        <span className="messaging-section-kicker">03 · RESPONSE</span><h3>Check the result</h3>
        <pre className="messaging-response-code"><code>{JSON.stringify({ id: 'msg_123', status: 'simulated', environment: 'test', delivered: false, simulated: true }, null, 2)}</code></pre>
        <div className="messaging-info-note"><b>Delivery is disabled in test mode</b><span>This API is a partner integration sandbox. Live WhatsApp delivery requires a production phone number, approved Meta setup, and server-side secrets.</span></div>
      </section>
      <section className="messaging-panel">
        <span className="messaging-section-kicker">RATE LIMIT</span><h3>60 requests per minute</h3><p>Rate limits are enforced per partner key. A 429 response includes Retry-After.</p>
      </section>
      <section className="messaging-panel">
        <span className="messaging-section-kicker">IDEMPOTENCY</span><h3>Retry safely</h3><p>Set an Idempotency-Key for a request. Repeating the same key returns the original simulated message ID.</p>
      </section>
    </div>
  </>
}

export default function AdminMessagingApi() {
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [clients, setClients] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [issuedKey, setIssuedKey] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const results = await Promise.all([
        authRequest('/admin/messaging/overview'),
        authRequest('/admin/messaging/clients'),
        authRequest('/admin/messaging/messages'),
      ])
      setOverview(results[0])
      setClients(results[1]?.clients || [])
      setMessages(results[2]?.messages || [])
    } catch (err) {
      setError(errorText(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function createClient(payload) {
    const result = await authRequest('/admin/messaging/clients', { method: 'POST', body: payload })
    setIssuedKey({ apiKey: result.apiKey, companyName: result.client?.companyName })
    await load()
  }

  async function revokeClient(client) {
    if (!window.confirm('Revoke the test API key for ' + client.companyName + '? Their next API request will be rejected.')) return
    try {
      await authRequest('/admin/messaging/clients/' + client.id + '/revoke', { method: 'POST', body: {} })
      if (issuedKey && client.companyName === issuedKey.companyName) setIssuedKey(null)
      await load()
    } catch (err) {
      setError(errorText(err))
    }
  }

  const tabs = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: '⌂' },
    { id: 'keys', label: 'API keys', icon: '⚿' },
    { id: 'playground', label: 'Playground', icon: '↗' },
    { id: 'docs', label: 'API docs', icon: '⌘' },
  ], [])

  return <main className="admin-messaging-api">
    <header className="messaging-page-heading">
      <div><span className="messaging-breadcrumb">ADMIN <b>/</b> PLATFORM TOOLS</span><h1>Messaging API</h1><p>Partner onboarding, test keys, and a safe WhatsApp API sandbox.</p></div>
      <div className="messaging-heading-actions"><StatePill tone="blue">TEST ENVIRONMENT</StatePill><button type="button" className="messaging-refresh" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button></div>
    </header>

    {error && <div className="messaging-page-error"><strong>Messaging data unavailable</strong><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}

    <nav className="messaging-tabs" aria-label="Messaging API sections">
      {tabs.map(item => <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><i>{item.icon}</i>{item.label}</button>)}
    </nav>

    {tab === 'overview' && <OverviewTab overview={overview} clients={clients} messages={messages} onRefresh={() => void load()} onChangeTab={setTab} />}
    {tab === 'keys' && <KeysTab clients={clients} loading={loading} onCreate={createClient} onRevoke={revokeClient} issuedKey={issuedKey} onDismissKey={() => setIssuedKey(null)} />}
    {tab === 'playground' && <PlaygroundTab clients={clients} issuedKey={issuedKey} />}
    {tab === 'docs' && <DocsTab overview={overview} />}

    <footer className="messaging-page-foot"><span><i /> Propulse Messaging API</span><span>Test requests are isolated and simulated.</span></footer>
  </main>
}
