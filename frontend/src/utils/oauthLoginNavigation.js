// Public ProPulse OAuth currently serves one external client: Business OS.
// Navigate only to this fixed, trusted homepage. Never turn the OAuth
// returnTo query into a user-controlled off-site redirect.
export const BUSINESS_OS_HOME_URL = 'https://sghomesinterior.in/'

export function getOAuthReturnPath(search) {
  const requested = new URLSearchParams(search || '').get('returnTo')
  return typeof requested === 'string' &&
    requested.startsWith('/api/oauth/authorize?') &&
    !requested.startsWith('//') &&
    requested.length < 4096
    ? requested
    : null
}

export function getLoginHomeHref(search) {
  return getOAuthReturnPath(search) ? BUSINESS_OS_HOME_URL : '/'
}
