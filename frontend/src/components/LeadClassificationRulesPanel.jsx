import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'
import './LeadClassificationRulesPanel.css'

const operatorLabels = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', contains: 'contains', not_contains: 'does not contain' }

export default function LeadClassificationRulesPanel({ onStatusChange }) {
  const [industries, setIndustries] = useState([])
  const [settings, setSettings] = useState(null)
  const [draft, setDraft] = useState(null)
  const [industryId, setIndustryId] = useState('')
  const [accessSettings, setAccessSettings] = useState(null)
  const [earlyAccessDays, setEarlyAccessDays] = useState('2')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      authRequest('/leads/classification/settings'),
      authRequest('/industries'),
      authRequest('/leads/access-settings'),
    ]).then(([rules, catalog, access]) => {
      if (!active) return
      setSettings(rules)
      setDraft(rules)
      setIndustries(Array.isArray(catalog) ? catalog : [])
      setAccessSettings(access)
      setEarlyAccessDays(String(access?.premium?.proEarlyAccessDays ?? 2))
    }).catch(error => {
      if (active) setMessage(error.message || 'Unable to load lead classification rules')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!settings) return
    setDraft(industryId ? settings.industryRules?.[industryId] || settings : settings)
  }, [settings, industryId])

  useEffect(() => {
    onStatusChange?.({ enabled: Boolean(draft?.enabled) })
  }, [draft?.enabled, onStatusChange])

  const updateCondition = (tier, index, key, value) => setDraft(current => ({
    ...current,
    [tier]: current[tier].map((condition, position) =>
      position === index ? { ...condition, [key]: value } : condition)
  }))

  const addCondition = tier => setDraft(current => ({
    ...current,
    [tier]: [...(current[tier] || []), { field: '', operator: 'gt', value: '', fieldType: 'number' }]
  }))

  const removeCondition = (tier, index) => setDraft(current => ({
    ...current,
    [tier]: current[tier].filter((_, position) => position !== index)
  }))

  async function saveRules() {
    if (!draft) return
    if (!accessSettings?.basic || !accessSettings?.premium) {
      setMessage('Settings are still loading. Try saving again in a moment.')
      return
    }
    const days = Number(earlyAccessDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setMessage('Pro Early Access must be between 1 and 365 days.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const saved = await authRequest('/leads/classification/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...draft, industryId: industryId || null })
      })
      setSettings(saved)
      setDraft(industryId ? saved.industryRules?.[industryId] || saved : saved)
      if (days !== Number(accessSettings.premium.proEarlyAccessDays ?? 2)) {
        const savedAccess = await authRequest('/leads/access-settings', {
          method: 'PUT',
          body: JSON.stringify({
            basic: accessSettings.basic,
            premium: { ...accessSettings.premium, proEarlyAccessDays: days }
          })
        })
        setAccessSettings(savedAccess)
        setEarlyAccessDays(String(savedAccess?.premium?.proEarlyAccessDays ?? days))
      }
      setMessage(industryId ? 'Industry rules saved' : 'Classification rules saved')
    } catch (error) {
      setMessage(error.message || 'Unable to save lead settings')
    } finally {
      setBusy(false)
    }
  }

  const summarize = (conditions, mode) => {
    if (!conditions?.length) return 'No conditions configured yet.'
    return conditions.slice(0, 2).map(condition => {
      const field = condition.field || 'Question'
      const operator = operatorLabels[condition.operator] || '>'
      const value = condition.value || 'value'
      return fieldTypeIsText(condition.fieldType) ? field + ' ' + operator + ' “' + value + '”' : field + ' ' + operator + ' ' + value
    }).join(mode === 'any' ? ' or ' : ' and ')
  }

  const fieldTypeIsText = type => type === 'text'
  const conditionRows = (tier, conditions, prefix) => (conditions || []).map((condition, index) => (
    <div className="mla-condition-row" key={prefix + '-' + index}>
      <input aria-label={prefix + ' field ' + (index + 1)} value={condition.field || ''} placeholder="Form question, e.g. Plot Size" onChange={event => updateCondition(tier, index, 'field', event.target.value)} />
      <select aria-label={prefix + ' comparison ' + (index + 1)} value={condition.operator || 'gt'} onChange={event => updateCondition(tier, index, 'operator', event.target.value)}>
        {condition.fieldType === 'text'
          ? <><option value="eq">equals</option><option value="contains">contains</option><option value="not_contains">does not contain</option></>
          : <><option value="gt">greater than</option><option value="gte">at least</option><option value="lt">less than</option><option value="lte">at most</option><option value="eq">equals</option></>}
      </select>
      <input aria-label={prefix + ' threshold ' + (index + 1)} value={condition.value ?? ''} placeholder={condition.fieldType === 'text' ? 'Answer text' : 'Threshold'} onChange={event => updateCondition(tier, index, 'value', event.target.value)} />
      <select aria-label={prefix + ' value type ' + (index + 1)} value={condition.fieldType || 'number'} onChange={event => {
        const fieldType = event.target.value
        setDraft(value => ({ ...value, [tier]: value[tier].map((item, position) => position === index
          ? { ...item, fieldType, operator: fieldType === 'text' ? 'eq' : item.operator }
          : item) }))
      }}>
        <option value="number">Number</option>
        <option value="floors">Floors (G+3 = 4)</option>
        <option value="text">Text / choice</option>
      </select>
      <button type="button" className="mla-condition-remove" aria-label={'Remove ' + prefix.toLowerCase() + ' condition ' + (index + 1)} onClick={() => removeCondition(tier, index)}>Remove</button>
    </div>
  ))

  return <section className="mla-classification">
    {!draft ? <div className="mla-rules-loading">Loading classification rules…</div> : <>
      <div className="mla-classification-layout">
        <section className="mla-rule-builder">
          <header className="mla-rules-heading">
            <div>
              <span className="mla-rules-kicker">BASIC / PREMIUM / EXCLUSIVE CLASSIFICATION</span>
              <h2>Rules Configuration</h2>
            </div>
            <label className="mla-auto-toggle">
              <span>Auto-classify new imports</span>
              <input type="checkbox" checked={Boolean(draft.enabled)} onChange={event => setDraft(value => ({ ...value, enabled: event.target.checked }))} />
              <i aria-hidden="true" />
            </label>
          </header>

          <div className="mla-rule-settings-row">
            <label className="mla-meta-field mla-industry-field">
              <span>Rules for</span>
              <select aria-label="Classification industry" value={industryId} onChange={event => setIndustryId(event.target.value)}>
                <option value="">All industries (fallback)</option>
                {industries.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
              </select>
            </label>
            <label className="mla-meta-field mla-match-field">
              <span>Premium when</span>
              <select aria-label="Premium match mode" value={draft.matchMode || 'all'} onChange={event => setDraft(value => ({ ...value, matchMode: event.target.value }))}>
                <option value="all">All conditions match (AND)</option>
                <option value="any">Any condition matches (OR)</option>
              </select>
            </label>
          </div>
          {industryId && !settings?.industryRules?.[industryId] && <p className="mla-inherit-note">This industry inherits the fallback until you save its own rules.</p>}

          <section className="mla-rule-group">
            <div className="mla-rule-group-heading">
              <strong>Premium Rules</strong>
              <span>classifies lead as Premium</span>
            </div>
            <div className="mla-condition-list">{conditionRows('premiumConditions', draft.premiumConditions, 'Premium')}</div>
          </section>

          <section className="mla-exclusive-card" aria-label="Exclusive lead classification">
            <header className="mla-exclusive-heading">
              <span className="mla-crown" aria-hidden="true">♛</span>
              <div>
                <h3>EXCLUSIVE · ABOVE PREMIUM</h3>
              </div>
              <label className="mla-exclusive-toggle">
                <span>Enable Exclusive classification</span>
                <input type="checkbox" checked={Boolean(draft.exclusiveEnabled)} onChange={event => setDraft(value => ({ ...value, exclusiveEnabled: event.target.checked }))} />
                <i aria-hidden="true" />
              </label>
            </header>

            <label className="mla-meta-field mla-exclusive-match">
              <span>Exclusive when</span>
              <select aria-label="Exclusive match mode" value={draft.exclusiveMatchMode || 'all'} onChange={event => setDraft(value => ({ ...value, exclusiveMatchMode: event.target.value }))}>
                <option value="all">All exclusive conditions match (AND)</option>
                <option value="any">Any exclusive condition matches (OR)</option>
              </select>
            </label>

            <div className="mla-rule-group mla-exclusive-rules">
              <div className="mla-rule-group-heading">
                <strong>Exclusive Rules</strong>
              </div>
              <div className="mla-condition-list">{conditionRows('exclusiveConditions', draft.exclusiveConditions, 'Exclusive')}</div>
            </div>

            <div className="mla-access-window">
              <label className="mla-early-access-label" htmlFor="mla-early-access-days">Pro Early Access</label>
              <div className="mla-access-input-wrap">
                <input id="mla-early-access-days" aria-label="Pro Early Access window in days" type="number" min="1" max="365" value={earlyAccessDays} onChange={event => setEarlyAccessDays(event.target.value)} />
                <span>days</span>
              </div>
            </div>
            <div className="mla-exclusive-footer">
              <button type="button" className="mla-add-exclusive" disabled={(draft.exclusiveConditions || []).length >= 12} onClick={() => addCondition('exclusiveConditions')}>＋ Add Exclusive condition</button>
            </div>
          </section>

          <footer className="mla-rule-actions">
            <button type="button" className="mla-add-condition" disabled={(draft.premiumConditions || []).length >= 12} onClick={() => addCondition('premiumConditions')}>＋ Add condition</button>
            <button type="button" className="mla-save-rules" disabled={busy} onClick={saveRules}>{busy ? 'Saving…' : 'Save classification rules'}</button>
          </footer>
          {message && <p role="status" className={'mla-inline-message ' + (message.includes('Unable') ? 'error' : 'success')}>{message}</p>}
        </section>

        <aside className="mla-classification-preview">
          <header>
            <h2>Classification preview</h2>
          </header>
          <ol className="mla-tier-flow">
            <li className="mla-tier-step basic">
              <span className="mla-tier-dot" />
              <article>
                <strong>Basic</strong>
              </article>
            </li>
            <li className="mla-tier-step premium">
              <span className="mla-tier-dot" />
              <article>
                <strong>Premium</strong>
                {draft.premiumConditions?.length > 0 && <small>{summarize(draft.premiumConditions, draft.matchMode)}</small>}
              </article>
            </li>
            <li className={'mla-tier-step exclusive ' + (draft.exclusiveEnabled ? 'enabled' : 'disabled')}>
              <span className="mla-tier-dot" />
              <article>
                <strong><span aria-hidden="true">♛</span> Exclusive</strong>
                {draft.exclusiveEnabled && draft.exclusiveConditions?.length > 0 && <small>{summarize(draft.exclusiveConditions, draft.exclusiveMatchMode)}</small>}
                {draft.exclusiveEnabled && <p><b>✓</b> {earlyAccessDays || 2}-day Pro Early Access.</p>}
              </article>
            </li>
          </ol>
        </aside>
      </div>
    </>}
  </section>
}
