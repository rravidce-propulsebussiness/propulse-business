import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { publicRequest, authRequest, saveSession } from '../utils/auth'
import GoogleButton from '../components/GoogleButton'
import './Signup.css'

const emptyForm = { name: '', email: '', phone: '', businessName: '', businessDetails: '', password: '', confirm: '' }
const newService = () => ({ industryId: '', serviceId: '', subserviceId: '' })
const newLocation = () => ({ stateId: '', cityId: '' })

function toList(value, key) {
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value[key])) return value[key]
  if (value && Array.isArray(value.data)) return value.data
  return []
}

function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [accountType, setAccountType] = useState('business')
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
  const [googleLoading, setGoogleLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [industryData, serviceData, subserviceData, stateData, cityData] = await Promise.all([
          publicRequest('/industries'), publicRequest('/services'), publicRequest('/subservices'),
          publicRequest('/states'), publicRequest('/cities'),
        ])
        setIndustries(toList(industryData, 'industries'))
        setServices(toList(serviceData, 'services'))
        setSubservices(toList(subserviceData, 'subservices'))
        setStates(toList(stateData, 'states'))
        setCities(toList(cityData, 'cities'))
      } catch (err) { setError(`We couldn't load the business options. ${err.message}`) }
      finally { setLoadingData(false) }
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

  function accountTypeLabel() {
    return accountType === 'lead_partner' ? 'Lead Partner' : 'User'
  }

  async function submit(e) {
    e.preventDefault(); setError('')
    if (!accountType) return setError('Choose an account type to continue.')
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
      const result = await authRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ ...form, confirm: undefined, accountType, services: cleanServices, locations: cleanLocations }) })
      saveSession(result)
      navigate('/dashboard', { replace: true })
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  const handleGoogle = useCallback(async credential => {
    setError('')
    if (!agree) return setError('Please accept the terms to continue with Google.')
    try {
      setGoogleLoading(true)
      const result = await authRequest('/auth/google', { method: 'POST', body: JSON.stringify({ credential, accountType }) })
      saveSession(result)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }, [accountType, agree, navigate])

  return (
    <div className="signup-premium-page">
      <section className="signup-premium-visual" aria-label="Propulse Business">
        <div className="signup-visual-bg" />
        <div className="signup-visual-overlay" />
        <div className="signup-visual-orbit orbit-a" />
        <div className="signup-visual-orbit orbit-b" />

        <div className="signup-visual-top">
          <Link className="signup-brand" to="/" aria-label="Propulse Business home">
            <img src="/brand/propulse-logo.png" alt="Propulse Business Technologies Private Limited" />
            <span>Building Business Together.</span>
          </Link>
          <div className="signup-visual-nav"><span>Technology</span><i/><span>Growth</span><i/><span>Opportunities</span></div>
        </div>

        <div className="signup-visual-content">
          <div className="signup-visual-kicker"><span /> JOIN PROPULSE</div>
          <h1>Be Part of<br /><em>Bigger Growth.</em></h1>
          <p>Create your account and unlock opportunities in technology, digital growth, lead sales and business solutions with Propulse.</p>

          <div className="signup-benefits">
            <div><b>01</b><span><strong>Access Leads</strong><small>Discover relevant customer opportunities.</small></span></div>
            <div><b>02</b><span><strong>Grow Your Business</strong><small>Use technology, marketing and digital tools.</small></span></div>
            <div><b>03</b><span><strong>Expert Support</strong><small>Build, digitize and scale with practical support.</small></span></div>
            <div><b>04</b><span><strong>Secure &amp; Reliable</strong><small>Business-focused systems and workflows.</small></span></div>
          </div>

          <div className="signup-quote">
            <span>“</span>
            <div><p>Technology built around business growth.</p><small>— Propulse Business Technologies</small></div>
          </div>
        </div>

        <div className="signup-visual-foot">PROPULSE BUSINESS TECHNOLOGIES PRIVATE LIMITED</div>
      </section>

      <main className="signup-premium-main">
        <div className="signup-card-premium">
          <div className="signup-card-top">
            <Link className="signup-card-logo" to="/" aria-label="Propulse Business home">
              <img src="/brand/propulse-logo.png" alt="Propulse Business" />
            </Link>
            <div className="signup-top-link"><span>Already have an account?</span><Link to="/login">Sign in <b>→</b></Link></div>
          </div>

          <div className="signup-heading">
            <span>JOIN PROPULSE</span>
            <h2>Create your account</h2>
            <p>Join Propulse and start your business journey today.</p>
          </div>

          {error && <div className="signup-error" role="alert">{error}</div>}

          <div className="signup-account-grid" role="radiogroup" aria-label="Account type">
            <button type="button" className={`signup-account-option ${accountType === 'business' ? 'selected' : ''}`} onClick={() => setAccountType('business')} aria-pressed={accountType === 'business'} disabled={loading || googleLoading}>
              <span className="signup-option-icon">♙</span>
              <span><strong>User</strong><small>Buy leads &amp; grow your business</small></span>
            </button>
            <button type="button" className={`signup-account-option ${accountType === 'lead_partner' ? 'selected' : ''}`} onClick={() => setAccountType('lead_partner')} aria-pressed={accountType === 'lead_partner'} disabled={loading || googleLoading}>
              <span className="signup-option-icon">♙♙</span>
              <span><strong>Lead Partner</strong><small>Submit &amp; manage lead opportunities</small></span>
            </button>
          </div>

          <div className="signup-role-note">Creating a <strong>{accountTypeLabel()}</strong> account. Select the account type that matches how you use Propulse.</div>

          {loadingData && <div className="signup-loading">Loading business options…</div>}

          <form className="signup-form" onSubmit={submit}>
            <section className="signup-form-section">
              <div className="signup-section-head"><span>01</span><div><strong>Your details</strong><small>Tell us how to reach you.</small></div></div>
              <div className="signup-form-grid">
                <label>Full name<input autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter your full name" required /></label>
                <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Enter your email address" required /></label>
                <label>Mobile number<input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Enter your mobile number" required /></label>
                <label>Password<div className="signup-password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Create a password" required /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
                <label className="signup-full">Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} placeholder="Repeat your password" required /></label>
              </div>
            </section>

            <section className="signup-form-section">
              <div className="signup-section-head"><span>02</span><div><strong>Your business</strong><small>Help us understand what you do.</small></div></div>
              <div className="signup-form-grid">
                <label className="signup-full">Business name<input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Your company or business name" required /></label>
                <label className="signup-full">Business details<textarea value={form.businessDetails} onChange={(e) => update('businessDetails', e.target.value)} placeholder="Tell us what your business does" rows="3" required /></label>
              </div>
            </section>

            <section className="signup-form-section">
              <div className="signup-section-head signup-section-head-inline">
                <span>03</span>
                <div><strong>Services you provide</strong><small>Select every service you want matching leads for.</small></div>
                <button type="button" className="signup-add-button" onClick={addServiceSelection}>+ Add service</button>
              </div>
              <div className="signup-selection-list">
                {serviceSelections.map((selection, index) => (
                  <div className="signup-selection-card" key={`service-${index}`}>
                    <div className="signup-selection-top"><span>Service {index + 1}</span>{serviceSelections.length > 1 && <button type="button" onClick={() => removeServiceSelection(index)}>Remove</button>}</div>
                    <div className="signup-selection-grid">
                      <label>Industry<select value={selection.industryId} onChange={(e) => updateServiceSelection(index, 'industryId', e.target.value)} disabled={loadingData} required><option value="">Select industry</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label>Service<select value={selection.serviceId} onChange={(e) => updateServiceSelection(index, 'serviceId', e.target.value)} disabled={!selection.industryId} required><option value="">{selection.industryId ? 'Select service' : 'Select industry first'}</option>{(serviceOptions[index] || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label>Subservice <small>Optional</small><select value={selection.subserviceId} onChange={(e) => updateServiceSelection(index, 'subserviceId', e.target.value)} disabled={!selection.serviceId}><option value="">All related subservices</option>{(subserviceOptions[index] || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="signup-form-section">
              <div className="signup-section-head signup-section-head-inline">
                <span>04</span>
                <div><strong>Locations you serve</strong><small>Select the cities where you want relevant leads.</small></div>
                <button type="button" className="signup-add-button" onClick={addLocationSelection}>+ Add location</button>
              </div>
              <div className="signup-selection-list">
                {locationSelections.map((selection, index) => (
                  <div className="signup-selection-card" key={`location-${index}`}>
                    <div className="signup-selection-top"><span>Location {index + 1}</span>{locationSelections.length > 1 && <button type="button" onClick={() => removeLocationSelection(index)}>Remove</button>}</div>
                    <div className="signup-selection-grid signup-location-grid">
                      <label>State / UT<select value={selection.stateId} onChange={(e) => updateLocationSelection(index, 'stateId', e.target.value)} disabled={loadingData} required><option value="">Select state / UT</option>{states.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                      <label>City<select value={selection.cityId} onChange={(e) => updateLocationSelection(index, 'cityId', e.target.value)} disabled={!selection.stateId} required><option value="">{selection.stateId ? 'Select city' : 'Select state first'}</option>{(cityOptions[index] || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="signup-consent">
              <label><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span></label>
            </div>

            <button className="signup-submit" disabled={loading || googleLoading || loadingData}>{loading ? 'Creating Account…' : `Create ${accountTypeLabel()} Account`} <span>→</span></button>
          </form>

          <div className="signup-or"><span /> <b>OR</b> <span /></div>
          <div className="signup-google"><GoogleButton onCredential={handleGoogle} disabled={loading || googleLoading || loadingData} /></div>

          <div className="signup-security"><span>⌑</span><div><strong>Your information is secure with us.</strong><small>Business account details are used to provide the Propulse service experience.</small></div></div>

          <p className="signup-bottom-login">Already have an account? <Link to="/login">Sign in <b>→</b></Link></p>
        </div>
      </main>
    </div>
  )
}
export default Signup
