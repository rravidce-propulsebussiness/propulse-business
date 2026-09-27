export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_REQUEST_TIMEOUT_MS = 20000

function requestSignal(signal, timeoutMs) {
  const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1000, Number(timeoutMs)) : DEFAULT_REQUEST_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeout)
  const abort = () => controller.abort(signal?.reason)
  if (signal) {
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  }
  return { signal: controller.signal, cleanup: () => { clearTimeout(timer); signal?.removeEventListener?.('abort', abort) } }
}

export async function apiRequest(path, options = {}, includeToken = true) {
  const requestOptions = options
  const headers = { ...(requestOptions.headers || {}) }
  const hasBody = requestOptions.body !== undefined && requestOptions.body !== null
  if (hasBody && !Object.keys(headers).some(key => key.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json'
  const { timeoutMs, signal: callerSignal, ...fetchOptions } = requestOptions
  const timed = requestSignal(callerSignal, timeoutMs)
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, signal: timed.signal, headers, credentials: 'include' })
  } catch (error) {
    if (timed.signal.aborted && !callerSignal?.aborted) {
      const timeoutError = new Error('Request timed out. Please try again.')
      timeoutError.code = 'REQUEST_TIMEOUT'
      throw timeoutError
    }
    throw error
  } finally {
    timed.cleanup()
  }
  const data = await response.json().catch(() => ({}))

  if (response.status === 401 && includeToken && path !== '/auth/login') {
    localStorage.removeItem('propulse_auth_user')
    localStorage.removeItem('propulse_is_pro_member')
    localStorage.removeItem('propulse_session_mode')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.code = data.code
    throw error
  }

  if (Array.isArray(data?.data)) {
    const collection = data.data
    collection.data = collection
    Object.entries(data).forEach(([key, value]) => { if (key !== 'data') collection[key] = value })
    return collection
  }

  return data
}
