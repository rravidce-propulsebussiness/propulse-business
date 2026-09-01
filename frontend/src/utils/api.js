export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function apiRequest(path, options = {}, includeToken = true) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (includeToken) {
    const token = localStorage.getItem('propulse_auth_token')
    if (token) headers.Authorization = `Bearer ${token}`
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.code = data.code
    throw error
  }
  return data
}
