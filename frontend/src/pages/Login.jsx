import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import GoogleButton from '../components/GoogleButton'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const finishLogin = useCallback(async (result) => {
    saveSession(result)
    if (result.user?.role === 'admin') {
      navigate('/admin', { replace: true })
      return
    }

    // Lead Partner accounts must never enter the marketplace.
    if (result.user?.role === 'lead_partner') {
      navigate('/lead-partner', { replace: true })
      return
    }

    const destination = location.state?.from?.pathname || '/leads'
    navigate(destination, { replace: true })
  }, [location.state, navigate])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) return setError('Enter your email and password.')
    try {
      setLoading(true)
      const result = await authRequest('/auth/login', { method: 'POST', body: JSON.stringify({ ...form, remember }) })
      await finishLogin(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = useCallback(async credential => {
    setError('')
    try {
      setGoogleLoading(true)
      const result = await authRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential, remember }),
      })
      await finishLogin(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }, [finishLogin, remember])

  return (
    <div className="auth-page login-premium">
      <header className="login-topbar">
        <Link className="login-topbar-brand" to="/" aria-label="Propulse Business home">
          <img src="/brand/propulse-logo.png" alt="Propulse Business Technologies Private Limited" />
        </Link>
        <Link className="login-back-home" to="/"><span>←</span> Back to Home</Link>
      </header>

      <main className="auth-card-wrap login-premium-card-wrap">
        <div className="auth-card login-premium-card">
          <div className="login-simple-heading">
            <h1>Sign in</h1>
            <p>Access your ProPulse account.</p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <div className="google-auth-block">
            <GoogleButton onCredential={handleGoogle} disabled={loading || googleLoading} />
          </div>
          <div className="auth-divider"><span /><b>OR CONTINUE WITH EMAIL</b><span /></div>

          <form onSubmit={submit}>
            <label>
              Email address
              <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
            </label>
            <label>
              Password
              <div className="password-field">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
            </label>

            <div className="auth-options">
              <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
              <div className="auth-secondary-links"><Link className="text-button" to="/forgot-password">Forgot password?</Link></div>
            </div>

            <button className="auth-submit login-premium-submit" disabled={loading || googleLoading}>
              {loading ? 'Signing in…' : googleLoading ? 'Signing in with Google…' : 'Sign in'} <span>→</span>
            </button>
          </form>

          <div className="auth-divider"><span /> <b>NEW TO PRO PULSE?</b> <span /></div>
          <Link className="auth-outline" to="/signup">Create an account <span>→</span></Link>
        </div>
      </main>
    </div>
  )}

export default Login
