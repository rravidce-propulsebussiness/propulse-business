import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getOAuthReturnPath, getLoginHomeHref, BUSINESS_OS_HOME_URL } from '../src/utils/oauthLoginNavigation.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const auth = read('src/utils/auth.js')
const app = read('src/App.jsx')
const signup = read('src/pages/Signup.jsx')
const login = read('src/pages/Login.jsx')
const loginStyles = read('src/pages/Login.css')

assert(auth.includes("apiRequest('/auth/session', {}, false)"), 'Initial session bootstrap must verify the HttpOnly cookie through anonymous-safe /auth/session')
assert(auth.includes("export const getToken = () => (sessionKnown && currentUser ? 'cookie-session' : null)"), 'Route token state must depend on verified in-memory session state')
assert(auth.includes('export const getUser = () => (sessionKnown ? currentUser : null)'), 'getUser must not trust cached localStorage before server verification')
assert(!auth.includes('JSON.parse(localStorage.getItem'), 'Browser auth cache must not be parsed as routing authority')
assert(!auth.includes('localStorage.setItem'), 'Authenticated user/profile data must not be persisted in localStorage')
assert(app.includes('function SessionBootstrap'), 'App must gate routing on session bootstrap')
assert(app.includes('<SessionBootstrap><BrowserRouter>'), 'BrowserRouter must render only after session verification')
assert(app.includes("authRequest('/lead-partner/me')"), 'Lead Partner routes must verify the server-side approval record')
assert(app.includes('LeadPartnerApprovalPending'), 'Pending Lead Partners must receive an approval-status screen instead of the active workspace')
assert(signup.includes('maxLength={64}'), 'Signup password controls must enforce the backend character limit')
assert(signup.includes('new TextEncoder().encode(form.password).length > 72'), 'Signup validation must enforce bcrypt UTF-8 byte bounds')


const oauthReturn = '/api/oauth/authorize?client_id=business-os&redirect_uri=https%3A%2F%2Fexample.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code'
const oauthSearch = '?' + new URLSearchParams({ returnTo: oauthReturn }).toString()
assert(getOAuthReturnPath(oauthSearch) === oauthReturn, 'OAuth returnTo must stay on the ProPulse authorize endpoint after sign-in')
assert(getLoginHomeHref(oauthSearch) === BUSINESS_OS_HOME_URL, 'Business OS OAuth sign-in must link home to the Business OS origin')
assert(getLoginHomeHref('') === '/', 'Ordinary ProPulse login must keep ProPulse as its home')
assert(getLoginHomeHref('?returnTo=https%3A%2F%2Fevil.example') === '/', 'An arbitrary external returnTo must not influence the home link')
assert(getOAuthReturnPath('?returnTo=%2F%2Fevil.example') === null, 'Protocol-relative OAuth returnTo must be rejected')
assert(getOAuthReturnPath('?returnTo=%2Fapi%2Foauth%2Fauthorizex%3Fclient_id%3Dfoo') === null, 'Only the exact OAuth authorize route is supported')
assert(login.includes('href={homeHref}'), 'Both login header home links must use the origin-aware href')
assert(login.includes("businessOsConnection ? 'Back to Business OS' : 'Back to Home'"), 'OAuth login should identify the destination clearly')
assert(login.includes('window.location.assign(validOAuthReturn)'), 'Successful ProPulse sign-in must still complete the OAuth authorization flow')


assert(loginStyles.includes('.auth-page.login-premium') && loginStyles.includes('display:flex;') && loginStyles.includes('flex-direction:column;'), 'Login must override the shared two-column auth grid')
assert(loginStyles.includes('.auth-card-wrap.login-premium-card-wrap') && loginStyles.includes('place-items:center;'), 'Login page must center its only sign-in card')
assert(loginStyles.includes('@media (max-width:600px)') && loginStyles.includes('prefers-reduced-motion'), 'Login must remain responsive and honor reduced-motion preferences')
assert(login.includes('auth-card login-premium-card') && login.includes('GoogleButton onCredential={handleGoogle}'), 'Redesigned login must preserve the native Google identity widget')
assert(login.includes("authRequest('/auth/login'") && login.includes('type="submit"'), 'Redesigned login must preserve email/password login')
assert(login.includes('to="/forgot-password"') && login.includes('to="/signup"'), 'Redesigned login must preserve recovery and account creation')
assert(!login.includes('login-premium-card-wrap">\n        <div className="auth-card'), 'The centered design must retain decorative site context without a duplicate form')

console.log('Authoritative auth bootstrap regression test passed.')
