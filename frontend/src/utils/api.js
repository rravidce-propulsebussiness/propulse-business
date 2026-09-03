export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function apiRequest(path, options = {}, includeToken = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = includeToken ? localStorage.getItem('propulse_auth_token') : null
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))

  if (response.status === 401 && token && path !== '/auth/login') {
    localStorage.removeItem('propulse_auth_token')
    localStorage.removeItem('propulse_auth_user')
    localStorage.removeItem('propulse_session_mode')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.code = data.code
    throw error
  }
  return data
}
