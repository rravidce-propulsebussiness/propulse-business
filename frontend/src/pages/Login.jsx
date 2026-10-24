import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import GoogleButton from '../components/GoogleButton'
import { getOAuthReturnPath, getLoginHomeHref } from '../utils/oauthLoginNavigation'
import './Login.css'


function LoginArchitecture() {
  return (
    <svg viewBox="0 0 540 470" fill="none" role="presentation" focusable="false" className="login-premium-architecture">
      <defs>
        <linearGradient id="propulse-login-architecture-fill" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ffe2cc" />
          <stop offset="1" stopColor="#fff7f0" />
        </linearGradient>
      </defs>
      <circle cx="355" cy="149" r="138" stroke="#ffd5b6" strokeWidth="1.5" strokeDasharray="6 11" />
      <circle cx="355" cy="149" r="103" stroke="#ffebdc" strokeWidth="1.5" />
      <path d="M28 418H522M65 428H481" stroke="#edba96" strokeWidth="2" strokeLinecap="round" />
      <path d="M115 415V192L227 134L333 192V415" fill="url(#propulse-login-architecture-fill)" stroke="#efa76d" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M115 192L227 134L333 192M227 134V415M115 269H333M115 345H333" stroke="#e89961" strokeWidth="2" />
      <path d="M150 223H194V261H150zM257 223H300V261H257zM149 293H195V332H149zM257 293H301V332H257zM197 357H260V415H197z" stroke="#f0b487" strokeWidth="2" fill="#fffdfb" />
      <path d="M370 415V242L422 210L479 242V415M370 290H479M370 349H479M424 210V415" stroke="#f3b88d" strokeWidth="2.2" fill="#fff8f2" />
      <path d="M385 263H408V283H385zM440 263H465V283H440zM385 316H408V339H385zM440 316H465V339H440z" stroke="#f4c6a7" strokeWidth="2" />
      <g className="login-premium-crane" stroke="#f4772c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M68 415V79M51 94H310M68 79L109 45L152 94M63 79H73M91 94L122 113L154 94L185 113L216 94L249 113L281 94M303 94v91m-10 0h20m-10 0v12" />
      </g>
      <path d="M66 79L45 96M87 415H48" stroke="#efb180" strokeWidth="4" strokeLinecap="round" />
      <circle className="login-premium-spark" cx="352" cy="78" r="7" fill="#f79c65" />
      <circle className="login-premium-spark" cx="333" cy="65" r="3" fill="#ffd1ae" />
      <path d="m477 108 6 18 18 6-18 6-6 18-6-18-18-6 18-6z" fill="#ffe1c8" stroke="#fab47d" strokeWidth="1.5" />
    </svg>
  )
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const validOAuthReturn = getOAuthReturnPath(location.search)
  const homeHref = getLoginHomeHref(location.search)
  const businessOsConnection = Boolean(validOAuthReturn)

  const finishLogin = useCallback(async (result) => {
    saveSession(result)
    if (validOAuthReturn) {
      // Complete the same-origin OAuth request with the new HttpOnly cookie.
      window.location.assign(validOAuthReturn)
      return
    }
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
  }, [location.state, navigate, validOAuthReturn])

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
        <a className="login-topbar-brand" href={homeHref} aria-label={businessOsConnection ? 'Business OS home' : 'ProPulse Business home'}>
          <span className="login-topbar-logo"><img src="/brand/propulse-logo.png" alt="" /></span>
          <span className="login-topbar-wordmark"><strong>ProPulse</strong><small>BUSINESS TECHNOLOGIES</small></span>
        </a>
        <a className="login-back-home" href={homeHref}>
          <span aria-hidden="true">←</span> {businessOsConnection ? 'Back to Business OS' : 'Back to Home'}
        </a>
      </header>

      <main className="auth-card-wrap login-premium-card-wrap">
        <div className="login-premium-background-art" aria-hidden="true"><LoginArchitecture /></div>
        <div className="login-premium-ring login-premium-ring-one" aria-hidden="true" />
        <div className="login-premium-ring login-premium-ring-two" aria-hidden="true" />

        <div className="login-premium-content">
          <div className="auth-card login-premium-card">
            <div className="login-premium-card-mark" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none" width="28" height="28" focusable="false">
                <path d="m7 23 17-14 17 14v17H7V23Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M18 40V26h12v14" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="login-form-heading">
              <span className="login-premium-eyebrow">YOUR BUSINESS WORKSPACE</span>
              <h1>Welcome back<span className="login-premium-heading-dot">.</span></h1>
              <p>Sign in to manage your leads and grow your business.</p>
            </div>
            {businessOsConnection && (
              <div className="login-premium-oauth-note" role="status">
                <span aria-hidden="true">↗</span> Signing in to connect your Business OS workspace.
              </div>
            )}
            {error && <div className="auth-error" role="alert">{error}</div>}

            <div className="google-auth-block">
              <GoogleButton onCredential={handleGoogle} disabled={loading || googleLoading} />
            </div>
            <div className="auth-divider"><span /><b>or continue with email</b><span /></div>

            <form onSubmit={submit}>
              <label htmlFor="propulse-login-email">
                Email address
                <input id="propulse-login-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" />
              </label>
              <label htmlFor="propulse-login-password">
                Password
                <div className="password-field">
                  <input id="propulse-login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
                </div>
              </label>

              <div className="auth-options">
                <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
                <div className="auth-secondary-links"><Link className="text-button" to="/forgot-password">Forgot password?</Link></div>
              </div>

              <button className="auth-submit login-premium-submit" type="submit" disabled={loading || googleLoading}>
                {loading ? 'Signing in…' : googleLoading ? 'Signing in with Google…' : 'Sign in'} <span aria-hidden="true">→</span>
              </button>
            </form>
            <div className="login-premium-signup">
              <span>New to ProPulse?</span>
              <Link to="/signup">Create an account <span aria-hidden="true">→</span></Link>
            </div>
          </div>

          <div className="login-premium-footer">
            <span className="login-premium-secure"><span aria-hidden="true">✓</span> Secure account access</span>
            <span className="login-premium-footer-divider" aria-hidden="true">·</span>
            <span>© 2026 ProPulse Business Technologies</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Login
