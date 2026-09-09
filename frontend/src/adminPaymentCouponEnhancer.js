import { authRequest } from './utils/auth'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
let paymentMap = new Map()
let leadMap = new Map()
let lastFetchAt = 0
let fetchInFlight = null
let leadFetchInFlight = null

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
      paymentMap = new Map(items.filter(x => x?.id != null).map(x => [String(x.id), x]))
    })
    .catch(() => {})
    .finally(() => { fetchInFlight = null })
  return fetchInFlight
}

async function loadLeadMap(force = false) {
  if (!isAdminPaymentsPage()) return
  if (!force && leadFetchInFlight) return leadFetchInFlight
  leadFetchInFlight = authRequest('/leads?status=all')
    .then(data => {
      const items = Array.isArray(data) ? data : data?.items || data?.data || []
      leadMap = new Map(items.filter(x => x?.id != null).map(x => [String(x.id), x]))
    })
    .catch(() => {})
    .finally(() => { leadFetchInFlight = null })
  return leadFetchInFlight
}

function text(parent, tag, value, className = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  node.textContent = value == null || value === '' ? '—' : String(value)
  parent.appendChild(node)
  return node
}

function closeLeadModal() {
  document.querySelector('.admin-lead-preview-backdrop')?.remove()
}

function showLeadModal(lead, paymentData) {
  closeLeadModal()
  const backdrop = document.createElement('div')
  backdrop.className = 'admin-lead-preview-backdrop'
  const modal = document.createElement('div')
  modal.className = 'admin-lead-preview-modal'
  const header = document.createElement('div')
  header.className = 'admin-lead-preview-header'
  const title = document.createElement('div')
  title.className = 'admin-lead-preview-title'
  text(title, 'span', `Lead #${lead?.id ?? paymentData?.purchase_id ?? '—'}`, 'admin-lead-preview-id')
  text(title, 'strong', lead?.customer_name || lead?.requirement || 'Lead details')
  header.appendChild(title)
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'admin-lead-preview-close'
  close.textContent = '×'
  close.onclick = closeLeadModal
  header.appendChild(close)
  modal.appendChild(header)

  const grid = document.createElement('div')
  grid.className = 'admin-lead-preview-grid'
  const details = [
    ['Customer', lead?.customer_name],
    ['Phone', lead?.customer_phone],
    ['Email', lead?.customer_email],
    ['Industry', lead?.industry_name],
    ['Service', lead?.service_name],
    ['Subservice', lead?.subservice_name],
    ['Location', [lead?.city_name, lead?.state_name].filter(Boolean).join(', ')],
    ['Property type', lead?.property_type],
    ['Budget', lead?.budget],
    ['Requirement', lead?.requirement]
  ]
  details.forEach(([label, value]) => {
    const box = document.createElement('div')
    box.className = 'admin-lead-preview-item'
    text(box, 'span', label)
    text(box, 'b', value)
    grid.appendChild(box)
  })
  modal.appendChild(grid)

  const paymentBox = document.createElement('div')
  paymentBox.className = 'admin-lead-preview-payment'
  text(paymentBox, 'span', 'PAYMENT', 'admin-lead-preview-payment-label')
  text(paymentBox, 'b', `Original ${money(paymentData?.subtotal_amount ?? paymentData?.amount)}`)
  text(paymentBox, 'small', paymentData?.coupon_code ? `Coupon ${paymentData.coupon_code}: −${money(paymentData.discount_amount)}` : 'No coupon')
  text(paymentBox, 'strong', `Actual payable ${money(paymentData?.amount)}`)
  modal.appendChild(paymentBox)

  backdrop.appendChild(modal)
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeLeadModal() })
  document.body.appendChild(backdrop)
}

function decorateRows() {
  if (!isAdminPaymentsPage()) return
  document.querySelectorAll('.approval-table-wrap .approval-row').forEach(row => {
    const id = row.querySelector('td:first-child')?.textContent?.replace('#', '').trim()
    if (!id) return
    const payment = paymentMap.get(id)
    if (!payment) return

    const amountCell = row.querySelector('td:nth-child(4)')
    if (payment.purchase_type === 'lead' && amountCell && !amountCell.querySelector('.admin-lead-payment-summary')) {
      amountCell.textContent = ''
      const summary = document.createElement('div')
      summary.className = 'admin-lead-payment-summary'
      text(summary, 'strong', `Original ${money(payment.subtotal_amount ?? payment.amount)}`)
      if (payment.coupon_code) text(summary, 'small', `Coupon ${payment.coupon_code}: −${money(payment.discount_amount)}`)
      text(summary, 'small', `Wallet ${money(payment.wallet_amount)}`)
      text(summary, 'small', `Direct ${money(payment.external_amount)}`)
      text(summary, 'b', `Payable ${money(payment.amount)}`, 'admin-lead-payable')
      amountCell.appendChild(summary)
    }

    const purchaseCell = row.querySelector('td:nth-child(3)')
    if (payment.purchase_type === 'lead' && purchaseCell && !purchaseCell.querySelector('.admin-lead-link')) {
      purchaseCell.textContent = ''
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'admin-lead-link'
      const lead = leadMap.get(String(payment.purchase_id)) || payment.lead
      button.textContent = `Lead #${payment.purchase_id}`
      button.title = lead?.customer_name || lead?.requirement || 'View lead details'
      button.onclick = () => showLeadModal(lead || { id: payment.purchase_id }, payment)
      purchaseCell.appendChild(button)
      text(purchaseCell, 'small', lead?.customer_name || lead?.requirement || 'Lead purchase')
    }

    const detailsRow = row.nextElementSibling
    const grid = detailsRow?.querySelector('.approval-details-grid')
    if (payment.purchase_type === 'lead' && grid && !grid.querySelector('.admin-lead-payment-details')) {
      const box = document.createElement('div')
      box.className = 'admin-lead-payment-details'
      text(box, 'span', 'PAYMENT BREAKDOWN')
      text(box, 'b', `Original: ${money(payment.subtotal_amount ?? payment.amount)}`)
      text(box, 'small', payment.coupon_code ? `Coupon ${payment.coupon_code}: −${money(payment.discount_amount)}` : 'Coupon: —')
      text(box, 'small', `Wallet used: ${money(payment.wallet_amount)}`)
      text(box, 'small', `Direct due: ${money(payment.external_amount)}`)
      text(box, 'strong', `Actual payable: ${money(payment.amount)}`)
      grid.prepend(box)
    }
  })
}

async function run() {
  if (!isAdminPaymentsPage()) return
  await Promise.all([loadPaymentMap(), loadLeadMap()])
  decorateRows()
}

const style = document.createElement('style')
style.textContent = `
.admin-lead-payment-summary{display:flex;flex-direction:column;gap:2px;line-height:1.25}
.admin-lead-payment-summary strong{font-size:12px;color:#243b5c}
.admin-lead-payment-summary small{font-size:9px;color:#718096;white-space:nowrap}
.admin-lead-payment-summary .admin-lead-payable{font-size:12px;color:#18713c;margin-top:2px}
.admin-lead-link{border:0;background:transparent;padding:0;color:#173b70;font-weight:900;cursor:pointer;text-align:left;font:inherit}
.admin-lead-link:hover{text-decoration:underline}
.admin-lead-payment-details{grid-column:1/-1!important;border:1px solid #cfe0f5!important;background:#f5f9ff!important}
.admin-lead-payment-details span{color:#173b70!important}
.admin-lead-payment-details b,.admin-lead-payment-details small,.admin-lead-payment-details strong{display:block!important}
.admin-lead-payment-details small{margin-top:3px;color:#718096;font-size:10px}
.admin-lead-payment-details strong{margin-top:6px;color:#18713c;font-size:14px}
.admin-lead-preview-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(15,28,48,.46);display:flex;align-items:center;justify-content:center;padding:20px}
.admin-lead-preview-modal{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.25);padding:22px}
.admin-lead-preview-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
.admin-lead-preview-title{display:flex;flex-direction:column;gap:4px}
.admin-lead-preview-title strong{font-size:20px;color:#142c4d}
.admin-lead-preview-id{font-size:11px;font-weight:900;color:#6f8199;text-transform:uppercase;letter-spacing:.08em}
.admin-lead-preview-close{width:34px;height:34px;border:1px solid #dbe4ef;border-radius:10px;background:#fff;font-size:24px;line-height:1;cursor:pointer}
.admin-lead-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.admin-lead-preview-item{border:1px solid #e3eaf2;border-radius:12px;padding:11px 12px;background:#fbfdff}
.admin-lead-preview-item span{display:block;font-size:9px;font-weight:900;color:#7b8ba0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.admin-lead-preview-item b{display:block;font-size:12px;color:#233b59;line-height:1.4;white-space:pre-wrap;word-break:break-word}
.admin-lead-preview-payment{margin-top:14px;border:1px solid #cfe0f5;border-radius:12px;background:#f5f9ff;padding:13px}
.admin-lead-preview-payment-label{display:block;font-size:9px;font-weight:900;color:#173b70;letter-spacing:.07em}
.admin-lead-preview-payment b,.admin-lead-preview-payment small,.admin-lead-preview-payment strong{display:block;margin-top:4px}
.admin-lead-preview-payment small{color:#718096}
.admin-lead-preview-payment strong{font-size:15px;color:#18713c}
@media(max-width:640px){.admin-lead-preview-grid{grid-template-columns:1fr}.admin-lead-preview-modal{padding:16px}}
`
document.head.appendChild(style)

const observer = new MutationObserver(() => decorateRows())
observer.observe(document.body, { childList: true, subtree: true })

setInterval(() => {
  if (isAdminPaymentsPage()) {
    Promise.all([loadPaymentMap(true), loadLeadMap(true)]).then(decorateRows)
  }
}, 15000)

run()
