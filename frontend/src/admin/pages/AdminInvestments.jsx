import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import AdminInvestmentsWallet from './AdminInvestmentsWallet'
import InvestorActionModals from './InvestorActionModals'
import './InvestorActionModals.css'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function InvestorModalActions() {
  const [actionState, setActionState] = useState({ type: null, investor: null, availableForAds: 0, transferable: 0, payoutAccount: null })

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .investor-table-row .more-btn,.investor-table-row .action-menu-wrap{display:none!important}
      .investor-table-head > span:last-child,.investor-table-row > .row-actions{position:sticky;right:0;z-index:5;background:#fff;box-shadow:-10px 0 16px rgba(20,67,120,.07)}
      .investor-table-head > span:last-child{background:#f4f8fc;z-index:6}
      .investor-table-row > .row-actions{padding-left:8px}
      .investor-history-modal .investor-history-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 26px;border-top:1px solid #e4ebf3;background:#fff;flex:0 0 auto;position:relative;z-index:10;box-sizing:border-box}
      .investor-history-modal .investor-history-actions button{height:42px;padding:0 18px;border:1px solid #d6e3ef;border-radius:9px;background:#fff;color:#17457f;font-size:11px;font-weight:900;cursor:pointer}
      .investor-history-modal .investor-history-actions button:hover{background:#f4f8fd}
      .investor-history-modal .investor-history-actions .spend-action{border-color:#d5e5f5;background:#eef6ff;color:#126fca}
      .investor-history-modal .investor-history-actions .transfer-action{border:0;background:#104789;color:#fff;box-shadow:0 4px 10px rgba(16,71,137,.14)}
      .investor-history-modal .investor-history-actions button:disabled{opacity:.5;cursor:not-allowed}
      .investor-history-modal .investor-history-actions .action-status{margin-right:auto;color:#7890aa;font-size:9px}
      .investor-history-modal .investor-history-actions .action-status strong{color:#17457f}
      .investor-history-modal .investor-history-summary{grid-template-columns:repeat(6,minmax(0,1fr))!important;padding-top:13px;padding-bottom:13px;gap:8px}
      .investor-history-modal .history-summary-card{padding:11px 12px}
      .investor-history-modal .history-summary-card strong{font-size:17px;margin-top:5px}
      .investor-history-modal .history-summary-card small{font-size:7px}
      .investor-history-modal .investor-history-body{padding-bottom:66px}
      @media(max-width:1100px){.investor-history-modal .investor-history-summary{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(max-width:720px){.investor-history-modal .investor-history-summary{grid-template-columns:repeat(2,minmax(0,1fr))!important}.investor-history-modal .investor-history-actions{padding:10px 14px;flex-wrap:wrap}.investor-history-modal .investor-history-actions .action-status{width:100%;margin-right:0}}
    `
    document.head.appendChild(style)

    let observer
    let busy = false

    const getInvestor = async email => {
      const params = new URLSearchParams({ search: email || '', status: 'all', industryId: '' })
      const dashboard = await apiRequest(`/admin/commercial/investment-dashboard?${params}`)
      const investors = dashboard?.investors || []
      return investors.find(item => String(item.email || item.user_email || '').toLowerCase() === String(email || '').toLowerCase()) || investors[0] || null
    }

    const parseMoney = value => {
      const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''))
      return Number.isFinite(parsed) ? parsed : 0
    }

    const loadPayoutAccount = async userId => {
      try { return await apiRequest(`/investments/admin/investor/${userId}/payout-account`) } catch { return null }
    }

    const injectActions = async modal => {
      if (!modal || modal.querySelector('.investor-history-actions') || busy) return
      const headEmail = modal.querySelector('.investor-history-head p')?.textContent?.split(' · ')[0]?.trim() || ''
      if (!headEmail) return
      busy = true
      try {
        const investor = await getInvestor(headEmail)
        if (!investor || modal.querySelector('.investor-history-actions')) return

        const records = Array.isArray(investor.cycles) ? investor.cycles.filter(x => x.status !== 'cancelled') : []
        const totalFunding = records.reduce((sum, x) => sum + Number(x.amount || 0), 0)
        const adSpent = records.reduce((sum, x) => sum + Number(x.ad_spent || 0), 0)
        const autoInvestEarnings = records.reduce((sum, x) => {
          const ref = String(x.payout_transfer_reference || '').trim().toUpperCase()
          const alreadyReinvested = ref.startsWith('REINVESTMENT-')
          return sum + (Boolean(x.reinvestment_enabled) && !alreadyReinvested && x.status !== 'paid' ? Number(x.allocated_revenue || 0) : 0)
        }, 0)
        const reinvestmentEnabled = records.some(x => Boolean(x.reinvestment_enabled))
        const allocatedAdBalance = Math.max(0, totalFunding - adSpent) + autoInvestEarnings
        const summaryCards = modal.querySelectorAll('.history-summary-card')
        const currentBalanceCard = summaryCards[0]
        const currentBalance = parseMoney(currentBalanceCard?.querySelector('strong')?.textContent)
        const availableForAds = reinvestmentEnabled ? currentBalance : allocatedAdBalance
        const bankTransfer = records.reduce((sum, x) => {
          const ref = String(x.payout_transfer_reference || '').trim().toUpperCase()
          return sum + (!Boolean(x.reinvestment_enabled) && !ref.startsWith('REINVESTMENT-') && x.status !== 'paid' ? Number(x.payable_now || 0) : 0)
        }, 0)

        const adSummary = summaryCards[2]
        if (adSummary) {
          const value = adSummary.querySelector('strong')
          const note = adSummary.querySelector('small')
          if (value) value.textContent = money(availableForAds)
          if (note) note.textContent = reinvestmentEnabled ? 'Current balance available for ads' : 'Current ad allocation remaining'
        }

        const amountCard = document.createElement('article')
        amountCard.className = 'history-summary-card blue'
        amountCard.innerHTML = `<span>AD SPENT</span><strong>${money(adSpent)}</strong><small>Total amount actually spent on advertising</small>`
        const summary = modal.querySelector('.investor-history-summary')
        if (summary && !summary.querySelector('[data-ad-spent]')) {
          amountCard.setAttribute('data-ad-spent','true')
          summary.insertBefore(amountCard, summaryCards[2] || null)
        }

        const footer = document.createElement('div')
        footer.className = 'investor-history-actions'
        footer.innerHTML = `<span class="action-status">${reinvestmentEnabled ? 'Current balance' : 'Ad balance'} <strong>${money(availableForAds)}</strong> · Transferable <strong>${money(bankTransfer)}</strong></span><button type="button" class="spend-action">Spend on Ads</button><button type="button" class="transfer-action" ${bankTransfer <= 0 ? 'disabled' : ''}>Transfer to Account</button>`
        modal.appendChild(footer)

        footer.querySelector('.spend-action').addEventListener('click', () => {
          setActionState({ type: 'spend', investor, availableForAds, transferable: bankTransfer, payoutAccount: null })
        })

        footer.querySelector('.transfer-action').addEventListener('click', async () => {
          if (bankTransfer <= 0) return
          const payoutAccount = await loadPayoutAccount(investor.user_id)
          setActionState({ type: 'transfer', investor, availableForAds, transferable: bankTransfer, payoutAccount })
        })
      } finally {
        busy = false
      }
    }

    const scan = () => {
      const modal = document.querySelector('.investor-history-modal')
      if (modal && !modal.querySelector('.investor-history-actions')) injectActions(modal)
    }

    observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()

    return () => {
      observer?.disconnect()
      style.remove()
    }
  }, [])

  const closeActions = () => setActionState({ type: null, investor: null, availableForAds: 0, transferable: 0, payoutAccount: null })

  const handleSpend = async payload => {
    const investor = actionState.investor
    const records = Array.isArray(investor?.cycles) ? investor.cycles.filter(x => x.status !== 'cancelled') : []
    const investmentId = records.find(x => Number(x.ad_remaining || 0) > 0)?.id || records.find(x => x.status === 'active' || x.status === 'matured')?.id
    if (!investmentId) return
    try {
      await apiRequest(`/investments/admin/${investmentId}/ad-spend`, { method: 'POST', body: JSON.stringify(payload) })
      closeActions()
      window.location.reload()
    } catch (error) {
      window.alert(error?.message || 'Unable to record ad spend.')
    }
  }

  const handleTransfer = async payload => {
    const investor = actionState.investor
    if (!investor?.user_id || actionState.transferable <= 0) return
    try {
      await apiRequest(`/investments/admin/${investor.user_id}/payout`, { method: 'POST', body: JSON.stringify({ amount: actionState.transferable, ...payload, forceTransfer: true }) })
      closeActions()
      window.location.reload()
    } catch (error) {
      window.alert(error?.message || 'Unable to transfer investor money.')
    }
  }

  return <>
    <AdminInvestmentsWallet />
    <InvestorActionModals spendOpen={actionState.type === 'spend'} transferOpen={actionState.type === 'transfer'} availableForAds={actionState.availableForAds} transferable={actionState.transferable} payoutAccount={actionState.payoutAccount} onCloseSpend={closeActions} onCloseTransfer={closeActions} onSpend={handleSpend} onTransfer={handleTransfer} />
  </>
}

export default function AdminInvestments() {
  return <InvestorModalActions />
}
