import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import './Auth.css'

function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.name || !form.email || !form.password) return setError('Complete all required fields.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (!agree) return setError('Please accept the terms to continue.')
    try {
      setLoading(true)
      const result = await authRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) })
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
            <p>Join Pro Pulse to discover qualified customers actively looking for your services and grow your business with better opportunities.</p>
          </div>
          <div className="auth-visual-footer">
            <span>CONNECT</span><i /> <span>GROW</span><i /> <span>BUILD</span><i /> <span>SUCCEED</span>
          </div>
        </div>
      </section>

      <main className="auth-card-wrap">
        <div className="auth-card signup-card">
          <div className="mobile-brand">
            <img src="/brand/propulse-logo.png" alt="Pro Pulse" />
          </div>
          <div className="auth-heading">
            <p className="auth-kicker">GET STARTED</p>
            <h2>Create account</h2>
            <p>Start finding better business opportunities.</p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={submit}>
            <label>Full name<input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>
            <label>Work email<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" /></label>
            <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            <label>Confirm password<input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat your password" /></label>
            <label className="check terms"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to the terms and privacy policy.</label>
            <button className="auth-submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'} <span>→</span></button>
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </main>
    </div>
  )
}

export default Signup
