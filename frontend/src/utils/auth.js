import { API_BASE_URL, apiRequest } from './api'

const TOKEN_KEY = 'propulse_auth_token'
const USER_KEY = 'propulse_auth_user'
const PRO_MEMBER_KEY = 'propulse_is_pro_member'

export const getToken = () => (getUser() ? 'cookie-session' : null)
export const getUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    const proFlag = localStorage.getItem(PRO_MEMBER_KEY)
    if (user && (proFlag === 'true' || proFlag === 'false')) {
      return {
        ...user,
        is_pro_member: proFlag === 'true',
        membership_type: proFlag === 'true' ? 'pro' : (user.membership_type === 'pro' ? '' : user.membership_type)
      }
    }
    return user
  } catch { return null }
}

export function saveSession({ user }) {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  if (user?.is_pro_member !== undefined) localStorage.setItem(PRO_MEMBER_KEY, String(Boolean(user.is_pro_member)))
}

export async function clearSession({ revoke = true } = {}) {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(PRO_MEMBER_KEY)
  if (revoke) {
    try { await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }) } catch {}
  }
}

export const authRequest = (path, options = {}) => apiRequest(path, options, true)
export const publicRequest = (path, options = {}) => apiRequest(path, options, false)

export { API_BASE_URL }
