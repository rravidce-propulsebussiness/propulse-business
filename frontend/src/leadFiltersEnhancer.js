const state = { industry: '', service: '', location: '', type: 'all', open: false }

const style = document.createElement('style')
style.textContent = `
.lv2-filter-button.filter-active{background:#edf3fb;border-color:#9eb9dd;color:#0b2d63}
.lv2-filter-overlay{position:fixed;inset:0;background:rgba(5,21,43,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;z-index:1000}
.lv2-filter-modal{width:min(520px,100%);background:#fff;border:1px solid #dce5ef;border-radius:20px;box-shadow:0 28px 80px rgba(5,28,58,.25);padding:24px;position:relative}
.lv2-filter-modal h2{margin:3px 0 6px;color:#102f58;font-size:22px}
.lv2-filter-modal p{margin:0 0 20px;color:#75879e;font-size:11px;line-height:1.6}
.lv2-filter-close{position:absolute;right:14px;top:10px;border:0;background:transparent;color:#526780;font-size:25px;cursor:pointer}
.lv2-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.lv2-filter-field{display:flex;flex-direction:column;gap:6px}
.lv2-filter-field.full{grid-column:1/-1}
.lv2-filter-field label{color:#647994;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}
.lv2-filter-field select{height:44px;border:1px solid #d6e0eb;border-radius:10px;background:#fff;color:#173b70;padding:0 11px;outline:0;font-size:12px;font-weight:700}
.lv2-filter-actions{display:flex;justify-content:space-between;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid #edf1f5}
.lv2-filter-actions button{height:42px;border-radius:9px;padding:0 16px;font-size:11px;font-weight:900;cursor:pointer}
.lv2-filter-reset{border:1px solid #d8e1ec;background:#fff;color:#526780}
.lv2-filter-apply{border:0;background:#f15a24;color:#fff;min-width:130px}
.lv2-filter-count{margin-left:6px;font-size:10px;opacity:.8}
.lv2-filter-empty{display:none;margin:18px 0;padding:25px;text-align:center;border:1px dashed #d5dfeb;border-radius:14px;background:#fff;color:#72859e;font-size:11px;font-weight:700}
@media(max-width:600px){.lv2-filter-modal{padding:20px}.lv2-filter-grid{grid-template-columns:1fr}.lv2-filter-field.full{grid-column:auto}.lv2-filter-actions{position:sticky;bottom:0;background:#fff}}
`
document.head.appendChild(style)

const clean = value => String(value || '').trim()
const uniqueSorted = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

function readCards() {
  return [...document.querySelectorAll('.lv2-card')].map(card => {
    const facts = [...card.querySelectorAll('.lv2-facts > div')]
    const valueForIcon = icon => clean(facts.find(item => clean(item.querySelector('span')?.textContent) === icon)?.querySelector('b')?.textContent)
    return {
      card,
      industry: valueForIcon('▣'),
      service: valueForIcon('⌁'),
      location: valueForIcon('⌖'),
      type: card.classList.contains('premium') ? 'premium' : 'basic'
    }
  })
}

function applyFilters() {
  const cards = readCards()
  let visible = 0
  cards.forEach(item => {
    const matches = (!state.industry || item.industry === state.industry)
      && (!state.service || item.service === state.service)
      && (!state.location || item.location === state.location)
      && (state.type === 'all' || item.type === state.type)
    item.card.style.display = matches ? '' : 'none'
    if (matches) visible += 1
  })

  const totalNode = document.querySelector('.lv2-stat.orange b')
  if (totalNode) {
    if (!totalNode.dataset.filterTotal) totalNode.dataset.filterTotal = totalNode.textContent
    totalNode.textContent = activeCount() ? String(visible) : totalNode.dataset.filterTotal
  }

  let empty = document.querySelector('.lv2-filter-empty')
  const grid = document.querySelector('.lv2-grid')
  if (!empty && grid) {
    empty = document.createElement('div')
    empty.className = 'lv2-filter-empty'
    empty.textContent = 'No leads match these filters on this page.'
    grid.parentNode.insertBefore(empty, grid.nextSibling)
  }
  if (empty) empty.style.display = activeCount() && visible === 0 ? 'block' : 'none'

  const button = document.querySelector('.lv2-filter-button')
  if (button) {
    const count = [state.industry, state.service, state.location, state.type !== 'all' ? state.type : ''].filter(Boolean).length
    button.classList.toggle('filter-active', count > 0)
    button.innerHTML = `<span>☷</span> Filters${count ? `<small class="lv2-filter-count">${count}</small>` : ''}`
  }
}

function activeCount() {
  return [state.industry, state.service, state.location, state.type !== 'all' ? state.type : ''].filter(Boolean).length
}

function closeModal() {
  state.open = false
  document.querySelector('.lv2-filter-overlay')?.remove()
}

function buildModal() {
  const cards = readCards()
  const industries = uniqueSorted(cards.map(x => x.industry))
  const services = uniqueSorted(cards.map(x => x.service))
  const locations = uniqueSorted(cards.map(x => x.location))
  const option = (value, selected) => `<option value="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;') }" ${value === selected ? 'selected' : ''}>${value}</option>`
  const options = (items, selected, allLabel) => `<option value="">${allLabel}</option>${items.map(value => option(value, selected)).join('')}`

  const overlay = document.createElement('div')
  overlay.className = 'lv2-filter-overlay'
  overlay.innerHTML = `<div class="lv2-filter-modal" role="dialog" aria-modal="true" aria-label="Filter leads">
    <button class="lv2-filter-close" type="button" aria-label="Close filters">×</button>
    <span style="color:#f15a24;font-size:9px;font-weight:900;letter-spacing:.15em">LEAD FILTERS</span>
    <h2>Find the right leads</h2>
    <p>Combine industry, service, location and lead type filters. Your existing search and marketplace data stay unchanged.</p>
    <div class="lv2-filter-grid">
      <div class="lv2-filter-field"><label>Industry</label><select data-filter="industry">${options(industries, state.industry, 'All industries')}</select></div>
      <div class="lv2-filter-field"><label>Service</label><select data-filter="service">${options(services, state.service, 'All services')}</select></div>
      <div class="lv2-filter-field"><label>Location</label><select data-filter="location">${options(locations, state.location, 'All locations')}</select></div>
      <div class="lv2-filter-field"><label>Lead type</label><select data-filter="type"><option value="all" ${state.type === 'all' ? 'selected' : ''}>All lead types</option><option value="basic" ${state.type === 'basic' ? 'selected' : ''}>Basic</option><option value="premium" ${state.type === 'premium' ? 'selected' : ''}>Premium</option></select></div>
    </div>
    <div class="lv2-filter-actions"><button class="lv2-filter-reset" type="button">Reset filters</button><button class="lv2-filter-apply" type="button">Apply filters</button></div>
  </div>`

  overlay.addEventListener('click', event => { if (event.target === overlay) closeModal() })
  overlay.querySelector('.lv2-filter-close').addEventListener('click', closeModal)
  overlay.querySelectorAll('[data-filter]').forEach(select => {
    select.addEventListener('change', event => { state[event.target.dataset.filter] = event.target.value })
  })
  overlay.querySelector('.lv2-filter-reset').addEventListener('click', () => {
    state.industry = ''; state.service = ''; state.location = ''; state.type = 'all'; closeModal(); applyFilters()
  })
  overlay.querySelector('.lv2-filter-apply').addEventListener('click', () => { closeModal(); applyFilters() })
  document.body.appendChild(overlay)
  state.open = true
}

function bindButton(button) {
  if (!button || button.dataset.filtersReady === 'true') return
  button.dataset.filtersReady = 'true'
  button.addEventListener('click', event => {
    event.preventDefault()
    event.stopImmediatePropagation()
    buildModal()
  }, true)
}

function scan() {
  bindButton(document.querySelector('.lv2-filter-button'))
  if (activeCount() || document.querySelector('.lv2-filter-empty')) applyFilters()
}

const observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
scan()
