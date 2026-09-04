import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRequest, saveSession, getUser } from '../utils/auth'
import './Profile.css'

const emptyService = () => ({ industryId: '', serviceId: '', subserviceId: '' })
const emptyLocation = () => ({ stateId: '', cityId: '' })

function Profile() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', businessName: '', businessDetails: '' })
  const [industries, setIndustries] = useState([])
  const [services, setServices] = useState([])
  const [subservices, setSubservices] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [serviceSelections, setServiceSelections] = useState([])
  const [locationSelections, setLocationSelections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [profile, industryData, serviceData, subserviceData, stateData, cityData] = await Promise.all([
          authRequest('/profile'), authRequest('/industries'), authRequest('/services'),
          authRequest('/subservices'), authRequest('/states'), authRequest('/cities'),
        ])
        setForm({ name: getUser()?.name || '', email: getUser()?.email || '', phone: profile.phone || '', businessName: profile.business_name || '', businessDetails: profile.business_details || '' })
        setIndustries(industryData); setServices(serviceData); setSubservices(subserviceData); setStates(stateData); setCities(cityData)
        setServiceSelections(profile.services.map((x) => ({ industryId: String(x.industry_id), serviceId: String(x.service_id), subserviceId: x.subservice_id ? String(x.subservice_id) : '' })))
        setLocationSelections(profile.locations.map((x) => ({ stateId: String(x.state_id), cityId: String(x.city_id) })))
      } catch (err) { setError(err.message) } finally { setLoading(false) }
    }
    load()
  }, [])

  const serviceOptions = useMemo(() => serviceSelections.map((x) => services.filter((s) => String(s.industry_id) === String(x.industryId))), [services, serviceSelections])
  const subserviceOptions = useMemo(() => serviceSelections.map((x) => subservices.filter((s) => String(s.service_id) === String(x.serviceId))), [subservices, serviceSelections])
  const cityOptions = useMemo(() => locationSelections.map((x) => cities.filter((c) => String(c.state_id) === String(x.stateId))), [cities, locationSelections])

  function update(field, value) { setForm((x) => ({ ...x, [field]: value })); setMessage('') }
  function updateService(index, field, value) {
    setServiceSelections((items) => items.map((x, i) => i !== index ? x : field === 'industryId' ? { industryId: value, serviceId: '', subserviceId: '' } : field === 'serviceId' ? { ...x, serviceId: value, subserviceId: '' } : { ...x, [field]: value }))
    setMessage('')
  }
  function updateLocation(index, field, value) {
    setLocationSelections((items) => items.map((x, i) => i !== index ? x : field === 'stateId' ? { stateId: value, cityId: '' } : { ...x, cityId: value }))
    setMessage('')
  }
  function addAllServicesForIndustry(index) {
    const industryId = serviceSelections[index]?.industryId
    if (!industryId) return setError('Select an industry first.')
    const available = services.filter((service) => String(service.industry_id) === String(industryId))
    if (!available.length) return setError('No services are available for this industry.')
    setServiceSelections((items) => {
      const existing = new Set(items.map((item) => `${item.industryId}:${item.serviceId}`))
      const additions = available.filter((service) => !existing.has(`${industryId}:${service.id}`)).map((service) => ({ industryId: String(industryId), serviceId: String(service.id), subserviceId: '' }))
      return additions.length ? [...items, ...additions] : items
    })
    setMessage('All available services for this industry were added.')
    setError('')
  }

  async function save(e) {
    e.preventDefault(); setError(''); setMessage('')
    if (!serviceSelections.length || serviceSelections.some((x) => !x.industryId || !x.serviceId)) return setError('Complete every service selection.')
    if (!locationSelections.length || locationSelections.some((x) => !x.stateId || !x.cityId)) return setError('Complete every location selection.')
    try {
      setSaving(true)
      const result = await authRequest('/profile', {
        method: 'PUT', body: JSON.stringify({ ...form, services: serviceSelections.map((x) => ({ industryId: Number(x.industryId), serviceId: Number(x.serviceId), subserviceId: x.subserviceId ? Number(x.subserviceId) : null })), locations: locationSelections.map((x) => ({ stateId: Number(x.stateId), cityId: Number(x.cityId) })) }),
      })
      saveSession({ token: getTokenSafe(), user: result.user })
      setMessage('Profile saved successfully.')
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  function getTokenSafe() { return localStorage.getItem('propulse_auth_token') }

  if (loading) return <div className="profile-page"><div className="profile-loading">Loading your business profile…</div></div>

  return (
    <div className="profile-page">
      <div className="profile-head">
        <div><span className="profile-kicker">ACCOUNT</span><h1>Business profile</h1><p>Keep your business, services and lead locations up to date.</p></div>
        <button className="profile-back" type="button" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
      </div>
      {error && <div className="profile-alert error">{error}</div>}
      {message && <div className="profile-alert success">{message}</div>}
      <form onSubmit={save}>
        <section className="profile-panel">
          <div className="panel-title"><div><span>01</span><h2>Business information</h2></div></div>
          <div className="profile-grid">
            <label>Full name<input value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
            <label>Phone<input value={form.phone} onChange={(e) => update('phone', e.target.value)} required /></label>
            <label>Business name<input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} required /></label>
            <label className="wide">Business details<textarea rows="4" value={form.businessDetails} onChange={(e) => update('businessDetails', e.target.value)} required /></label>
          </div>
        </section>

        <section className="profile-panel">
          <div className="panel-title"><div><span>02</span><h2>Services you provide</h2><p>Add every service you want matching leads for.</p></div><button type="button" onClick={() => setServiceSelections((x) => [...x, emptyService()])}>+ Add service</button></div>
          <div className="profile-list">
            {serviceSelections.map((x, i) => <div className="profile-row" key={`s-${i}`}><div className="row-number">{String(i + 1).padStart(2, '0')}</div><label>Industry<select value={x.industryId} onChange={(e) => updateService(i, 'industryId', e.target.value)} required><option value="">Select industry</option>{industries.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Service<select value={x.serviceId} onChange={(e) => updateService(i, 'serviceId', e.target.value)} disabled={!x.industryId} required><option value="">Select service</option>{(serviceOptions[i] || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>Subservice <small>Optional · blank means all</small><select value={x.subserviceId} onChange={(e) => updateService(i, 'subserviceId', e.target.value)} disabled={!x.serviceId}><option value="">All related</option>{(subserviceOptions[i] || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><button type="button" className="add-all-services" onClick={() => addAllServicesForIndustry(i)} disabled={!x.industryId}>Add all services</button><button type="button" className="row-remove" onClick={() => setServiceSelections((items) => items.filter((_, n) => n !== i))}>Remove</button></div>)}
          </div>
        </section>

        <section className="profile-panel">
          <div className="panel-title"><div><span>03</span><h2>Locations you serve</h2><p>Add every city where you want to receive leads.</p></div><button type="button" onClick={() => setLocationSelections((x) => [...x, emptyLocation()])}>+ Add location</button></div>
          <div className="profile-list">
            {locationSelections.map((x, i) => <div className="profile-row location-row" key={`l-${i}`}><div className="row-number">{String(i + 1).padStart(2, '0')}</div><label>State / UT<select value={x.stateId} onChange={(e) => updateLocation(i, 'stateId', e.target.value)} required><option value="">Select state / UT</option>{states.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><label>City<select value={x.cityId} onChange={(e) => updateLocation(i, 'cityId', e.target.value)} disabled={!x.stateId} required><option value="">Select city</option>{(cityOptions[i] || []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label><button type="button" className="row-remove" onClick={() => setLocationSelections((items) => items.filter((_, n) => n !== i))}>Remove</button></div>)}
          </div>
        </section>
        <div className="profile-save"><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <span>→</span></button></div>
      </form>
    </div>
  )
}

export default Profile
