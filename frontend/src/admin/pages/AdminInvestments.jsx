import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import AdminInvestmentsWallet from './AdminInvestmentsWallet'
import InvestmentCycleControls from './InvestmentCycleControls'
import InvestorActionModals from './InvestorActionModals'
import './InvestorActionModals.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function InvestorModalActions() {
  const [actionState, setActionState] = useState({ type: null, investor: null, availableForAds: 0, transferable: 0 })

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `.investor-table-row .more-btn,.investor-table-row .action-menu-wrap{display:none!important}.investor-table-head > span:last-child,.investor-table-row > .row-actions{position:sticky;right:0;z-index:5;background:#fff;box-shadow:-10px 0 16px rgba(20,67,120,.07)}.investor-table-head > span:last-child{background:#f4f8fc;z-index:6}.investor-table-row > .row-actions{padding-left:8px}.investor-history-modal .investor-history-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 26px;border-top:1px solid #e4ebf3;background:#fff;flex:0 0 auto;position:relative;z-index:10;box-sizing:border-box}.investor-history-modal .investor-history-actions button{height:42px;padding:0 18px;border:1px solid #d6e3ef;border-radius:9px;background:#fff;color:#17457f;font-size:11px;font-weight:900;cursor:pointer}.investor-history-modal .investor-history-actions .spend-action{border-color:#d5e5f5;background:#eef6ff;color:#126fca}.investor-history-modal .investor-history-actions button:disabled{opacity:.5;cursor:not-allowed}.investor-history-modal .investor-history-actions .action-status{margin-right:auto;color:#7890aa;font-size:9px}.investor-history-modal .investor-history-actions .action-status strong{color:#17457f}.investor-history-modal .investor-history-summary{grid-template-columns:repeat(6,minmax(0,1fr))!important;padding-top:13px;padding-bottom:13px;gap:8px}.investor-history-modal .history-summary-card{padding:11px 12px}.investor-history-modal .history-summary-card strong{font-size:17px;margin-top:5px}.investor-history-modal .history-summary-card small{font-size:7px}.investor-history-modal .investor-history-body{padding-bottom:66px}@media(max-width:1100px){.investor-history-modal .investor-history-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important}}@media(max-width:720px){.investor-history-modal .investor-history-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}.investor-history-modal .investor-history-actions{padding:10px 14px;flex-wrap:wrap}.investor-history-modal .investor-history-actions .action-status{width:100%;margin-right:0}}`
    document.head.appendChild(style)
    let observer
    let busy = false
    const getInvestor = async email => {
      const params = new URLSearchParams({ search: email || '', status: 'all', industryId: '' })
      const dashboard = await apiRequest(`/admin/commercial/investment-dashboard?${params}`)
      const investors = dashboard?.investors || []
      const investor = investors.find(item => String(item.email || item.user_email || '').toLowerCase() === String(email || '').toLowerCase()) || investors[0] || null
      if (!investor?.user_id) return null
      const funds = await apiRequest(`/investments/admin/investor/${investor.user_id}/funds`)
      return { ...investor, funds }
    }
    const injectActions = async modal => {
      if (!modal || modal.querySelector('.investor-history-actions') || busy) return
      const head = modal.querySelector('.investor-history-head p')
      const headEmail = head?.textContent?.split(' · ')[0]?.trim() || ''
      if (!headEmail) return
      busy = true
      try {
        const investor = await getInvestor(headEmail)
        if (!investor || modal.querySelector('.investor-history-actions')) return
        const funds = investor.funds || {}
        const currentCycleId = investor.latest_cycle_id || investor.cycles?.[0]?.cycle_id || null
        const autoInvest = Boolean(investor.cycles?.[0]?.reinvestment_enabled)
        const availableForAds = Math.max(0, Number(funds.available_for_ads ?? 0))
        const transferable = Math.max(0, Number(funds.transferable ?? funds.withdrawable_earnings ?? 0))
        const adSpent = Math.max(0, Number(funds.ad_spent ?? funds.total_ad_spent ?? 0))
        const generatedEarnings = Math.max(0, Number(funds.generated ?? 0))
        const totalInvestment = Math.max(0, Number(funds.total_invested ?? funds.contributed_capital ?? 0))
        const primaryAvailable = autoInvest ? availableForAds : transferable
        if (head) head.textContent = `${headEmail} · Cycle #${currentCycleId || '—'} · ${autoInvest ? 'Auto-Invest' : 'Non-Auto'} · Current cycle only`

        const summaryCards = modal.querySelectorAll('.history-summary-card')
        const currentBalance = summaryCards[0]?.querySelector('strong')
        const currentNote = summaryCards[0]?.querySelector('small')
        if (currentBalance) currentBalance.textContent = money(primaryAvailable)
        if (currentNote) currentNote.textContent = autoInvest ? 'Current-cycle funds available for advertising' : 'Current-cycle earnings available for transfer'

        const totalCard = summaryCards[1]
        if (totalCard) { const value = totalCard.querySelector('strong'); const note = totalCard.querySelector('small'); if (value) value.textContent = money(totalInvestment); if (note) note.textContent = 'Current-cycle investor capital; principal is never withdrawable' }

        const availableSummary = summaryCards[2]
        if (availableSummary) { const value = availableSummary.querySelector('strong'); const note = availableSummary.querySelector('small'); if (value) value.textContent = money(availableForAds); if (note) note.textContent = autoInvest ? 'Available for Auto-Invest ad spending' : 'Not available for Non-Auto principal spending' }

        const transferSummary = summaryCards[3]
        if (transferSummary) { const value = transferSummary.querySelector('strong'); const note = transferSummary.querySelector('small'); if (value) value.textContent = money(transferable); if (note) note.textContent = autoInvest ? 'Earnings eligible for transfer after ad-spend reservations' : 'Earnings currently available for transfer' }

        const revenueSummary = summaryCards[4]
        if (revenueSummary) { const value = revenueSummary.querySelector('strong'); const note = revenueSummary.querySelector('small'); if (value) value.textContent = money(generatedEarnings); if (note) note.textContent = 'Investor earnings from sold leads in the current cycle' }

        const amountCard = document.createElement('article')
        amountCard.className = 'history-summary-card blue'
        amountCard.setAttribute('data-ad-spent','true')
        amountCard.innerHTML = `<span>AD SPENT</span><strong>${money(adSpent)}</strong><small>Current-cycle advertising spend</small>`
        const summary = modal.querySelector('.investor-history-summary')
        if (summary && !summary.querySelector('[data-ad-spent]')) summary.insertBefore(amountCard, summaryCards[2] || null)

        const footer = document.createElement('div')
        footer.className = 'investor-history-actions'
        footer.innerHTML = `<span class="action-status">${autoInvest ? 'Available for Ads' : 'Ready to Transfer'} <strong>${money(primaryAvailable)}</strong> · Current cycle <strong>#${currentCycleId || '—'}</strong></span><button type="button" class="spend-action" ${availableForAds <= 0 ? 'disabled' : ''}>Spend on Ads</button>`
        modal.appendChild(footer)
        footer.querySelector('.spend-action').addEventListener('click', () => setActionState({ type: 'spend', investor, availableForAds, transferable }))
      } finally { busy = false }
    }
    const scan = () => {
      const modal = document.querySelector('.investor-history-modal')
      if (modal && !modal.querySelector('.investor-history-actions')) injectActions(modal)
    }
    observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()
    return () => { observer?.disconnect(); style.remove() }
  }, [])

  const closeActions = () => setActionState({ type: null, investor: null, availableForAds: 0, transferable: 0 })

  const handleSpend = async payload => {
    const investor = actionState.investor
    if (!investor?.user_id || Number(payload?.amount || 0) <= 0) return
    try {
      await apiRequest(`/investments/admin/investor/${investor.user_id}/managed-ad-spend`, { method: 'POST', body: JSON.stringify(payload) })
      closeActions()
      window.location.reload()
    } catch (error) { window.alert(error?.message || 'Unable to record ad spend.') }
  }

  return <><InvestmentCycleControls /><AdminInvestmentsWallet /><InvestorActionModals spendOpen={actionState.type === 'spend'} transferOpen={false} availableForAds={actionState.availableForAds} transferable={actionState.transferable} payoutAccount={null} onCloseSpend={closeActions} onCloseTransfer={closeActions} onSpend={handleSpend} onTransfer={undefined} /></>
}

export default function AdminInvestments() { return <InvestorModalActions /> }
