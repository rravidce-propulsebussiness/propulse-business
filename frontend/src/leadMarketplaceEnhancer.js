import { authRequest } from './utils/auth'

const preferenceKey = 'propulse_use_wallet'

function formatMoney(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : '₹0'
}

function isProMember() {
  try { return localStorage.getItem('propulse_is_pro_member') === 'true' } catch { return false }
}

function enhanceProPricing(modal) {
  const pricing = modal.querySelector('.lv2-modal-pricing')
  if (!pricing) return
  if (isProMember()) pricing.classList.add('pro-only')
  if (!pricing.classList.contains('pro-only') || pricing.dataset.proSavingsReady === 'true') return
  pricing.dataset.proSavingsReady = 'true'
  pricing.querySelectorAll('.lv2-modal-price-row').forEach(row => {
    const normal = row.querySelector('.lv2-modal-price.normal')
    const pro = row.querySelector('.lv2-modal-price.pro')
    if (!normal || !pro) return
    const normalValue = Number(String(normal.textContent || '').replace(/[^0-9.]/g, ''))
    const proValue = Number(String(pro.textContent || '').replace(/[^0-9.]/g, ''))
    const saving = normalValue - proValue
    if (!Number.isFinite(saving) || saving <= 0 || pro.querySelector('.lv2-pro-saving')) return
    const save = document.createElement('small')
    save.className = 'lv2-pro-saving'
    save.textContent = `Save ${formatMoney(saving)}`
    pro.appendChild(save)
  })
}

function enhanceBuyModal(modal) {
  if (!modal) return
  const pricing = modal.querySelector('.lv2-modal-pricing')
  if (!pricing) return
  enhanceProPricing(modal)
  if (modal.dataset.walletPreferenceReady === 'true') return

  modal.dataset.walletPreferenceReady = 'true'
  try { localStorage.setItem(preferenceKey, 'true') } catch {}

  const option = document.createElement('label')
  option.className = 'lv2-wallet-option'
  option.innerHTML = '<input type="checkbox" checked><span><strong>Use wallet balance</strong><small>Apply your available wallet balance first. Uncheck to pay the full amount directly.</small></span><b class="lv2-wallet-balance">Checking…</b>'

  const checkbox = option.querySelector('input')
  checkbox.addEventListener('change', () => {
    try { localStorage.setItem(preferenceKey, checkbox.checked ? 'true' : 'false') } catch {}
  })

  pricing.parentNode.insertBefore(option, pricing)

  authRequest('/wallet').then(data => {
    const balance = Number(data?.balance ?? 0)
    const balanceNode = option.querySelector('.lv2-wallet-balance')
    if (balanceNode) balanceNode.textContent = `Available ${formatMoney(balance)}`
    if (!Number.isFinite(balance) || balance <= 0) {
      checkbox.checked = true
      try { localStorage.setItem(preferenceKey, 'true') } catch {}
    }
  }).catch(() => {
    const balanceNode = option.querySelector('.lv2-wallet-balance')
    if (balanceNode) balanceNode.textContent = 'Wallet balance unavailable'
  })
}

function enhancePaymentModal(modal) {
  if (!modal || modal.dataset.paymentModalReady === 'true') return
  if (!modal.querySelector('#lead-payment-utr')) return
  modal.dataset.paymentModalReady = 'true'
  modal.classList.add('lead-payment-modal')
}

const filterState = { industry: '', service: '', location: '', type: 'all' }
let lastCardSignature = ''

const filterStyle = document.createElement('style')
filterStyle.textContent = `
.lv2-filter-button.filter-active{background:#edf3fb;border-color:#9eb9dd;color:#0b2d63}
.lv2-filter-overlay{position:fixed;inset:0;background:rgba(5,21,43,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;z-index:1000}
.lv2-filter-modal{width:min(520px,100%);background:#fff;border:1px solid #dce5ef;border-radius:20px;box-shadow:0 28px 80px rgba(5,28,58,.25);padding:24px;position:relative}
.lv2-filter-modal h2{margin:3px 0 6px;color:#102f58;font-size:22px}
.lv2-filter-modal p{margin:0 0 20px;color:#75879e;font-size:11px;line-height:1.6}
.lv2-filter-close{position:absolute;right:14px;top:10px;border:0;background:transparent;color:#526780;font-size:25px;cursor:pointer}
.lv2-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.lv2-filter-field{display:flex;flex-direction:column;gap:6px}
.lv2-filter-field label{color:#647994;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}
.lv2-filter-field select{height:44px;border:1px solid #d6e0eb;border-radius:10px;background:#fff;color:#173b70;padding:0 11px;outline:0;font-size:12px;font-weight:700}
.lv2-filter-actions{display:flex;justify-content:space-between;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid #edf1f5}
.lv2-filter-actions button{height:42px;border-radius:9px;padding:0 16px;font-size:11px;font-weight:900;cursor:pointer}
.lv2-filter-reset{border:1px solid #d8e1ec;background:#fff;color:#526780}
.lv2-filter-apply{border:0;background:#f15a24;color:#fff;min-width:130px}
.lv2-filter-count{margin-left:6px;font-size:10px;opacity:.8}
.lv2-filter-empty{display:none;margin:18px 0;padding:25px;text-align:center;border:1px dashed #d5dfeb;border-radius:14px;background:#fff;color:#72859e;font-size:11px;font-weight:700}
@media(max-width:600px){.lv2-filter-modal{padding:20px}.lv2-filter-grid{grid-template-columns:1fr}}
`
document.head.appendChild(filterStyle)

const clean = value => String(value || '').trim()
const uniqueSorted = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

function readFilterCards() {
  return [...document.querySelectorAll('.lv2-card')].map(card => {
    const facts = [...card.querySelectorAll('.lv2-facts > div')]
    const valueForIcon = icon => clean(facts.find(item => clean(item.querySelector('span')?.textContent) === icon)?.querySelector('b')?.textContent)
    return { card, industry: valueForIcon('▣'), service: valueForIcon('⌁'), location: valueForIcon('⌖'), type: card.classList.contains('premium') ? 'premium' : 'basic' }
  })
}

function activeFilterCount() {
  return [filterState.industry, filterState.service, filterState.location, filterState.type !== 'all' ? filterState.type : ''].filter(Boolean).length
}

function applyLeadFilters() {
  const cards = readFilterCards()
  let visible = 0
  cards.forEach(item => {
    const matches = (!filterState.industry || item.industry === filterState.industry)
      && (!filterState.service || item.service === filterState.service)
      && (!filterState.location || item.location === filterState.location)
      && (filterState.type === 'all' || item.type === filterState.type)
    item.card.style.display = matches ? '' : 'none'
    if (matches) visible += 1
  })
  const totalNode = document.querySelector('.lv2-stat.orange b')
  if (totalNode) {
    if (!totalNode.dataset.filterTotal) totalNode.dataset.filterTotal = totalNode.textContent
    const nextValue = activeFilterCount() ? String(visible) : totalNode.dataset.filterTotal
    if (totalNode.textContent !== nextValue) totalNode.textContent = nextValue
  }
  const grid = document.querySelector('.lv2-grid')
  let empty = document.querySelector('.lv2-filter-empty')
  if (!empty && grid) {
    empty = document.createElement('div')
    empty.className = 'lv2-filter-empty'
    empty.textContent = 'No leads match these filters on this page.'
    grid.parentNode.insertBefore(empty, grid.nextSibling)
  }
  if (empty) empty.style.display = activeFilterCount() && visible === 0 ? 'block' : 'none'
  const button = document.querySelector('.lv2-filter-button')
  if (button) {
    const count = activeFilterCount()
    button.classList.toggle('filter-active', count > 0)
    const nextHtml = `<span>☷</span> Filters${count ? `<small class="lv2-filter-count">${count}</small>` : ''}`
    if (button.innerHTML !== nextHtml) button.innerHTML = nextHtml
  }
}

function closeFilterModal() {
  document.querySelector('.lv2-filter-overlay')?.remove()
}

function buildFilterModal() {
  const cards = readFilterCards()
  const industries = uniqueSorted(cards.map(x => x.industry))
  const services = uniqueSorted(cards.map(x => x.service))
  const locations = uniqueSorted(cards.map(x => x.location))
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  const options = (items, selected, allLabel) => `<option value="">${allLabel}</option>${items.map(value => `<option value="${escape(value)}" ${value === selected ? 'selected' : ''}>${value}</option>`).join('')}`
  const overlay = document.createElement('div')
  overlay.className = 'lv2-filter-overlay'
  overlay.innerHTML = `<div class="lv2-filter-modal" role="dialog" aria-modal="true" aria-label="Filter leads">
    <button class="lv2-filter-close" type="button" aria-label="Close filters">×</button>
    <span style="color:#f15a24;font-size:9px;font-weight:900;letter-spacing:.15em">LEAD FILTERS</span>
    <h2>Find the right leads</h2>
    <p>Combine industry, service, location and lead type without changing the existing marketplace data or purchase flow.</p>
    <div class="lv2-filter-grid">
      <div class="lv2-filter-field"><label>Industry</label><select data-filter="industry">${options(industries, filterState.industry, 'All industries')}</select></div>
      <div class="lv2-filter-field"><label>Service</label><select data-filter="service">${options(services, filterState.service, 'All services')}</select></div>
      <div class="lv2-filter-field"><label>Location</label><select data-filter="location">${options(locations, filterState.location, 'All locations')}</select></div>
      <div class="lv2-filter-field"><label>Lead type</label><select data-filter="type"><option value="all" ${filterState.type === 'all' ? 'selected' : ''}>All lead types</option><option value="basic" ${filterState.type === 'basic' ? 'selected' : ''}>Basic</option><option value="premium" ${filterState.type === 'premium' ? 'selected' : ''}>Premium</option></select></div>
    </div>
    <div class="lv2-filter-actions"><button class="lv2-filter-reset" type="button">Reset filters</button><button class="lv2-filter-apply" type="button">Apply filters</button></div>
  </div>`
  overlay.addEventListener('click', event => { if (event.target === overlay) closeFilterModal() })
  overlay.querySelector('.lv2-filter-close').addEventListener('click', closeFilterModal)
  overlay.querySelectorAll('[data-filter]').forEach(select => select.addEventListener('change', event => { filterState[event.target.dataset.filter] = event.target.value }))
  overlay.querySelector('.lv2-filter-reset').addEventListener('click', () => {
    filterState.industry = ''; filterState.service = ''; filterState.location = ''; filterState.type = 'all'
    closeFilterModal(); applyLeadFilters()
  })
  overlay.querySelector('.lv2-filter-apply').addEventListener('click', () => { closeFilterModal(); applyLeadFilters() })
  document.body.appendChild(overlay)
}

function bindFilterButton(button) {
  if (!button || button.dataset.filtersReady === 'true') return
  button.dataset.filtersReady = 'true'
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopImmediatePropagation()
    buildFilterModal()
  }, true)
}

function scan() {
  document.querySelectorAll('.lv2-buy-modal').forEach(enhanceBuyModal)
  document.querySelectorAll('.lv2-upgrade').forEach(enhancePaymentModal)
  bindFilterButton(document.querySelector('.lv2-filter-button'))
  const cards = [...document.querySelectorAll('.lv2-card')]
  const signature = cards.map(card => `${card.querySelector('.lv2-id')?.textContent || ''}|${card.className}`).join('||')
  if (signature !== lastCardSignature) {
    lastCardSignature = signature
    if (activeFilterCount()) applyLeadFilters()
  }
}

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()