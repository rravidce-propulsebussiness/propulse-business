// Money shown to customers and admins: whole rupees stay short (₹900),
// amounts with paise always show both digits (₹902.70, never ₹902.7 or ₹903).
export function hasPaise(value) {
  const paise = Math.round(Number(value || 0) * 100)
  return paise % 100 !== 0
}

export function formatRupees(value) {
  const amount = Number(value || 0)
  const digits = hasPaise(amount) ? 2 : 0
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}
