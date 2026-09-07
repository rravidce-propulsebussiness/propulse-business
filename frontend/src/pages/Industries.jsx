import { useEffect, useMemo, useRef, useState } from 'react'
import { authRequest } from '../utils/auth'
import './Industries.css'

const slugify = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const stateCode = value => String(value || '').trim().split(/\s+/).map(part => part[0]).join('').slice(0, 3).toUpperCase()

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

const request = (path, options = {}) => authRequest(path, options)
const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

function downloadCsv(filename, headers, row) {
  const csv = [headers.join(','), row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (ch === '"' && text[i + 1] === '"' && quoted) { cell += '"'; i += 1 }
    else if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row) }
  if (!rows.length) return []
  const headers = rows[0].map(header => header.toLowerCase().trim())
  return rows.slice(1).map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])))
}

export default function Industries() {
  const [tab, setTab] = useState('industries')
  const [industries, setIndustries] = useState([])
  const [services, setServices] = useState([])
  const [subservices, setSubservices] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [subcities, setSubcities] = useState([])
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
    setLoading(true)
    setError('')
    const endpoints = [
      ['industries', '/industries', setIndustries],
      ['services', '/services', setServices],
      ['subservices', '/subservices', setSubservices],
      ['states', '/states', setStates],
      ['cities', '/cities', setCities],
      ['subcities', '/subcities', setSubcities],
    ]
    const results = await Promise.all(endpoints.map(async ([label, path, setter]) => {
      try {
        setter(collection(await request(path)))
        return null
      } catch (err) {
        return `${label}: ${err.message}`
      }
    }))
    const failures = results.filter(Boolean)
    if (failures.length) setError(failures.join(' · '))
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const filteredIndustries = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return industries
    return industries.filter(item => String(item.name || '').toLowerCase().includes(query))
  }, [industries, search])

  const servicesFor = id => services.filter(item => Number(item.industry_id) === Number(id))
  const subservicesFor = id => subservices.filter(item => Number(item.service_id) === Number(id))
  const citiesFor = id => cities.filter(item => Number(item.state_id) === Number(id))
  const subcitiesFor = id => subcities.filter(item => Number(item.city_id) === Number(id))

  const cityMatches = (city, query) => {
    if (!query) return true
    const name = String(city.name || '').toLowerCase()
    const areas = subcitiesFor(city.id)
    const pins = Array.isArray(city.pincodes) ? city.pincodes : []
    return name.includes(query)
      || areas.some(area => String(area.name || '').toLowerCase().includes(query) || String(area.pincode || '').includes(query))
      || pins.some(pin => String(pin.pincode || '').includes(query) || String(pin.officeName || '').toLowerCase().includes(query))
  }

  const filteredStates = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return states
    return states.filter(state => String(state.name || '').toLowerCase().includes(query) || citiesFor(state.id).some(city => cityMatches(city, query)))
  }, [states, cities, subcities, search])

  const areaMatches = (area, query) => !query || String(area.name || '').toLowerCase().includes(query) || String(area.pincode || '').includes(query)

  function openModal(type, item = null, parentId = null) {
    let parent = null
    if (type === 'service') parent = item?.industry_id ?? parentId
    if (type === 'subservice') parent = item?.service_id ?? parentId
    if (type === 'city') parent = item?.state_id ?? parentId
    if (type === 'subcity') parent = item?.city_id ?? parentId
    setModal({ type, item, form: { name: item?.name || '', parentId: parent, pincode: item?.pincode || '' } })
    setError('')
    setSuccess('')
  }

  async function saveModal(event) {
    event.preventDefault()
    if (!modal) return
    const name = modal.form.name.trim()
    if (!name) { setError(`${modal.type} name is required.`); return }

    const { type, item, form } = modal
    let base = '/industries'
    let payload = { name, slug: slugify(name) }
    if (type === 'service') { base = '/services'; payload = { industryId: form.parentId, name, slug: slugify(name) } }
    if (type === 'subservice') { base = '/subservices'; payload = { serviceId: form.parentId, name, slug: slugify(name) } }
    if (type === 'state') { base = '/states'; payload = { name, code: stateCode(name) } }
    if (type === 'city') { base = '/cities'; payload = { stateId: form.parentId, name, slug: slugify(name) } }
    if (type === 'subcity') { base = '/subcities'; payload = { cityId: form.parentId, name, slug: slugify(name), pincode: form.pincode.trim() || null } }

    if (type === 'city' && !item) {
      const duplicate = cities.some(city => Number(city.state_id) === Number(form.parentId) && String(city.name || '').trim().toLowerCase() === name.toLowerCase())
      if (duplicate) { setError('City already exists in this state.'); return }
    }

    try {
      setSaving(true)
      setError('')
      await request(item ? `${base}/${item.id}` : base, jsonOptions(item ? 'PUT' : 'POST', payload))
      setModal(null)
      setSuccess(`${type[0].toUpperCase() + type.slice(1)} ${item ? 'updated' : 'added'} successfully.`)
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(type, id, name) {
    if (!window.confirm(`Delete ${name}?`)) return
    const baseMap = { industry: '/industries', service: '/services', subservice: '/subservices', state: '/states', city: '/cities', subcity: '/subcities' }
    try {
      setError('')
      await request(`${baseMap[type]}/${id}`, { method: 'DELETE' })
      setSuccess(`${type} deleted successfully.`)
      await loadAll()
    } catch (err) { setError(err.message) }
  }

  async function uploadCsv(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setUploadOpen(false)
    if (!file) return
    try {
      setSaving(true); setError(''); setSuccess('')
      const rows = parseCsv(await file.text())
      if (tab === 'industries') {
        const headers = ['industry_name', 'service_name', 'subservice_name']
        if (!rows.length || !headers.every(header => header in rows[0])) throw new Error('Use the Industry sample template.')
        let added = 0
        const industryCache = [...industries], serviceCache = [...services], subserviceCache = [...subservices]
        for (const row of rows) {
          if (!row.industry_name) continue
          let industry = industryCache.find(item => item.name.toLowerCase() === row.industry_name.toLowerCase())
          if (!industry) { industry = await request('/industries', jsonOptions('POST', { name: row.industry_name, slug: slugify(row.industry_name) })); industryCache.push(industry); added += 1 }
          if (!row.service_name) continue
          let service = serviceCache.find(item => Number(item.industry_id) === Number(industry.id) && item.name.toLowerCase() === row.service_name.toLowerCase())
          if (!service) { service = await request('/services', jsonOptions('POST', { industryId: industry.id, name: row.service_name, slug: slugify(row.service_name) })); serviceCache.push(service); added += 1 }
          if (!row.subservice_name) continue
          if (!subserviceCache.find(item => Number(item.service_id) === Number(service.id) && item.name.toLowerCase() === row.subservice_name.toLowerCase())) {
            const created = await request('/subservices', jsonOptions('POST', { serviceId: service.id, name: row.subservice_name, slug: slugify(row.subservice_name) }))
            subserviceCache.push(created); added += 1
          }
        }
        setSuccess(`${added} new master records added.`)
      } else {
        const headers = ['state_name', 'city_name', 'subcity_name', 'pincode']
        if (!rows.length || !headers.every(header => header in rows[0])) throw new Error('Use the Location sample template.')
        let added = 0
        const stateCache = [...states], cityCache = [...cities], subcityCache = [...subcities]
        for (const row of rows) {
          if (!row.state_name) continue
          let state = stateCache.find(item => item.name.toLowerCase() === row.state_name.toLowerCase())
          if (!state) { state = await request('/states', jsonOptions('POST', { name: row.state_name, code: stateCode(row.state_name) })); stateCache.push(state); added += 1 }
          if (!row.city_name) continue
          let city = cityCache.find(item => Number(item.state_id) === Number(state.id) && item.name.toLowerCase() === row.city_name.toLowerCase())
          if (!city) { city = await request('/cities', jsonOptions('POST', { stateId: state.id, name: row.city_name, slug: slugify(row.city_name) })); cityCache.push(city); added += 1 }
          if (!row.subcity_name) continue
          if (!subcityCache.find(item => Number(item.city_id) === Number(city.id) && item.name.toLowerCase() === row.subcity_name.toLowerCase())) {
            const created = await request('/subcities', jsonOptions('POST', { cityId: city.id, name: row.subcity_name, slug: slugify(row.subcity_name), pincode: row.pincode || null }))
            subcityCache.push(created); added += 1
          }
        }
        setSuccess(`${added} new location records added.`)
      }
      await loadAll()
    } catch (err) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  function renderIndustryTree() {
    return (
      <div className="tree-card">
        {filteredIndustries.map(industry => {
          const open = Boolean(expanded[`i${industry.id}`])
          const children = servicesFor(industry.id)
          return (
            <div className="tree-item" key={industry.id}>
              <div className="tree-row level-industry">
                <button className="chevron" onClick={() => setExpanded(value => ({ ...value, [`i${industry.id}`]: !open }))}>{open ? '⌄' : '›'}</button>
                <div className="node-mark industry-mark">I</div>
                <div className="node-name"><strong>{industry.name}</strong><small>{children.length} services</small></div>
                <div className="node-actions">
                  <button onClick={() => openModal('industry', industry)}>Edit</button>
                  <button className="delete" onClick={() => remove('industry', industry.id, industry.name)}>Delete</button>
                  <button className="add-link" onClick={() => { setExpanded(value => ({ ...value, [`i${industry.id}`]: true })); openModal('service', null, industry.id) }}>+ Service</button>
                </div>
              </div>
              {open && <div className="nested">{children.map(service => {
                const serviceOpen = Boolean(expanded[`s${service.id}`])
                const subItems = subservicesFor(service.id)
                return (
                  <div className="tree-item" key={service.id}>
                    <div className="tree-row level-service">
                      <button className="chevron" onClick={() => setExpanded(value => ({ ...value, [`s${service.id}`]: !serviceOpen }))}>{serviceOpen ? '⌄' : '›'}</button>
                      <div className="node-mark service-mark">S</div>
                      <div className="node-name"><strong>{service.name}</strong><small>{subItems.length} subservices</small></div>
                      <div className="node-actions">
                        <button onClick={() => openModal('service', service)}>Edit</button>
                        <button className="delete" onClick={() => remove('service', service.id, service.name)}>Delete</button>
                        <button className="add-link" onClick={() => { setExpanded(value => ({ ...value, [`s${service.id}`]: true })); openModal('subservice', null, service.id) }}>+ Subservice</button>
                      </div>
                    </div>
                    {serviceOpen && <div className="nested subnested">{subItems.map(subservice => (
                      <div className="tree-row level-subservice" key={subservice.id}>
                        <div className="node-mark subservice-mark">↳</div>
                        <div className="node-name"><strong>{subservice.name}</strong></div>
                        <div className="node-actions">
                          <button onClick={() => openModal('subservice', subservice)}>Edit</button>
                          <button className="delete" onClick={() => remove('subservice', subservice.id, subservice.name)}>Delete</button>
                        </div>
                      </div>
                    ))}</div>}
                  </div>
                )
              })}</div>}
            </div>
          )
        })}
      </div>
    )
  }

  function renderLocationTree() {
    const query = search.trim().toLowerCase()
    return (
      <div className="tree-card">
        {filteredStates.map(state => {
          const stateOpen = Boolean(expanded[`st${state.id}`]) || Boolean(query)
          const allCities = citiesFor(state.id)
          const visibleCities = !query || String(state.name || '').toLowerCase().includes(query) ? allCities : allCities.filter(city => cityMatches(city, query))
          return (
            <div className="tree-item" key={state.id}>
              <div className="tree-row level-state">
                <button className="chevron" onClick={() => setExpanded(value => ({ ...value, [`st${state.id}`]: !stateOpen }))}>{stateOpen ? '⌄' : '›'}</button>
                <div className="node-mark state-mark">{state.code || stateCode(state.name)}</div>
                <div className="node-name"><strong>{state.name}</strong><small>{allCities.length} cities</small></div>
                <div className="node-actions">
                  <button onClick={() => openModal('state', state)}>Edit</button>
                  <button className="delete" onClick={() => remove('state', state.id, state.name)}>Delete</button>
                  <button className="add-link" onClick={() => { setExpanded(value => ({ ...value, [`st${state.id}`]: true })); openModal('city', null, state.id) }}>+ City</button>
                </div>
              </div>
              {stateOpen && <div className="nested">{visibleCities.map(city => {
                const cityOpen = Boolean(expanded[`c${city.id}`]) || Boolean(query && cityMatches(city, query))
                const areas = subcitiesFor(city.id)
                const visibleAreas = !query || String(city.name || '').toLowerCase().includes(query) ? areas : areas.filter(area => areaMatches(area, query))
                return (
                  <div className="tree-item" key={city.id}>
                    <div className="tree-row level-city">
                      <button className="chevron" onClick={() => setExpanded(value => ({ ...value, [`c${city.id}`]: !cityOpen }))}>{cityOpen ? '⌄' : '›'}</button>
                      <div className="node-mark city-mark">C</div>
                      <div className="node-name"><strong>{city.name}</strong><small>{areas.length} areas</small></div>
                      <div className="node-actions">
                        <button onClick={() => openModal('city', city)}>Edit</button>
                        <button className="delete" onClick={() => remove('city', city.id, city.name)}>Delete</button>
                        <button className="add-link" onClick={() => { setExpanded(value => ({ ...value, [`c${city.id}`]: true })); openModal('subcity', null, city.id) }}>+ Area</button>
                      </div>
                    </div>
                    {cityOpen && <div className="nested subnested">{visibleAreas.map(area => (
                      <div className="tree-row level-subcity" key={area.id}>
                        <div className="node-mark subcity-mark">•</div>
                        <div className="node-name"><strong>{area.name}</strong><small>{area.pincode || 'No PIN'}</small></div>
                        <div className="node-actions">
                          <button onClick={() => openModal('subcity', area)}>Edit</button>
                          <button className="delete" onClick={() => remove('subcity', area.id, area.name)}>Delete</button>
                        </div>
                      </div>
                    ))}</div>}
                  </div>
                )
              })}</div>}
            </div>
          )
        })}
      </div>
    )
  }

  function renderModal() {
    if (!modal) return null
    let parentLabel = ''
    let parentItems = []
    if (modal.type === 'service') { parentLabel = 'Industry'; parentItems = industries }
    if (modal.type === 'subservice') { parentLabel = 'Service'; parentItems = services }
    if (modal.type === 'city') { parentLabel = 'State'; parentItems = states }
    if (modal.type === 'subcity') { parentLabel = 'City'; parentItems = cities }

    return (
      <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setModal(null) }}>
        <div className="modal-card" onMouseDown={event => event.stopPropagation()}>
          <div className="modal-head">
            <div><span className="investment-kicker">MASTER DATA</span><h3>{modal.item ? `Edit ${modal.type}` : `Add ${modal.type}`}</h3></div>
            <button type="button" onClick={() => !saving && setModal(null)}>×</button>
          </div>
          <form onSubmit={saveModal}>
            <label>Name<input autoFocus value={modal.form.name} onChange={event => setModal(value => ({ ...value, form: { ...value.form, name: event.target.value } }))} required /></label>
            {parentLabel && <label>{parentLabel}<select value={modal.form.parentId || ''} onChange={event => setModal(value => ({ ...value, form: { ...value.form, parentId: event.target.value } }))} required><option value="">Select {parentLabel.toLowerCase()}</option>{parentItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
            {modal.type === 'subcity' && <label>Pincode<input inputMode="numeric" maxLength={6} value={modal.form.pincode} onChange={event => setModal(value => ({ ...value, form: { ...value.form, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) } }))} placeholder="Enter 6-digit PIN" /></label>}
            <div className="modal-actions"><button type="button" onClick={() => setModal(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving…' : modal.item ? 'Save changes' : 'Add'}</button></div>
          </form>
        </div>
      </div>
    )
  }

  const template = tab === 'industries'
    ? () => downloadCsv('propulse-industry-master-template.csv', ['industry_name', 'service_name', 'subservice_name'], ['Interior Design', 'Residential Interior Design', '2BHK Interior Design'])
    : () => downloadCsv('propulse-location-master-template.csv', ['state_name', 'city_name', 'subcity_name', 'pincode'], ['Telangana', 'Hyderabad', 'Gachibowli', '500032'])

  return (
    <div className="master-page">
      <div className="master-tabs">
        <button className={tab === 'industries' ? 'active' : ''} onClick={() => { setTab('industries'); setSearch(''); setUploadOpen(false) }}>Industries</button>
        <button className={tab === 'locations' ? 'active' : ''} onClick={() => { setTab('locations'); setSearch(''); setUploadOpen(false) }}>Locations</button>
      </div>
      {error && <div className="toast error">{error}</div>}
      {success && <div className="toast success">✓ {success}</div>}
      <div className="master-toolbar">
        <div className="toolbar-copy"><h2>{tab === 'industries' ? 'Industry hierarchy' : 'State · City · Sub-city · Pincode'}</h2></div>
        <div className="toolbar-actions">
          <div className="upload-wrap">
            <button className="secondary-action" onClick={() => setUploadOpen(value => !value)} disabled={saving}>↑ Upload bulk</button>
            {uploadOpen && <div className="upload-popover"><strong>Bulk import</strong><p>Use the current hierarchy template.</p><button onClick={template}>↓ Download sample</button><button onClick={() => fileRef.current?.click()}>Choose CSV file</button></div>}
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={uploadCsv} />
          </div>
          <button className="primary-action" onClick={() => openModal(tab === 'industries' ? 'industry' : 'state')}>+ Add {tab === 'industries' ? 'Industry' : 'State'}</button>
        </div>
      </div>
      <div className="search-row">
        <div className="search-box">⌕<input value={search} onChange={event => setSearch(event.target.value)} placeholder={tab === 'industries' ? 'Search industries...' : 'Search states, cities, areas or PIN codes...'} /></div>
        <div className="counts">{tab === 'industries' ? `${industries.length} industries · ${services.length} services · ${subservices.length} subservices` : `${states.length} states · ${cities.length} cities · ${subcities.length} sub-cities`}</div>
      </div>
      {loading ? <div className="premium-empty">Loading master data…</div> : tab === 'industries' ? renderIndustryTree() : renderLocationTree()}
      {renderModal()}
    </div>
  )
}
