import { authRequest } from './utils/auth'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
let paymentMap = new Map()
let lastFetchAt = 0
let fetchInFlight = null

function isAdminPaymentsPage() {
  return window.location.pathname === '/admin/payments'
}

async function loadPaymentMap(force = false) {
  if (!isAdminPaymentsPage()) return
  const now = Date.now()
  if (!force && (fetchInFlight || now - lastFetchAt < 8000)) return fetchInFlight
  lastFetchAt = now
  fetchInFlight = authRequest('/payments?status=all&search=&page=1&limit=100')
    .then(data => {
      const items = Array.isArray(data) ? data : data?.items || []
      paymentMap = new Map(
        items
          .filter(x => x?.purchase_type === 'wallet_topup' && x?.purchase_id != null)
          .map(x => [String(x.purchase_id), x])
      )
    })
    .catch(() => {})
    .finally(() => { fetchInFlight = null })
  return fetchInFlight
}

function decorateRows() {
  if (!isAdminPaymentsPage()) return
  document.querySelectorAll('.approval-table-wrap .approval-row').forEach(row => {
    const id = row.querySelector('td:first-child')?.textContent?.replace('#', '').trim()
    if (!id) return
    const payment = paymentMap.get(id)
    if (!payment || !payment.coupon_code) return

    const rechargeCell = row.querySelector('td:nth-child(3)')
    if (rechargeCell && !rechargeCell.querySelector('.admin-coupon-summary')) {
      const summary = document.createElement('div')
      summary.className = 'admin-coupon-summary'
      const credit = document.createElement('strong')
      credit.textContent = money(payment.subtotal_amount ?? payment.amount)
      const coupon = document.createElement('small')
      coupon.textContent = `Coupon: ${String(payment.coupon_code || '')} −${money(payment.discount_amount)}`
      const paid = document.createElement('small')
      paid.className = 'admin-coupon-paid'
      paid.textContent = `Actual paid: ${money(payment.amount)}`
      summary.append(credit, coupon, paid)
      rechargeCell.replaceChildren(summary)
    }

    const detailsRow = row.nextElementSibling
    const grid = detailsRow?.querySelector('.approval-details-grid')
    if (grid && !grid.querySelector('.admin-coupon-details')) {
      const box = document.createElement('div')
      box.className = 'admin-coupon-details'
      const heading = document.createElement('span')
      heading.textContent = 'PAYMENT BREAKDOWN'
      const credit = document.createElement('b')
      credit.textContent = `Wallet credit: ${money(payment.subtotal_amount ?? payment.amount)}`
      const coupon = document.createElement('small')
      coupon.textContent = `Coupon ${String(payment.coupon_code || '')}: −${money(payment.discount_amount)}`
      const paid = document.createElement('strong')
      paid.textContent = `Actual paid: ${money(payment.amount)}`
      box.append(heading, credit, coupon, paid)
      grid.prepend(box)
    }
  })
}

async function run() {
  if (!isAdminPaymentsPage()) return
  await loadPaymentMap()
  decorateRows()
}

const style = document.createElement('style')
style.textContent = `
.admin-coupon-summary{display:flex;flex-direction:column;gap:2px;line-height:1.25}
.admin-coupon-summary strong{font-size:15px;color:#243b5c}
.admin-coupon-summary small{font-size:9px;color:#7b8ba0;white-space:nowrap}
.admin-coupon-summary .admin-coupon-paid{font-size:10px;font-weight:900;color:#18713c}
.admin-coupon-details{grid-column:1/-1!important;border:1px solid #cfe0f5!important;background:#f5f9ff!important}
.admin-coupon-details span{color:#173b70!important}
.admin-coupon-details b,.admin-coupon-details small,.admin-coupon-details strong{display:block!important}
.admin-coupon-details small{margin-top:3px;color:#718096;font-size:10px}
.admin-coupon-details strong{margin-top:6px;color:#18713c;font-size:14px}
`
document.head.appendChild(style)

const observer = new MutationObserver(() => { run() })
observer.observe(document.body, { childList: true, subtree: true })
run()
