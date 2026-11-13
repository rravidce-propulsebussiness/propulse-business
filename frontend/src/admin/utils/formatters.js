// Amounts with paise always show two digits (₹2,697.30, not ₹2,697.3).
export const formatInr = (value, { minimumFractionDigits, maximumFractionDigits = 2 } = {}) => {
  const amount = Number(value || 0)
  const min = minimumFractionDigits ?? (Math.round(amount * 100) % 100 !== 0 ? Math.min(2, maximumFractionDigits) : 0)
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: min, maximumFractionDigits: Math.max(min, maximumFractionDigits) })}`
}

export const formatAdminDateTime = value => value
  ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

export const formatAdminDate = value => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

export const formatSnakeTitle = value =>
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
