import { API_BASE_URL, apiRequest } from './api'

let currentUser = null
let sessionKnown = false
let bootstrapPromise = null

export const getToken = () => (sessionKnown && currentUser ? 'cookie-session' : null)
export const getUser = () => (sessionKnown ? currentUser : null)
export const isSessionKnown = () => sessionKnown

export function saveSession({ user }) {
  currentUser = user || null
  sessionKnown = true
  // The authenticated user lives in memory only. The HttpOnly cookie is the
  // durable session and /auth/session repopulates this state after a reload without treating anonymous visitors as an error.
}

export async function clearSession({ revoke = true } = {}) {
  currentUser = null
  sessionKnown = true
  localStorage.removeItem('propulse_auth_user')
  localStorage.removeItem('propulse_is_pro_member')
  if (revoke) {
    try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }) } catch {}
  }
}

export function bootstrapSession({ force = false } = {}) {
  if (sessionKnown && !force) return Promise.resolve(currentUser)
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = apiRequest('/auth/session', {}, false)
    .then(result => {
      const user = result?.authenticated === true ? result.user || null : null
      saveSession({ user })
      return user
    })
    .finally(() => {
      bootstrapPromise = null
    })

  return bootstrapPromise
}

export const authRequest = (path, options = {}) => apiRequest(path, options, true)
export const publicRequest = (path, options = {}) => apiRequest(path, options, false)

export { API_BASE_URL }
