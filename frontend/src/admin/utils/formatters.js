export const formatInr = (value, { minimumFractionDigits = 0, maximumFractionDigits = 2 } = {}) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits, maximumFractionDigits })}`

export const formatAdminDateTime = value => value
  ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

export const formatAdminDate = value => value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

export const formatSnakeTitle = value =>
  String(value || '').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
