import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import './Auth.css'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) return setError('Enter your email and password.')
    try {
      setLoading(true)
      const result = await authRequest('/auth/login', { method: 'POST', body: JSON.stringify(form) })
      saveSession(result)
      if (!remember) localStorage.setItem('propulse_session_mode', 'session')
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <div className="brand-lockup"><span className="brand-dot" /> PRO PULSE</div>
        <div className="brand-message"><p className="auth-kicker">BUSINESS CONTROL CENTER</p><h1>Run your business<br /><em>with clarity.</em></h1><p>One secure workspace for your marketplace, master data and operations.</p></div>
        <div className="brand-foot">© 2026 Pro Pulse Business</div>
      </div>
      <main className="auth-card-wrap">
        <div className="auth-card">
          <div className="mobile-brand"><span className="brand-dot" /> PRO PULSE</div>
          <div className="auth-heading"><p className="auth-kicker">WELCOME BACK</p><h2>Sign in</h2><p>Access your business workspace.</p></div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" /></label>
            <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
            <div className="auth-options"><label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label><button type="button" className="text-button" onClick={() => setError('Password recovery will be available after email delivery is configured.')}>Forgot password?</button></div>
            <button className="auth-submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} <span>→</span></button>
          </form>
          <div className="auth-divider"><span /> <b>NEW TO PRO PULSE?</b> <span /></div>
          <Link className="auth-outline" to="/signup">Create an account <span>→</span></Link>
        </div>
      </main>
    </div>
  )
}

export default Login
