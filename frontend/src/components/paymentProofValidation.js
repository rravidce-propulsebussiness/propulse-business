const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])

export function paymentProofError(file) {
  if (!file) return 'Choose a payment proof first.'
  if (!ALLOWED_TYPES.has(String(file.type || '').toLowerCase())) return 'Payment proof must be a JPG, PNG or PDF file.'
  if (Number(file.size || 0) > MAX_BYTES) return 'Payment proof must be 5 MB or smaller.'
  return ''
}
