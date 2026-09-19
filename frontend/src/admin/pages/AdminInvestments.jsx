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
      .investor-history-modal .investor-history-summary{grid-template-columns:repeat(5,minmax(0,1fr))!important;padding-top:13px;padding-bottom:13px;gap:8px}
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
        const ledger = await apiRequest(`/investments/admin/investor/${investor.user_id}/financial-summary`)
        const summaryCards = modal.querySelectorAll('.history-summary-card')
        const availableForAds = Number(ledger?.available_for_ads || 0)
        const adSpent = Number(ledger?.ad_spent || 0)
        const bankTransfer = Number(ledger?.transferable || 0)
        const totalInvested = Number(ledger?.contributed_capital || ledger?.capital || 0)
        const leadRevenue = Number(ledger?.auto_invest_earnings || 0) + Number(ledger?.non_auto_earnings || 0)

        const summaryValues = [
          ['Available for Ads', availableForAds, 'Capital and unconsumed Auto-Invest earnings available for advertising'],
          ['Total Invested', totalInvested, 'Original investor-contributed capital'],
          ['AD SPENT', adSpent, 'Total amount actually spent on advertising'],
          ['Transfer to Bank', bankTransfer, 'Eligible investor earnings available for transfer'],
          ['Total Lead Revenue', leadRevenue, 'Total investor earnings generated from paid lead sales'],
        ]
        summaryValues.forEach((item,index) => {
          const card = summaryCards[index]
          if (!card) return
          const label = card.querySelector('span')
          const value = card.querySelector('strong')
          const note = card.querySelector('small')
          if (label) label.textContent = item[0]
          if (value) value.textContent = money(item[1])
          if (note) note.textContent = item[2]
        })
        const footer = document.createElement('div')
        footer.className = 'investor-history-actions'
        footer.innerHTML = `<span class="action-status">Available for Ads <strong>${money(availableForAds)}</strong> · Transferable <strong>${money(bankTransfer)}</strong></span><button type="button" class="spend-action">Spend on Ads</button><button type="button" class="transfer-action" ${bankTransfer <= 0 ? 'disabled' : ''}>Transfer to Account</button>`
        modal.appendChild(footer)
        footer.querySelector('.spend-action').addEventListener('click', () => setActionState({ type: 'spend', investor, availableForAds, transferable: bankTransfer, payoutAccount: null }))
        footer.querySelector('.transfer-action').addEventListener('click', async () => {
          if (bankTransfer <= 0) return
          const payoutAccount = await loadPayoutAccount(investor.user_id)
          setActionState({ type: 'transfer', investor, availableForAds, transferable: bankTransfer, payoutAccount })
        })
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

  const closeActions = () => setActionState({ type: null, investor: null, availableForAds: 0, transferable: 0, payoutAccount: null })

  const handleSpend = async payload => {
    const investor = actionState.investor
    if (!investor?.user_id || Number(payload?.amount || 0) <= 0) return
    try {
      await apiRequest(`/investments/admin/investor/${investor.user_id}/managed-ad-spend`, { method: 'POST', body: JSON.stringify(payload) })
      closeActions()
      window.location.reload()
    } catch (error) { window.alert(error?.message || 'Unable to record ad spend.') }
  }

  const handleTransfer = async payload => {
    const investor = actionState.investor
    if (!investor?.user_id || actionState.transferable <= 0) return
    try {
      await apiRequest(`/investments/admin/${investor.user_id}/payout`, { method: 'POST', body: JSON.stringify({ amount: actionState.transferable, ...payload, forceTransfer: true }) })
      closeActions()
      window.location.reload()
    } catch (error) { window.alert(error?.message || 'Unable to transfer investor money.') }
  }

  return <><AdminInvestmentsWallet /><InvestorActionModals spendOpen={actionState.type === 'spend'} transferOpen={actionState.type === 'transfer'} availableForAds={actionState.availableForAds} transferable={actionState.transferable} payoutAccount={actionState.payoutAccount} onCloseSpend={closeActions} onCloseTransfer={closeActions} onSpend={handleSpend} onTransfer={handleTransfer} /></>
}

export default function AdminInvestments() { return <InvestorModalActions /> }
