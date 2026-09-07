import { authRequest, publicRequest } from './utils/auth'

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
    if (!Number.isFinite(balance) || balance <= 0) checkbox.checked = true
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

const readUrlFilters = () => {
  if (typeof window === 'undefined') return { industryId: '', serviceId: '', stateId: '', cityId: '', leadType: 'all', allIndustries: false }
  const params = new URLSearchParams(window.location.search)
  return {
    industryId: params.get('industryId') || '',
    serviceId: params.get('serviceId') || '',
    stateId: params.get('stateId') || '',
    cityId: params.get('cityId') || '',
    leadType: params.get('leadType') || 'all',
    allIndustries: params.get('allIndustries') === '1',
  }
}

const filterState = readUrlFilters()
let masterDataPromise = null

const filterStyle = document.createElement('style')
filterStyle.textContent = `
.lv2-filter-button.filter-active{background:#edf3fb;border-color:#9eb9dd;color:#0b2d63}
.lv2-filter-overlay{position:fixed;inset:0;background:rgba(5,21,43,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;z-index:1000}
.lv2-filter-modal{width:min(560px,100%);max-height:calc(100vh - 36px);overflow:auto;background:#fff;border:1px solid #dce5ef;border-radius:20px;box-shadow:0 28px 80px rgba(5,28,58,.25);padding:24px;position:relative}
.lv2-filter-modal h2{margin:3px 0 6px;color:#102f58;font-size:22px}
.lv2-filter-modal p{margin:0 0 20px;color:#75879e;font-size:11px;line-height:1.6}
.lv2-filter-close{position:absolute;right:14px;top:10px;border:0;background:transparent;color:#526780;font-size:25px;cursor:pointer}
.lv2-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.lv2-filter-field{display:flex;flex-direction:column;gap:6px}
.lv2-filter-field.full{grid-column:1/-1}
.lv2-filter-field label{color:#647994;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}
.lv2-filter-field select{height:44px;border:1px solid #d6e0eb;border-radius:10px;background:#fff;color:#173b70;padding:0 11px;outline:0;font-size:12px;font-weight:700}
.lv2-filter-loading{padding:12px;border-radius:10px;background:#f7faff;color:#647994;font-size:11px;font-weight:700}
.lv2-filter-error{padding:12px;border-radius:10px;background:#fff5f4;border:1px solid #fecaca;color:#a52b20;font-size:11px}
.lv2-filter-actions{display:flex;justify-content:space-between;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid #edf1f5}
.lv2-filter-actions button{height:42px;border-radius:9px;padding:0 16px;font-size:11px;font-weight:900;cursor:pointer}
.lv2-filter-reset{border:1px solid #d8e1ec;background:#fff;color:#526780}
.lv2-filter-apply{border:0;background:#f15a24;color:#fff;min-width:130px}
.lv2-filter-count{margin-left:6px;font-size:10px;opacity:.8}
@media(max-width:600px){.lv2-filter-modal{padding:20px}.lv2-filter-grid{grid-template-columns:1fr}.lv2-filter-field.full{grid-column:auto}.lv2-filter-actions{position:sticky;bottom:0;background:#fff}}
`
document.head.appendChild(filterStyle)

const clean = value => String(value ?? '').trim()
const unwrap = value => Array.isArray(value) ? value : (Array.isArray(value?.data) ? value.data : (Array.isArray(value?.items) ? value.items : []))
const byName = (a, b) => clean(a.name).localeCompare(clean(b.name))
const escapeHtml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const activeFilterCount = () => [filterState.industryId, filterState.serviceId, filterState.stateId, filterState.cityId, filterState.leadType !== 'all' ? filterState.leadType : ''].filter(Boolean).length

async function loadMasterData() {
  if (masterDataPromise) return masterDataPromise
  masterDataPromise = Promise.all([
    publicRequest('/industries'),
    publicRequest('/services'),
    publicRequest('/states'),
    publicRequest('/cities'),
  ]).then(([industriesResponse, servicesResponse, statesResponse, citiesResponse]) => ({
    industries: unwrap(industriesResponse).sort(byName),
    services: unwrap(servicesResponse).sort(byName),
    states: unwrap(statesResponse).sort(byName),
    cities: unwrap(citiesResponse).sort(byName),
  })).catch(error => {
    masterDataPromise = null
    throw error
  })
  return masterDataPromise
}

function syncFilterButton() {
  const button = document.querySelector('.lv2-filter-button')
  if (!button) return
  const count = activeFilterCount()
  button.classList.toggle('filter-active', count > 0)
  const nextHtml = `<span>☷</span> Filters${count ? `<small class="lv2-filter-count">${count}</small>` : ''}`
  if (button.innerHTML !== nextHtml) button.innerHTML = nextHtml
}

function renderFilterGrid(grid, data) {
  const selectedIndustry = data.industries.some(item => String(item.id) === String(filterState.industryId))
  if (!selectedIndustry) filterState.industryId = ''

  const services = data.services.filter(item => !filterState.industryId || String(item.industry_id) === String(filterState.industryId))
  if (!services.some(item => String(item.id) === String(filterState.serviceId))) filterState.serviceId = ''

  const selectedState = data.states.some(item => String(item.id) === String(filterState.stateId))
  if (!selectedState) filterState.stateId = ''

  const cities = data.cities.filter(item => !filterState.stateId || String(item.state_id) === String(filterState.stateId))
  if (!cities.some(item => String(item.id) === String(filterState.cityId))) filterState.cityId = ''

  const option = (value, label, selected = false) => `<option value="${escapeHtml(value)}"${selected ? ' selected' : ''}>${escapeHtml(label)}</option>`
  const industryOptions = option('', 'All industries', !filterState.industryId) + data.industries.map(item => option(item.id, item.name, String(item.id) === String(filterState.industryId))).join('')
  const serviceOptions = option('', filterState.industryId ? 'All services in selected industry' : 'All services', !filterState.serviceId) + services.map(item => option(item.id, item.name, String(item.id) === String(filterState.serviceId))).join('')
  const stateOptions = option('', 'All states', !filterState.stateId) + data.states.map(item => option(item.id, item.name, String(item.id) === String(filterState.stateId))).join('')
  const cityOptions = option('', filterState.stateId ? 'All cities in selected state' : 'All cities', !filterState.cityId) + cities.map(item => option(item.id, item.name, String(item.id) === String(filterState.cityId))).join('')

  grid.innerHTML = `
    <div class="lv2-filter-field"><label>Industry</label><select data-filter="industryId">${industryOptions}</select></div>
    <div class="lv2-filter-field"><label>Service</label><select data-filter="serviceId">${serviceOptions}</select></div>
    <div class="lv2-filter-field"><label>State</label><select data-filter="stateId">${stateOptions}</select></div>
    <div class="lv2-filter-field"><label>City</label><select data-filter="cityId">${cityOptions}</select></div>
    <div class="lv2-filter-field full"><label>Lead type</label><select data-filter="leadType">
      <option value="all"${filterState.leadType === 'all' ? ' selected' : ''}>All lead types</option>
      <option value="basic"${filterState.leadType === 'basic' ? ' selected' : ''}>Basic</option>
      <option value="premium"${filterState.leadType === 'premium' ? ' selected' : ''}>Premium</option>
    </select></div>`

  grid.querySelectorAll('[data-filter]').forEach(select => select.addEventListener('change', event => {
    const key = event.target.dataset.filter
    filterState[key] = event.target.value
    if (key === 'industryId') filterState.allIndustries = event.target.value === ''
    renderFilterGrid(grid, data)
  }))
}

function navigateWithFilters({ reset = false } = {}) {
  const params = new URLSearchParams(window.location.search)
  ;['industryId', 'serviceId', 'stateId', 'cityId', 'leadType', 'allIndustries'].forEach(key => params.delete(key))
  if (filterState.industryId) params.set('industryId', filterState.industryId)
  if (filterState.serviceId) params.set('serviceId', filterState.serviceId)
  if (filterState.stateId) params.set('stateId', filterState.stateId)
  if (filterState.cityId) params.set('cityId', filterState.cityId)
  if (filterState.leadType !== 'all') params.set('leadType', filterState.leadType)
  if (!reset && filterState.allIndustries && !filterState.industryId) params.set('allIndustries', '1')
  params.delete('page')
  const query = params.toString()
  window.location.assign(`${window.location.pathname}${query ? `?${query}` : ''}`)
}

function closeFilterModal() { document.querySelector('.lv2-filter-overlay')?.remove() }

async function buildFilterModal() {
  closeFilterModal()
  const overlay = document.createElement('div')
  overlay.className = 'lv2-filter-overlay'
  overlay.innerHTML = `<div class="lv2-filter-modal" role="dialog" aria-modal="true" aria-label="Filter leads">
    <button class="lv2-filter-close" type="button" aria-label="Close filters">×</button>
    <span style="color:#f15a24;font-size:9px;font-weight:900;letter-spacing:.15em">LEAD FILTERS</span>
    <h2>Find the right leads</h2>
    <p>These filters are applied on the marketplace query, so existing leads are filtered too — not only newly added leads.</p>
    <div class="lv2-filter-loading">Loading industry, service and location options…</div>
    <div class="lv2-filter-grid" data-filter-grid style="display:none"></div>
    <div class="lv2-filter-actions"><button class="lv2-filter-reset" type="button">Reset filters</button><button class="lv2-filter-apply" type="button">Apply filters</button></div>
  </div>`
  document.body.appendChild(overlay)
  overlay.addEventListener('click', event => { if (event.target === overlay) closeFilterModal() })
  overlay.querySelector('.lv2-filter-close').addEventListener('click', closeFilterModal)
  overlay.querySelector('.lv2-filter-reset').addEventListener('click', () => {
    filterState.industryId = ''
    filterState.serviceId = ''
    filterState.stateId = ''
    filterState.cityId = ''
    filterState.leadType = 'all'
    filterState.allIndustries = false
    navigateWithFilters({ reset: true })
  })
  overlay.querySelector('.lv2-filter-apply').addEventListener('click', () => {
    syncFilterButton()
    navigateWithFilters()
  })

  try {
    const data = await loadMasterData()
    if (!document.body.contains(overlay)) return
    const grid = overlay.querySelector('[data-filter-grid]')
    renderFilterGrid(grid, data)
    grid.style.display = 'grid'
    overlay.querySelector('.lv2-filter-loading').remove()
  } catch (error) {
    const loading = overlay.querySelector('.lv2-filter-loading')
    if (loading) {
      loading.className = 'lv2-filter-error'
      loading.textContent = error?.message || 'Unable to load filter options. Please try again.'
    }
  }
}

function bindFilterButton(button) {
  if (!button || button.dataset.filtersReady === 'true') return
  button.dataset.filtersReady = 'true'
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopImmediatePropagation()
    buildFilterModal()
  }, true)
  syncFilterButton()
}

function scan() {
  document.querySelectorAll('.lv2-buy-modal').forEach(enhanceBuyModal)
  document.querySelectorAll('.lv2-upgrade').forEach(enhancePaymentModal)
  bindFilterButton(document.querySelector('.lv2-filter-button'))
}

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
