// A non-authoritative "this browser was signed in last time" flag.
// It stores only a constant marker, never user or profile data, and is never
// used to grant access: the HttpOnly cookie verified by /auth/session remains
// the only authority. It only decides whether first paint must wait for that
// verification (returning signed-in users) or can render the public page
// immediately (anonymous visitors, the vast majority of traffic).
const SESSION_HINT_KEY = 'propulse_session_hint'
const SESSION_HINT_VALUE = '1'

export function hasSessionHint() {
  try { return localStorage.getItem(SESSION_HINT_KEY) === SESSION_HINT_VALUE } catch { return false }
}

export function setSessionHint(signedIn) {
  try {
    if (signedIn) localStorage.setItem(SESSION_HINT_KEY, SESSION_HINT_VALUE)
    else localStorage.removeItem(SESSION_HINT_KEY)
  } catch {}
}
