import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const auth = read('src/utils/auth.js')
const app = read('src/App.jsx')
const signup = read('src/pages/Signup.jsx')

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

console.log('Authoritative auth bootstrap regression test passed.')
