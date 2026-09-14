import { useEffect } from 'react'
import { apiRequest } from '../../utils/api'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function InvestmentCycleControls() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `.investor-cycle-panel{margin:0 0 16px;padding:14px 16px;border:1px solid #dce7f1;border-radius:10px;background:#f8fbfe}.investor-cycle-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.investor-cycle-head strong{color:#123d7b;font-size:12px}.investor-cycle-head span{color:#7a8da5;font-size:8px}.investor-cycle-row{padding:12px 0;border-top:1px solid #e5edf5}.investor-cycle-main{display:flex;align-items:center;justify-content:space-between;gap:12px}.investor-cycle-info{min-width:0;flex:1}.investor-cycle-info strong{display:block;color:#173f78;font-size:10px}.investor-cycle-info small{display:block;color:#8497ae;font-size:8px;margin-top:3px}.investor-cycle-status{padding:5px 8px;border-radius:999px;background:#e8f7ef;color:#16804d;font-size:8px;font-weight:900;white-space:nowrap}.investor-cycle-status.closed{background:#edf1f5;color:#65778c}.investor-cycle-actions{display:flex;gap:7px;align-items:center}.investor-cycle-actions button,.investor-cycle-history-toggle{height:32px;padding:0 10px;border-radius:7px;font-size:9px;font-weight:900;cursor:pointer}.investor-cycle-actions .close-cycle{border:1px solid #1762aa;background:#fff;color:#1762aa}.investor-cycle-actions .finish-cycle{border:1px solid #d9e3ed;background:#fff;color:#526b85}.investor-cycle-history-toggle{border:1px solid #d9e3ed;background:#fff;color:#1762aa;white-space:nowrap}.cycle-statement{margin-top:10px;padding:12px;border:1px solid #e2eaf2;border-radius:9px;background:#fff}.cycle-statement-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;color:#173f78;font-size:10px;font-weight:900}.cycle-statement-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.cycle-stat{padding:9px;border:1px solid #e6edf4;border-radius:7px;background:#fbfdff}.cycle-stat span{display:block;color:#8195ab;font-size:7px;font-weight:800;text-transform:uppercase}.cycle-stat strong{display:block;margin-top:4px;color:#173f78;font-size:11px}.cycle-stat.green strong{color:#07985a}.cycle-stat.blue strong{color:#176fcb}.cycle-stat.orange strong{color:#df5030}.cycle-section{margin-top:10px}.cycle-section-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;color:#173f78;font-size:8px;font-weight:900}.cycle-section-title span{color:#8497ae;font-weight:700}.cycle-timeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.cycle-timeline div{padding:7px;border-radius:6px;background:#f3f7fb;color:#637a93;font-size:7px}.cycle-timeline strong{display:block;color:#173f78;font-size:8px;margin-bottom:3px}.cycle-closure{margin-top:9px;padding:8px;border-left:3px solid #1762aa;background:#f4f8fc;color:#637a93;font-size:8px}.cycle-closure strong{color:#173f78}.cycle-history-events{margin-top:9px;overflow:auto}.cycle-history-events table{width:100%;border-collapse:collapse;min-width:620px}.cycle-history-events th,.cycle-history-events td{padding:6px;border-bottom:1px solid #e7eef5;text-align:left;font-size:7px;color:#617894}.cycle-history-events th{color:#7890aa;font-weight:900;background:#f2f7fb}.cycle-history-events td.credit{color:#07985a;font-weight:900}.cycle-history-events td.debit{color:#df5030;font-weight:900}.cycle-loading,.cycle-error{padding:10px;color:#8497ae;font-size:8px}.cycle-error{color:#b9432c}@media(max-width:720px){.investor-cycle-main{align-items:flex-start;flex-wrap:wrap}.cycle-statement-grid,.cycle-timeline{grid-template-columns:repeat(2,minmax(0,1fr))}.investor-cycle-actions{width:100%}.cycle-history-events{overflow-x:auto}}`
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

    const loadStatement = async (panel, userId, cycleId, box, button) => {
      if (box.dataset.loaded === 'true') { box.hidden = !box.hidden; button.textContent = box.hidden ? 'View Full History' : 'Hide History'; return }
      button.disabled = true
      box.hidden = false
      box.innerHTML = '<div class="cycle-loading">Loading complete cycle statement…</div>'
      try {
        const statement = await apiRequest(`/investments/admin/investor/${userId}/cycles/${cycleId}/statement`)
        const c = statement.cycle || {}
        const inv = statement.investment || {}
        const ads = statement.ads || {}
        const leads = statement.leads || {}
        const revenue = statement.revenue || {}
        const payouts = statement.payouts || {}
        box.innerHTML = `<div class="cycle-statement"><div class="cycle-statement-title"><span>Cycle #${cycleId} Complete Statement</span><span>${String(c.status || '').toUpperCase()}</span></div><div class="cycle-statement-grid"><div class="cycle-stat"><span>Total Invested</span><strong>${money(inv.principal)}</strong></div><div class="cycle-stat blue"><span>Ad Spend</span><strong>${money(ads.spent)}</strong></div><div class="cycle-stat"><span>Linked Leads</span><strong>${Number(leads.linked || 0)}</strong></div><div class="cycle-stat green"><span>Leads Sold</span><strong>${Number(leads.sold || 0)}</strong></div><div class="cycle-stat"><span>Expired Leads</span><strong>${Number(leads.expired || 0)}</strong></div><div class="cycle-stat"><span>Closed Leads</span><strong>${Number(leads.closed || 0)}</strong></div><div class="cycle-stat"><span>Admin Closed</span><strong>${Number(leads.admin_closed || 0)}</strong></div><div class="cycle-stat green"><span>Revenue Generated</span><strong>${money(revenue.generated)}</strong></div><div class="cycle-stat"><span>Sales</span><strong>${Number(revenue.sales || 0)}</strong></div><div class="cycle-stat orange"><span>Paid to Investor</span><strong>${money(payouts.paid)}</strong></div><div class="cycle-stat"><span>Pending Withdrawals</span><strong>${money(payouts.pending)}</strong></div><div class="cycle-stat"><span>Rejected Withdrawals</span><strong>${money(payouts.rejected)}</strong></div></div><div class="cycle-section"><div class="cycle-section-title"><strong>Cycle Timeline</strong><span>${c.auto_invest ? 'Auto-Invest' : 'Non-Auto'}</span></div><div class="cycle-timeline"><div><strong>Started</strong>${dateTime(c.started_at)}</div><div><strong>Maturity</strong>${dateTime(c.maturity_at)}</div><div><strong>Exit Requested</strong>${dateTime(c.exit_requested_at)}</div><div><strong>Closed</strong>${dateTime(c.closed_at)}</div></div></div>${c.admin_closed_reason || c.exit_reason ? `<div class="cycle-closure"><strong>Closure reason:</strong> ${c.admin_closed_reason || c.exit_reason}</div>` : ''}<div class="cycle-section"><div class="cycle-section-title"><strong>Financial activity</strong><span>${Number(ads.transactions || 0)} ad-spend transaction(s) · ${Number(inv.count || 0)} investment row(s) · ${Number(payouts.requests || 0)} withdrawal request(s)</span></div><div class="cycle-history-events"><div class="cycle-loading">Use the cycle transaction history below for individual investment/spend/revenue events.</div></div></div></div>`
        box.dataset.loaded = 'true'
        button.textContent = 'Hide History'
      } catch (error) {
        box.innerHTML = '<div class="cycle-error">Unable to load cycle statement.</div>'
        button.textContent = 'View Full History'
      } finally { button.disabled = false }
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
        const cycles = all.filter(cycle => Number(cycle.user_id) === Number(userId)).sort((a, b) => { const aOpen = ['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS'].includes(String(a.status || '').toUpperCase()); const bOpen = ['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS'].includes(String(b.status || '').toUpperCase()); return Number(bOpen) - Number(aOpen) || Number(b.id || 0) - Number(a.id || 0) })
        const current = cycles.find(cycle => ['ACTIVE','EXIT_REQUESTED','WAITING_FOR_LEADS'].includes(String(cycle.status || '').toUpperCase())) || null
        const previous = cycles.filter(cycle => !current || Number(cycle.id) !== Number(current.id))
        const renderCycle = (cycle, isCurrent) => { const closed = String(cycle.status || '').toUpperCase() === 'CLOSED'; return `<div class="investor-cycle-row"><div class="investor-cycle-main"><div class="investor-cycle-info"><strong>${isCurrent ? 'Current Active Cycle' : `Cycle #${cycle.id}`} · ${cycle.auto_invest ? 'Auto-Invest' : 'Non-Auto'}</strong><small>${money(cycle.principal)} invested · ${Number(cycle.total_leads || 0)} linked leads · ${Number(cycle.final_leads || 0)} final · ${Number(cycle.pending_leads || 0)} pending</small></div><span class="investor-cycle-status ${closed ? 'closed' : ''}">${cycle.status || '—'}</span><div class="investor-cycle-actions"><button class="investor-cycle-history-toggle" data-cycle-id="${cycle.id}">${isCurrent ? 'View Full History' : 'View Full History'}</button>${closed ? '' : `<button class="close-cycle" data-cycle-id="${cycle.id}">Close Cycle</button><button class="finish-cycle" data-cycle-id="${cycle.id}">Finish</button>`}</div></div><div class="investor-cycle-history" data-history-cycle-id="${cycle.id}" hidden></div></div>` }
        const panel = document.createElement('div')
        panel.className = 'investor-cycle-panel'
        panel.innerHTML = `<div class="investor-cycle-head"><strong>Investment Cycles</strong><span>Current cycle is separate from all historical cycles</span></div>${current ? renderCycle(current, true) : '<div style="padding:8px 0;color:#8497ae;font-size:9px">No active cycle. Historical cycles are shown below.</div>'}${previous.length ? `<div style="margin-top:10px;padding-top:9px;border-top:1px solid #dce7f1;color:#173f78;font-size:9px;font-weight:900">Previous Cycle History</div>${previous.map(cycle => renderCycle(cycle, false)).join('')}` : ''}`
        const body = modal.querySelector('.investor-history-body')
        if (body) body.insertBefore(panel, body.querySelector('.history-caption') || body.firstChild)
        else modal.appendChild(panel)
        panel.querySelectorAll('.investor-cycle-history-toggle').forEach(button => button.addEventListener('click', () => { const box = panel.querySelector(`[data-history-cycle-id="${button.dataset.cycleId}"]`); if (box) loadStatement(panel, userId, button.dataset.cycleId, box, button) }))
        panel.querySelectorAll('.close-cycle').forEach(button => button.addEventListener('click', async () => { if (!window.confirm(`Close cycle #${button.dataset.cycleId}? Unresolved leads will remain unchanged.`)) return; button.disabled = true; try { await apiRequest(`/investments/admin/cycles/${button.dataset.cycleId}/close`, { method: 'POST' }); panel.remove(); busy = false; await renderPanel(modal, true) } catch (error) { window.alert(error?.message || 'Unable to close the investment cycle.'); button.disabled = false } }))
        panel.querySelectorAll('.finish-cycle').forEach(button => button.addEventListener('click', async () => { const reason = window.prompt('Reason for administrative finish:'); if (!reason?.trim()) return; button.disabled = true; try { await apiRequest(`/investments/admin/cycles/${button.dataset.cycleId}/finish`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }); panel.remove(); busy = false; await renderPanel(modal, true) } catch (error) { window.alert(error?.message || 'Unable to finish the investment cycle.'); button.disabled = false } }))
      } catch (error) { if (!stopped && modal.isConnected) { modal.querySelector('.investor-cycle-panel')?.remove(); const panel = document.createElement('div'); panel.className = 'investor-cycle-panel'; panel.innerHTML = '<strong style="color:#b9432c;font-size:9px">Unable to load investment cycle.</strong>'; modal.querySelector('.investor-history-body')?.prepend(panel) } } finally { busy = false }
    }

    const scan = () => { const modal = document.querySelector('.investor-history-modal'); if (modal && !modal.querySelector('.investor-cycle-panel')) renderPanel(modal) }
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()
    return () => { stopped = true; observer.disconnect(); style.remove() }
  }, [])

  return null
}
