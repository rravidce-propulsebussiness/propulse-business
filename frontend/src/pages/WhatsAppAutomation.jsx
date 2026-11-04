import { useCallback, useEffect, useMemo, useState } from 'react'
import { authRequest } from '../utils/auth'
import UserHeader from '../components/UserHeader'
import './WhatsAppAutomation.css'

const blankRule = { name: '', triggerEvent: 'lead.created', messageTemplate: 'Hi {{name}}, we received your enquiry. Our team will contact you soon.', isEnabled: true }
const dateLabel = value => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}
const errorText = error => error?.message || 'Something went wrong. Please try again.'

function Pill({ children, tone = 'neutral' }) {
  return <span className={'wa-pill ' + tone}><i />{children}</span>
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return <button className="wa-copy" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
}

export default function WhatsAppAutomation() {
  const [overview, setOverview] = useState(null)
  const [rules, setRules] = useState([])
  const [keys, setKeys] = useState([])
  const [runs, setRuns] = useState([])
  const [form, setForm] = useState(blankRule)
  const [editingId, setEditingId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [testRuleId, setTestRuleId] = useState('')
  const [recipient, setRecipient] = useState('+919876543210')
  const [testName, setTestName] = useState('Test Customer')
  const [issuedKey, setIssuedKey] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const results = await Promise.all([
        authRequest('/whatsapp-automation/overview'),
        authRequest('/whatsapp-automation/rules'),
        authRequest('/whatsapp-automation/keys'),
        authRequest('/whatsapp-automation/runs'),
      ])
      setOverview(results[0])
      setRules(results[1]?.rules || [])
      setTestRuleId(current => current || results[1]?.rules?.[0]?.id || '')
      setKeys(results[2]?.clients || [])
      setRuns(results[3]?.runs || [])
      setCompanyName(current => current || results[0]?.businessName || '')
    } catch (err) {
      setError(errorText(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  function changeForm(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  function startEdit(rule) {
    setEditingId(rule.id)
    setForm({ name: rule.name, triggerEvent: rule.triggerEvent, messageTemplate: rule.messageTemplate, isEnabled: rule.isEnabled })
    setNotice('')
  }

  function resetForm() {
    setEditingId('')
    setForm(blankRule)
  }

  async function saveRule(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await authRequest(editingId ? '/whatsapp-automation/rules/' + editingId : '/whatsapp-automation/rules', {
        method: editingId ? 'PUT' : 'POST',
        body: form,
      })
      setNotice(editingId ? 'Automation updated in test mode.' : 'Automation created in test mode.')
      resetForm()
      await load()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function toggleRule(rule) {
    setError('')
    try {
      await authRequest('/whatsapp-automation/rules/' + rule.id, {
        method: 'PUT',
        body: { name: rule.name, triggerEvent: rule.triggerEvent, messageTemplate: rule.messageTemplate, isEnabled: !rule.isEnabled },
      })
      await load()
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function removeRule(rule) {
    if (!window.confirm('Delete the test automation "' + rule.name + '"?')) return
    setError('')
    try {
      await authRequest('/whatsapp-automation/rules/' + rule.id, { method: 'DELETE' })
      if (editingId === rule.id) resetForm()
      await load()
    } catch (err) {
      setError(errorText(err))
    }
  }

  async function runTest(event) {
    event.preventDefault()
    if (!rules.length) {
      setError('Create an automation before running a test.')
      return
    }
    const rule = rules.find(item => item.id === testRuleId) || rules[0]
    setBusy(true)
    setError('')
    setTestResult(null)
    try {
      const result = await authRequest('/whatsapp-automation/rules/' + rule.id + '/test', {
        method: 'POST',
        body: { to: recipient, data: { name: testName, company: companyName } },
      })
      setTestResult({ ...result, ruleId: rule.id })
      await load()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function createKey(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await authRequest('/whatsapp-automation/keys', { method: 'POST', body: { companyName } })
      setIssuedKey(result.apiKey)
      setNotice('Test API key created. Copy it now; it will only be shown once.')
      await load()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  async function revokeKey(client) {
    if (!window.confirm('Revoke this API key? Requests using it will stop working.')) return
    try {
      await authRequest('/whatsapp-automation/keys/' + client.id + '/revoke', { method: 'POST', body: {} })
      await load()
    } catch (err) {
      setError(errorText(err))
    }
  }

  const endpoint = useMemo(() => window.location.origin + '/api/v1/messaging/automations/trigger', [])
  const sample = 'curl -X POST ' + endpoint + ' \\\n  -H "X-Propulse-API-Key: pma_test_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"event":"lead.created","to":"+919876543210","data":{"name":"Asha"}}\''

  return <div className="wa-page">
    <UserHeader />
    <main className="wa-shell">
      <header className="wa-heading">
        <div><span className="wa-kicker">BUSINESS WORKSPACE / MESSAGING</span><h1>WhatsApp automation</h1><p>Create event-based message flows for your company and test them from your own website or app.</p></div>
        <Pill tone="blue">TEST MODE</Pill>
      </header>

      {error && <div className="wa-alert error" role="alert"><strong>Action needs attention</strong><span>{error}</span><button type="button" onClick={() => void load()}>Retry</button></div>}
      {notice && <div className="wa-alert success" role="status"><strong>Done</strong><span>{notice}</span><button type="button" onClick={() => setNotice('')}>×</button></div>}

      <section className="wa-live-banner">
        <span className="wa-live-icon">◉</span><div><strong>Automation workspace is ready for testing</strong><p>Test runs are simulated. No WhatsApp message is sent and live delivery is disabled.</p></div><Pill tone="warn">Meta not connected</Pill>
      </section>

      <section className="wa-stats">
        <article><small>Automations</small><strong>{overview?.automationCount ?? '—'}</strong><span>Owned by this account</span></article>
        <article><small>Active test keys</small><strong>{overview?.activeKeys ?? '—'}</strong><span>Keys for your company</span></article>
        <article><small>Test runs · 24h</small><strong>{overview?.runs24h ?? '—'}</strong><span>Simulated events</span></article>
      </section>

      <div className="wa-main-grid">
        <section className="wa-card wa-builder">
          <div className="wa-card-heading"><div><span className="wa-kicker">AUTOMATION BUILDER</span><h2>{editingId ? 'Edit automation' : 'Create an automation'}</h2><p>Choose an event, then write the message your integration should send.</p></div><span className="wa-step">01</span></div>
          <form onSubmit={saveRule} className="wa-form">
            <label>Automation name<input required minLength="2" maxLength="120" value={form.name} onChange={e => changeForm('name', e.target.value)} placeholder="New lead follow-up" /></label>
            <label>Trigger event<select value={form.triggerEvent} onChange={e => changeForm('triggerEvent', e.target.value)}>
              <option value="lead.created">New lead · lead.created</option>
              <option value="appointment.booked">Appointment booked · appointment.booked</option>
              <option value="payment.received">Payment received · payment.received</option>
              <option value="custom.event">Custom event · custom.event</option>
            </select></label>
            <label>Message template<textarea required maxLength="4096" rows="5" value={form.messageTemplate} onChange={e => changeForm('messageTemplate', e.target.value)} placeholder="Use variables such as {{name}} and {{company}}." /></label>
            <div className="wa-template-tip"><b>Personalize with variables</b><span>Try <code>{'{{name}}'}</code> or <code>{'{{company}}'}</code>. Values come from your test event.</span></div>
            <label className="wa-switch-row"><span><strong>Enable for test events</strong><small>Enabled test rules respond to calls made with your API key.</small></span><input type="checkbox" checked={form.isEnabled} onChange={e => changeForm('isEnabled', e.target.checked)} /></label>
            <div className="wa-form-actions"><button className="wa-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Save test automation'}</button>{editingId && <button type="button" className="wa-secondary" onClick={resetForm}>Cancel</button>}</div>
          </form>
        </section>

        <section className="wa-card wa-test-card">
          <div className="wa-card-heading"><div><span className="wa-kicker">SAFE SIMULATION</span><h2>Run a test</h2><p>Preview one automation without contacting WhatsApp.</p></div><span className="wa-step green">02</span></div>
          <form onSubmit={runTest} className="wa-form">
            <label>Automation to test<select required value={testRuleId} onChange={e => setTestRuleId(e.target.value)}>{rules.map(rule => <option value={rule.id} key={rule.id}>{rule.name}</option>)}</select></label>
            <label>Test recipient<input required value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="+919876543210" /></label>
            <label>Sample name<input value={testName} onChange={e => setTestName(e.target.value)} /></label>
            <button className="wa-primary" type="submit" disabled={busy || !rules.length}>{busy ? 'Running simulation…' : 'Run test automation'}</button>
          </form>
          {testResult && <div className="wa-test-result"><div><Pill tone="blue">SIMULATED</Pill><strong>{testResult.automation}</strong></div><p>{testResult.preview}</p><small>Recipient {testResult.recipient} · No WhatsApp message was sent.</small></div>}
          {!testResult && <div className="wa-safe-note"><b>Test data stays in your workspace</b><span>History stores the masked recipient and message length, not the rendered message.</span></div>}
        </section>
      </div>

      <section className="wa-card">
        <div className="wa-card-heading"><div><span className="wa-kicker">YOUR WORKSPACE</span><h2>Automations <small>{rules.length}</small></h2></div><button className="wa-refresh" type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : '↻ Refresh'}</button></div>
        {rules.length ? <div className="wa-rule-list">{rules.map(rule => <article className="wa-rule" key={rule.id}>
          <div className="wa-rule-mark">↗</div><div className="wa-rule-copy"><strong>{rule.name}</strong><span>When <code>{rule.triggerEvent}</code></span><p>{rule.messageTemplate}</p></div>
          <Pill tone={rule.isEnabled ? 'good' : 'neutral'}>{rule.isEnabled ? 'Test enabled' : 'Paused'}</Pill>
          <button type="button" className="wa-inline-button" onClick={() => void toggleRule(rule)}>{rule.isEnabled ? 'Pause' : 'Enable'}</button>
          <button type="button" className="wa-inline-button" onClick={() => startEdit(rule)}>Edit</button>
          <button type="button" className="wa-inline-button danger" onClick={() => void removeRule(rule)}>Delete</button>
        </article>)}</div> : <div className="wa-empty"><span>↗</span><strong>No automations yet</strong><p>Create your first event-based test flow above.</p></div>}
      </section>

      <div className="wa-bottom-grid">
        <section className="wa-card">
          <div className="wa-card-heading"><div><span className="wa-kicker">DEVELOPER ACCESS</span><h2>Your test API keys</h2><p>Issue a key for your app or an integration partner.</p></div><span className="wa-step purple">03</span></div>
          {issuedKey && <div className="wa-issued-key"><div><strong>Copy this key now</strong><span>It is shown once and stored only as a one-way hash.</span><code>{issuedKey}</code></div><CopyButton value={issuedKey} /><button type="button" className="wa-close" onClick={() => setIssuedKey(null)} aria-label="Dismiss key">×</button></div>}
          <form onSubmit={createKey} className="wa-key-form"><label>Company or workspace name<input required minLength="2" maxLength="160" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your company name" /></label><button className="wa-secondary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create test API key'}</button></form>
          {keys.length ? <div className="wa-key-list">{keys.map(client => <div className="wa-key-row" key={client.id}><div><strong>{client.companyName}</strong><code>{client.keyPrefix}</code></div><Pill tone={client.status === 'active' ? 'good' : 'neutral'}>{client.status}</Pill>{client.status === 'active' && <button type="button" className="wa-inline-button danger" onClick={() => void revokeKey(client)}>Revoke</button>}</div>)}</div> : <div className="wa-small-empty">Create a test key to let your application call the automation endpoint.</div>}
        </section>

        <section className="wa-card wa-docs">
          <div className="wa-card-heading"><div><span className="wa-kicker">CONNECT YOUR APP</span><h2>Trigger from an event</h2><p>POST an event when your app creates a lead, books an appointment, or receives a payment.</p></div></div>
          <div className="wa-endpoint"><span>POST</span><code>/api/v1/messaging/automations/trigger</code></div>
          <pre><code>{sample}</code></pre>
          <div className="wa-safe-note"><b>Live WhatsApp connection is not enabled</b><span>This endpoint runs matching rules in the sandbox. A production Meta connection requires the app review and each company’s WhatsApp Business setup.</span></div>
        </section>
      </div>

      <section className="wa-card">
        <div className="wa-card-heading"><div><span className="wa-kicker">AUDIT TRAIL</span><h2>Recent test runs</h2></div><Pill tone="blue">Private to your account</Pill></div>
        {runs.length ? <div className="wa-run-table-wrap"><table className="wa-run-table"><thead><tr><th>Automation</th><th>Event</th><th>Recipient</th><th>Result</th><th>Time</th></tr></thead><tbody>{runs.map(run => <tr key={run.id}><td>{run.automation}</td><td><code>{run.event}</code></td><td>{run.recipient}</td><td><Pill tone="blue">Simulated</Pill></td><td>{dateLabel(run.createdAt)}</td></tr>)}</tbody></table></div> : <div className="wa-small-empty">Your test event history will appear here.</div>}
      </section>

      <footer className="wa-footer"><span>Propulse Messaging · Company workspace</span><span>All requests are test-only and simulated.</span></footer>
    </main>
  </div>
}
