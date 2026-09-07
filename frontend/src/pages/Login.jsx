import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import GoogleButton from '../components/GoogleButton'
import './Auth.css'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  function finishLogin(result) {
    saveSession(result)
    if (!remember) localStorage.setItem('propulse_session_mode', 'session')
    const destination = location.state?.from?.pathname
      || (result.user?.role === 'admin' ? '/admin' : '/dashboard')
    navigate(destination, { replace: true })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) return setError('Enter your email and password.')
    try {
      setLoading(true)
      const result = await authRequest('/auth/login', { method: 'POST', body: JSON.stringify(form) })
      finishLogin(result)
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
      const result = await authRequest('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })
      finishLogin(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }, [location.state, navigate, remember])

  return (
    <div className="auth-page">
      <section className="auth-visual" aria-label="Pro Pulse Business">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <div className="auth-logo-frame">
            <img className="auth-logo" src="/brand/propulse-logo.png" alt="Pro Pulse Business Technologies Private Limited" />
          </div>
          <div className="auth-visual-copy">
            <span>QUALIFIED LEADS. BETTER OPPORTUNITIES.</span>
            <h1>Get High-Value<br /><em>Clients.</em></h1>
            <p>Connect with qualified customers actively looking for your services — and turn more opportunities into paying clients.</p>
          </div>
          <div className="auth-visual-footer">
            <span>CONNECT</span><i /> <span>GROW</span><i /> <span>BUILD</span><i /> <span>SUCCEED</span>
          </div>
        </div>
      </section>

      <main className="auth-card-wrap">
        <div className="auth-card">
          <div className="mobile-brand">
            <img src="/brand/propulse-logo.png" alt="Pro Pulse" />
          </div>
          <div className="auth-heading">
            <p className="auth-kicker">WELCOME BACK</p>
            <h2>Sign in</h2>
            <p>Access your leads and business opportunities.</p>
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
              <Link className="text-button" to="/forgot-password">Forgot password?</Link>
            </div>

            <button className="auth-submit" disabled={loading || googleLoading}>
              {loading ? 'Signing in…' : googleLoading ? 'Signing in with Google…' : 'Sign in'} <span>→</span>
            </button>
          </form>

          <div className="auth-divider"><span /> <b>NEW TO PRO PULSE?</b> <span /></div>
          <Link className="auth-outline" to="/signup">Create an account <span>→</span></Link>
        </div>
      </main>
    </div>
  )
}

export default Login
