import { authRequest } from './utils/auth'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
let paymentMap = new Map()
let paymentById = new Map()
let approvalQueue = 'membership'
let investmentPendingCount = 0
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
      paymentById = new Map(items.filter(x => x?.id != null).map(x => [String(x.id), x]))
      paymentMap = new Map(items.filter(x => x?.purchase_id != null).map(x => [String(x.purchase_id), x]))
      investmentPendingCount = items.filter(x => String(x?.purchase_type || x?.payment_type || '').toLowerCase() === 'investment' && x?.status === 'pending').length
    })
    .catch(() => {})
    .finally(() => { fetchInFlight = null })
  return fetchInFlight
}

function enhanceApprovalSwitcher(){
  if(!isAdminPaymentsPage()) return
  const switcher=document.querySelector('.approval-switcher')
  if(!switcher) return
  const existing=[...switcher.querySelectorAll('button')]
  const membership=existing.find(b=>b.textContent.includes('Membership'))
  const wallet=existing.find(b=>b.textContent.includes('Wallet'))
  if(!membership||!wallet) return
  if(switcher.dataset.fourQueues==='1'){
    existing.forEach(b=>b.classList.remove('active'))
    const active=approvalQueue==='wallet'?wallet:approvalQueue==='membership'?membership:switcher.querySelector('.approval-external-queue[data-queue="'+approvalQueue+'"]')
    active?.classList.add('active')
    return
  }
  const make=(label,queue,badge=0)=>{const b=document.createElement('button');b.type='button';b.className='approval-external-queue';b.dataset.queue=queue;const count=Number(badge)>0?`<b>${badge}</b>`:'';b.innerHTML=`<span>${label}</span>${count}`;b.onclick=()=>{approvalQueue=queue;filterApprovalQueue(queue);enhanceApprovalSwitcher()};return b}
  wallet.addEventListener('click',()=>{approvalQueue='wallet'})
  membership.addEventListener('click',()=>{approvalQueue='membership'})
  switcher.textContent=''
  switcher.append(wallet,make('Leads','leads'),membership,make('Investment','investment',investmentPendingCount))
  switcher.dataset.fourQueues='1'
  enhanceApprovalSwitcher()
}

function filterApprovalQueue(queue){
  if(!isAdminPaymentsPage()) return
  const switcher=document.querySelector('.approval-switcher')
  const rows=[...document.querySelectorAll('.approval-table-wrap .approval-row')]
  const title=document.querySelector('.approval-switcher')?.nextElementSibling?.querySelector('h3')
  rows.forEach(row=>{
    const id=row.querySelector('td:first-child')?.textContent?.replace('#','').trim()
    const payment=paymentById.get(id)
    const match=queue==='leads'?payment?.purchase_type==='lead':queue==='investment'?String(payment?.purchase_type||payment?.payment_type||'').toLowerCase()==='investment':queue==='wallet'
    row.style.display=queue==='leads'||queue==='investment'?(match?'':'none'):''
    const details=row.nextElementSibling
    if(details?.classList.contains('approval-details-row'))details.style.display=queue==='leads'||queue==='investment'?(match?'':'none'):''
  })
  if(title)title.textContent=queue==='leads'?'Lead payment approvals':queue==='investment'?'Investment payment approvals':'Wallet recharge approvals'
  if(switcher)switcher.dataset.approvalQueue=queue
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
  filterApprovalQueue(document.querySelector('.approval-switcher')?.dataset.approvalQueue||'membership')
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
.approval-external-queue b{min-width:24px;height:24px;padding:0 7px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:#eef2f6;color:#526071;font-size:11px}
.approval-external-queue.active{background:#111827;border-color:#111827;color:#fff}
.approval-external-queue.active b{background:#fff;color:#111827}
.approval-external-queue:hover{background:#f5f8fb}
`
document.head.appendChild(style)

const observer = new MutationObserver(() => { enhanceApprovalSwitcher(); filterApprovalQueue(document.querySelector('.approval-switcher')?.dataset.approvalQueue||'membership'); decorateRows() })
observer.observe(document.body, { childList: true, subtree: true })

setInterval(() => {
  if (isAdminPaymentsPage()) {
    loadPaymentMap(true).then(() => { enhanceApprovalSwitcher(); filterApprovalQueue(document.querySelector('.approval-switcher')?.dataset.approvalQueue||'membership'); decorateRows() })
  }
}, 15000)

run()
