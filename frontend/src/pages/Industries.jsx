import { useEffect, useMemo, useRef, useState } from 'react'
import { authRequest } from '../utils/auth'
import './Industries.css'

const slugify = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const stateCode = value => String(value || '').trim().split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase()

async function request(path, options = {}) {
  return authRequest(path, options)
}

const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

function downloadCsv(filename, headers, row) {
  const csv = [headers.join(','), row.map(v => `\"${String(v ?? '').replaceAll('\\"', '\\\"\\"')}\"`).join(',')].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
}

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '\"' && text[i + 1] === '\"' && quoted) { cell += '\"'; i += 1 }
    else if (ch === '\"') quoted = !quoted
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
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [syncing, setSyncing] = useState('')
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [modal, setModal] = useState(null), [uploadOpen, setUploadOpen] = useState(false)
  const fileRef = useRef(null)

  async function loadAll() {
    try {
      setLoading(true); setError('')
      const [i, s, ss, st, c, sc] = await Promise.all([
        request('/industries'), request('/services'), request('/subservices'), request('/states'), request('/cities'), request('/subcities'),
      ])
      setIndustries(i || []); setServices(s || []); setSubservices(ss || []); setStates(st || []); setCities(c || []); setSubcities(sc || [])
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  const filteredIndustries = useMemo(() => { const q = search.trim().toLowerCase(); return !q ? industries : industries.filter(x => x.name.toLowerCase().includes(q)) }, [industries, search])
  const servicesFor = id => services.filter(x => Number(x.industry_id) === Number(id))
  const subservicesFor = id => subservices.filter(x => Number(x.service_id) === Number(id))
  const citiesFor = id => cities.filter(x => Number(x.state_id) === Number(id))
  const subcitiesFor = id => subcities.filter(x => Number(x.city_id) === Number(id))
  const cityMatches = (city, q) => {
    if (!q) return true
    const areas = subcitiesFor(city.id)
    const pins = city.pincodes || []
    return city.name.toLowerCase().includes(q)
      || areas.some(area => area.name.toLowerCase().includes(q) || String(area.pincode || '').includes(q))
      || pins.some(pin => String(pin.pincode || '').includes(q) || String(pin.officeName || '').toLowerCase().includes(q))
  }
  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return states
    return states.filter(state => state.name.toLowerCase().includes(q) || citiesFor(state.id).some(city => cityMatches(city, q)))
  }, [states, cities, subcities, search])

  function openModal(type, item = null, parentId = null) {
    const parent = type === 'service' ? item?.industry_id ?? parentId : type === 'subservice' ? item?.service_id ?? parentId : type === 'city' ? item?.state_id ?? parentId : type === 'subcity' ? item?.city_id ?? parentId : null
    setModal({ type, item, form: { name: item?.name || '', parentId: parent, pincode: item?.pincode || '' } })
    setError(''); setSuccess('')
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
      if (type === 'subcity') { base = '/subcities'; payload = { cityId: form.parentId, name: form.name.trim(), slug: slugify(form.name), pincode: form.pincode.trim() || null, source: 'admin' } }
      await request(item ? `${base}/${item.id}` : base, jsonOptions(item ? 'PUT' : 'POST', payload))
      setModal(null); setSuccess(`${type[0].toUpperCase() + type.slice(1)} ${item ? 'updated' : 'added'} successfully.`); await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function remove(type, id, name) {
    if (!window.confirm(`Delete ${name}?`)) return
    const base = type === 'industry' ? '/industries' : type === 'service' ? '/services' : type === 'subservice' ? '/subservices' : type === 'state' ? '/states' : type === 'city' ? '/cities' : '/subcities'
    try { setError(''); await request(`${base}/${id}`, { method: 'DELETE' }); setSuccess(`${type} deleted successfully.`); await loadAll() } catch (err) { setError(err.message) }
  }

  async function syncStateCities(state) {
    try { setSyncing(`state:${state.id}`); setError(''); setSuccess(''); const result = await request(`/states/${state.id}/sync-cities`, { method: 'POST' }); setSuccess(`${state.name}: ${result.added || 0} new cities, ${result.restored || 0} restored.`); await loadAll() }
    catch (err) { setError(err.message) } finally { setSyncing('') }
  }

  async function syncCityCoverage(city) {
    try { setSyncing(`city:${city.id}`); setError(''); setSuccess(''); const result = await request(`/cities/${city.id}/sync-coverage`, { method: 'POST' }); setSuccess(`${city.name}: ${result.subcities?.added || 0} new sub-city records, ${result.subcities?.restored || 0} restored. Pincodes are entered manually.`); await loadAll() }
    catch (err) { setError(err.message) } finally { setSyncing('') }
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
          const exists = sct.find(x => Number(x.city_id) === Number(city.id) && x.name.toLowerCase() === row.subcity_name.toLowerCase())
          if (!exists) { const sc = await request('/subcities', jsonOptions('POST', { cityId: city.id, name: row.subcity_name, slug: slugify(row.subcity_name), pincode: row.pincode || null, source: 'admin' })); sct.push(sc); added++ }
        }
        setSuccess(`${added} new location records added.`)
      }
      await loadAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const template = tab === 'industries'
    ? () => downloadCsv('propulse-industry-master-template.csv', ['industry_name', 'service_name', 'subservice_name'], ['Interior Design', 'Residential Interior Design', '2BHK Interior Design'])
    : () => downloadCsv('propulse-location-master-template.csv', ['state_name', 'city_name', 'subcity_name', 'pincode'], ['Telangana', 'Hyderabad', 'Gachibowli', '500032'])

  return <div className="master-page">
    <div className="master-tabs"><button className={tab === 'industries' ? 'active' : ''} onClick={() => { setTab('industries'); setSearch(''); setUploadOpen(false) }}>Industries</button><button className={tab === 'locations' ? 'active' : ''} onClick={() => { setTab('locations'); setSearch(''); setUploadOpen(false) }}>Locations</button></div>
    {error && <div className="toast error">{error}</div>}{success && <div className="toast success">✓ {success}</div>}
    <div className="master-toolbar"><div className="toolbar-copy"><h2>{tab === 'industries' ? 'Industry hierarchy' : 'State · City · Sub-city · Pincode'}</h2></div><div className="toolbar-actions"><div className="upload-wrap"><button className="secondary-action" onClick={() => setUploadOpen(v => !v)} disabled={saving || Boolean(syncing)}>↑ Upload bulk</button>{uploadOpen && <div className="upload-popover"><strong>Bulk import</strong><p>Use the current hierarchy template.</p><button onClick={template}>↓ Download sample</button><button onClick={() => fileRef.current?.click()}>Choose CSV file</button></div>}<input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={uploadCsv} /></div><button className="primary-action" onClick={() => openModal(tab === 'industries' ? 'industry' : 'state')}>+ Add {tab === 'industries' ? 'Industry' : 'State'}</button></div></div>
    <div className="search-row"><div className="search-box">⌕<input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'industries' ? 'Search industries...' : 'Search states, cities, areas or PIN codes...'} /></div><div className="counts">{tab === 'industries' ? `${industries.length} industries · ${services.length} services · ${subservices.length} subservices` : `${states.length} states · ${cities.length} cities · ${subcities.length} sub-cities`}</div></div>

    {loading ? <div className="premium-empty">Loading master data…</div> : tab === 'industries' ? <div className="tree-card">{filteredIndustries.map(industry => { const open = !!expanded[`i${industry.id}`]; const list = servicesFor(industry.id); return <div className="tree-item" key={industry.id}><div className="tree-row level-industry"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`i${industry.id}`]: !open }))}>{open ? '⌄' : '›'}</button><div className="node-mark industry-mark">I</div><div className="node-name"><strong>{industry.name}</strong><small>{list.length} services</small></div><div className="node-actions"><button onClick={() => openModal('industry', industry)}>Edit</button><button className="delete" onClick={() => remove('industry', industry.id, industry.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`i${industry.id}`]: true })); openModal('service', null, industry.id) }}>+ Service</button></div></div>{open && <div className="nested">{list.map(service => { const sOpen = !!expanded[`s${service.id}`]; const children = subservicesFor(service.id); return <div className="tree-item" key={service.id}><div className="tree-row level-service"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`s${service.id}`]: !sOpen }))}>{sOpen ? '⌄' : '›'}</button><div className="node-mark service-mark">S</div><div className="node-name"><strong>{service.name}</strong><small>{children.length} subservices</small></div><div className="node-actions"><button onClick={() => openModal('service', service)}>Edit</button><button className="delete" onClick={() => remove('service', service.id, service.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`s${service.id}`]: true })); openModal('subservice', null, service.id) }}>+ Subservice</button></div></div>{sOpen && <div className="nested subnested">{children.map(ss => <div className="tree-row level-subservice" key={ss.id}><div className="node-mark subservice-mark">↳</div><div className="node-name"><strong>{ss.name}</strong></div><div className="node-actions"><button onClick={() => openModal('subservice', ss)}>Edit</button><button className="delete" onClick={() => remove('subservice', ss.id, ss.name)}>Delete</button></div></div>)}</div>}</div>})}</div>}</div>})}</div> : <div className="tree-card">{filteredStates.map(state => { const q = search.trim().toLowerCase(); const stateMatches = state.name.toLowerCase().includes(q); const stateCities = citiesFor(state.id); const visibleCities = q && !stateMatches ? stateCities.filter(city => cityMatches(city, q)) : stateCities; const open = !!expanded[`st${state.id}`] || Boolean(q); const stateSyncing = syncing === `state:${state.id}`; return <div className="tree-item" key={state.id}><div className="tree-row level-industry"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`st${state.id}`]: !open }))}>{open ? '⌄' : '›'}</button><div className="node-mark industry-mark">S</div><div className="node-name"><strong>{state.name}</strong><small>{stateCities.length} cities</small></div><div className="node-actions"><button onClick={() => openModal('state', state)}>Edit</button><button className="delete" onClick={() => remove('state', state.id, state.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`st${state.id}`]: true })); openModal('city', null, state.id) }}>+ City</button><button className="sync-link" disabled={Boolean(syncing)} onClick={() => syncStateCities(state)}>{stateSyncing ? 'Syncing…' : '↻ Sync cities'}</button></div></div>{open && <div className="nested">{visibleCities.map(city => { const cityOpen = !!expanded[`ct${city.id}`] || Boolean(q && cityMatches(city, q)); const areas = subcitiesFor(city.id); const pins = city.pincodes || []; const citySyncing = syncing === `city:${city.id}`; return <div className="tree-item" key={city.id}><div className="tree-row level-service"><button className="chevron" onClick={() => setExpanded(x => ({ ...x, [`ct${city.id}`]: !cityOpen }))}>{cityOpen ? '⌄' : '›'}</button><div className="node-mark service-mark">C</div><div className="node-name"><strong>{city.name}</strong><small>{areas.length} sub-cities · {pins.length} PIN codes</small></div><div className="node-actions"><button onClick={() => openModal('city', city)}>Edit</button><button className="delete" onClick={() => remove('city', city.id, city.name)}>Delete</button><button className="add-link" onClick={() => { setExpanded(x => ({ ...x, [`ct${city.id}`]: true })); openModal('subcity', null, city.id) }}>+ Sub-city</button><button className="sync-link" disabled={Boolean(syncing)} onClick={() => syncCityCoverage(city)}>{citySyncing ? 'Syncing…' : '↻ Sync areas'}</button></div></div>{cityOpen && <div className="nested subnested">{areas.map(area => <div className="tree-row level-subservice" key={area.id}><div className="node-mark subservice-mark">A</div><div className="node-name"><strong>{area.name}</strong><small>{area.pincode ? `PIN ${area.pincode}` : 'PIN not assigned'} · ${area.source || 'admin'}</small></div><div className="node-actions"><button onClick={() => openModal('subcity', area)}>Edit</button><button className="delete" onClick={() => remove('subcity', area.id, area.name)}>Delete</button></div></div>)}{pins.length > 0 && <div className="pincode-panel"><div className="pincode-title">PIN codes for {city.name}</div><div className="pincode-list">{pins.map(pin => <span className="pincode-chip" key={pin.id}>{pin.pincode}{pin.officeName ? ` · ${pin.officeName}` : ''}</span>)}</div></div>}</div>}</div>})}</div>}</div>})}</div>}

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null) }}><form className="premium-modal" onSubmit={saveModal}><div className="modal-top"><div><span>MASTER DATA</span><h3>{modal.item ? 'Edit' : 'Add'} {modal.type}</h3></div><button type="button" onClick={() => setModal(null)}>×</button></div>{['service','subservice','city','subcity'].includes(modal.type) && <label>Parent<select value={modal.form.parentId || ''} onChange={e => setModal(x => ({ ...x, form: { ...x.form, parentId: e.target.value } }))} required><option value="">Select parent</option>{(modal.type === 'service' ? industries : modal.type === 'subservice' ? services : modal.type === 'city' ? states : cities).map(x => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label>}<label>Name<input value={modal.form.name} onChange={e => setModal(x => ({ ...x, form: { ...x.form, name: e.target.value } }))} autoFocus required /></label>{modal.type === 'subcity' && <><label>Pincode<input list="city-pincode-options" inputMode="numeric" maxLength={6} value={modal.form.pincode} onChange={e => setModal(x => ({ ...x, form: { ...x.form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) } }))} placeholder="Enter 6-digit PIN manually" /><datalist id="city-pincode-options">{((cities || []).find(x => String(x.id) === String(modal.form.parentId))?.pincodes || []).map(pin => <option key={pin.id} value={pin.pincode}>{pin.officeName || pin.pincode}</option>)}</datalist></label><small className="modal-help">PIN codes are managed manually. Example: Kukatpally → 500072.</small></>}<div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button className="save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form></div>}
  </div>
}
