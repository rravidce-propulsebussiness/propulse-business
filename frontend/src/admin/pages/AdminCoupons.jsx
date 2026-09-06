import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken, clearSession } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import './AdminCoupons.css'

const initial = {
  code: '', description: '', discount_type: 'percent', discount_value: '', max_discount: '',
  min_order_amount: '', usage_limit: '', per_user_limit: '', starts_at: '', expires_at: '',
  purchase_types: ['membership', 'lead', 'booster'], user_ids: [], industry_ids: [], membership_plan_ids: [], is_active: true,
}
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function AdminCoupons() {
  const navigate = useNavigate()
  const [coupons, setCoupons] = useState([])
  const [users, setUsers] = useState([])
  const [industries, setIndustries] = useState([])
  const [form, setForm] = useState(initial)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function request(path, options = {}) {
    if (!getToken()) {
      clearSession()
      navigate('/login', { replace: true })
      throw new Error('Your admin session has expired. Please sign in again.')
    }
    return apiRequest(path, options)
  }

  async function load() {
    try {
      setLoading(true)
      setError('')
      const [c, u, i] = await Promise.all([
        request(`/coupons?search=${encodeURIComponent(search.trim())}&status=${status}`),
        request('/admin/users?role=business&status=active'),
        request('/industries'),
      ])
      setCoupons(Array.isArray(c) ? c : [])
      setUsers(Array.isArray(u) ? u : [])
      setIndustries(Array.isArray(i) ? i : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status])

  function toggle(field, id) {
    setForm((f) => ({ ...f, [field]: f[field].includes(id) ? f[field].filter((x) => x !== id) : [...f[field], id] }))
  }

  function reset() {
    setForm({ ...initial, purchase_types: [...initial.purchase_types], user_ids: [], industry_ids: [], membership_plan_ids: [] })
    setEditing(null)
    setError('')
  }

  async function save(e) {
    e.preventDefault()
    if (saving) return
    try {
      setSaving(true)
      setError('')
      const body = {
        ...form,
        discount_value: Number(form.discount_value),
        max_discount: form.max_discount === '' ? null : Number(form.max_discount),
        min_order_amount: Number(form.min_order_amount || 0),
        usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
        per_user_limit: form.per_user_limit === '' ? null : Number(form.per_user_limit),
      }
      await request(editing ? `/coupons/${editing}` : '/coupons', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
      setNotice(editing ? 'Coupon updated successfully.' : 'Coupon created successfully.')
      reset()
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c) {
    try {
      setError('')
      await request(`/coupons/${c.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !c.is_active }) })
      setNotice(c.is_active ? 'Coupon deactivated.' : 'Coupon activated.')
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function edit(c) {
    try {
      setError('')
      const d = await request(`/coupons/${c.id}`)
      setEditing(d.id)
      setForm({
        ...initial,
        ...d,
        user_ids: (d.users || []).map((x) => x.id),
        industry_ids: (d.industries || []).map((x) => x.id),
        purchase_types: Array.isArray(d.purchase_types) ? d.purchase_types : JSON.parse(d.purchase_types || '[]'),
        membership_plan_ids: Array.isArray(d.membership_plan_ids) ? d.membership_plan_ids : JSON.parse(d.membership_plan_ids || '[]'),
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e.message)
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return
    try {
      setError('')
      await request(`/coupons/${c.id}`, { method: 'DELETE' })
      setNotice(`Coupon ${c.code} deleted.`)
      if (editing === c.id) reset()
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  const selectedUsers = users.filter((u) => form.user_ids.includes(u.id))

  return (
    <section className="admin-coupons">
      <div className="coupon-head">
        <div><h1>Coupons</h1></div>
        <button type="button" onClick={reset}>{editing ? 'Cancel edit' : 'New coupon'}</button>
      </div>
      {error && <div className="coupon-error">{error}</div>}
      {notice && <div className="coupon-notice">{notice}</div>}

      <div className="coupon-grid">
        <form className="coupon-form" onSubmit={save}>
          <div className="coupon-form-head"><h2>{editing ? 'Edit coupon' : 'New coupon'}</h2></div>
          <div className="coupon-fields">
            <label>Code<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WELCOME20" /></label>
            <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></label>
            <label>Discount type<select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
            <label>Discount value<input required type="number" min="0.01" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} /></label>
            <label>Maximum discount<input type="number" min="0" step="0.01" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} placeholder="Optional" /></label>
            <label>Minimum order<input type="number" min="0" step="0.01" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} /></label>
            <label>Total usage limit<input type="number" min="1" step="1" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Unlimited" /></label>
            <label>Per-user limit<input type="number" min="1" step="1" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} placeholder="Unlimited" /></label>
            <label>Starts at<input type="datetime-local" value={form.starts_at ? String(form.starts_at).slice(0, 16) : ''} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
            <label>Expires at<input type="datetime-local" value={form.expires_at ? String(form.expires_at).slice(0, 16) : ''} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></label>
          </div>

          <div className="coupon-scope"><h3>Purchase types</h3><div className="coupon-check-row">{['membership', 'lead', 'booster'].map((x) => <label className="check" key={x}><input type="checkbox" checked={form.purchase_types.includes(x)} onChange={() => toggle('purchase_types', x)} />{x[0].toUpperCase() + x.slice(1)}</label>)}</div></div>
          <div className="coupon-scope"><h3>Industries <small>Optional</small></h3><div className="coupon-options">{industries.map((i) => <label className="check" key={i.id}><input type="checkbox" checked={form.industry_ids.includes(i.id)} onChange={() => toggle('industry_ids', i.id)} />{i.name}</label>)}</div></div>
          <div className="coupon-scope"><h3>Specific users <small>Optional</small></h3><select className="coupon-user-select" value="" onChange={(e) => { const id = Number(e.target.value); if (id && !form.user_ids.includes(id)) setForm((f) => ({ ...f, user_ids: [...f.user_ids, id] })) }}><option value="">Select a user…</option>{users.map((u) => <option key={u.id} value={u.id} disabled={form.user_ids.includes(u.id)}>{u.business_name || u.name}{u.email ? ` — ${u.email}` : ''}</option>)}</select>{selectedUsers.length > 0 && <div className="coupon-selected-users">{selectedUsers.map((u) => <span key={u.id}>{u.business_name || u.name}<button type="button" onClick={() => toggle('user_ids', u.id)} aria-label={`Remove ${u.business_name || u.name}`}>×</button></span>)}</div>}</div>
          <label className="coupon-active"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          <button className="coupon-save" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}</button>
        </form>

        <div className="coupon-list">
          <div className="coupon-list-toolbar"><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Search coupons..." /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button type="button" onClick={load}>Search</button></div>
          {loading ? <div className="coupon-empty">Loading…</div> : !coupons.length ? <div className="coupon-empty">No coupons yet.</div> : (
            <div className="coupon-records">
              {coupons.map((c) => (
                <article className="coupon-record" key={c.id}>
                  <div className="coupon-record-main">
                    <div className="coupon-record-code"><b>{c.code}</b><small>{c.description || 'No description'}</small></div>
                    <div className="coupon-record-value"><span>Discount</span><strong>{c.discount_type === 'percent' ? `${c.discount_value}%` : money(c.discount_value)}</strong>{c.max_discount && <small>Max {money(c.max_discount)}</small>}</div>
                    <div className="coupon-record-scope"><span>Scope</span><small>{Number(c.target_user_count) > 0 ? `${c.target_user_count} users` : 'All users'}</small><small>{Number(c.target_industry_count) > 0 ? c.target_industries : 'All industries'}</small></div>
                  </div>
                  <div className="coupon-record-meta">
                    <div><span>Usage</span><b>{c.redeemed_count}{c.usage_limit ? ` / ${c.usage_limit}` : ' / Unlimited'}</b></div>
                    <div><span>Validity</span><small>{c.starts_at ? new Date(c.starts_at).toLocaleString('en-IN') : 'Now'}{c.expires_at ? ` — ${new Date(c.expires_at).toLocaleString('en-IN')}` : ' — No expiry'}</small></div>
                    <div><span>Status</span><em className={c.is_active ? 'coupon-active-badge' : 'coupon-inactive-badge'}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</em></div>
                  </div>
                  <div className="coupon-record-actions"><button type="button" onClick={() => edit(c)}>Edit</button><button type="button" onClick={() => toggleActive(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" className="coupon-delete" onClick={() => remove(c)}>Delete</button></div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
