import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'

const panelStyle = { margin: '0 0 18px', padding: 18, border: '1px solid #dce5ef', borderRadius: 14, background: '#fff', boxShadow: '0 8px 24px rgba(15,45,82,.045)' }
const selectStyle = { padding: '9px 8px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }
const inputStyle = { minWidth: 0, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }

export default function LeadClassificationRulesPanel() {
  const [industries, setIndustries] = useState([])
  const [settings, setSettings] = useState(null)
  const [draft, setDraft] = useState(null)
  const [industryId, setIndustryId] = useState('')
  const [accessSettings, setAccessSettings] = useState(null)
  const [earlyAccessDays, setEarlyAccessDays] = useState('2')
  const [busy, setBusy] = useState(false)
  const [accessBusy, setAccessBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [accessMessage, setAccessMessage] = useState('')

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

  const updateCondition = (index, key, value) => setDraft(current => ({
    ...current,
    premiumConditions: current.premiumConditions.map((condition, position) =>
      position === index ? { ...condition, [key]: value } : condition)
  }))

  async function saveEarlyAccessWindow() {
    if (!accessSettings?.basic || !accessSettings?.premium) return
    setAccessBusy(true)
    setAccessMessage('')
    try {
      const saved = await authRequest('/leads/access-settings', {
        method: 'PUT',
        body: JSON.stringify({
          basic: accessSettings.basic,
          premium: { ...accessSettings.premium, proEarlyAccessDays: Number(earlyAccessDays) }
        })
      })
      setAccessSettings(saved)
      setEarlyAccessDays(String(saved?.premium?.proEarlyAccessDays ?? earlyAccessDays))
      setAccessMessage('Pro Early Access window saved')
    } catch (error) {
      setAccessMessage(error.message || 'Unable to save Pro Early Access window')
    } finally {
      setAccessBusy(false)
    }
  }

  async function saveRules() {
    if (!draft) return
    setBusy(true)
    setMessage('')
    try {
      const saved = await authRequest('/leads/classification/settings', {
        method: 'PUT',
        body: JSON.stringify({ ...draft, industryId: industryId || null })
      })
      setSettings(saved)
      setMessage(industryId ? 'Industry-specific rules saved' : 'All-industries fallback rules saved')
    } catch (error) {
      setMessage(error.message || 'Unable to save lead classification rules')
    } finally {
      setBusy(false)
    }
  }

  return <section className="v9-panel v9-classification-panel" style={panelStyle}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
      <div>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.12em', color: '#bc5c3f' }}>BASIC / PREMIUM / EXCLUSIVE CLASSIFICATION</span>
        <strong style={{ display: 'block', marginTop: 5, fontSize: 16, color: '#163253' }}>Classify new Meta leads from their form answers</strong>
        <small style={{ display: 'block', marginTop: 5, color: '#64748b' }}>Set Premium criteria first, then a stricter Exclusive tier for the strongest leads. Rules are scoped per industry and apply to Meta and admin CSV imports.</small>
      </div>
      {draft && <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 750, color: '#334155' }}>
        <input type="checkbox" checked={Boolean(draft.enabled)} onChange={event => setDraft(value => ({ ...value, enabled: event.target.checked }))} />
        Auto-classify new imports
      </label>}
    </div>

    {!draft ? <p className="mla-muted">Loading classification rules…</p> : <>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
        Rules for
        <select aria-label="Classification industry" value={industryId} onChange={event => setIndustryId(event.target.value)} style={selectStyle}>
          <option value="">All industries (fallback)</option>
          {industries.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
        </select>
      </label>
      {industryId && !settings?.industryRules?.[industryId] && <small style={{ display: 'block', margin: '-4px 0 12px', color: '#64748b' }}>This industry inherits the fallback until you save its own rules.</small>}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 14px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
        Premium when
        <select aria-label="Premium match mode" value={draft.matchMode || 'all'} onChange={event => setDraft(value => ({ ...value, matchMode: event.target.value }))} style={selectStyle}>
          <option value="all">all conditions match (AND)</option>
          <option value="any">any condition matches (OR)</option>
        </select>
      </label>

      <div style={{ display: 'grid', gap: 9 }}>
        {(draft.premiumConditions || []).map((condition, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, alignItems: 'center' }}>
          <input aria-label={`Premium field ${index + 1}`} value={condition.field || ''} placeholder="Form question, e.g. Plot Size" onChange={event => updateCondition(index, 'field', event.target.value)} style={inputStyle} />
          <select aria-label={`Premium comparison ${index + 1}`} value={condition.operator || 'gt'} onChange={event => updateCondition(index, 'operator', event.target.value)} style={selectStyle}>
            {condition.fieldType === 'text'
              ? <><option value="eq">equals</option><option value="contains">contains</option><option value="not_contains">does not contain</option></>
              : <><option value="gt">greater than</option><option value="gte">at least</option><option value="lt">less than</option><option value="lte">at most</option><option value="eq">equals</option></>}
          </select>
          <input aria-label={`Premium threshold ${index + 1}`} value={condition.value ?? ''} placeholder={condition.fieldType === 'text' ? 'Answer text' : 'Threshold'} onChange={event => updateCondition(index, 'value', event.target.value)} style={inputStyle} />
          <select aria-label={`Premium value type ${index + 1}`} value={condition.fieldType || 'number'} onChange={event => {
            const fieldType = event.target.value
            setDraft(value => ({ ...value, premiumConditions: value.premiumConditions.map((item, position) => position === index
              ? { ...item, fieldType, operator: fieldType === 'text' ? 'eq' : item.operator }
              : item) }))
          }} style={selectStyle}>
            <option value="number">Number</option>
            <option value="floors">Floors (G+3 = 4)</option>
            <option value="text">Text / choice</option>
          </select>
          <button type="button" aria-label={`Remove condition ${index + 1}`} onClick={() => setDraft(value => ({ ...value, premiumConditions: value.premiumConditions.filter((_, position) => position !== index) }))} style={{ padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#64748b' }}>Remove</button>
        </div>)}
      </div>

      <section aria-label="Exclusive lead classification" style={{ marginTop: 20, padding: 16, border: '1px solid #fed7aa', borderRadius: 12, background: '#fffaf5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <strong style={{ color: '#9a3412', fontSize: 15 }}>Exclusive leads · above Premium</strong>
            <small style={{ display: 'block', marginTop: 4, color: '#64748b' }}>An Exclusive lead must first meet the Premium rules, then match these stricter rules too.</small>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9a3412', fontWeight: 750 }}>
            <input type="checkbox" checked={Boolean(draft.exclusiveEnabled)} onChange={event => setDraft(value => ({ ...value, exclusiveEnabled: event.target.checked }))} />
            Enable Exclusive classification
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', margin: '12px 0', fontSize: 13, fontWeight: 700, color: '#334155' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Exclusive when
            <select aria-label="Exclusive match mode" value={draft.exclusiveMatchMode || 'all'} onChange={event => setDraft(value => ({ ...value, exclusiveMatchMode: event.target.value }))} style={selectStyle}>
              <option value="all">all exclusive conditions match (AND)</option>
              <option value="any">any exclusive condition matches (OR)</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5 }}>
            Pro Early Access window (days)
            <input aria-label="Pro Early Access window in days" type="number" min="1" max="365" value={earlyAccessDays} onChange={event => setEarlyAccessDays(event.target.value)} style={{ ...inputStyle, width: 190 }} />
            <small style={{ color: '#64748b', fontWeight: 500 }}>Applies to Premium leads that also meet the Exclusive rules.</small>
          </label>
          <button type="button" disabled={accessBusy || !accessSettings} onClick={saveEarlyAccessWindow} style={{ padding: '9px 14px', border: 0, borderRadius: 8, background: '#9a3412', color: '#fff', fontWeight: 800 }}>
            {accessBusy ? 'Saving…' : 'Save access window'}
          </button>
        </div>
        {accessMessage && <p role="status" style={{ margin: '0 0 10px', color: accessMessage.includes('Unable') ? '#b91c1c' : '#166534' }}>{accessMessage}</p>}
        <div style={{ display: 'grid', gap: 9 }}>
          {(draft.exclusiveConditions || []).map((condition, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, alignItems: 'center' }}>
            <input aria-label={`Exclusive field ${index + 1}`} value={condition.field || ''} placeholder="Form question, e.g. Budget" onChange={event => setDraft(value => ({ ...value, exclusiveConditions: value.exclusiveConditions.map((item, position) => position === index ? { ...item, field: event.target.value } : item) }))} style={inputStyle} />
            <select aria-label={`Exclusive comparison ${index + 1}`} value={condition.operator || 'gt'} onChange={event => setDraft(value => ({ ...value, exclusiveConditions: value.exclusiveConditions.map((item, position) => position === index ? { ...item, operator: event.target.value } : item) }))} style={selectStyle}>
              {condition.fieldType === 'text' ? <><option value="eq">equals</option><option value="contains">contains</option><option value="not_contains">does not contain</option></> : <><option value="gt">greater than</option><option value="gte">at least</option><option value="lt">less than</option><option value="lte">at most</option><option value="eq">equals</option></>}
            </select>
            <input aria-label={`Exclusive threshold ${index + 1}`} value={condition.value ?? ''} placeholder={condition.fieldType === 'text' ? 'Answer text' : 'Threshold'} onChange={event => setDraft(value => ({ ...value, exclusiveConditions: value.exclusiveConditions.map((item, position) => position === index ? { ...item, value: event.target.value } : item) }))} style={inputStyle} />
            <select aria-label={`Exclusive value type ${index + 1}`} value={condition.fieldType || 'number'} onChange={event => { const fieldType = event.target.value; setDraft(value => ({ ...value, exclusiveConditions: value.exclusiveConditions.map((item, position) => position === index ? { ...item, fieldType, operator: fieldType === 'text' ? 'eq' : item.operator } : item) })) }} style={selectStyle}>
              <option value="number">Number</option><option value="floors">Floors (G+3 = 4)</option><option value="text">Text / choice</option>
            </select>
            <button type="button" aria-label={`Remove exclusive condition ${index + 1}`} onClick={() => setDraft(value => ({ ...value, exclusiveConditions: value.exclusiveConditions.filter((_, position) => position !== index) }))} style={{ padding: '8px 10px', border: '1px solid #fed7aa', borderRadius: 8, background: '#fff', color: '#9a3412' }}>Remove</button>
          </div>)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <small style={{ color: '#64748b' }}>Add up to 12 stricter conditions. An empty rule set creates no Exclusive leads.</small>
          <button type="button" disabled={(draft.exclusiveConditions || []).length >= 12} onClick={() => setDraft(value => ({ ...value, exclusiveConditions: [...(value.exclusiveConditions || []), { field: '', operator: 'gt', value: '', fieldType: 'number' }] }))} style={{ padding: '8px 12px', border: '1px solid #fed7aa', borderRadius: 8, background: '#fff', color: '#9a3412', fontWeight: 750 }}>Add Exclusive condition</button>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>Add up to 12 conditions. Example: Plot Size &gt; 150 sq yd and Floors &gt; G+3.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={(draft.premiumConditions || []).length >= 12} onClick={() => setDraft(value => ({ ...value, premiumConditions: [...(value.premiumConditions || []), { field: '', operator: 'gt', value: '', fieldType: 'number' }] }))} style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#173b70', fontWeight: 750 }}>Add condition</button>
          <button type="button" disabled={busy} onClick={saveRules} style={{ padding: '8px 14px', border: 0, borderRadius: 8, background: '#0b2d63', color: '#fff', fontWeight: 800 }}>{busy ? 'Saving…' : 'Save rules'}</button>
        </div>
      </div>
    </>}
    {message && <p role="status" className="mla-muted" style={{ marginBottom: 0 }}>{message}</p>}
  </section>
}
