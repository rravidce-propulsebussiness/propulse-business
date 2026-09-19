import { useCallback, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authRequest, saveSession } from '../utils/auth'
import GoogleButton from '../components/GoogleButton'
import './Auth.css'
import './AuthExtras.css'
import './LoginPremium.css'

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountType, setAccountType] = useState('customer')
  const accountCopy = {
    customer: { eyebrow: 'BUSINESS WORKSPACE', title: 'Welcome back.', accent: "Let’s grow.", description: 'Manage your business, discover verified opportunities, and keep every lead in one place.' },
    lead_partner: { eyebrow: 'LEAD PARTNER PORTAL', title: 'Supply demand.', accent: 'Grow together.', description: 'Access your partner workspace, manage submitted leads, pricing, inventory, and performance.' },
    investor: { eyebrow: 'PRO INVESTMENT', title: 'Put capital to work.', accent: 'Build returns.', description: 'Access investment opportunities available to eligible Business users with active Pro membership.' },
    admin: { eyebrow: 'ADMIN CONTROL CENTER', title: 'Run the platform.', accent: 'Stay in control.', description: 'Secure access to users, leads, verification, reporting, investments, and platform operations.' }
  }[accountType]

  const finishLogin = useCallback(async (result) => {
    const user = result.user
    if (accountType === 'admin' && user?.role !== 'admin') throw new Error('This account is not an Admin account.')
    if (accountType === 'lead_partner') {
      if (user?.role !== 'business') throw new Error('Lead Partner access requires a Business account.')
      const partner = await authRequest('/lead-partner/me')
      if (partner?.status !== 'active') throw new Error('This Business account is not an active Lead Partner account.')
    }
    if (accountType === 'investor') {
      if (user?.role !== 'business') throw new Error('Investment access requires a Business account.')
      const access = await authRequest('/investments/access')
      if (!access?.isPro) throw new Error('An active Pro membership is required for Investment access.')
    }
    saveSession(result)
    if (!remember) localStorage.setItem('propulse_session_mode', 'session')
    const destination = location.state?.from?.pathname
      || (accountType === 'admin' ? '/admin' : accountType === 'lead_partner' ? '/lead-partner' : accountType === 'investor' ? '/investment' : '/leads')
    navigate(destination, { replace: true })
  }, [accountType, location.state, navigate, remember])

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) return setError('Enter your email and password.')
    try {
      setLoading(true)
      const result = await authRequest('/auth/login', { method: 'POST', body: JSON.stringify(form) })
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
      const result = await authRequest('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })
      await finishLogin(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }, [finishLogin])

  return (
    <div className="auth-page login-page">
      <header className="login-topbar">
        <Link className="login-brand" to="/"><span>P</span><strong>Propulse <em>Business</em></strong></Link>
        <div className="login-header-actions">
          <Link className="login-home login-home-secondary" to="/">← Home</Link>
          <Link className="login-home" to="/signup">Create account <b>→</b></Link>
        </div>
      </header>
      <section className="auth-visual" aria-label="Pro Pulse Business">
        <div className="auth-visual-overlay" />
        <div className="auth-visual-content">
          <div className="login-visual-brand">
            <div className="login-brand-mark">P</div>
            <div><strong>Propulse</strong><span>BUSINESS TECHNOLOGIES</span></div>
          </div>
          <div className="login-visual-copy">
            <span>{accountCopy.eyebrow}</span>
            <h1>{accountCopy.title}<br /><em>{accountCopy.accent}</em></h1>
            <p>{accountCopy.description}</p>
          </div>
          <div className="login-value-grid">
            <div><b>01</b><strong>Verified opportunities</strong><span>Connect with relevant business demand.</span></div>
            <div><b>02</b><strong>One business workspace</strong><span>Leads, wallet, membership and more.</span></div>
            <div><b>03</b><strong>Secure account access</strong><span>Role and capability checks stay server-side.</span></div>
          </div>
          <div className="login-visual-note"><span>✦</span><div><strong>Technology built around business growth.</strong><small>One platform. Multiple business capabilities.</small></div></div>
          <div className="auth-visual-footer"><span>CONNECT</span><i /> <span>GROW</span><i /> <span>BUILD</span><i /> <span>SUCCEED</span></div>
        </div>
      </section>

      <main className="auth-card-wrap">
        <div className="auth-card login-card">
          <div className="mobile-brand">
            <img src="/brand/propulse-logo.png" alt="Pro Pulse" />
          </div>
          <div className="login-account-types" role="tablist" aria-label="Account type">
            {[
              ['customer','Customer'],
              ['lead_partner','Lead Partner'],
              ['investor','Investor'],
              ['admin','Admin']
            ].map(([value,label]) => (
              <button key={value} type="button" className={accountType===value?'active':''} onClick={()=>{setAccountType(value);setError('')}}>{label}</button>
            ))}
          </div>

          <div className="auth-heading login-heading">
            <p className="auth-kicker">{accountCopy.eyebrow}</p>
            <h2>Sign in to <em>Propulse</em></h2>
            <p>{accountType === 'customer' ? 'Access your business workspace and opportunities.' : accountCopy.description}</p>
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
