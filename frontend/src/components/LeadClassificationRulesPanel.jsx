import { useEffect, useMemo, useState } from 'react'
import { authRequest } from '../utils/auth'
import './LeadClassificationRulesPanel.css'

const operatorLabels = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', contains: 'contains', not_contains: 'does not contain' }
const freshCondition = () => ({ field: '', operator: 'gt', value: '', fieldType: 'number' })
const freshRule = settings => ({
  enabled: Boolean(settings?.enabled ?? true),
  matchMode: settings?.matchMode || 'all',
  premiumConditions: [freshCondition()],
  exclusiveEnabled: false,
  exclusiveMatchMode: 'all',
  exclusiveConditions: []
})
const cloneRule = value => ({
  enabled: Boolean(value?.enabled),
  matchMode: value?.matchMode || 'all',
  premiumConditions: Array.isArray(value?.premiumConditions) ? value.premiumConditions.map(item => ({ ...item })) : [],
  exclusiveEnabled: Boolean(value?.exclusiveEnabled),
  exclusiveMatchMode: value?.exclusiveMatchMode || 'all',
  exclusiveConditions: Array.isArray(value?.exclusiveConditions) ? value.exclusiveConditions.map(item => ({ ...item })) : []
})

export default function LeadClassificationRulesPanel({ onStatusChange }) {
  const [industries, setIndustries] = useState([])
  const [settings, setSettings] = useState(null)
  const [accessSettings, setAccessSettings] = useState(null)
  const [draft, setDraft] = useState(null)
  const [industryId, setIndustryId] = useState('')
  const [earlyAccessDays, setEarlyAccessDays] = useState('2')
  const [editorMode, setEditorMode] = useState('')
  const [expandedRuleKey, setExpandedRuleKey] = useState('')
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
      setIndustries(Array.isArray(catalog) ? catalog : [])
      setAccessSettings(access)
      setEarlyAccessDays(String(access?.premium?.proEarlyAccessDays ?? 2))
    }).catch(error => {
      if (active) setMessage(error.message || 'Unable to load rules')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    onStatusChange?.({ enabled: Boolean(settings?.enabled) })
  }, [settings?.enabled, onStatusChange])

  const savedRules = useMemo(() => {
    if (!settings) return []
    const items = [{ key: 'fallback', industryId: '', name: 'All industries', rule: settings }]
    Object.entries(settings.industryRules || {}).forEach(([id, rule]) => {
      const industry = industries.find(item => String(item.id) === String(id))
      items.push({ key: String(id), industryId: String(id), name: industry?.name || 'Industry ' + id, rule })
    })
    return items
  }, [settings, industries])

  const beginCreate = () => {
    setIndustryId('')
    setDraft(freshRule(settings))
    setEditorMode('create')
    setExpandedRuleKey('')
    setMessage('')
  }
  const beginEdit = rule => {
    setIndustryId(rule.industryId)
    setDraft(cloneRule(rule.rule))
    setEarlyAccessDays(String(accessSettings?.premium?.proEarlyAccessDays ?? 2))
    setEditorMode('edit')
    setExpandedRuleKey(rule.key)
    setMessage('')
  }
  const cancelEdit = () => {
    setEditorMode('')
    setDraft(null)
    setIndustryId('')
    setMessage('')
  }

  const updateCondition = (tier, index, key, value) => setDraft(current => ({
    ...current,
    [tier]: current[tier].map((condition, position) =>
      position === index ? { ...condition, [key]: value } : condition)
  }))
  const addCondition = tier => setDraft(current => ({
    ...current,
    [tier]: [...(current[tier] || []), freshCondition()]
  }))
  const removeCondition = (tier, index) => setDraft(current => ({
    ...current,
    [tier]: current[tier].filter((_, position) => position !== index)
  }))

  async function saveRules() {
    if (!draft || !settings) return
    if (!accessSettings?.basic || !accessSettings?.premium) {
      setMessage('Settings are still loading.')
      return
    }
    const days = Number(earlyAccessDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setMessage('Pro Early Access must be between 1 and 365 days.')
      return
    }
    if (!(draft.premiumConditions || []).length || draft.premiumConditions.some(item => !item.field.trim() || String(item.value).trim() === '')) {
      setMessage('Complete each Premium condition before saving.')
      return
    }
    if (draft.exclusiveEnabled && (draft.exclusiveConditions || []).some(item => !item.field.trim() || String(item.value).trim() === '')) {
      setMessage('Complete each Exclusive condition before saving.')
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
      setEditorMode('')
      setDraft(null)
      setIndustryId('')
      setMessage('')
    } catch (error) {
      setMessage(error.message || 'Unable to save rules')
    } finally {
      setBusy(false)
    }
  }

  const summarize = (conditions, mode) => {
    if (!conditions?.length) return 'No conditions'
    const values = conditions.slice(0, 2).map(condition => {
      const field = condition.field || 'Question'
      const operator = operatorLabels[condition.operator] || '>'
      const value = condition.value || 'value'
      return condition.fieldType === 'text' ? field + ' ' + operator + ' “' + value + '”' : field + ' ' + operator + ' ' + value
    })
    return values.join(mode === 'any' ? ' or ' : ' and ') + (conditions.length > 2 ? ' +' + (conditions.length - 2) : '')
  }

  const conditionRows = (tier, conditions, prefix) => (conditions || []).map((condition, index) => (
    <div className="mla-condition-row" key={prefix + '-' + index}>
      <input aria-label={prefix + ' field ' + (index + 1)} value={condition.field || ''} placeholder="Form question" onChange={event => updateCondition(tier, index, 'field', event.target.value)} />
      <select aria-label={prefix + ' comparison ' + (index + 1)} value={condition.operator || 'gt'} onChange={event => updateCondition(tier, index, 'operator', event.target.value)}>
        {condition.fieldType === 'text'
          ? <><option value="eq">equals</option><option value="contains">contains</option><option value="not_contains">does not contain</option></>
          : <><option value="gt">greater than</option><option value="gte">at least</option><option value="lt">less than</option><option value="lte">at most</option><option value="eq">equals</option></>}
      </select>
      <input aria-label={prefix + ' threshold ' + (index + 1)} value={condition.value ?? ''} placeholder={condition.fieldType === 'text' ? 'Answer' : 'Value'} onChange={event => updateCondition(tier, index, 'value', event.target.value)} />
      <select aria-label={prefix + ' value type ' + (index + 1)} value={condition.fieldType || 'number'} onChange={event => {
        const fieldType = event.target.value
        setDraft(value => ({ ...value, [tier]: value[tier].map((item, position) => position === index
          ? { ...item, fieldType, operator: fieldType === 'text' ? 'eq' : item.operator }
          : item) }))
      }}>
        <option value="number">Number</option>
        <option value="floors">Floors</option>
        <option value="text">Text / choice</option>
      </select>
      <button type="button" className="mla-condition-remove" aria-label={'Remove ' + prefix.toLowerCase() + ' condition ' + (index + 1)} onClick={() => removeCondition(tier, index)}>Remove</button>
    </div>
  ))

  const editor = draft && <div className="mla-rule-editor">
    <div className="mla-editor-top">
      <strong>{editorMode === 'create' ? 'New rule' : 'Edit rule'}</strong>
      <button type="button" className="mla-editor-close" onClick={cancelEdit} aria-label="Cancel rule editing">Cancel</button>
    </div>
    <div className="mla-editor-settings">
      <label className="mla-meta-field">
        <span>Industry</span>
        <select aria-label="Classification industry" value={industryId} onChange={event => setIndustryId(event.target.value)}>
          <option value="">All industries</option>
          {industries.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
        </select>
      </label>
      <label className="mla-meta-field">
        <span>Premium match</span>
        <select aria-label="Premium match mode" value={draft.matchMode || 'all'} onChange={event => setDraft(value => ({ ...value, matchMode: event.target.value }))}>
          <option value="all">All (AND)</option>
          <option value="any">Any (OR)</option>
        </select>
      </label>
      {!industryId && <label className="mla-auto-toggle">
        <span>Auto-classify</span>
        <input type="checkbox" checked={Boolean(draft.enabled)} onChange={event => setDraft(value => ({ ...value, enabled: event.target.checked }))} />
        <i aria-hidden="true" />
      </label>}
    </div>
    <section className="mla-rule-group">
      <div className="mla-rule-group-heading"><strong>Premium</strong></div>
      <div className="mla-condition-list">{conditionRows('premiumConditions', draft.premiumConditions, 'Premium')}</div>
      <div className="mla-compact-actions">
        <button type="button" className="mla-add-condition" disabled={(draft.premiumConditions || []).length >= 12} onClick={() => addCondition('premiumConditions')}>＋ Condition</button>
      </div>
    </section>
    <section className="mla-exclusive-card" aria-label="Exclusive lead classification">
      <header className="mla-exclusive-heading">
        <span className="mla-crown" aria-hidden="true">♛</span>
        <div><h3>Exclusive</h3></div>
        <label className="mla-exclusive-toggle">
          <span>Enable</span>
          <input type="checkbox" checked={Boolean(draft.exclusiveEnabled)} onChange={event => setDraft(value => ({ ...value, exclusiveEnabled: event.target.checked }))} />
          <i aria-hidden="true" />
        </label>
      </header>
      {draft.exclusiveEnabled && <>
        <label className="mla-meta-field mla-exclusive-match">
          <span>Match</span>
          <select aria-label="Exclusive match mode" value={draft.exclusiveMatchMode || 'all'} onChange={event => setDraft(value => ({ ...value, exclusiveMatchMode: event.target.value }))}>
            <option value="all">All (AND)</option>
            <option value="any">Any (OR)</option>
          </select>
        </label>
        <div className="mla-rule-group mla-exclusive-rules">
          <div className="mla-rule-group-heading"><strong>Exclusive conditions</strong></div>
          <div className="mla-condition-list">{conditionRows('exclusiveConditions', draft.exclusiveConditions, 'Exclusive')}</div>
          <div className="mla-compact-actions">
            <button type="button" className="mla-add-exclusive" disabled={(draft.exclusiveConditions || []).length >= 12} onClick={() => addCondition('exclusiveConditions')}>＋ Condition</button>
          </div>
        </div>
      </>}
      <div className="mla-access-window">
        <label className="mla-early-access-label" htmlFor="mla-early-access-days">Pro Early Access</label>
        <div className="mla-access-input-wrap">
          <input id="mla-early-access-days" aria-label="Pro Early Access window in days" type="number" min="1" max="365" value={earlyAccessDays} onChange={event => setEarlyAccessDays(event.target.value)} />
          <span>days</span>
        </div>
      </div>
    </section>
    {message && <p role="status" className={'mla-inline-message ' + (message.includes('Unable') ? 'error' : 'success')}>{message}</p>}
    <footer className="mla-rule-actions">
      <button type="button" className="mla-save-rules" disabled={busy} onClick={saveRules}>{busy ? 'Saving…' : 'Save rule'}</button>
    </footer>
  </div>

  return <section className="mla-classification" aria-label="Classification rules">
    <header className="mla-classification-head">
      <h2>Classification rules</h2>
      {!editorMode && <button type="button" className="mla-create-rule" onClick={beginCreate}>＋ Create rules</button>}
    </header>
    {!settings ? <div className="mla-rules-loading">Loading…</div> : <>
      {editorMode === 'create' && editor}
      <div className="mla-saved-rules">
        {savedRules.map(rule => {
          const isEditing = editorMode === 'edit' && expandedRuleKey === rule.key
          const isOpen = expandedRuleKey === rule.key
          return <details className="mla-saved-rule" key={rule.key} open={isOpen} onToggle={event => {
            if (!event.currentTarget.open && expandedRuleKey === rule.key && editorMode !== 'edit') setExpandedRuleKey('')
            if (event.currentTarget.open) setExpandedRuleKey(rule.key)
          }}>
            <summary className="mla-saved-rule-summary">
              <span className="mla-rule-chevron" aria-hidden="true">›</span>
              <span className="mla-rule-name">{rule.name}</span>
              <span className="mla-rule-pill">Premium</span>
              <span className="mla-rule-summary-text">{summarize(rule.rule.premiumConditions, rule.rule.matchMode)}</span>
              {!isEditing && <button type="button" className="mla-edit-rule" onClick={event => { event.preventDefault(); beginEdit(rule) }}>Edit</button>}
            </summary>
            {isEditing
              ? editor
              : <div className="mla-rule-details">
                <span>Premium · {summarize(rule.rule.premiumConditions, rule.rule.matchMode)}</span>
                {rule.rule.exclusiveEnabled && <span>Exclusive · {summarize(rule.rule.exclusiveConditions, rule.rule.exclusiveMatchMode)}</span>}
                {rule.rule.exclusiveEnabled && <span>Pro Early Access · {accessSettings?.premium?.proEarlyAccessDays ?? 2} day{Number(accessSettings?.premium?.proEarlyAccessDays ?? 2) === 1 ? '' : 's'}</span>}
              </div>}
          </details>
        })}
      </div>
      {editorMode === 'edit' && expandedRuleKey && <div className="mla-edit-save-footer" aria-hidden="true" />}
    </>}
  </section>
}
