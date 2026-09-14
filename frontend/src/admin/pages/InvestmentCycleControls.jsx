import { useEffect } from 'react'
import { apiRequest } from '../../utils/api'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function InvestmentCycleControls() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `.investor-cycle-panel{margin:0 0 16px;padding:14px 16px;border:1px solid #dce7f1;border-radius:10px;background:#f8fbfe}.investor-cycle-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.investor-cycle-head strong{color:#123d7b;font-size:12px}.investor-cycle-head span{color:#7a8da5;font-size:8px}.investor-cycle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #e5edf5}.investor-cycle-info{min-width:0;flex:1}.investor-cycle-info strong{display:block;color:#173f78;font-size:10px}.investor-cycle-info small{display:block;color:#8497ae;font-size:8px;margin-top:3px}.investor-cycle-status{padding:5px 8px;border-radius:999px;background:#e8f7ef;color:#16804d;font-size:8px;font-weight:900;white-space:nowrap}.investor-cycle-status.closed{background:#edf1f5;color:#65778c}.investor-cycle-actions{display:flex;gap:7px}.investor-cycle-actions button{height:32px;padding:0 10px;border-radius:7px;font-size:9px;font-weight:900;cursor:pointer}.investor-cycle-actions .close-cycle{border:1px solid #1762aa;background:#fff;color:#1762aa}.investor-cycle-actions .finish-cycle{border:1px solid #d9e3ed;background:#fff;color:#526b85}@media(max-width:720px){.investor-cycle-row{align-items:flex-start;flex-direction:column}.investor-cycle-status,.investor-cycle-actions{align-self:flex-start}}`
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

    const renderPanel = async (modal, force = false) => {
      if (stopped || !modal || !modal.isConnected || (!force && modal.querySelector('.investor-cycle-panel')) || (!force && busy)) return
      busy = true
      try {
        modal.querySelector('.investor-cycle-panel')?.remove()
        const userId = await getInvestorId(modal)
        if (!userId || stopped || !modal.isConnected) return

        const result = await apiRequest('/investments/admin/cycles')
        const all = Array.isArray(result) ? result : (Array.isArray(result?.cycles) ? result.cycles : [])
        const cycles = all
          .filter(cycle => Number(cycle.user_id) === Number(userId))
          .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))

        const panel = document.createElement('div')
        panel.className = 'investor-cycle-panel'
        panel.innerHTML = `<div class="investor-cycle-head"><strong>Investment Cycle</strong><span>Managed from this investor account</span></div>${cycles.length ? cycles.map(cycle => { const closed = String(cycle.status || '').toUpperCase() === 'CLOSED'; return `<div class="investor-cycle-row"><div class="investor-cycle-info"><strong>Cycle #${cycle.id} · ${cycle.auto_invest ? 'Auto-Invest' : 'Non-Auto'}</strong><small>${money(cycle.principal)} principal · ${Number(cycle.total_leads || 0)} leads · ${Number(cycle.final_leads || 0)} final · ${Number(cycle.pending_leads || 0)} pending</small></div><span class="investor-cycle-status ${closed ? 'closed' : ''}">${cycle.status || '—'}</span>${closed ? '' : `<div class="investor-cycle-actions"><button class="close-cycle" data-cycle-id="${cycle.id}">Close Cycle</button><button class="finish-cycle" data-cycle-id="${cycle.id}">Finish</button></div>`}</div>` }).join('') : '<div style="padding:8px 0;color:#8497ae;font-size:9px">No investment cycle found.</div>'}`

        const body = modal.querySelector('.investor-history-body')
        if (body) body.insertBefore(panel, body.querySelector('.history-caption') || body.firstChild)
        else modal.appendChild(panel)

        panel.querySelectorAll('.close-cycle').forEach(button => button.addEventListener('click', async () => {
          if (!window.confirm(`Close cycle #${button.dataset.cycleId}? Unresolved leads will remain unchanged.`)) return
          button.disabled = true
          try {
            await apiRequest(`/investments/admin/cycles/${button.dataset.cycleId}/close`, { method: 'POST' })
            panel.remove()
            busy = false
            await renderPanel(modal, true)
          } catch (error) {
            window.alert(error?.message || 'Unable to close the investment cycle.')
            button.disabled = false
          }
        }))

        panel.querySelectorAll('.finish-cycle').forEach(button => button.addEventListener('click', async () => {
          const reason = window.prompt('Reason for administrative finish:')
          if (!reason?.trim()) return
          button.disabled = true
          try {
            await apiRequest(`/investments/admin/cycles/${button.dataset.cycleId}/finish`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) })
            panel.remove()
            busy = false
            await renderPanel(modal, true)
          } catch (error) {
            window.alert(error?.message || 'Unable to finish the investment cycle.')
            button.disabled = false
          }
        }))
      } catch (error) {
        if (!stopped && modal.isConnected) {
          modal.querySelector('.investor-cycle-panel')?.remove()
          const panel = document.createElement('div')
          panel.className = 'investor-cycle-panel'
          panel.innerHTML = `<strong style="color:#b9432c;font-size:9px">Unable to load investment cycle.</strong>`
          modal.querySelector('.investor-history-body')?.prepend(panel)
        }
      } finally {
        busy = false
      }
    }

    const scan = () => {
      const modal = document.querySelector('.investor-history-modal')
      if (modal && !modal.querySelector('.investor-cycle-panel')) renderPanel(modal)
    }

    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()

    return () => {
      stopped = true
      observer.disconnect()
      style.remove()
    }
  }, [])

  return null
}
