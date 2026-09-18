import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import GoogleButton from '../components/GoogleButton'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [accountType, setAccountType] = useState('business')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const finishLogin = useCallback((result) => {
    saveSession(result)
    if (!remember) localStorage.setItem('propulse_session_mode', 'session')
    const destination = location.state?.from?.pathname
      || (result.user?.role === 'admin' ? '/admin' : '/leads')
    navigate(destination, { replace: true })
  }, [location.state, navigate, remember])

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
      const result = await authRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential, accountType }),
      })
      finishLogin(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }, [accountType, finishLogin])

  return (
    <div className="auth-page login-premium">
      <header className="login-topbar">
        <Link className="login-topbar-brand" to="/" aria-label="Propulse Business home"><img src="/brand/propulse-logo.png" alt="Propulse Business Technologies Private Limited" /><span>Building Business Together</span></Link>
        <div className="login-topbar-context">Technology <i/> Growth <i/> Opportunities</div>
        <Link className="login-back-home" to="/"><span>←</span> Back to Home</Link>
      </header>
      <section className="login-premium-visual" aria-label="Propulse Business Technologies">
        <div className="login-premium-image"/>
        <div className="login-premium-glow"/>
        <div className="login-premium-visual-content">
          <span className="login-premium-kicker">WELCOME TO PROPULSE</span>
          <h1>Technology built around<br /><em>business growth.</em></h1>
          <p><strong>Propulse Business Technologies Private Limited</strong> helps businesses build, digitize, operate and scale through practical technology, digital growth and business solutions.</p>
          <div className="login-premium-features">
            <div><b>01</b><span><strong>Technology</strong><small>Websites, apps, software and automation.</small></span></div>
            <div><b>02</b><span><strong>Digital Growth</strong><small>Marketing, creative and demand generation.</small></span></div>
            <div><b>03</b><span><strong>Lead Opportunities</strong><small>Discover and buy relevant customer enquiries.</small></span></div>
            <div><b>04</b><span><strong>Business Support</strong><small>Technology-led operational and compliance support.</small></span></div>
          </div>
          <div className="login-premium-quote"><span>“</span><p>Technology built around business growth.</p><small>— Propulse Business Technologies</small></div>
        </div>
      </section>

      <main className="auth-card-wrap login-premium-card-wrap">
        <div className="auth-card login-premium-card">
          <div className="login-premium-card-head"><div className="mobile-brand"><img src="/brand/propulse-logo.png" alt="Propulse Business" /></div><div className="login-new-user"><span>New to Propulse?</span><Link to="/signup">Get Started <b>→</b></Link></div></div>
          <div className="auth-heading login-heading">
            <p className="auth-kicker">WELCOME BACK</p>
            <h2>Welcome back.</h2>
            <p>Sign in to continue your business journey.</p>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <div className="account-type-grid" role="radiogroup" aria-label="Account type">
            <button type="button" className={`account-type-card ${accountType === 'business' ? 'selected' : ''}`} onClick={() => setAccountType('business')} aria-pressed={accountType === 'business'} disabled={loading || googleLoading}>
              <span className="account-icon" aria-hidden="true">♙</span><span className="account-copy"><strong>User</strong><small>Buy leads &amp; grow your business</small></span>
            </button>
            <button type="button" className={`account-type-card ${accountType === 'lead_partner' ? 'selected' : ''}`} onClick={() => setAccountType('lead_partner')} aria-pressed={accountType === 'lead_partner'} disabled={loading || googleLoading}>
              <span className="account-icon" aria-hidden="true">♙♙</span><span className="account-copy"><strong>Lead Partner</strong><small>Submit &amp; manage leads</small></span>
            </button>
          </div>
          <div className="signup-role-note">Choose how you use Propulse. Google sign-in uses the selected account type for new accounts.</div>

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
          <p className="login-legal-note">By continuing, you agree to use Propulse for business-related technology, growth and lead services.</p>
        </div>
      </main>
    </div>
  )
}

export default Login
