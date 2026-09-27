import { API_BASE_URL, apiRequest } from './api'

const USER_KEY = 'propulse_auth_user'
const PRO_MEMBER_KEY = 'propulse_is_pro_member'

let currentUser = null
let sessionKnown = false
let bootstrapPromise = null

export const getToken = () => (sessionKnown && currentUser ? 'cookie-session' : null)
export const getUser = () => (sessionKnown ? currentUser : null)
export const isSessionKnown = () => sessionKnown

export function saveSession({ user }) {
  currentUser = user || null
  sessionKnown = true
  if (currentUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
    if (currentUser.is_pro_member !== undefined) localStorage.setItem(PRO_MEMBER_KEY, String(Boolean(currentUser.is_pro_member)))
  } else {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(PRO_MEMBER_KEY)
  }
}

export async function clearSession({ revoke = true } = {}) {
  currentUser = null
  sessionKnown = true
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(PRO_MEMBER_KEY)
  if (revoke) {
    try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }) } catch {}
  }
}

export function bootstrapSession({ force = false } = {}) {
  if (sessionKnown && !force) return Promise.resolve(currentUser)
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = apiRequest('/auth/me', {}, false)
    .then(user => {
      saveSession({ user })
      return user
    })
    .catch(async error => {
      if (error?.status === 401) {
        await clearSession({ revoke: false })
        return null
      }
      throw error
    })
    .finally(() => {
      bootstrapPromise = null
    })

  return bootstrapPromise
}

export const authRequest = (path, options = {}) => apiRequest(path, options, true)
export const publicRequest = (path, options = {}) => apiRequest(path, options, false)

export { API_BASE_URL }
