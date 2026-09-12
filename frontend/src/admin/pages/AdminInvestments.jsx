import { useEffect } from 'react'
import { apiRequest } from '../../utils/api'
import AdminInvestmentsWallet from './AdminInvestmentsWallet'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function InvestorModalActions() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .investor-history-modal .investor-history-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 26px;border-top:1px solid #e4ebf3;background:#fff;flex:0 0 auto}
      .investor-history-modal .investor-history-actions button{height:42px;padding:0 18px;border:1px solid #d6e3ef;border-radius:9px;background:#fff;color:#17457f;font-size:11px;font-weight:900;cursor:pointer}
      .investor-history-modal .investor-history-actions button:hover{background:#f4f8fd}
      .investor-history-modal .investor-history-actions .spend-action{border-color:#d5e5f5;background:#eef6ff;color:#126fca}
      .investor-history-modal .investor-history-actions .transfer-action{border:0;background:#104789;color:#fff;box-shadow:0 4px 10px rgba(16,71,137,.14)}
      .investor-history-modal .investor-history-actions button:disabled{opacity:.5;cursor:not-allowed}
      .investor-history-modal .investor-history-actions .action-status{margin-right:auto;color:#7890aa;font-size:9px}
      .investor-history-modal .investor-history-actions .action-status strong{color:#17457f}
      .investor-history-modal + .admin-modal-backdrop{display:none!important}
    `
    document.head.appendChild(style)

    let observer
    let busy = false

    const getInvestor = async email => {
      const params = new URLSearchParams({ search: email || '', status: 'all', industryId: '' })
      const dashboard = await apiRequest(`/admin/commercial/investment-dashboard?${params}`)
      const investors = dashboard?.investors || []
      return investors.find(item => String(item.email || '').toLowerCase() === String(email || '').toLowerCase()) || investors[0] || null
    }

    const injectActions = async modal => {
      if (!modal || modal.dataset.actionsReady === '1' || busy) return
      const headEmail = modal.querySelector('.investor-history-head p')?.textContent?.split(' · ')[0]?.trim() || ''
      if (!headEmail) return
      busy = true
      try {
        const investor = await getInvestor(headEmail)
        if (!investor || modal.dataset.actionsReady === '1') return

        const records = Array.isArray(investor.cycles) ? investor.cycles.filter(x => x.status !== 'cancelled') : []
        const adBalance = Math.max(0, records.reduce((sum, x) => sum + Number(x.amount || 0), 0) - records.reduce((sum, x) => sum + Number(x.ad_spent || 0), 0))
        const bankTransfer = records.reduce((sum, x) => {
          const ref = String(x.payout_transfer_reference || '').trim().toUpperCase()
          return sum + (!Boolean(x.reinvestment_enabled) && !ref.startsWith('REINVESTMENT-') && x.status !== 'paid' ? Number(x.payable_now || 0) : 0)
        }, 0)

        const footer = document.createElement('div')
        footer.className = 'investor-history-actions'
        footer.innerHTML = `<span class="action-status">Ad balance <strong>${money(adBalance)}</strong> · Bank transfer <strong>${money(bankTransfer)}</strong></span><button type="button" class="spend-action">Spend on Ads</button><button type="button" class="transfer-action" ${bankTransfer <= 0 ? 'disabled' : ''}>Transfer to Bank</button>`

        const body = modal.querySelector('.investor-history-body')
        if (!body) return
        modal.appendChild(footer)
        modal.dataset.actionsReady = '1'

        footer.querySelector('.spend-action').addEventListener('click', async () => {
          const raw = window.prompt(`Enter actual ad spend (available ${money(adBalance)}):`)
          if (raw == null) return
          const amount = Number(raw)
          if (!Number.isFinite(amount) || amount <= 0) return
          if (amount > adBalance) {
            window.alert(`Ad spend cannot exceed the available ad balance of ${money(adBalance)}.`)
            return
          }
          const investmentId = records.find(x => Number(x.ad_available || 0) > 0)?.id || records.find(x => x.status === 'active' || x.status === 'matured')?.id
          if (!investmentId) {
            window.alert('No eligible investment is available for ad spending.')
            return
          }
          try {
            await apiRequest(`/investments/admin/${investor.user_id}/ad-spend`, { method: 'POST', body: JSON.stringify({ investmentId, amount }) })
            window.location.reload()
          } catch (error) {
            window.alert(error?.message || 'Unable to record ad spend.')
          }
        })

        footer.querySelector('.transfer-action').addEventListener('click', async () => {
          if (bankTransfer <= 0) return
          const reference = window.prompt(`Enter bank transfer UTR/reference for ${money(bankTransfer)}:`)
          if (!reference) return
          const proofUrl = window.prompt('Enter transfer proof URL (optional):') || ''
          try {
            await apiRequest(`/investments/admin/${investor.user_id}/payout`, { method: 'POST', body: JSON.stringify({ amount: bankTransfer, transferReference: reference.trim(), proofUrl, forceTransfer: true }) })
            window.location.reload()
          } catch (error) {
            window.alert(error?.message || 'Unable to transfer investor money.')
          }
        })
      } finally {
        busy = false
      }
    }

    const scan = () => {
      const modal = document.querySelector('.investor-history-modal')
      if (modal) injectActions(modal)
    }

    observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()

    return () => {
      observer?.disconnect()
      style.remove()
    }
  }, [])

  return <AdminInvestmentsWallet />
}

export default function AdminInvestments() {
  return <InvestorModalActions />
}
