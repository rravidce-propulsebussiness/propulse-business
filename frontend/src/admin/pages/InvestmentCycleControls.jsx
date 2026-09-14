import { useEffect } from 'react'
import { apiRequest } from '../../utils/api'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const isOpen = cycle => ['ACTIVE', 'EXIT_REQUESTED', 'WAITING_FOR_LEADS'].includes(String(cycle.status || '').toUpperCase())

export default function InvestmentCycleControls() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `.investor-cycle-panel{margin:0 0 16px;padding:14px 16px;border:1px solid #dce7f1;border-radius:10px;background:#f8fbfe}.investor-cycle-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.investor-cycle-head strong{color:#123d7b;font-size:12px}.investor-cycle-head span{color:#7a8da5;font-size:8px}.investor-cycle-section{margin-top:10px}.investor-cycle-section-title{padding:4px 0 7px;color:#173f78;font-size:9px;font-weight:900}.investor-cycle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #e5edf5}.investor-cycle-info{min-width:0;flex:1}.investor-cycle-info strong{display:block;color:#173f78;font-size:10px}.investor-cycle-info small{display:block;color:#8497ae;font-size:8px;margin-top:3px}.investor-cycle-status{padding:5px 8px;border-radius:999px;background:#e8f7ef;color:#16804d;font-size:8px;font-weight:900;white-space:nowrap}.investor-cycle-status.closed{background:#edf1f5;color:#65778c}.investor-cycle-actions{display:flex;gap:7px}.investor-cycle-actions button,.investor-cycle-history-toggle{height:32px;padding:0 10px;border-radius:7px;font-size:9px;font-weight:900;cursor:pointer}.investor-cycle-actions .close-cycle{border:1px solid #1762aa;background:#fff;color:#1762aa}.investor-cycle-actions .finish-cycle{border:1px solid #d9e3ed;background:#fff;color:#526b85}.investor-cycle-history-toggle{border:1px solid #d9e3ed;background:#fff;color:#1762aa;white-space:nowrap}.investor-cycle-history{margin:0 0 10px;padding:10px 0 2px;border-top:1px dashed #dce7f1}.investor-cycle-history table{width:100%;border-collapse:collapse}.investor-cycle-history th,.investor-cycle-history td{padding:7px 6px;border-bottom:1px solid #e7eef5;text-align:left;font-size:8px;color:#617894}.investor-cycle-history th{color:#7890aa;font-weight:900;background:#f2f7fb}.investor-cycle-history td.amount.credit{color:#07985a;font-weight:900}.investor-cycle-history td.amount.debit{color:#df5030;font-weight:900}.investor-cycle-history .history-loading,.investor-cycle-history .history-empty{padding:12px 0;color:#8497ae;font-size:8px}.investor-cycle-history-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;color:#173f78;font-size:9px;font-weight:900}@media(max-width:720px){.investor-cycle-row{align-items:flex-start;flex-wrap:wrap}.investor-cycle-status,.investor-cycle-actions,.investor-cycle-history-toggle{align-self:flex-start}.investor-cycle-history{overflow-x:auto}.investor-cycle-history table{min-width:620px}}`
    document.head.appendChild(style)
    let stopped = false
    let busy = false

    const getInvestorId = async modal => {
      const email = modal.querySelector('.investor-history-head p')?.textContent?.split(' · ')[0]?.trim() || ''
      if (!email) return null
      const params = new URLSearchParams({ search: email, status: 'all', industryId: '' })
      const dashboard = await apiRequest(`/admin/commercial/investment-dashboard?${params}`)
      const investors = dashboard?.investors || []
      const investor = investors.find(item => String(item.email || item.user_email || '').toLowerCase() === email.toLowerCase()) || investors[0]
      return investor?.user_id || null
    }

    const loadCycleHistory = async (userId, cycleId, historyBox, button) => {
      if (historyBox.dataset.loaded === 'true') {
        historyBox.hidden = !historyBox.hidden
        button.textContent = historyBox.hidden ? 'View History' : 'Hide History'
        return
      }
      button.disabled = true
      historyBox.hidden = false
      historyBox.innerHTML = '<div class="history-loading">Loading cycle history…</div>'
      try {
        const result = await apiRequest(`/investments/admin/investor/${userId}/cycles/${cycleId}/history`)
        const rows = Array.isArray(result?.investments) ? result.investments : []
        const events = []
        const children = new Map(rows.filter(row => row.parent_investment_id != null).map(row => [Number(row.parent_investment_id), row]))
        for (const row of rows) {
          const ref = String(row.payout_transfer_reference || '').trim().toUpperCase()
          const funding = Number(row.amount || 0)
          const spend = Number(row.ad_spent || 0)
          const revenue = Number(row.allocated_revenue || 0)
          if (!row.parent_investment_id && funding > 0) events.push({ date: row.created_at, title: 'Investment added', amount: funding, type: 'credit', description: 'Investor contributed capital', reference: `#INV-${row.id}` })
          if (spend > 0) events.push({ date: row.updated_at || row.created_at, title: 'Ads spent', amount: -spend, type: 'debit', description: 'Actual advertising spend', reference: `#ADS-${row.id}` })
          if (revenue > 0) events.push({ date: row.updated_at || row.created_at, title: 'Lead sold', amount: revenue, type: 'credit', description: `${Number(row.allocated_sales || 0)} lead sale(s)`, reference: `#SALE-${row.id}` })
          const child = children.get(Number(row.id))
          if (ref.startsWith('REINVESTMENT-') && child) events.push({ date: child.created_at || row.updated_at || row.created_at, title: 'Reinvested', amount: -Number(child.amount || 0), type: 'debit', description: 'Earnings moved back into advertising', reference: `#REINV-${child.id}` })
          else if (Number(row.paid_to_investor || 0) > 0) events.push({ date: row.updated_at || row.created_at, title: 'Transferred to investor', amount: -Number(row.paid_to_investor || 0), type: 'debit', description: 'Earnings transferred to investor account', reference: `#TRF-${row.id}` })
        }
        events.sort((a, b) => new Date(a.date) - new Date(b.date))
        historyBox.innerHTML = `<div class="investor-cycle-history-title"><span>Cycle #${cycleId} transaction history</span><span>${events.length} transaction${events.length === 1 ? '' : 's'}</span></div>${events.length ? `<table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Description</th><th>Reference</th></tr></thead><tbody>${events.map(event => `<tr><td>${dateTime(event.date)}</td><td>${event.title}</td><td class="amount ${event.type}">${event.amount >= 0 ? '+' : ''}${money(event.amount)}</td><td>${event.description}</td><td>${event.reference}</td></tr>`).join('')}</tbody></table>` : '<div class="history-empty">No transactions recorded in this cycle.</div>'}`
        historyBox.dataset.loaded = 'true'
        button.textContent = 'Hide History'
      } catch (error) {
        historyBox.innerHTML = `<div class="history-empty" style="color:#b9432c">Unable to load cycle history.</div>`
        button.textContent = 'View History'
      } finally {
        button.disabled = false
      }
    }

    const renderPanel = async (modal, force = false) => {
      if (stopped || !modal || !modal.isConnected || (!force && modal.querySelector('.investor-cycle-panel')) || (!force && busy)) return
      busy = true
      try {
        modal.querySelector('.investor-cycle-panel')?.remove()
        const userId = await getInvestorId(modal)
        if (!userId || stopped || !modal.isConnected) return
        const result = await apiRequest('/investments/admin/cycles')
        const all = Array.isArray(result) ? result : (Array.isArray(result?.cycles) ? result.cycles : [])
        const mine = all.filter(cycle => Number(cycle.user_id) === Number(userId))
        const active = mine.filter(isOpen).sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0]
        const previous = mine.filter(cycle => !isOpen(cycle)).sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        const renderCycle = cycle => {
          const closed = !isOpen(cycle)
          return `<div class="investor-cycle-row"><div class="investor-cycle-info"><strong>Cycle #${cycle.id} · ${cycle.auto_invest ? 'Auto-Invest' : 'Non-Auto'}</strong><small>${money(cycle.principal)} principal · ${Number(cycle.total_leads || 0)} leads · ${Number(cycle.final_leads || 0)} final · ${Number(cycle.pending_leads || 0)} pending</small></div><span class="investor-cycle-status ${closed ? 'closed' : ''}">${cycle.status || '—'}</span><button class="investor-cycle-history-toggle" data-cycle-id="${cycle.id}">View History</button>${closed ? '' : `<div class="investor-cycle-actions"><button class="close-cycle" data-cycle-id="${cycle.id}">Close Cycle</button><button class="finish-cycle" data-cycle-id="${cycle.id}">Finish</button></div>`}</div><div class="investor-cycle-history" data-history-cycle-id="${cycle.id}" hidden></div>`
        }
        const panel = document.createElement('div')
        panel.className = 'investor-cycle-panel'
        panel.innerHTML = `<div class="investor-cycle-head"><strong>Investment Cycle History</strong><span>Current cycle is shown separately from closed history</span></div>${active ? `<div class="investor-cycle-section"><div class="investor-cycle-section-title">Current Active Cycle</div>${renderCycle(active)}</div>` : '<div class="investor-cycle-section"><div class="investor-cycle-section-title">Current Active Cycle</div><div style="padding:8px 0;color:#8497ae;font-size:9px">No active investment cycle.</div></div>'}${previous.length ? `<div class="investor-cycle-section"><div class="investor-cycle-section-title">Previous Cycle History</div>${previous.map(renderCycle).join('')}</div>` : ''}`
        const body = modal.querySelector('.investor-history-body')
        if (body) body.insertBefore(panel, body.querySelector('.history-caption') || body.firstChild)
        else modal.appendChild(panel)

        panel.querySelectorAll('.investor-cycle-history-toggle').forEach(button => button.addEventListener('click', () => { const box = panel.querySelector(`[data-history-cycle-id="${button.dataset.cycleId}"]`); if (box) loadCycleHistory(userId, button.dataset.cycleId, box, button) }))
        panel.querySelectorAll('.close-cycle').forEach(button => button.addEventListener('click', async () => {
          if (!window.confirm(`Close cycle #${button.dataset.cycleId}? Unresolved leads will remain unchanged.`)) return
          button.disabled = true
          try { await apiRequest(`/investments/admin/cycles/${button.dataset.cycleId}/close`, { method: 'POST' }); panel.remove(); busy = false; await renderPanel(modal, true) }
          catch (error) { window.alert(error?.message || 'Unable to close the investment cycle.'); button.disabled = false }
        }))
        panel.querySelectorAll('.finish-cycle').forEach(button => button.addEventListener('click', async () => {
          const reason = window.prompt('Reason for administrative finish:')
          if (!reason?.trim()) return
          button.disabled = true
          try { await apiRequest(`/investments/admin/cycles/${button.dataset.cycleId}/finish`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }); panel.remove(); busy = false; await renderPanel(modal, true) }
          catch (error) { window.alert(error?.message || 'Unable to finish the investment cycle.'); button.disabled = false }
        }))
      } catch (error) {
        if (!stopped && modal.isConnected) { modal.querySelector('.investor-cycle-panel')?.remove(); const panel = document.createElement('div'); panel.className = 'investor-cycle-panel'; panel.innerHTML = `<strong style="color:#b9432c;font-size:9px">Unable to load investment cycle.</strong>`; modal.querySelector('.investor-history-body')?.prepend(panel) }
      } finally { busy = false }
    }

    const scan = () => { const modal = document.querySelector('.investor-history-modal'); if (modal && !modal.querySelector('.investor-cycle-panel')) renderPanel(modal) }
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()
    return () => { stopped = true; observer.disconnect(); style.remove() }
  }, [])

  return null
}
