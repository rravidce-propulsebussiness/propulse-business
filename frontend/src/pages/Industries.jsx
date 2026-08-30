import { useEffect, useMemo, useRef, useState } from 'react'
import './Industries.css'

const API = 'http://localhost:5000/api'

const slugify = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const stateCode = (value) => value.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase()

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

function downloadCsv(filename, headers, row) {
  const csv = [headers.join(','), row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
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
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row) }
  if (!rows.length) return []
  const headers = rows[0].map((h) => h.toLowerCase().trim())
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])))
}

function Industries() {
  const [tab, setTab] = useState('industries')
  const [industries, setIndustries] = useState([])
  const [services, setServices] = useState([])
  const [subservices, setSubservices] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [expanded, setExpanded] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [modal, setModal] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const fileRef = useRef(null)

  async function loadAll() {
    try {
      setLoading(true); setError('')
      const [i, s, ss, st, c] = await Promise.all([
        request('/industries'), request('/services'), request('/subservices'), request('/states'), request('/cities'),
      ])
      setIndustries(i); setServices(s); setSubservices(ss); setStates(st); setCities(c)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const filteredIndustries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return industries
    return industries.filter((x) => x.name.toLowerCase().includes(q))
  }, [industries, search])

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return states
    return states.filter((x) => x.name.toLowerCase().includes(q))
  }, [states, search])

  const servicesFor = (id) => services.filter((x) => Number(x.industry_id) === Number(id))
  const subservicesFor = (id) => subservices.filter((x) => Number(x.service_id) === Number(id))
  const citiesFor = (id) => cities.filter((x) => Number(x.state_id) === Number(id))

  function openModal(type, item = null, parentId = null) {
    const parent = type === 'service' ? item?.industry_id || parentId : type === 'subservice' ? item?.service_id || parentId : type === 'city' ? item?.state_id || parentId : null
    setModal({ type, item, form: { name: item?.name || '', parentId: parent } })
    setError(''); setSuccess('')
  }

  async function saveModal(e) {
    e.preventDefault()
    if (!modal || !modal.form.name.trim()) return setError(`${modal.type} name is required.`)
    const { type, item, form } = modal
    try {
      setSaving(true); setError('')
      let base = '/industries'; let payload = { name: form.name.trim(), slug: slugify(form.name) }
      if (type === 'service') { base = '/services'; payload = { industryId: form.parentId, name: form.name.trim(), slug: slugify(form.name) } }
      if (type === 'subservice') { base = '/subservices'; payload = { serviceId: form.parentId, name: form.name.trim(), slug: slugify(form.name) } }
      if (type === 'state') { base = '/states'; payload = { name: form.name.trim(), code: stateCode(form.name) } }
      if (type === 'city') { base = '/cities'; payload = { stateId: form.parentId, name: form.name.trim(), slug: slugify(form.name) } }
      await request(item ? `${base}/${item.id}` : base, { method: item ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setModal(null); setSuccess(`${type[0].toUpperCase() + type.slice(1)} ${item ? 'updated' : 'added'} successfully.`); await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove(type, id, name) {
    if (!window.confirm(`Delete ${name}?`)) return
    const base = type === 'industry' ? '/industries' : type === 'service' ? '/services' : type === 'subservice' ? '/subservices' : type === 'state' ? '/states' : '/cities'
    try { setError(''); await request(`${base}/${id}`, { method: 'DELETE' }); setSuccess(`${type} deleted successfully.`); await loadAll() }
    catch (err) { setError(err.message) }
  }

  async function uploadCsv(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    setUploadOpen(false)
    if (!file) return
    try {
      setSaving(true); setError(''); setSuccess('')
      const rows = parseCsv(await file.text())
      if (tab === 'industries') {
        const headers = ['industry_name', 'service_name', 'subservice_name']
        if (!rows.length || !headers.every((h) => h in rows[0])) throw new Error('Use the Industry sample template.')
        let added = 0; const ci = [...industries], cs = [...services], css = [...subservices]
        for (const row of rows) {
          if (!row.industry_name) continue
          let industry = ci.find((x) => x.name.toLowerCase() === row.industry_name.toLowerCase())
          if (!industry) { industry = await request('/industries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: row.industry_name, slug: slugify(row.industry_name) }) }); ci.push(industry); added++ }
          if (!row.service_name) continue
          let service = cs.find((x) => Number(x.industry_id) === Number(industry.id) && x.name.toLowerCase() === row.service_name.toLowerCase())
          if (!service) { service = await request('/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industryId: industry.id, name: row.service_name, slug: slugify(row.service_name) }) }); cs.push(service); added++ }
          if (!row.subservice_name) continue
          const exists = css.find((x) => Number(x.service_id) === Number(service.id) && x.name.toLowerCase() === row.subservice_name.toLowerCase())
          if (!exists) { const ss = await request('/subservices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId: service.id, name: row.subservice_name, slug: slugify(row.subservice_name) }) }); css.push(ss); added++ }
        }
        setSuccess(`${added} new master records added.`)
      } else {
        const headers = ['state_name', 'city_name']
        if (!rows.length || !headers.every((h) => h in rows[0])) throw new Error('Use the Location sample template.')
        let added = 0; const st = [...states], ct = [...cities]
        for (const row of rows) {
          if (!row.state_name) continue
          let state = st.find((x) => x.name.toLowerCase() === row.state_name.toLowerCase())
          if (!state) { state = await request('/states', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: row.state_name, code: stateCode(row.state_name) }) }); st.push(state); added++ }
          if (!row.city_name) continue
          const exists = ct.find((x) => Number(x.state_id) === Number(state.id) && x.name.toLowerCase() === row.city_name.toLowerCase())
          if (!exists) { const city = await request('/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stateId: state.id, name: row.city_name, slug: slugify(row.city_name) }) }); ct.push(city); added++ }
        }
        setSuccess(`${added} new location records added.`)
      }
      await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const template = tab === 'industries'
    ? () => downloadCsv('propulse-industry-master-template.csv', ['industry_name', 'service_name', 'subservice_name'], ['Interior Design', 'Residential Interior Design', '2BHK Interior Design'])
    : () => downloadCsv('propulse-location-master-template.csv', ['state_name', 'city_name'], ['Telangana', 'Hyderabad'])

  return <div className="master-page">
    <div className="master-hero">
      <div>
        <div className="eyebrow">PRO PULSE · MASTER DATA</div>
        <h1>Master data, <span>beautifully organised.</span></h1>
        <p>Build the structure that powers your marketplace — simple, clean and ready to scale.</p>
      </div>
      <div className="hero-metric"><strong>{tab === 'industries' ? industries.length : states.length}</strong><span>{tab === 'industries' ? 'Industries' : 'States'}</span></div>
    </div>

    <div className="master-tabs">
      <button className={tab === 'industries' ? 'active' : ''} onClick={() => { setTab('industries'); setSearch(''); setUploadOpen(false) }}><span>01</span> Industries</button>
      <button className={tab === 'locations' ? 'active' : ''} onClick={() => { setTab('locations'); setSearch(''); setUploadOpen(false) }}><span>02</span> Locations</button>
    </div>

    {error && <div className="toast error">{error}</div>}
    {success && <div className="toast success">✓ {success}</div>}

    <div className="master-toolbar">
      <div className="toolbar-copy"><span>{tab === 'industries' ? 'INDUSTRY DIRECTORY' : 'LOCATION DIRECTORY'}</span><h2>{tab === 'industries' ? 'Industry hierarchy' : 'State & city hierarchy'}</h2></div>
      <div className="toolbar-actions">
        <div className="upload-wrap">
          <button className="secondary-action" onClick={() => setUploadOpen((v) => !v)} disabled={saving}>↑ Upload bulk</button>
          {uploadOpen && <div className="upload-popover">
            <div><strong>Bulk import</strong><p>Use our clean CSV template to add data faster.</p></div>
            <button onClick={template}>↓ Download sample</button>
            <button onClick={() => fileRef.current?.click()}>Choose CSV file</button>
          </div>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={uploadCsv} />
        </div>
        <button className="primary-action" onClick={() => openModal(tab === 'industries' ? 'industry' : 'state')}>+ Add {tab === 'industries' ? 'Industry' : 'State'}</button>
      </div>
    </div>

    <div className="search-row"><div className="search-box">⌕<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'industries' ? 'Search industries...' : 'Search states...'} /></div><div className="counts">{tab === 'industries' ? `${industries.length} industries · ${services.length} services · ${subservices.length} subservices` : `${states.length} states · ${cities.length} cities`}</div></div>

    {loading ? <div className="premium-empty">Loading master data…</div> : tab === 'industries' ? <div className="tree-card">
      {filteredIndustries.map((industry) => {
        const open = !!expanded[`i${industry.id}`]; const list = servicesFor(industry.id)
        return <div className="tree-item" key={industry.id}>
          <div className="tree-row level-industry">
            <button className="chevron" onClick={() => setExpanded((x) => ({ ...x, [`i${industry.id}`]: !open }))}>{open ? '⌄' : '›'}</button><div className="node-mark industry-mark">I</div><div className="node-name"><strong>{industry.name}</strong><small>{list.length} service{list.length === 1 ? '' : 's'}</small></div>
            <div className="node-actions"><button onClick={() => openModal('industry', industry)}>Edit</button><button className="delete" onClick={() => remove('industry', industry.id, industry.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded((x) => ({ ...x, [`i${industry.id}`]: true })); openModal('service', null, industry.id) }}>+ Service</button></div>
          </div>
          {open && <div className="nested">{list.map((service) => { const sOpen = !!expanded[`s${service.id}`]; const children = subservicesFor(service.id); return <div className="tree-item" key={service.id}>
            <div className="tree-row level-service"><button className="chevron" onClick={() => setExpanded((x) => ({ ...x, [`s${service.id}`]: !sOpen }))}>{sOpen ? '⌄' : '›'}</button><div className="node-mark service-mark">S</div><div className="node-name"><strong>{service.name}</strong><small>{children.length} subservice{children.length === 1 ? '' : 's'}</small></div><div className="node-actions"><button onClick={() => openModal('service', service)}>Edit</button><button className="delete" onClick={() => remove('service', service.id, service.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded((x) => ({ ...x, [`s${service.id}`]: true })); openModal('subservice', null, service.id) }}>+ Subservice</button></div></div>
            {sOpen && <div className="nested subnested">{children.map((ss) => <div className="tree-row level-subservice" key={ss.id}><div className="node-mark subservice-mark">↳</div><div className="node-name"><strong>{ss.name}</strong></div><div className="node-actions"><button onClick={() => openModal('subservice', ss)}>Edit</button><button className="delete" onClick={() => remove('subservice', ss.id, ss.name)}>Delete</button></div></div>)}</div>}
          </div>})}</div>}
        </div>
      })}
      {!filteredIndustries.length && <div className="premium-empty">No industries found.</div>}
    </div> : <div className="tree-card">
      {filteredStates.map((state) => { const open = !!expanded[`st${state.id}`]; const list = citiesFor(state.id); return <div className="tree-item" key={state.id}>
        <div className="tree-row level-industry"><button className="chevron" onClick={() => setExpanded((x) => ({ ...x, [`st${state.id}`]: !open }))}>{open ? '⌄' : '›'}</button><div className="node-mark industry-mark">S</div><div className="node-name"><strong>{state.name}</strong><small>{list.length} cit{list.length === 1 ? 'y' : 'ies'}</small></div><div className="node-actions"><button onClick={() => openModal('state', state)}>Edit</button><button className="delete" onClick={() => remove('state', state.id, state.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded((x) => ({ ...x, [`st${state.id}`]: true })); openModal('city', null, state.id) }}>+ City</button></div></div>
        {open && <div className="nested">{list.map((city) => <div className="tree-row level-subservice" key={city.id}><div className="node-mark subservice-mark">↳</div><div className="node-name"><strong>{city.name}</strong></div><div className="node-actions"><button onClick={() => openModal('city', city)}>Edit</button><button className="delete" onClick={() => remove('city', city.id, city.name)}>Delete</button></div></div>)}</div>}
      </div> })}
      {!filteredStates.length && <div className="premium-empty">No states found.</div>}
    </div>}

    {modal && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !saving && setModal(null)}><form className="premium-modal" onSubmit={saveModal}>
      <div className="modal-top"><div><span>{modal.item ? 'EDIT' : 'ADD'} · MASTER DATA</span><h3>{modal.item ? 'Edit' : 'Add'} {modal.type}</h3></div><button type="button" onClick={() => setModal(null)}>×</button></div>
      {['service', 'subservice', 'city'].includes(modal.type) && <label>Parent<select value={modal.form.parentId || ''} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, parentId: e.target.value } }))} required><option value="">Select parent</option>{(modal.type === 'service' ? industries : modal.type === 'subservice' ? services : states).map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label>}
      <label>{modal.type === 'state' ? 'State name' : modal.type === 'city' ? 'City name' : `${modal.type[0].toUpperCase() + modal.type.slice(1)} name`}<input autoFocus value={modal.form.name} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))} placeholder={`Enter ${modal.type} name`} required /></label>
      <div className="modal-note">Slugs and technical fields are generated automatically. You only need the name.</div>
      <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
    </form></div>}
  </div>
}

export default Industries
