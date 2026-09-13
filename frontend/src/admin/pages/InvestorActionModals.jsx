import { useEffect, useState } from 'react'

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function InvestorActionModals({ spendOpen, transferOpen, availableForAds, transferable, payoutAccount, onCloseSpend, onCloseTransfer, onSpend, onTransfer }) {
  const [spendAmount, setSpendAmount] = useState('')
  const [platform, setPlatform] = useState('Meta')
  const [campaign, setCampaign] = useState('')
  const [spendDate, setSpendDate] = useState(new Date().toISOString().slice(0, 10))
  const [spendNotes, setSpendNotes] = useState('')
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState('')

  useEffect(() => {
    if (spendOpen) {
      setSpendAmount('')
      setPlatform('Meta')
      setCampaign('')
      setSpendDate(new Date().toISOString().slice(0, 10))
      setSpendNotes('')
    }
  }, [spendOpen])

  useEffect(() => {
    if (transferOpen) {
      setReference('')
      setProofUrl('')
    }
  }, [transferOpen])

  if (!spendOpen && !transferOpen) return null

  const submitSpend = event => {
    event.preventDefault()
    const amount = Number(spendAmount)
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(availableForAds || 0)) return
    onSpend({ amount, platform, campaign, spendDate, notes: spendNotes })
  }

  const submitTransfer = event => {
    event.preventDefault()
    if (!reference.trim() || !proofUrl.trim() || Number(transferable || 0) <= 0) return
    onTransfer({ transferReference: reference.trim(), proofUrl: proofUrl.trim() })
  }

  return (
    <div className="investor-action-overlay" role="presentation">
      {spendOpen && (
        <div className="investor-action-modal" role="dialog" aria-modal="true" aria-labelledby="spend-title">
          <div className="investor-action-header">
            <div><span className="investor-action-eyebrow">ADVERTISING</span><h3 id="spend-title">Spend on Ads</h3><p>Record the actual amount spent on the investor's advertising allocation.</p></div>
            <button type="button" className="investor-action-close" onClick={onCloseSpend} aria-label="Close">×</button>
          </div>
          <div className="investor-action-balance"><span>Available for Ads</span><strong>{money(availableForAds)}</strong></div>
          <form onSubmit={submitSpend}>
            <div className="investor-action-grid">
              <label><span>Amount to Spend</span><div className="money-input"><b>₹</b><input autoFocus type="number" min="0.01" max={availableForAds} step="0.01" value={spendAmount} onChange={e => setSpendAmount(e.target.value)} placeholder="0.00" required /></div></label>
              <label><span>Platform</span><select value={platform} onChange={e => setPlatform(e.target.value)}><option>Meta</option><option>Google</option><option>Other</option></select></label>
              <label><span>Campaign</span><input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="Campaign name / ID" /></label>
              <label><span>Spend Date</span><input type="date" value={spendDate} onChange={e => setSpendDate(e.target.value)} required /></label>
              <label className="full"><span>Notes</span><textarea value={spendNotes} onChange={e => setSpendNotes(e.target.value)} placeholder="Optional internal note" rows="3" /></label>
            </div>
            <div className="investor-action-footer"><button type="button" className="secondary" onClick={onCloseSpend}>Cancel</button><button type="submit" className="primary">Confirm Spend</button></div>
          </form>
        </div>
      )}

      {transferOpen && (
        <div className="investor-action-modal transfer" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
          <div className="investor-action-header">
            <div><span className="investor-action-eyebrow">PAYOUT</span><h3 id="transfer-title">Transfer to Account</h3><p>Review the investor's saved payout destination before making the transfer.</p></div>
            <button type="button" className="investor-action-close" onClick={onCloseTransfer} aria-label="Close">×</button>
          </div>
          <div className="investor-action-balance transfer-balance"><span>Transferable Amount</span><strong>{money(transferable)}</strong></div>
          <div className="payout-account-card">
            <div className="payout-account-top"><span>Saved Payout Account</span><strong>{payoutAccount?.type === 'upi' ? 'UPI' : 'Bank Account'}</strong></div>
            {payoutAccount ? (payoutAccount.type === 'upi' ? <div className="payout-details"><div><small>UPI ID</small><b>{payoutAccount.upi_id || 'Not available'}</b></div><div><small>Status</small><b>{payoutAccount.is_verified ? 'Verified' : 'Pending verification'}</b></div></div> : <div className="payout-details"><div><small>Account Holder</small><b>{payoutAccount.account_holder_name || 'Not available'}</b></div><div><small>Bank</small><b>{payoutAccount.bank_name || 'Not available'}</b></div><div><small>Account Number</small><b>{payoutAccount.account_number_masked || 'Not available'}</b></div><div><small>IFSC</small><b>{payoutAccount.ifsc_code || 'Not available'}</b></div></div>) : <div className="payout-empty">No payout account is available for this investor.</div>}
          </div>
          <form onSubmit={submitTransfer}>
            <div className="investor-action-grid"><label><span>UTR / Transfer Reference</span><input value={reference} onChange={e => setReference(e.target.value)} placeholder="Enter transaction reference" required /></label><label><span>Transfer Proof</span><input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="Proof URL" required /></label></div>
            <div className="investor-action-footer"><button type="button" className="secondary" onClick={onCloseTransfer}>Cancel</button><button type="submit" className="primary transfer-primary">Confirm Transfer</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
