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
    e.preventDefault(); setError('')
    if (!form.name || !form.email || !form.password) return setError('Complete all required fields.')
    if (form.password.length < 8) return setError('Password must be at least 8 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    if (!agree) return setError('Please accept the terms to continue.')
    try {
      setLoading(true)
      const result = await authRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) })
      saveSession(result); navigate('/dashboard', { replace: true })
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="brand-lockup"><span className="brand-dot" /> PRO PULSE</div>
        <div className="brand-message"><p className="auth-kicker">YOUR BUSINESS. ONE PLACE.</p><h1>Build the<br /><em>next stage.</em></h1><p>Create your secure workspace and start managing your business structure.</p></div>
        <div className="brand-foot">© 2026 Pro Pulse Business</div>
      </div>
      <main className="auth-card-wrap">
        <div className="auth-card signup-card">
          <div className="mobile-brand"><span className="brand-dot" /> PRO PULSE</div>
          <div className="auth-heading"><p className="auth-kicker">GET STARTED</p><h2>Create account</h2><p>Set up your business workspace in minutes.</p></div>
          {error && <div className="auth-error">{error}</div>}
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
