import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerWithdrawals.css';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function LeadPartnerWithdrawals() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [funds, setFunds] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [proof, setProof] = useState(null);

  const initials = useMemo(
    () => (user?.name || 'Lead Partner').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'LP',
    [user?.name]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setFunds(await authRequest('/lead-partner/funds'));
    } catch (e) {
      setError(e.message || 'Unable to load earnings and withdrawals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await authRequest('/lead-partner/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), notes })
      });
      setAmount('');
      setNotes('');
      setMessage('Withdrawal request submitted for Admin review.');
      await load();
    } catch (e) {
      setError(e.message || 'Unable to submit withdrawal');
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    clearSession();
    localStorage.removeItem('propulse_session_mode');
    navigate('/login', { replace: true });
  }

  const account = funds?.payout_account;
  const requests = funds?.requests || [];
  const available = Number(funds?.available || 0);
  const reserved = Number(funds?.reserved || 0);
  const paid = Number(funds?.paid || 0);
  const recovery = Number(funds?.recovery_outstanding || 0);
  const totalEarned = Number(funds?.total_earned ?? (available + reserved + paid + recovery));
  const totalWithdrawn = paid;

  return (
    <div className="withdrawals-shell">
      <aside className="withdrawals-sidebar">
        <div className="withdrawals-brand">
          <span className="withdrawals-brand-mark">P</span>
          <span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span>
        </div>
        <div className="withdrawals-nav-label">WORKSPACE</div>
        <nav className="withdrawals-nav">
          <Link className={location.pathname === '/lead-partner' ? 'active' : ''} to="/lead-partner"><i>⌂</i><span>Overview</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/inventory') ? 'active' : ''} to="/lead-partner/inventory"><i>◈</i><span>Lead Inventory</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/pricing') ? 'active' : ''} to="/lead-partner/pricing"><i>₹</i><span>Pricing & Revenue</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/withdrawals') ? 'active' : ''} to="/lead-partner/withdrawals"><i>⇩</i><span>Earnings & Withdrawals</span></Link><Link className={location.pathname.startsWith('/lead-partner/reports')?'active':''} to="/lead-partner/reports"><i>▥</i><span>Reports</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/account') ? 'active' : ''} to="/lead-partner/account"><i>◎</i><span>Account</span></Link>
        </nav>
        <div className="withdrawals-sidebar-bottom">
          <div className="withdrawals-user">
            <span>{initials}</span>
            <div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div>
          </div>
          <button onClick={signOut}>↪ <span>Log out</span></button>
        </div>
      </aside>

      <main className="withdrawals-main">
        <header className="withdrawals-topbar">
          <div className="withdrawals-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Earnings & Withdrawals</strong></div>
          <div className="withdrawals-top-status"><i /> Partner account</div>
        </header>

        <div className="withdrawals-content">
          <section className="withdrawals-heading">
            <div>
              <span className="withdrawals-eyebrow">LEAD PARTNER PORTAL · FINANCE</span>
              <h1>Withdrawals</h1>
              <p>Manage your eligible earnings, payout destination and withdrawal history.</p>
            </div>
            <div className="withdrawals-live"><i /> Live earnings</div>
          </section>

          {error && <div className="withdrawals-message error">{error}</div>}
          {message && <div className="withdrawals-message success">✓ {message}</div>}

          {!loading && recovery > 0 && (
            <div className="withdrawals-recovery">
              <span className="withdrawals-recovery-icon">!</span>
              <div><strong>Recovery adjustment: {money(recovery)}</strong><small>This amount is being recovered from future eligible earnings and is not available for withdrawal.</small></div>
            </div>
          )}

          {loading ? (
            <section className="withdrawals-card"><div className="withdrawals-empty">Loading earnings…</div></section>
          ) : (
            <>
              <section className="withdrawals-summary">
                <article><div className="summary-icon available">₹</div><div><span>Available Now</span><strong>{money(available)}</strong><small>Eligible for withdrawal</small></div></article>
                <article><div className="summary-icon pending">◷</div><div><span>Pending Payout</span><strong>{money(reserved)}</strong><small>Awaiting Admin processing</small></div></article>
                <article><div className="summary-icon earned">↗</div><div><span>Total Earned</span><strong>{money(totalEarned)}</strong><small>Partner earnings to date</small></div></article>
                <article><div className="summary-icon withdrawn">✓</div><div><span>Total Withdrawn</span><strong>{money(totalWithdrawn)}</strong><small>Successfully paid out</small></div></article>
              </section>

              <section className="withdrawals-primary-grid">
                <article className="withdrawals-card request-card">
                  <div className="withdrawals-card-head">
                    <div><span className="withdrawals-kicker">WITHDRAW EARNINGS</span><h2>Request Withdrawal</h2><p>Withdraw from your currently available partner balance.</p></div>
                    <span className="request-lock">🔒 Secure</span>
                  </div>
                  <div className="available-strip"><span>Available balance</span><strong>{money(available)}</strong></div>
                  <form className="withdrawal-form" onSubmit={submit}>
                    <label>Withdrawal amount
                      <div className="amount-input"><span>₹</span><input required min="0.01" max={available} step="0.01" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
                    </label>
                    <label>Note to Admin <span className="optional">Optional</span>
                      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" maxLength="500" placeholder="Add a note for the payout reviewer…" />
                    </label>
                    <button className="withdrawal-submit" disabled={saving || !account || Number(amount) <= 0 || Number(amount) > available}>
                      {saving ? 'Submitting…' : 'Request Withdrawal'} <span>→</span>
                    </button>
                    {!account && <small className="form-warning">Add a payout account in Account before requesting a withdrawal.</small>}
                  </form>
                  <div className="processing-note"><span>i</span><p><b>What happens next?</b> Your request is reserved immediately, then reviewed and processed by Admin.</p></div>
                </article>

                <aside className="withdrawals-side-stack">
                  <article className="withdrawals-card account-card">
                    <div className="withdrawals-card-head compact">
                      <div><span className="withdrawals-kicker">PAYOUT DESTINATION</span><h2>{account ? 'Linked bank account' : 'Payout account'}</h2></div>
                      {account ? <span className="verified-badge">✓ Verified</span> : <Link to="/lead-partner/account" className="manage-link">Add account →</Link>}
                    </div>
                    {account ? (
                      <div className="bank-visual">
                        <div className="bank-logo">P</div>
                        <div><strong>{account.method === 'upi' ? 'UPI transfer' : account.bank_name}</strong><span>{account.method === 'upi' ? account.upi_id : `•••• ${String(account.account_number_masked || '').slice(-4)}`}</span></div>
                        <span className="bank-chip">ACTIVE</span>
                      </div>
                    ) : (
                      <div className="no-account"><strong>No payout destination</strong><span>Add Bank Account or UPI to enable withdrawals.</span><Link to="/lead-partner/account">Manage payout account →</Link></div>
                    )}
                    {account && <div className="account-footer"><span>{account.method === 'upi' ? 'UPI' : 'Bank transfer'}</span><Link to="/lead-partner/account">Manage →</Link></div>}
                  </article>

                  <article className="withdrawals-card how-card">
                    <div className="withdrawals-card-head compact"><div><span className="withdrawals-kicker">PROCESS</span><h2>How withdrawals work</h2></div></div>
                    <div className="steps">
                      <div><b>1</b><span><strong>Submit Request</strong><small>Choose an amount from your available balance.</small></span></div>
                      <div><b>2</b><span><strong>Admin Review</strong><small>Your request is checked and approved.</small></span></div>
                      <div><b>3</b><span><strong>Payout Initiated</strong><small>Payment is sent to your linked destination.</small></span></div>
                      <div><b>4</b><span><strong>Receive Amount</strong><small>Track the completed payout in history.</small></span></div>
                    </div>
                  </article>
                </aside>
              </section>

              <section className="withdrawals-card history-card">
                <div className="withdrawals-card-head history-head">
                  <div><span className="withdrawals-kicker">PAYOUT HISTORY</span><h2>Withdrawal History</h2><p>All payout requests and processing references are retained here.</p></div>
                  <span className="history-count">{requests.length} request{requests.length === 1 ? '' : 's'}</span>
                </div>
                <div className="withdrawals-table-wrap">
                  <table className="withdrawals-table">
                    <thead><tr><th>ID</th><th>Amount</th><th>Status</th><th>Method</th><th>Requested</th><th>Processed</th><th>Reference / Reason</th></tr></thead>
                    <tbody>
                      {requests.map(request => (
                        <tr key={request.id}>
                          <td><b>#{request.id}</b></td>
                          <td><strong>{money(request.amount)}</strong></td>
                          <td><span className={`withdrawal-status ${request.status}`}>{request.status}</span></td>
                          <td>{request.payout_method || '—'}</td>
                          <td>{dateTime(request.requested_at)}</td>
                          <td>{dateTime(request.processed_at)}</td>
                          <td>{request.transfer_reference || request.rejection_reason || '—'} {request.proof_url && request.status === 'paid' && <button type="button" className="proof-button" onClick={() => setProof(request.proof_url)}>View proof</button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!requests.length && <div className="withdrawals-empty">No withdrawal requests yet.</div>}
                </div>
              </section>

              <section className="withdrawals-info-grid">
                <article className="withdrawals-info"><span>ⓘ</span><div><strong>Important Information</strong><p>Only eligible partner earnings can be withdrawn. Active invested principal is not included in the available balance. Pending requests are reserved until Admin completes or rejects them.</p></div></article>
                <article className="withdrawals-support"><div><span>Need help?</span><strong>Questions about a payout?</strong><small>Contact your ProPulse administrator with the withdrawal ID.</small></div><Link to="/lead-partner/account">Account & payout settings →</Link></article>
              </section>
            </>
          )}
        </div>
      </main>

      {proof && (
        <div className="proof-overlay" onClick={() => setProof(null)}>
          <div className="proof-modal" onClick={event => event.stopPropagation()}>
            <div><strong>Payment proof</strong><button type="button" onClick={() => setProof(null)}>×</button></div>
            <img src={proof} alt="Payment proof" />
          </div>
        </div>
      )}
    </div>
  );
}
