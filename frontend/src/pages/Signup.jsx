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
  const [showBusinessModal, setShowBusinessModal] = useState(false)
  const [proofDocuments, setProofDocuments] = useState([])
  const [googleCredential, setGoogleCredential] = useState('')
  const [documentUploadStatus, setDocumentUploadStatus] = useState('idle')

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
  function addProofDocuments(files) {
    setError('')
    const incoming = Array.from(files || [])
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png'])
    const valid = incoming.filter((file) => {
      if (!allowed.has(file.type) || file.size > 5 * 1024 * 1024) {
        setError(`${file.name}: only PDF, JPG or PNG files up to 5 MB are allowed.`)
        return false
      }
      return true
    })
    setProofDocuments((current) => {
      const existing = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`))
      const next = [...current, ...valid.filter((file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`))]
      if (next.length > 8) {
        setError('You can upload up to 8 company proof documents.')
        return next.slice(0, 8)
      }
      return next
    })
    if (valid.length) setDocumentUploadStatus('selected')
  }
  function removeProofDocument(index) { setProofDocuments((current) => current.filter((_, i) => i !== index)); setDocumentUploadStatus('selected') }
  function addLocationSelection() { setLocationSelections((current) => [...current, newLocation()]) }
  function removeLocationSelection(index) { setLocationSelections((current) => current.filter((_, i) => i !== index)) }

  const serviceOptions = useMemo(() => serviceSelections.map((s) => services.filter((item) => String(item.industry_id) === String(s.industryId))), [services, serviceSelections])
  const subserviceOptions = useMemo(() => serviceSelections.map((s) => subservices.filter((item) => String(item.service_id) === String(s.serviceId))), [subservices, serviceSelections])
  const cityOptions = useMemo(() => locationSelections.map((s) => cities.filter((item) => String(item.state_id) === String(s.stateId))), [cities, locationSelections])

  function accountTypeLabel() {
    return accountType === 'lead_partner' ? 'Lead Partner' : 'User'
  }

  function validateCredentials() {
    const mobile = String(form.phone || '').replace(/\D/g, '')
    if (!/^\d{10}$/.test(mobile)) return 'Mobile number must be exactly 10 digits.'
    if (!googleCredential) {
      if (!/^(?=.*[A-Za-z])(?=.*\d).{7,}$/.test(form.password)) return 'Password must contain letters and numbers, for example Ravi143.'
      if (form.password !== form.confirm) return 'Passwords do not match.'
    }
    return ''
  }

  function openBusinessDetails(e) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.email || !form.phone || (!googleCredential && (!form.password || !form.confirm))) return setError('Complete your basic account details.')
    const credentialError = validateCredentials()
    if (credentialError) return setError(credentialError)
    setForm((current) => ({ ...current, phone: String(current.phone).replace(/\D/g, '') }))
    setShowBusinessModal(true)
  }

  async function submit(e) {
    e.preventDefault(); setError('')
    if (!accountType) return setError('Choose an account type to continue.')
    if (!agree) return setError('Please accept the terms to continue.')
    if (!form.name) return setError('Full name is required.')
    if (!form.email) return setError('Email address is required.')
    if (!form.phone) return setError('Mobile number is required.')
    if (!/^\d{10}$/.test(String(form.phone).replace(/\D/g, ''))) return setError('Mobile number must be exactly 10 digits.')
    if (!form.businessName) return setError('Business name is required.')
    if (!form.businessDetails) return setError('Business details are required.')
    const credentialError = validateCredentials()
    if (credentialError) return setError(credentialError)
    const cleanServices = serviceSelections.flatMap((x) => {
      if (!x.industryId || !x.serviceId) return []
      if (x.serviceId === '__all__') {
        return services.filter((item) => String(item.industry_id) === String(x.industryId)).map((item) => ({
          industryId: Number(x.industryId), serviceId: Number(item.id), subserviceId: null,
        }))
      }
      return [{ industryId: Number(x.industryId), serviceId: Number(x.serviceId), subserviceId: x.subserviceId ? Number(x.subserviceId) : null }]
    })
    const cleanLocations = locationSelections.filter((x) => x.stateId && x.cityId).map((x) => ({ stateId: Number(x.stateId), cityId: Number(x.cityId) }))
    if (!cleanServices.length) return setError('Add at least one service.')
    if (!cleanLocations.length) return setError('Add at least one location.')
    try {
      setLoading(true)
      if (!proofDocuments.length) return setError('Upload at least one company proof document.')
      const result = await authRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ ...form, confirm: undefined, password: googleCredential ? undefined : form.password, accountType, services: cleanServices, locations: cleanLocations, googleCredential: googleCredential || undefined }) })
      saveSession(result)
      setDocumentUploadStatus('uploading')
      for (const file of proofDocuments) {
        const documentPayload = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, data: reader.result })
        reader.onerror = reject
          reader.readAsDataURL(file)
        })
        await authRequest('/auth/company-proofs', { method: 'POST', body: JSON.stringify({ documents: [documentPayload] }) })
      }
      setDocumentUploadStatus('uploaded')
      await new Promise((resolve) => setTimeout(resolve, 700))
      navigate('/dashboard', { replace: true })
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }


  const completeGoogleLogin = useCallback(async (result) => {
    saveSession(result)

    if (result.user?.role === 'admin') {
      navigate('/admin', { replace: true })
      return
    }

    if (result.user?.role === 'lead_partner') {
      navigate('/lead-partner', { replace: true })
      return
    }

    navigate('/leads', { replace: true })
  }, [navigate])

  const handleGoogleSignup = useCallback(async (credential) => {
    setError('')
    try {
      setGoogleLoading(true)

      // If this Google email already has a Propulse account, authenticate it
      // immediately instead of showing the registration form again.
      try {
        const result = await authRequest('/auth/google', {
          method: 'POST',
          body: JSON.stringify({ credential }),
        })
        await completeGoogleLogin(result)
        return
      } catch (err) {
        // A verified Google account that is not registered yet continues into
        // the normal signup flow so the user can complete the business profile.
        if (err.status !== 404) throw err
      }

      setGoogleCredential(credential)
      try {
        const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        setForm((current) => ({
          ...current,
          name: current.name || payload.name || '',
          email: current.email || payload.email || ''
        }))
      } catch {}
      setShowBusinessModal(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }, [completeGoogleLogin])

  const handleGoogle = useCallback(async credential => {
    setError('')
    try {
      setGoogleLoading(true)
      const result = await authRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      })
      await completeGoogleLogin(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }, [completeGoogleLogin])

  return (
    <div className="signup-premium-page">
      <header className="signup-topbar">
        <Link className="signup-topbar-brand" to="/" aria-label="Propulse Business home">
          <img src="/brand/propulse-logo.png" alt="Propulse Business Technologies Private Limited" />
          <span>Building Business Together</span>
        </Link>
        <div className="signup-topbar-context">Technology <i/> Growth <i/> Opportunities</div>
        <Link className="signup-back-home" to="/"><span>←</span> Back to Home</Link>
      </header>
      <section className="signup-premium-visual" aria-label="Propulse Business">
        <div className="signup-visual-bg" />
        <div className="signup-visual-overlay" />
        <div className="signup-visual-orbit orbit-a" />
        <div className="signup-visual-orbit orbit-b" />

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
          {error && <div className="signup-error" role="alert">{error}</div>}

          {loadingData && <div className="signup-loading">Loading business options…</div>}

          <form className="signup-form" onSubmit={openBusinessDetails}>
            <section className="signup-form-section">
              <div className="signup-form-grid">
                <label>Full name<input name="name" autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Enter your full name" required /></label>
                <label>Email address<input name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Enter your email address" required /></label>
                <label>Mobile number<input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Enter your mobile number" required /></label>
                <label>Password<div className="signup-password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={7} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{7,}" title="Use at least 7 characters with letters and numbers, e.g. Ravi143" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Example: Ravi143" required /><button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
                <label className="signup-full">Confirm password<input name="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={7} value={form.confirm} onChange={(e) => update('confirm', e.target.value)} placeholder="Repeat your password" required /></label>
              </div>
            </section>
            <button className="signup-submit" type="submit" disabled={loading || googleLoading || loadingData}>Create Account <span>→</span></button>
            <div className="signup-or"><span /> <b>OR</b> <span /></div>
            <div className="signup-google signup-google-signup">
              <div className="signup-google-label">Continue with Google</div>
              <GoogleButton onCredential={handleGoogleSignup} disabled={loading || googleLoading || loadingData} />
            </div>
          </form>
          {showBusinessModal && (
            <div className="signup-business-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowBusinessModal(false) }}>
              <div className="signup-business-modal" role="dialog" aria-modal="true" aria-labelledby="business-details-title">
                {error && <div className="signup-modal-error" role="alert">{error}</div>}
              <div className="signup-business-modal-head">
                  <div><span>BUSINESS DETAILS</span><h3 id="business-details-title">Complete your profile</h3><p>A few more details help us personalize your Propulse experience.</p></div>
                  <button type="button" onClick={() => setShowBusinessModal(false)} aria-label="Close">×</button>
                </div>
                <div className="signup-account-grid" role="radiogroup" aria-label="Account type">
                  <button type="button" className={`signup-account-option ${accountType === 'business' ? 'selected' : ''}`} onClick={() => setAccountType('business')} disabled={loading}><span className="signup-option-icon">♙</span><span><strong>User</strong><small>Buy leads &amp; grow your business</small></span></button>
                  <button type="button" className={`signup-account-option ${accountType === 'lead_partner' ? 'selected' : ''}`} onClick={() => setAccountType('lead_partner')} disabled={loading}><span className="signup-option-icon">♙♙</span><span><strong>Lead Partner</strong><small>Submit &amp; manage leads</small></span></button>
                </div>
                <form className="signup-form signup-modal-form" onSubmit={submit}>
                  <section className="signup-form-section"><div className="signup-form-grid"><label className="signup-full">Mobile number<input name="phone" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" required /></label><label className="signup-full">Business name<input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Your company or business name" required /></label><label className="signup-full">Business details<textarea value={form.businessDetails} onChange={(e) => update('businessDetails', e.target.value)} placeholder="Tell us what your business does" rows="3" required /></label></div></section>
                  <section className="signup-form-section"><div className="signup-section-head signup-section-head-inline"><span>01</span><div><strong>Services you provide</strong><small>Select every service you want matching leads for.</small></div><button type="button" className="signup-add-button" onClick={addServiceSelection}>+ Add service</button></div><div className="signup-selection-list">{serviceSelections.map((selection,index)=><div className="signup-selection-card" key={`service-${index}`}><div className="signup-selection-top"><span>Service {index+1}</span>{serviceSelections.length>1&&<button type="button" onClick={()=>removeServiceSelection(index)}>Remove</button>}</div><div className="signup-selection-grid"><label>Industry<select value={selection.industryId} onChange={(e)=>updateServiceSelection(index,'industryId',e.target.value)} disabled={loadingData} required><option value="">Select industry</option>{industries.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Service<select value={selection.serviceId} onChange={(e)=>updateServiceSelection(index,'serviceId',e.target.value)} disabled={!selection.industryId} required><option value="">Select service</option>{selection.industryId && (serviceOptions[index]||[]).length > 0 && <option value="__all__">All services</option>}{(serviceOptions[index]||[]).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Subservice <small>Optional</small><select value={selection.subserviceId} onChange={(e)=>updateServiceSelection(index,'subserviceId',e.target.value)} disabled={!selection.serviceId}><option value="">All related subservices</option>{(subserviceOptions[index]||[]).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></div>)}</div></section>
                  <section className="signup-form-section"><div className="signup-section-head signup-section-head-inline"><span>02</span><div><strong>Locations you serve</strong><small>Select the cities where you want relevant leads.</small></div><button type="button" className="signup-add-button" onClick={addLocationSelection}>+ Add location</button></div><div className="signup-selection-list">{locationSelections.map((selection,index)=><div className="signup-selection-card" key={`location-${index}`}><div className="signup-selection-top"><span>Location {index+1}</span>{locationSelections.length>1&&<button type="button" onClick={()=>removeLocationSelection(index)}>Remove</button>}</div><div className="signup-selection-grid signup-location-grid"><label>State / UT<select value={selection.stateId} onChange={(e)=>updateLocationSelection(index,'stateId',e.target.value)} disabled={loadingData} required><option value="">Select state / UT</option>{states.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>City<select value={selection.cityId} onChange={(e)=>updateLocationSelection(index,'cityId',e.target.value)} disabled={!selection.stateId} required><option value="">Select city</option>{(cityOptions[index]||[]).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></div>)}</div></section>
                  <section className="signup-form-section signup-proof-section">
                    <div className="signup-section-head signup-section-head-inline"><span>03</span><div><strong>Company proof documents</strong><small>Upload GST, registration, PAN, incorporation or other company proof.</small></div></div>
                    <label className="signup-document-upload">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={(e) => { addProofDocuments(e.target.files); e.target.value = '' }} />
                      <strong>Choose documents</strong><small>PDF, JPG or PNG · up to 5 MB each · multiple files allowed</small>
                    </label>
                    {proofDocuments.length > 0 && <div className="signup-document-list">
                      <div className="signup-document-summary"><strong>{proofDocuments.length} document{proofDocuments.length > 1 ? 's' : ''} selected</strong><span>{documentUploadStatus === 'uploaded' ? '✓ Uploaded successfully' : documentUploadStatus === 'uploading' ? 'Uploading…' : 'Ready to upload when you create the account'}</span></div>
                      {proofDocuments.map((file, index) => <div className="signup-document-item" key={file.name + ":" + file.size + ":" + file.lastModified}><span className="signup-document-name"><b>✓</b>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small><button type="button" onClick={() => removeProofDocument(index)} disabled={loading}>Remove</button></div>)}
                    </div>}
                  </section>
                  <div className="signup-consent"><label><input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} /> <span>I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b>.</span></label></div>
                  <button className="signup-submit" disabled={loading || googleLoading || loadingData}>{loading ? 'Submitting…' : 'Submit'} <span>→</span></button>
                </form>
              </div>
            </div>
          )}
          <div className="signup-security"><span>⌑</span><div><strong>Your information is secure with us.</strong><small>Business account details are used to provide the Propulse service experience.</small></div></div>

          <p className="signup-bottom-login">Already have an account? <Link to="/login">Sign in <b>→</b></Link></p>
        </div>
      </main>
    </div>
  )
}
export default Signup
