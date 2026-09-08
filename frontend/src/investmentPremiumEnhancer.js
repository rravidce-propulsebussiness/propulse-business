import { authRequest } from './utils/auth'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
let observer
let refreshTimer

async function loadMetrics() {
  const page = document.querySelector('.investment-page')
  if (!page) return
  try {
    const [investments, soldLeads, availableLeads] = await Promise.all([
      authRequest('/investments'),
      authRequest('/investments/sold-leads'),
      authRequest('/leads?status=available&page=1&limit=100'),
    ])
    const mine = Array.isArray(investments) ? investments : []
    const sold = Array.isArray(soldLeads) ? soldLeads : []
    const available = Array.isArray(availableLeads) ? availableLeads : Array.isArray(availableLeads?.items) ? availableLeads.items : []
    const generated = mine.reduce((sum, item) => sum + Number(item.realized_revenue || 0), 0)
    const paid = mine.reduce((sum, item) => sum + Number(item.payout_amount || 0), 0)
    const availableBalance = Math.max(0, generated - paid)
    let bar = document.querySelector('.investment-premium-metrics')
    if (!bar) {
      bar = document.createElement('section')
      bar.className = 'investment-premium-metrics'
      const summary = document.querySelector('.investment-summary')
      if (summary) summary.replaceWith(bar)
    }
    bar.innerHTML = `
      <article><span>AMOUNT GENERATED</span><strong>${money(generated)}</strong><small>From eligible lead sales</small></article>
      <article><span>LEADS SOLD</span><strong>${sold.length}</strong><small>From your investment</small></article>
      <article><span>AVAILABLE LEADS</span><strong>${available.length}</strong><small>Currently available to sell</small></article>
      <article class="premium-balance"><span>AVAILABLE BALANCE</span><strong>${money(availableBalance)}</strong><small>Ready for owner transfer</small></article>
    `
  } catch {}
}

function addReinvestOption(form) {
  if (!form || form.dataset.reinvestReady === 'true') return
  const buttons = form.querySelector('.investment-action-buttons')
  if (!buttons) return
  form.dataset.reinvestReady = 'true'
  const wrap = document.createElement('label')
  wrap.className = 'investment-reinvest-choice'
  wrap.innerHTML = '<input type="checkbox" id="investment-reinvest-toggle"><span><b>Reinvest returns automatically</b><small>When your cycle earns a return, use the realized amount to start the next investment cycle instead of transferring it to your owner account.</small></span>'
  buttons.before(wrap)
}

function patchCheckoutRequest() {
  if (window.__propulseInvestmentCheckoutPatched) return
  window.__propulseInvestmentCheckoutPatched = true
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input?.url || '')
      if (/\/api\/investments\/checkout(?:\?|$)/.test(url) && init?.body) {
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : null
        const toggle = document.querySelector('#investment-reinvest-toggle')
        if (body && toggle) init = { ...init, body: JSON.stringify({ ...body, reinvestmentEnabled: Boolean(toggle.checked) }) }
      }
    } catch {}
    return originalFetch(input, init)
  }
}

function refineExistingContent() {
  const page = document.querySelector('.investment-page')
  if (!page) return
  document.querySelectorAll('.sold-leads-card,.investment-history').forEach(node => node.classList.add('investment-hidden-section'))
  const flow = document.querySelector('.investment-hero-flow')
  if (flow) {
    const spans = flow.querySelectorAll('span')
    if (spans[3]) spans[3].textContent = 'Direct owner transfer'
  }
  addReinvestOption(document.querySelector('.investment-form-card'))
  patchCheckoutRequest()
  loadMetrics()
}

function scan() {
  refineExistingContent()
}

observer = new MutationObserver(scan)
observer.observe(document.body, { childList: true, subtree: true })
refreshTimer = window.setInterval(loadMetrics, 30000)
scan()

const style = document.createElement('style')
style.textContent = `
.investment-hidden-section{display:none!important}
.investment-premium-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.investment-premium-metrics article{position:relative;min-width:0;padding:20px 20px 18px;border:1px solid #e3e8f0;border-radius:18px;background:linear-gradient(180deg,#fff,#fbfcfe);box-shadow:0 12px 32px rgba(10,31,65,.055);overflow:hidden}.investment-premium-metrics article:before{content:'';position:absolute;left:0;top:0;width:4px;height:100%;background:linear-gradient(180deg,#dba928,#f7c95b)}.investment-premium-metrics span{display:block;color:#7c8da5;font-size:8px;font-weight:950;letter-spacing:.13em}.investment-premium-metrics strong{display:block;margin-top:9px;color:#102f5f;font-size:25px;letter-spacing:-.03em}.investment-premium-metrics small{display:block;margin-top:6px;color:#8a98aa;font-size:8px;line-height:1.4}.investment-premium-metrics .premium-balance{background:linear-gradient(145deg,#082b61,#123f79);border-color:#123f79}.investment-premium-metrics .premium-balance span,.investment-premium-metrics .premium-balance strong{color:#fff}.investment-premium-metrics .premium-balance small{color:#b8cbe3}.investment-reinvest-choice{display:flex!important;align-items:flex-start;gap:12px;margin:15px 0 4px!important;padding:14px 15px;border:1px solid #dce5ef;border-radius:13px;background:#f8fbff;cursor:pointer}.investment-reinvest-choice input{appearance:none;width:20px!important;height:20px!important;flex:0 0 20px;margin:0!important;border:1px solid #aebed2!important;border-radius:5px!important;background:#fff!important;position:relative;cursor:pointer;box-shadow:none!important}.investment-reinvest-choice input:checked{background:#eab63d!important;border-color:#d79e19!important}.investment-reinvest-choice input:checked:after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;color:#142f58;font-size:13px;font-weight:950}.investment-reinvest-choice span{display:block;margin:0!important}.investment-reinvest-choice b{display:block;color:#173b70;font-size:10px;font-weight:950}.investment-reinvest-choice small{display:block;margin-top:4px;color:#71849e;font-size:8px;line-height:1.5;font-weight:600}.investment-hero h1{color:#fff!important}.investment-hero h1 strong{color:#f6c64d}.investment-kicker{color:#f5c34d!important}.investment-submit{background:linear-gradient(135deg,#e9ad31,#f7cf68)!important;color:#102b53!important;box-shadow:0 10px 24px rgba(213,160,39,.2)!important}.investment-submit-direct{background:linear-gradient(135deg,#102f62,#174b86)!important;color:#fff!important}.investment-card,.investment-premium-metrics article{backdrop-filter:blur(8px)}
@media(max-width:900px){.investment-premium-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.investment-premium-metrics{grid-template-columns:1fr}.investment-premium-metrics strong{font-size:22px}}
`
document.head.appendChild(style)
