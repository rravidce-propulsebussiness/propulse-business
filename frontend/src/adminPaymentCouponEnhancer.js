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

function enhanceApprovalSwitcher(){
  if(!isAdminPaymentsPage()) return
  const switcher=document.querySelector('.approval-switcher')
  if(!switcher||switcher.dataset.fourQueues==='1') return
  const existing=[...switcher.querySelectorAll('button')]
  const membership=existing.find(b=>b.textContent.includes('Membership'))
  const wallet=existing.find(b=>b.textContent.includes('Wallet'))
  if(!membership||!wallet) return
  const make=(label,path)=>{const b=document.createElement('button');b.type='button';b.className='approval-external-queue';b.innerHTML=`<span>${label}</span>`;b.onclick=()=>{window.location.href=path};return b}
  switcher.textContent=''
  switcher.append(wallet,make('Leads','/admin/leads'),membership,make('Investment','/admin/investments'))
  switcher.dataset.fourQueues='1'
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
      rechargeCell.innerHTML = `
        <div class="admin-coupon-summary">
          <strong>${money(payment.subtotal_amount ?? payment.amount)}</strong>
          <small>Coupon: ${payment.coupon_code} −${money(payment.discount_amount)}</small>
          <small class="admin-coupon-paid">Actual paid: ${money(payment.amount)}</small>
        </div>`
    }

    const detailsRow = row.nextElementSibling
    const grid = detailsRow?.querySelector('.approval-details-grid')
    if (grid && !grid.querySelector('.admin-coupon-details')) {
      const box = document.createElement('div')
      box.className = 'admin-coupon-details'
      box.innerHTML = `
        <span>PAYMENT BREAKDOWN</span>
        <b>Wallet credit: ${money(payment.subtotal_amount ?? payment.amount)}</b>
        <small>Coupon ${payment.coupon_code}: −${money(payment.discount_amount)}</small>
        <strong>Actual paid: ${money(payment.amount)}</strong>`
      grid.prepend(box)
    }
  })
}

async function run() {
  if (!isAdminPaymentsPage()) return
  await loadPaymentMap()
  enhanceApprovalSwitcher()
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
.approval-external-queue{flex:1;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #dfe5ec;background:#fff;color:#526071;border-radius:12px;padding:12px 14px;font-weight:800;cursor:pointer;text-align:left}
.approval-external-queue span{font-size:13px}
.approval-external-queue:hover{background:#f5f8fb}
`
document.head.appendChild(style)

const observer = new MutationObserver(() => { enhanceApprovalSwitcher(); decorateRows() })
observer.observe(document.body, { childList: true, subtree: true })

setInterval(() => {
  if (isAdminPaymentsPage()) {
    loadPaymentMap(true).then(() => { enhanceApprovalSwitcher(); decorateRows() })
  }
}, 15000)

run()
