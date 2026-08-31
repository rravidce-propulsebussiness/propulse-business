import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest, authRequest, saveSession } from '../utils/auth'
import './Auth.css'

const emptyForm = { name: '', email: '', phone: '', businessName: '', businessDetails: '', password: '', confirm: '' }
const newService = () => ({ industryId: '', serviceId: '', subserviceId: '' })
const newLocation = () => ({ stateId: '', cityId: '' })

function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [industries, setIndustries] = useState([])
  const [services, setServices] = useState([])
  const [subservices, setSubservices] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [serviceSelections, setServiceSelections] = useState([newService()])
  const [locationSelections, setLocationSelections] = useState([newLocation()])
  const [showPassword, setShowPassword] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [industryData, serviceData, subserviceData, stateData, cityData] = await Promise.all([
          publicRequest('/industries'), publicRequest('/services'), publicRequest('/subservices'),
          publicRequest('/states'), publicRequest('/cities'),
        ])
        setIndustries(industryData)
        setServices(serviceData)
        setSubservices(subserviceData)
        setStates(stateData)
        setCities(cityData)
      } catch (err) {
        setError(`We couldn't load the business options. ${err.message}`)
      } finally { setLoadingData(false) }
    }
    loadMasterData()
  }, [])

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  function updateServiceSelection(index, field, value) {
    setServiceSelections((current) => current.map((item, i) => {
      if (i !== index) return item
      if (field === 'industryId') return { industryId: value, serviceId: '', subserviceId: '' }
      if (field === 'serviceId') return { ...item, serviceId: value, subserviceId: '' }
      return { ...item, [field]: value }
    }))
  }
  function updateLocationSelection(index, field, value) {
    setLocationSelections((current) => current.map((item, i) => i === index ? (field === 'stateId' ? { stateId: value, cityId: '' } : { ...item, [field]: value }) : item))
  }
  function addServiceSelection() { setServiceSelections((current) => [...current, newService()]) }
  function removeServiceSelection(index) { setServiceSelections((current) => current.filter((_, i) => i !== index)) }
  function addLocationSelection() { setLocationSelections((current) => [...current, newLocation()]) }
  function removeLocationSelection(index) { setLocationSelections((current) => current.filter((_, i) => i !== index)) }

  const serviceOptions = useMemo(() => serviceSelections.map((s) => services.filter((item) => String(item.industry_id) === String(s.industryId))), [services, serviceSelections])
  const subserviceOptions = useMemo(() => serviceSelections.map((s) => subservices.filter((item) => String(item.service_id) === String(s.serviceId))), [subservices, serviceSelections])
  const cityOptions = useMemo(() => locationSelections.map((s) => cities.filter((item) => String(item.state_id) === String(s.stateId))), [cities, locationSelections])

  async function submit(e) {
    e.preventDefault(); setError('')
    if (!agree) return setError('Please accept the terms to continue.')
    if (!form.name || !form.email || !form.phone || !form.businessName || !form.businessDetails) return setError('Complete your personal and business details.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    const cleanServices = serviceSelections.filter((x) => x.industryId && x.serviceId).map((x) => ({ industryId: Number(x.industryId), serviceId: Number(x.serviceId), subserviceId: x.subserviceId ? Number(x.subserviceId) : null }))
    const cleanLocations = locationSelections.filter((x) => x.stateId && x.cityId).map((x) => ({ stateId: Number(x.stateId), cityId: Number(x.cityId) }))
    if (!cleanServices.length) return setError('Add at least one service.')
    if (!cleanLocations.length) return setError('Add at least one location.')
    try {
      setLoading(true)
      const result = await authRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ ...form, confirm: undefined, services: cleanServices, locations: cleanLocations }) })
      saveSession(result); navigate('/', { replace: true })
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <section className="auth-visual" aria-label="Pro Pulse Business">
        <div className="auth-visual-overlay" /><div className="auth-visual-content">
          <div className="auth-logo-frame"><img className="auth-logo" src="/brand/propulse-logo.png" alt="Pro Pulse Business" /></div>
          <div className="auth-visual-copy"><span>QUALIFIED LEADS. BETTER OPPORTUNITIES.</span><h1>Get High-Value<br /><em>Clients.</em></h1><p>Choose the services you provide and the locations you serve. We'll match you with relevant opportunities.</p></div>
          <div className="auth-visual-footer"><span>CONNECT</span><i /><span>GROW</span><i /><span>BUILD</span><i /><span>SUCCEED</span></div>
        </div>
      </section>
      <main className="auth-card-wrap"><div className="auth-card signup-card signup-wide">
        <div className="mobile-brand"><img src="/brand/propulse-logo.png" alt="Pro Pulse" /></div>
        <div className="auth-heading"><p className="auth-kicker">BUSINESS PROFILE</p><h2>Create account</h2><p>Tell us what you sell and where you serve.</p></div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {loadingData && <div className="auth-loading">Loading options…</div>}
        <form onSubmit={submit}>
          <div className="signup-section-label">Personal details</div>
          <div className="auth-form-grid">
            <label>Full name<input autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" required /></label>
            <label>Phone number<input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile number" required /></label>
            <label className="full-span">Email address<input type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@company.com" required /></label>
          </div>
          <div className="signup-section-label">Business details</div>
          <div className="auth-form-grid"><label className="full-span">Business name<input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Your company or business name" required /></label><label className="full-span">Business details<textarea value={form.businessDetails} onChange={(e) => update('businessDetails', e.target.value)} placeholder="Tell customers what your business does" rows="3" required /></label></div>
          <div className="signup-section-label section-heading-row"><div><span>Services you provide</span><small>Add every service you want matching leads for.</small></div><button type="button" className="add-selection primary-add" onClick={addServiceSelection}>+ Add service</button></div>
          <div className="selection-list">{serviceSelections.map((selection, index) => <div className="selection-card" key={`service-${index}`}><div className="selection-card-top"><span>Service {index + 1}</span>{serviceSelections.length > 1 && <button type="button" className="remove-selection" onClick={() => removeServiceSelection(index)}>Remove</button>}</div><div className="selection-grid"><label>Industry<select value={selection.industryId} onChange={(e) => updateServiceSelection(index, 'industryId', e.target.value)} disabled={loadingData} required><option value="">Select industry</option>{industries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Service<select value={selection.serviceId} onChange={(e) => updateServiceSelection(index, 'serviceId', e.target.value)} disabled={!selection.industryId} required><option value="">{selection.industryId ? 'Select service' : 'Select industry first'}</option>{(serviceOptions[index] || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Subservice <span className="optional">Optional</span><select value={selection.subserviceId} onChange={(e) => updateServiceSelection(index, 'subserviceId', e.target.value)} disabled={!selection.serviceId}><option value="">All related subservices</option>{(subserviceOptions[index] || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></div>)}</div>
          <div className="signup-section-label section-heading-row"><div><span>Locations you serve</span><small>Add every city where you want to receive leads.</small></div><button type="button" className="add-selection primary-add" onClick={addLocationSelection}>+ Add location</button></div>
          <div className="selection-list">{locationSelections.map((selection, index) => <div className="selection-card" key={`location-${index}`}><div className="selection-card-top"><span>Location {index + 1}</span>{locationSelections.length > 1 && <button type="button" className="remove-selection" onClick={() => removeLocationSelection(index)}>Remove</button>}</div><div className="selection-grid location-grid"><label>State / UT<select value={selection.stateId} onChange={(e) => updateLocationSelection(index, 'stateId', e.target.value)} disabled={loadingData} required><option value="">Select state / UT</option>{states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>City<select value={selection.cityId} onChange={(e) => updateLocationSelection(index, 'cityId', e.target.value)} disabled={!selection.stateId} required><option value="">{selection.stateId ? 'Select city' : 'Select state first'}</option>{(cityOptions[index] || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></div>)}</div>
          <div className="signup-section-label">Secure your account</div><div className="auth-form-grid"><label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" required /><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label><label>Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} placeholder="Repeat your password" required /></label></div>
          <label className="check terms"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the terms and privacy policy.</label><button className="auth-submit" disabled={loading || loadingData}>{loading ? 'Creating…' : 'Create account'} <span>→</span></button>
        </form><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div></main>
    </div>
  )
}
export default Signup
