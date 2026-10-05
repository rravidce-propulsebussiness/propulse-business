export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_REQUEST_TIMEOUT_MS = 20000
const pendingIdempotencyKeys = new Map()

function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')
  }
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function mutationFingerprint(path, options) {
  const method = String(options.method || 'GET').toUpperCase()
  const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body ?? null)
  return `${method}\n${path}\n${body}`
}

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
  const { timeoutMs, signal: callerSignal, idempotency = false, idempotencyKey, ...fetchOptions } = requestOptions
  let idempotencyFingerprint = null
  if (idempotency || idempotencyKey) {
    idempotencyFingerprint = mutationFingerprint(path, fetchOptions)
    const key = idempotencyKey || pendingIdempotencyKeys.get(idempotencyFingerprint) || createIdempotencyKey()
    pendingIdempotencyKeys.set(idempotencyFingerprint, key)
    if (!Object.keys(headers).some(name => name.toLowerCase() === 'idempotency-key')) headers['Idempotency-Key'] = key
  }
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
    if (idempotencyFingerprint && response.status < 500 && data.code !== 'IDEMPOTENCY_IN_PROGRESS') pendingIdempotencyKeys.delete(idempotencyFingerprint)
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.code = data.code
    const retryAfterHeader = Number(response.headers.get('Retry-After'))
    const retryAfterBody = Number(data.retryAfterSeconds)
    const retryAfter = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader : retryAfterBody
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = retryAfter
    throw error
  }

  if (idempotencyFingerprint) pendingIdempotencyKeys.delete(idempotencyFingerprint)

  if (Array.isArray(data?.data)) {
    const collection = data.data
    collection.data = collection
    Object.entries(data).forEach(([key, value]) => { if (key !== 'data') collection[key] = value })
    return collection
  }

  return data
}


export async function apiRequestBlob(path, options = {}, includeToken = true) {
  const requestOptions = options
  const headers = { ...(requestOptions.headers || {}) }
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

  if (response.status === 401 && includeToken) {
    localStorage.removeItem('propulse_auth_user')
    localStorage.removeItem('propulse_is_pro_member')
    localStorage.removeItem('propulse_session_mode')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.code = data.code
    throw error
  }

  return response.blob()
}


export async function openApiBlob(path, options = {}) {
  const popup = window.open('', '_blank')
  if (!popup) {
    const error = new Error('Allow pop-ups to view this proof.')
    error.code = 'POPUP_BLOCKED'
    throw error
  }
  try {
    const blob = await apiRequestBlob(path, { timeoutMs: 30000, ...options })
    if (!blob.size) throw new Error('Proof file is empty.')
    const url = URL.createObjectURL(blob)
    popup.location.replace(url)
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    return true
  } catch (error) {
    popup.close()
    throw error
  }
}
