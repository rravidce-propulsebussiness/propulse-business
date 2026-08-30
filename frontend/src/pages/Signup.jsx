import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import './Auth.css'

const emptyForm = {
  name: '', email: '', phone: '', businessName: '', businessDetails: '',
  industryId: '', serviceId: '', subserviceId: '', stateId: '', cityId: '',
  password: '', confirm: '',
}

function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [industries, setIndustries] = useState([])
  const [services, setServices] = useState([])
  const [subservices, setSubservices] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadMasterData() {
      try {
        const [industryData, serviceData, subserviceData, stateData, cityData] = await Promise.all([
          authRequest('/industries'), authRequest('/services'), authRequest('/subservices'),
          authRequest('/states'), authRequest('/cities'),
        ])
        setIndustries(industryData)
        setServices(serviceData)
        setSubservices(subserviceData)
        setStates(stateData)
        setCities(cityData)
      } catch (err) {
        setError(`We couldn't load the business options. ${err.message}`)
      } finally {
        setLoadingData(false)
      }
    }
    loadMasterData()
  }, [])

  const filteredServices = useMemo(() => services.filter((item) => String(item.industry_id) === String(form.industryId)), [services, form.industryId])
  const filteredSubservices = useMemo(() => subservices.filter((item) => String(item.service_id) === String(form.serviceId)), [subservices, form.serviceId])
  const filteredCities = useMemo(() => cities.filter((item) => String(item.state_id) === String(form.stateId)), [cities, form.stateId])

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  function chooseIndustry(value) { setForm((current) => ({ ...current, industryId: value, serviceId: '', subserviceId: '' })) }
  function chooseService(value) { setForm((current) => ({ ...current, serviceId: value, subserviceId: '' })) }
  function chooseState(value) { setForm((current) => ({ ...current, stateId: value, cityId: '' })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!agree) return setError('Please accept the terms to continue.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (!form.industryId || !form.serviceId || !form.stateId || !form.cityId) return setError('Select your industry, service and location.')

    try {
      setLoading(true)
      const result = await authRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, email: form.email, password: form.password, phone: form.phone,
          businessName: form.businessName, businessDetails: form.businessDetails,
          industryId: Number(form.industryId), serviceId: Number(form.serviceId),
          subserviceId: form.subserviceId ? Number(form.subserviceId) : null,
          stateId: Number(form.stateId), cityId: Number(form.cityId),
        }),
      })
      saveSession(result)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-visual" aria-label="Pro Pulse Business">
        <img className="auth-office" src="/brand/propulse-office.png" alt="Pro Pulse Business office" />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <img className="auth-logo" src="/brand/propulse-logo.png" alt="Pro Pulse Business Technologies Private Limited" />
          <div className="auth-visual-copy">
            <span>QUALIFIED LEADS. BETTER OPPORTUNITIES.</span>
            <h1>Get High-Value<br /><em>Clients.</em></h1>
            <p>Tell us what your business offers and where you operate. We'll use these preferences to surface relevant opportunities.</p>
          </div>
          <div className="auth-visual-footer"><span>CONNECT</span><i /><span>GROW</span><i /><span>BUILD</span><i /><span>SUCCEED</span></div>
        </div>
      </section>

      <main className="auth-card-wrap">
        <div className="auth-card signup-card signup-wide">
          <div className="mobile-brand"><img src="/brand/propulse-logo.png" alt="Pro Pulse" /></div>
          <div className="auth-heading">
            <p className="auth-kicker">BUSINESS PROFILE</p>
            <h2>Create account</h2>
            <p>Set your profile so we can match better leads.</p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}
          {loadingData && <div className="auth-loading">Loading business options…</div>}

          <form onSubmit={submit}>
            <div className="signup-section-label">Your details</div>
            <div className="auth-form-grid">
              <label>Full name<input autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" required /></label>
              <label>Phone number<input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="10-digit mobile number" required /></label>
              <label className="full-span">Email address<input type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@company.com" required /></label>
            </div>

            <div className="signup-section-label">Business</div>
            <div className="auth-form-grid">
              <label className="full-span">Business name<input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Your company or business name" required /></label>
              <label className="full-span">Business details<textarea value={form.businessDetails} onChange={(e) => update('businessDetails', e.target.value)} placeholder="Briefly describe your business and the services you provide" rows="3" required /></label>
            </div>

            <div className="signup-section-label">What leads do you want?</div>
            <div className="auth-form-grid">
              <label>Industry
                <select value={form.industryId} onChange={(e) => chooseIndustry(e.target.value)} disabled={loadingData} required><option value="">Select industry</option>{industries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              </label>
              <label>Service
                <select value={form.serviceId} onChange={(e) => chooseService(e.target.value)} disabled={!form.industryId} required><option value="">{form.industryId ? 'Select service' : 'Select industry first'}</option>{filteredServices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              </label>
              <label>Subservice <span className="optional">Optional</span>
                <select value={form.subserviceId} onChange={(e) => update('subserviceId', e.target.value)} disabled={!form.serviceId}><option value="">{form.serviceId ? 'All related subservices' : 'Select service first'}</option>{filteredSubservices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              </label>
              <label>State / UT
                <select value={form.stateId} onChange={(e) => chooseState(e.target.value)} disabled={loadingData} required><option value="">Select state / UT</option>{states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              </label>
              <label>City
                <select value={form.cityId} onChange={(e) => update('cityId', e.target.value)} disabled={!form.stateId} required><option value="">{form.stateId ? 'Select city' : 'Select state first'}</option>{filteredCities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              </label>
            </div>

            <div className="signup-section-label">Password</div>
            <div className="auth-form-grid">
              <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" required /><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
              <label>Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={(e) => update('confirm', e.target.value)} placeholder="Repeat your password" required /></label>
            </div>

            <label className="check terms"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the terms and privacy policy.</label>
            <button className="auth-submit" disabled={loading || loadingData}>{loading ? 'Creating…' : 'Create account'} <span>→</span></button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </main>
    </div>
  )
}

export default Signup
