import { useEffect, useMemo, useRef, useState } from 'react'
import { authRequest } from '../utils/auth'
import './Industries.css'

const slugify = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const stateCode = value => String(value || '').trim().split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase()

async function request(path, options = {}) { return authRequest(path, options) }
const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const collection = value => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.rows)) return value.rows
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.industries)) return value.industries
  if (Array.isArray(value?.services)) return value.services
  if (Array.isArray(value?.subservices)) return value.subservices
  if (Array.isArray(value?.states)) return value.states
  if (Array.isArray(value?.cities)) return value.cities
  if (Array.isArray(value?.subcities)) return value.subcities
  return []
}

function downloadCsv(filename, headers, row) {
  const csv = [headers.join(','), row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i += 1 }
    else if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((ch === '\n' || ch === '\r') && !quoted) { if (ch === '\r' && text[i + 1] === '\n') i += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row) }
  if (!rows.length) return []
  const headers = rows[0].map(h => h.toLowerCase().trim())
  return rows.slice(1).map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])))
}

export default function Industries() {
  const [tab, setTab] = useState('industries')
  const [industries, setIndustries] = useState([]), [services, setServices] = useState([]), [subservices, setSubservices] = useState([])
  const [states, setStates] = useState([]), [cities, setCities] = useState([]), [subcities, setSubcities] = useState([])
  const [expanded, setExpanded] = useState({}), [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false)
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [modal, setModal] = useState(null), [uploadOpen, setUploadOpen] = useState(false)
  const fileRef = useRef(null)

  async function loadAll() {
    setLoading(true); setError('')
    const endpoints = [['industries', '/industries', setIndustries], ['services', '/services', setServices], ['subservices', '/subservices', setSubservices], ['states', '/states', setStates], ['cities', '/cities', setCities], ['subcities', '/subcities', setSubcities]]
    const results = await Promise.all(endpoints.map(async ([label, path, setter]) => {
      try { setter(collection(await request(path))); return null } catch (err) { return `${label}: ${err.message}` }
    }))
    const failures = results.filter(Boolean)
    if (failures.length) setError(failures.join(' · '))
    setLoading(false)
  }
  useEffect(() => { loadAll() }, [])

  const filteredIndustries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return !q ? industries : industries.filter(x => String(x.name || '').toLowerCase().includes(q))
  }, [industries, search])
  const servicesFor = id => services.filter(x => Number(x.industry_id) === Number(id))
  const subservicesFor = id => subservices.filter(x => Number(x.service_id) === Number(id))
  const citiesFor = id => cities.filter(x => Number(x.state_id) === Number(id))
  const subcitiesFor = id => subcities.filter(x => Number(x.city_id) === Number(id))
  const cityMatches = (city, q) => { if (!q) return true; const name = String(city.name || '').toLowerCase(); const areas = subcitiesFor(city.id); const pins = Array.isArray(city.pincodes) ? city.pincodes : []; return name.includes(q) || areas.some(area => String(area.name || '').toLowerCase().includes(q) || String(area.pincode || '').includes(q)) || pins.some(pin => String(pin.pincode || '').includes(q) || String(pin.officeName || '').toLowerCase().includes(q)) }
  const areaMatches = (area, q) => !q || String(area.name || '').toLowerCase().includes(q) || String(area.pincode || '').includes(q)

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return states
    return states.filter(state => String(state.name || '').toLowerCase().includes(q) || citiesFor(state.id).some(city => cityMatches(city, q)))
  }, [states, cities, subcities, search])

  function openModal(type, item = null, parentId = null) {
    const parent = type === 'service' ? item?.industry_id ?? parentId : type === 'subservice' ? item?.service_id ?? parentId : type === 'city' ? item?.state_id ?? parentId : type === 'subcity' ? item?.city_id ?? parentId : null
    setModal({ type, item, form: { name: item?.name || '', parentId: parent, pincode: item?.pincode || '' } }); setError(''); setSuccess('')
  }

  async function saveModal(e) {
    e.preventDefault(); if (!modal) return
    if (!modal.form.name.trim()) return setError(`${modal.type} name is required.`)
    const { type, item, form } = modal
    try {
      setSaving(true); setError('')
      let base = '/industries'; let payload = { name: form.name.trim(), slug: slugify(form.name) }
      if (type === 'service') { base = '/services'; payload = { industryId: form.parentId, name: form.name.trim(), slug: slugify(form.name) } }
      if (type === 'subservice') { base = '/subservices'; payload = { serviceId: form.parentId, name: form.name.trim(), slug: slugify(form.name) } }
      if (type === 'state') { base = '/states'; payload = { name: form.name.trim(), code: stateCode(form.name) } }
      if (type === 'city') { base = '/cities'; payload = { stateId: form.parentId, name: form.name.trim(), slug: slugify(form.name) } }
      if (type === 'subcity') { base = '/subcities'; payload = { cityId: form.parentId, name: form.name.trim(), slug: slugify(form.name), pincode: form.pincode.trim() || null } }
      if (type === 'city' && !item) { const normalizedName = form.name.trim().toLowerCase(); if (cities.some(city => Number(city.state_id) === Number(form.parentId) && String(city.name || '').trim().toLowerCase() === normalizedName)) return setError('City already exists in this state.') }
      await request(item ? `${base}/${item.id}` : base, jsonOptions(item ? 'PUT' : 'POST', payload))
      setModal(null); setSuccess(`${type[0].toUpperCase() + type.slice(1)} ${item ? 'updated' : 'added'} successfully.`); await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove(type, id, name) {
    if (!window.confirm(`Delete ${name}?`)) return
    const base = type === 'industry' ? '/industries' : type === 'service' ? '/services' : type === 'subservice' ? '/subservices' : type === 'state' ? '/states' : type === 'city' ? '/cities' : '/subcities'
    try { setError(''); await request(`${base}/${id}`, { method: 'DELETE' }); setSuccess(`${type} deleted successfully.`); await loadAll() } catch (err) { setError(err.message) }
  }

  async function uploadCsv(e) {
    const file = e.target.files?.[0]; e.target.value = ''; setUploadOpen(false); if (!file) return
    try {
      setSaving(true); setError(''); setSuccess(''); const rows = parseCsv(await file.text())
      if (tab === 'industries') {
        const headers = ['industry_name', 'service_name', 'subservice_name']; if (!rows.length || !headers.every(h => h in rows[0])) throw new Error('Use the Industry sample template.')
        let added = 0; const ci = [...industries], cs = [...services], css = [...subservices]
        for (const row of rows) {
          if (!row.industry_name) continue
          let industry = ci.find(x => x.name.toLowerCase() === row.industry_name.toLowerCase())
          if (!industry) { industry = await request('/industries', jsonOptions('POST', { name: row.industry_name, slug: slugify(row.industry_name) })); ci.push(industry); added++ }
          if (!row.service_name) continue
          let service = cs.find(x => Number(x.industry_id) === Number(industry.id) && x.name.toLowerCase() === row.service_name.toLowerCase())
          if (!service) { service = await request('/services', jsonOptions('POST', { industryId: industry.id, name: row.service_name, slug: slugify(row.service_name) })); cs.push(service); added++ }
          if (!row.subservice_name) continue
          if (!css.find(x => Number(x.service_id) === Number(service.id) && x.name.toLowerCase() === row.subservice_name.toLowerCase())) { const ss = await request('/subservices', jsonOptions('POST', { serviceId: service.id, name: row.subservice_name, slug: slugify(row.subservice_name) })); css.push(ss); added++ }
        }
        setSuccess(`${added} new master records added.`)
      } else {
        const headers = ['state_name', 'city_name', 'subcity_name', 'pincode']; if (!rows.length || !headers.every(h => h in rows[0])) throw new Error('Use the Location sample template.')
        let added = 0; const st = [...states], ct = [...cities], sct = [...subcities]
        for (const row of rows) {
          if (!row.state_name) continue
          let state = st.find(x => x.name.toLowerCase() === row.state_name.toLowerCase())
          if (!state) { state = await request('/states', jsonOptions('POST', { name: row.state_name, code: stateCode(row.state_name) })); st.push(state); added++ }
          if (!row.city_name) continue
          let city = ct.find(x => Number(x.state_id) === Number(state.id) && x.name.toLowerCase() === row.city_name.toLowerCase())
          if (!city) { city = await request('/cities', jsonOptions('POST', { stateId: state.id, name: row.city_name, slug: slugify(row.city_name) })); ct.push(city); added++ }
          if (!row.subcity_name) continue
          if (!sct.find(x => Number(x.city_id) === Number(city.id) && x.name.toLowerCase() === row.subcity_name.toLowerCase())) { const sc = await request('/subcities', jsonOptions('POST', { cityId: city.id, name: row.subcity_name, slug: slugify(row.subcity_name), pincode: row.pincode || null })); sct.push(sc); added++ }
        }
        setSuccess(`${added} new location records added.`)
      }
      await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const template = tab === 'industries' ? () => downloadCsv('propulse-industry-master-template.csv', ['industry_name', 'service_name', 'subservice_name'], ['Interior Design', 'Residential Interior Design', '2BHK Interior Design']) : () => downloadCsv('propulse-location-master-template.csv', ['state_name', 'city_name', 'subcity_name', 'pincode'], ['Telangana', 'Hyderabad', 'Gachibowli', '500032'])

  return <div className="master-page">
    <div className="master-tabs"><button className={tab === 'industries' ? 'active' : ''} onClick={() => { setTab('industries'); setSearch(''); setUploadOpen(false) }}>Industries</button><button className={tab === 'locations' ? 'active' : ''} onClick={() => { setTab('locations'); setSearch(''); setUploadOpen(false) }}>Locations</button></div>
    {error && <div className="toast error">{error}</div>}{success && <div className="toast success">✓ {success}</div>}
    <div className="master-toolbar"><div className="toolbar-copy"><h2>{tab === 'industries' ? 'Industry hierarchy' : 'State · City · Sub-city · Pincode'}</h2></div><div className="toolbar-actions"><div className="upload-wrap"><button className="secondary-action" onClick={() => setUploadOpen(v => !v)} disabled={saving}>↑ Upload bulk</button>{uploadOpen && <div className="upload-popover"><strong>Bulk import</strong><p>Use the current hierarchy template.</p><button onClick={template}>↓ Download sample</button><button onClick={() => fileRef.current?.click()}>Choose CSV file</button></div>}<input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={uploadCsv} /></div><button className="primary-action" onClick={() => openModal(tab === 'industries' ? 'industry' : 'state')}>+ Add {tab === 'industries' ? 'Industry' : 'State'}</button></div></div>
    <div className="search-row"><div className="search-box">⌕<input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'industries' ? 'Search industries...' : 'Search states, cities, areas or PIN codes...'} /></div><div className="counts">{tab === 'industries' ? `${industries.length} industries · ${services.length} services · ${subservices.length} subservices` : `${states.length} states · ${cities.length} cities · ${subcities.length} sub-cities`}</div></div>
    {loading ? <div className="premium-empty">Loading master data…</div> : tab === 'industries' ? <div className="tree-card">{filteredIndustries.map(industry => { const open = !!expanded[`i${industry.id}`]; const list = servicesFor(industry.id); return <div className="tree-item" key={industry.id}><div className="tree-row level-industry"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`i${industry.id}`]: !open }))}>{open ? '⌄' : '›'}</button><div className="node-mark industry-mark">I</div><div className="node-name"><strong>{industry.name}</strong><small>{list.length} services</small></div><div className="node-actions"><button onClick={() => openModal('industry', industry)}>Edit</button><button className="delete" onClick={() => remove('industry', industry.id, industry.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`i${industry.id}`]: true })); openModal('service', null, industry.id) }}>+ Service</button></div></div>{open && <div className="nested">{list.map(service => { const sOpen = !!expanded[`s${service.id}`]; const children = subservicesFor(service.id); return <div className="tree-item" key={service.id}><div className="tree-row level-service"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`s${service.id}`]: !sOpen }))}>{sOpen ? '⌄' : '›'}</button><div className="node-mark service-mark">S</div><div className="node-name"><strong>{service.name}</strong><small>{children.length} subservices</small></div><div className="node-actions"><button onClick={() => openModal('service', service)}>Edit</button><button className="delete" onClick={() => remove('service', service.id, service.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`s${service.id}`]: true })); openModal('subservice', null, service.id) }}>+ Subservice</button></div></div>{sOpen && <div className="nested">{children.map(child => <div className="tree-row level-subservice" key={child.id}><div className="node-mark subservice-mark">•</div><div className="node-name"><strong>{child.name}</strong></div><div className="node-actions"><button onClick={() => openModal('subservice', child)}>Edit</button><button className="delete" onClick={() => remove('subservice', child.id, child.name)}>Delete</button></div></div>)}</div>}</div>)}</div>}</div>})}</div> : <div className="tree-card">{filteredStates.map(state => { const open = !!expanded[`st${state.id}`]; const list = citiesFor(state.id).filter(city => cityMatches(city, search.trim().toLowerCase())); return <div className="tree-item" key={state.id}><div className="tree-row level-state"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`st${state.id}`]: !open }))}>{open ? '⌄' : '›'}</button><div className="node-mark state-mark">{state.code || stateCode(state.name)}</div><div className="node-name"><strong>{state.name}</strong><small>{citiesFor(state.id).length} cities</small></div><div className="node-actions"><button onClick={() => openModal('state', state)}>Edit</button><button className="delete" onClick={() => remove('state', state.id, state.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`st${state.id}`]: true })); openModal('city', null, state.id) }}>+ City</button></div></div>{open && <div className="nested">{list.map(city => { const cOpen = !!expanded[`c${city.id}`]; const areas = subcitiesFor(city.id).filter(area => areaMatches(area, search.trim().toLowerCase())); return <div className="tree-item" key={city.id}><div className="tree-row level-city"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`c${city.id}`]: !cOpen }))}>{cOpen ? '⌄' : '›'}</button><div className="node-mark city-mark">C</div><div className="node-name"><strong>{city.name}</strong><small>{areas.length} areas</small></div><div className="node-actions"><button onClick={() => openModal('city', city)}>Edit</button><button className="delete" onClick={() => remove('city', city.id, city.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`c${city.id}`]: true })); openModal('subcity', null, city.id) }}>+ Area</button></div></div>{cOpen && <div className="nested">{areas.map(area => <div className="tree-row level-subcity" key={area.id}><div className="node-mark subcity-mark">•</div><div className="node-name"><strong>{area.name}</strong><small>{area.pincode || 'No PIN'}</small></div><div className="node-actions"><button onClick={() => openModal('subcity', area)}>Edit</button><button className="delete" onClick={() => remove('subcity', area.id, area.name)}>Delete</button></div></div>)}</div>}</div>)}</div>}</div>})}</div>}
    {modal && <div className="modal-backdrop" onMouseDown={() => !saving && setModal(null)}><div className="modal-card" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="investment-kicker">MASTER DATA</span><h3>{modal.item ? `Edit ${modal.type}` : `Add ${modal.type}`}</h3></div><button onClick={() => !saving && setModal(null)}>×</button></div><form onSubmit={saveModal}><label>Name<input autoFocus value={modal.form.name} onChange={e => setModal(m => ({ ...m, form: { ...m.form, name: e.target.value } }))} /></label>{['service','subservice','city','subcity'].includes(modal.type) && <label>{modal.type === 'service' ? 'Industry' : modal.type === 'subservice' ? 'Service' : modal.type === 'city' ? 'State' : 'City'}<select value={modal.form.parentId || ''} onChange={e => setModal(m => ({ ...m, form: { ...m.form, parentId: e.target.value }))}>{modal.type === 'service' ? <>{industries.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</> : modal.type === 'subservice' ? <>{services.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</> : modal.type === 'city' ? <>{states.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</> : <>{cities.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</>}</select></label>}{modal.type === 'subcity' && <label>Pincode<input value={modal.form.pincode} onChange={e => setModal(m => ({ ...m, form: { ...m, pincode: e.target.value } }))} /></label>}<div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : modal.item ? 'Save changes' : 'Add'}</button></div></form></div></div>}
  </div>
}
