import { useEffect, useMemo, useRef, useState } from 'react'
import './Industries.css'

const API = 'http://localhost:5000/api'
const CSV_HEADERS = ['industry_name', 'industry_slug', 'industry_description', 'service_name', 'service_slug', 'service_description', 'subservice_name', 'subservice_slug', 'subservice_description']

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

function downloadTemplate() {
  const sample = [CSV_HEADERS.join(','), ['Interior Design', 'interior-design', 'Interior design services', 'Residential Interior Design', 'residential-interior-design', 'Home interior solutions', '2BHK Interior Design', '2bhk-interior-design', 'Complete 2BHK interiors'].map((v) => `"${v}"`).join(',')].join('\n')
  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'propulse-master-data-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function parseCsv(text) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i += 1 }
    else if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell.trim()); cell = ''
      if (row.some(Boolean)) rows.push(row)
      row = []
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row) }
  if (!rows.length) return []
  const headers = rows[0].map((h) => h.toLowerCase().trim())
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])))
}

function Industries() {
  const [industries, setIndustries] = useState([])
  const [services, setServices] = useState([])
  const [subservices, setSubservices] = useState([])
  const [expanded, setExpanded] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const fileRef = useRef(null)

  async function loadAll() {
    try {
      setLoading(true); setError('')
      const [i, s, ss] = await Promise.all([request('/industries'), request('/services'), request('/subservices')])
      setIndustries(i); setServices(s); setSubservices(ss)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return industries
    return industries.filter((i) => [i.name, i.slug, i.description].filter(Boolean).some((v) => v.toLowerCase().includes(q)))
  }, [industries, search])

  const servicesFor = (industryId) => services.filter((s) => Number(s.industry_id) === Number(industryId))
  const subservicesFor = (serviceId) => subservices.filter((s) => Number(s.service_id) === Number(serviceId))

  function openModal(type, item = null, parentId = null) {
    const defaults = type === 'industry'
      ? { name: item?.name || '', slug: item?.slug || '', description: item?.description || '' }
      : type === 'service'
        ? { name: item?.name || '', slug: item?.slug || '', description: item?.description || '', parentId: item?.industry_id || parentId }
        : { name: item?.name || '', slug: item?.slug || '', description: item?.description || '', parentId: item?.service_id || parentId }
    setModal({ type, item, form: defaults })
    setError(''); setSuccess('')
  }

  async function saveModal(event) {
    event.preventDefault()
    if (!modal) return
    const { type, item, form } = modal
    if (!form.name.trim()) return setError(`${type[0].toUpperCase() + type.slice(1)} name is required.`)
    const slug = (form.slug || slugify(form.name)).trim().toLowerCase()
    if (!slug) return setError('Slug is required.')
    try {
      setSaving(true); setError('')
      const payload = type === 'industry'
        ? { name: form.name.trim(), slug, description: form.description.trim() }
        : type === 'service'
          ? { industryId: form.parentId, name: form.name.trim(), slug, description: form.description.trim() }
          : { serviceId: form.parentId, name: form.name.trim(), slug, description: form.description.trim() }
      const base = type === 'industry' ? '/industries' : type === 'service' ? '/services' : '/subservices'
      await request(item ? `${base}/${item.id}` : base, { method: item ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setModal(null); setSuccess(`${type[0].toUpperCase() + type.slice(1)} ${item ? 'updated' : 'added'} successfully.`); await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function deactivate(type, id, name) {
    if (!window.confirm(`Delete/deactivate “${name}”?`)) return
    try {
      setError(''); setSuccess('')
      const base = type === 'industry' ? '/industries' : type === 'service' ? '/services' : '/subservices'
      await request(`${base}/${id}`, { method: 'DELETE' })
      setSuccess(`${type[0].toUpperCase() + type.slice(1)} deactivated successfully.`); await loadAll()
    } catch (err) { setError(err.message) }
  }

  async function uploadCsv(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setSaving(true); setError(''); setSuccess('')
      const rows = parseCsv(await file.text())
      if (!rows.length || !CSV_HEADERS.every((h) => Object.prototype.hasOwnProperty.call(rows[0], h))) throw new Error('Invalid template. Download the sample template and keep its column names.')
      let added = 0
      const currentI = [...industries], currentS = [...services], currentSS = [...subservices]
      for (const row of rows) {
        if (!row.industry_name || !row.industry_slug) continue
        let industry = currentI.find((x) => x.slug === row.industry_slug || x.name.toLowerCase() === row.industry_name.toLowerCase())
        if (!industry) { industry = await request('/industries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: row.industry_name, slug: row.industry_slug, description: row.industry_description }) }); currentI.push(industry); added += 1 }
        if (!row.service_name || !row.service_slug) continue
        let service = currentS.find((x) => Number(x.industry_id) === Number(industry.id) && (x.slug === row.service_slug || x.name.toLowerCase() === row.service_name.toLowerCase()))
        if (!service) { service = await request('/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industryId: industry.id, name: row.service_name, slug: row.service_slug, description: row.service_description }) }); currentS.push(service); added += 1 }
        if (!row.subservice_name || !row.subservice_slug) continue
        const exists = currentSS.find((x) => Number(x.service_id) === Number(service.id) && (x.slug === row.subservice_slug || x.name.toLowerCase() === row.subservice_name.toLowerCase()))
        if (!exists) { const ss = await request('/subservices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId: service.id, name: row.subservice_name, slug: row.subservice_slug, description: row.subservice_description }) }); currentSS.push(ss); added += 1 }
      }
      setSuccess(`Bulk upload complete. ${added} new records added.`); await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <div className="industries-page">
      <header className="industry-page-header">
        <div><div className="eyebrow">MASTER DATA</div><h1>Industry Management</h1><p>Manage your complete Industry → Service → Subservice hierarchy from one place.</p></div>
        <div className="header-actions">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={uploadCsv} />
          <button className="outline-button" type="button" onClick={downloadTemplate}>↓ Sample Template</button>
          <button className="outline-button" type="button" disabled={saving} onClick={() => fileRef.current?.click()}>↑ Upload Bulk Sheet</button>
          <button className="primary-header-button" type="button" onClick={() => openModal('industry')}><span>+</span> Add Industry</button>
        </div>
      </header>

      {error && <div className="industry-alert error-alert">{error}</div>}
      {success && <div className="industry-alert success-alert">{success}</div>}

      <div className="hierarchy-summary"><span>Industry</span><b>→</b><span>Service</span><b>→</b><span>Subservice</span><em>{industries.length} industries · {services.length} services · {subservices.length} subservices</em></div>

      <section className="industry-card hierarchy-card">
        <div className="directory-toolbar"><div><span className="section-kicker">MASTER DIRECTORY</span><h2>Industry → Services → Subservices</h2></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search industries..." /></div>
        {loading ? <div className="empty-state">Loading master data...</div> : filtered.length === 0 ? <div className="empty-state"><h3>No industries found</h3><p>Add an industry or change your search.</p></div> : (
          <div className="hierarchy-list">
            {filtered.map((industry) => {
              const industryServices = servicesFor(industry.id)
              const isOpen = expanded[industry.id]
              return <article className="hierarchy-industry" key={industry.id}>
                <div className="hierarchy-row industry-level">
                  <button className="expand-button" onClick={() => setExpanded((x) => ({ ...x, [industry.id]: !isOpen }))} aria-label="Expand industry">{isOpen ? '⌄' : '›'}</button>
                  <div className="level-icon industry-level-icon">I</div><div className="level-content"><div className="level-title"><strong>{industry.name}</strong><span>Industry</span></div><small>/{industry.slug} · {industryServices.length} service{industryServices.length === 1 ? '' : 's'}</small></div>
                  <div className="row-actions"><button className="edit-button" onClick={() => openModal('industry', industry)}>Edit</button><button className="danger-button" onClick={() => deactivate('industry', industry.id, industry.name)}>Delete</button><button className="add-small" onClick={() => { setExpanded((x) => ({ ...x, [industry.id]: true })); openModal('service', null, industry.id) }}>+ Service</button></div>
                </div>
                {isOpen && <div className="children-wrap">
                  {industryServices.length === 0 && <div className="child-empty">No services yet. <button onClick={() => openModal('service', null, industry.id)}>Add the first service</button></div>}
                  {industryServices.map((service) => {
                    const children = subservicesFor(service.id), serviceOpen = expanded[`s${service.id}`]
                    return <div className="service-block" key={service.id}>
                      <div className="hierarchy-row service-level">
                        <button className="expand-button" onClick={() => setExpanded((x) => ({ ...x, [`s${service.id}`]: !serviceOpen }))}>{serviceOpen ? '⌄' : '›'}</button><div className="level-icon service-level-icon">S</div><div className="level-content"><div className="level-title"><strong>{service.name}</strong><span>Service</span></div><small>/{service.slug} · {children.length} subservice{children.length === 1 ? '' : 's'}</small></div>
                        <div className="row-actions"><button className="edit-button" onClick={() => openModal('service', service)}>Edit</button><button className="danger-button" onClick={() => deactivate('service', service.id, service.name)}>Delete</button><button className="add-small" onClick={() => { setExpanded((x) => ({ ...x, [`s${service.id}`]: true })); openModal('subservice', null, service.id) }}>+ Subservice</button></div>
                      </div>
                      {serviceOpen && <div className="subservice-list">
                        {children.length === 0 && <div className="child-empty">No subservices yet. <button onClick={() => openModal('subservice', null, service.id)}>Add the first subservice</button></div>}
                        {children.map((ss) => <div className="hierarchy-row subservice-level" key={ss.id}><div className="level-icon subservice-level-icon">↳</div><div className="level-content"><div className="level-title"><strong>{ss.name}</strong><span>Subservice</span></div><small>/{ss.slug}</small></div><div className="row-actions"><button className="edit-button" onClick={() => openModal('subservice', ss)}>Edit</button><button className="danger-button" onClick={() => deactivate('subservice', ss.id, ss.name)}>Delete</button></div></div>)}
                      </div>}
                    </div>
                  })}
                </div>}
              </article>
            })}
          </div>
        )}
      </section>

      {modal && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && setModal(null)}><form className="master-modal" onSubmit={saveModal}><div className="modal-header"><div><span className="section-kicker">{modal.item ? 'EDIT' : 'ADD'} {modal.type.toUpperCase()}</span><h2>{modal.item ? `Edit ${modal.type}` : `Add ${modal.type}`}</h2></div><button type="button" className="modal-close" onClick={() => !saving && setModal(null)}>×</button></div>
        {modal.type !== 'industry' && <label>Parent {modal.type === 'service' ? 'Industry' : 'Service'}<select value={modal.form.parentId || ''} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, parentId: e.target.value } }))} required><option value="">Select parent</option>{(modal.type === 'service' ? industries : services).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
        <label>Name<input autoFocus value={modal.form.name} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value, slug: m.item ? m.form.slug : slugify(e.target.value) } }))} required /></label>
        <label>Slug<input value={modal.form.slug} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, slug: e.target.value } }))} required /></label>
        <label>Description<textarea rows="4" value={modal.form.description} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))} /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)} disabled={saving}>Cancel</button><button type="submit" className="save-button" disabled={saving}>{saving ? 'Saving...' : modal.item ? 'Save Changes' : `Add ${modal.type}`}</button></div>
      </form></div>}
    </div>
  )
}

export default Industries
