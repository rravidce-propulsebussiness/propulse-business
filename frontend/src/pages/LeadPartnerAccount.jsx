import { useCallback, useEffect, useState } from 'react';
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import { Link, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerAccount.css';

const emptyForm = { accountHolderName:'', accountNumber:'', ifscCode:'', bankName:'', upiId:'' };
const money = value => `₹${Number(value || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dateTime = value => value ? new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

function maskAccount(value){
  const raw = String(value || '').replace(/\D/g,'');
  return raw ? `•••• ${raw.slice(-4)}` : '••••';
}

export default function LeadPartnerAccount(){
  const navigate = useNavigate();
  const user = getUser();
  const [account,setAccount] = useState(null);
  const [method,setMethod] = useState('bank');
  const [form,setForm] = useState(emptyForm);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [tab,setTab] = useState('payout');
  const [transactions,setTransactions] = useState([]);
  const [transactionFunds,setTransactionFunds] = useState({available:0,reserved:0,paid:0,total_earned:0,total_additions:0,total_deductions:0,transaction_net:0,recovery_outstanding:0});
  const [transactionsLoading,setTransactionsLoading] = useState(false);
  const [transactionError,setTransactionError] = useState('');
  const [me,setMe] = useState(null);
  const [settingsLoading,setSettingsLoading] = useState(false);
  const [settingsError,setSettingsError] = useState('');

  const loadAccount = useCallback(async()=>{
    try{
      setLoading(true); setError('');
      const result = await authRequest('/lead-partner/payout-account');
      setAccount(result);
      if(result?.method) setMethod(result.method);
      if(result?.method==='upi') setForm(current=>({...current,upiId:result.upi_id||''}));
      else if(result) setForm(current=>({...current,accountHolderName:result.account_holder_name||'',bankName:result.bank_name||'',ifscCode:result.ifsc_code||''}));
    }catch(e){setError(e.message || 'Unable to load payout account')}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)loadAccount()});return()=>{active=false}},[loadAccount]);

  const loadTransactions = useCallback(async()=>{
    try{
      setTransactionsLoading(true); setTransactionError('');
      const result = await authRequest('/lead-partner/transactions');
      setTransactions(Array.isArray(result?.transactions) ? result.transactions : []);
      setTransactionFunds({available:Number(result?.available || 0),reserved:Number(result?.reserved || 0),paid:Number(result?.paid || 0),total_earned:Number(result?.total_earned || 0),total_additions:Number(result?.total_additions || 0),total_deductions:Number(result?.total_deductions || 0),transaction_net:Number(result?.transaction_net || 0),recovery_outstanding:Number(result?.recovery_outstanding || 0)});
    }catch(e){setTransactionError(e.message || 'Unable to load transaction history')}
    finally{setTransactionsLoading(false)}
  },[]);

  const loadSettings = useCallback(async()=>{
    try{
      setSettingsLoading(true); setSettingsError('');
      setMe(await authRequest('/auth/me'));
    }catch(e){setSettingsError(e.message || 'Unable to load account settings')}
    finally{setSettingsLoading(false)}
  },[]);

  function selectTab(next){
    setTab(next);
    setMessage('');
    setError('');
    if(next==='transactions' && !transactions.length) loadTransactions();
    if(next==='settings' && !me) loadSettings();
  }

  const update=(key,value)=>setForm(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault();
    setSaving(true); setMessage(''); setError('');
    try{
      const result=await authRequest('/lead-partner/payout-account',{
        method:'POST',
        body:JSON.stringify({method,...form,ifscCode:String(form.ifscCode||'').toUpperCase()})
      });
      setAccount(result);
      setMessage('Payout account saved successfully. It is now available for withdrawal requests.');
      setForm(current=>method==='upi'
        ? ({...emptyForm,upiId:result?.upi_id||current.upiId})
        : ({...emptyForm,accountHolderName:result?.account_holder_name||current.accountHolderName,bankName:result?.bank_name||current.bankName,ifscCode:result?.ifsc_code||current.ifscCode}));
    }catch(e){setError(e.message || 'Unable to save payout account')}
    finally{setSaving(false)}
  }

  function chooseMethod(next){setMethod(next);setError('');setMessage('')}

  function signOut(){
    clearSession();
    localStorage.removeItem('propulse_session_mode');
    navigate('/login',{replace:true});
  }

  const verified=Boolean(account);
  const statusText=loading?'Loading…':!account?'Not configured':'Active';

  return <div className="account-shell">
    <LeadPartnerSidebar user={user} onSignOut={signOut} />

    <main className="account-main">
      <header className="account-topbar">
        <div className="account-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Account</strong></div>
      </header>

      <div className="account-content">
        <section className="account-heading">
          <div><h1>Account</h1></div>
          <div className="account-secure"><span>✓</span><div><strong>Secure payout details</strong><small>Only masked payout information is shown in the portal.</small></div></div>
        </section>

        {message&&<div className="account-message success">✓ {message}</div>}
        {error&&<div className="account-message error">{error}</div>}

        <div className="account-tabs" role="tablist" aria-label="Account sections">
          <button type="button" className={tab==='payout'?'active':''} onClick={()=>selectTab('payout')}>▣ &nbsp;Payout Account</button>
          <button type="button" className={tab==='transactions'?'active':''} onClick={()=>selectTab('transactions')}>◷ &nbsp;Transaction History</button>
          <button type="button" className={tab==='settings'?'active':''} onClick={()=>selectTab('settings')}>⚙ &nbsp;Account Settings</button>
        </div>

        {tab==='payout'&&<section className="account-main-grid">
          <div className="account-left-column">
            <article className="account-card current-card">
              <div className="account-card-head"><div><h2>Current payout account</h2></div><span className={account?(verified?'account-status verified':'account-status active'):'account-status idle'}>● {statusText}</span></div>
              {loading?<div className="account-loading">Loading payout configuration…</div>:account?
                <div className="account-current-box">
                  <div className="account-bank-symbol">{account.method==='upi'?'@':'▥'}</div>
                  <div className="account-current-primary"><strong>{account.method==='upi'?'UPI account':account.bank_name||'Bank account'}</strong><span>{account.method==='upi'?account.upi_id:maskAccount(account.account_number_masked)}</span><small>{account.method==='upi'?'UPI payout destination':account.account_holder_name||'Account holder'}</small></div>
                  <div className="account-current-details">{account.method==='upi'?<><span>Method <b>UPI</b></span><span>Status <b>Active</b></span></>:<><span>IFSC Code <b>{account.ifsc_code||'—'}</b></span><span>Bank <b>{account.bank_name||'—'}</b></span></>}</div>
                  <div className="account-current-actions"><button type="button" onClick={()=>document.getElementById('payout-form')?.scrollIntoView({behavior:'smooth',block:'center'})}>✎ Update</button></div>
                </div>
                :<div className="account-empty-state"><span>+</span><div><strong>No payout account yet</strong><small>Add a Bank Account or UPI destination below to enable withdrawal requests.</small></div></div>}
            </article>

            <article className="account-card edit-card" id="payout-form">
              <div className="account-card-head"><div><h2>{account?'Update payout details':'Add payout details'}</h2><p>Saving a new destination replaces the currently active payout account.</p></div></div>
              <div className="account-methods"><button type="button" className={method==='bank'?'active':''} onClick={()=>chooseMethod('bank')}><span>▥</span><div><strong>Bank Account</strong><small>Direct bank transfer</small></div></button><button type="button" className={method==='upi'?'active':''} onClick={()=>chooseMethod('upi')}><span>@</span><div><strong>UPI Account</strong><small>UPI transfer</small></div></button></div>
              <form onSubmit={save}>
                {method==='bank'?<div className="account-form-grid"><label>Account holder name *<input value={form.accountHolderName} onChange={e=>update('accountHolderName',e.target.value)} placeholder="Enter account holder name" required/></label><label>Account number *<input inputMode="numeric" value={form.accountNumber} onChange={e=>update('accountNumber',e.target.value.replace(/\D/g,''))} placeholder={account?'Re-enter account number':'Enter account number'} required/></label><label>IFSC code *<input value={form.ifscCode} onChange={e=>update('ifscCode',e.target.value.toUpperCase())} maxLength="11" placeholder="Enter IFSC code" required/></label><label>Bank name *<input value={form.bankName} onChange={e=>update('bankName',e.target.value)} placeholder="Enter bank name" required/></label></div>:<label className="account-upi-field">UPI ID *<input placeholder="yourname@upi" value={form.upiId} onChange={e=>update('upiId',e.target.value)} required/><small>Example: name@okaxis or name@ybl</small></label>}
                <div className="account-form-footer"><div className="account-info-note"><span>i</span><p>Make sure the payout details are correct. Approved withdrawals are sent to this active destination.</p></div><button className="account-save" disabled={saving||loading}>{saving?'Saving…':'Save Payout Account'} <span>→</span></button></div>
              </form>
            </article>
            <article className="account-privacy"><span>✓</span><div><strong>Your privacy matters</strong><p>Your account number is stored and displayed using masked details. Payout requests use the active destination saved to your account.</p></div></article>
          </div>

          <aside className="account-right-column">
            <article className="account-side-card verification-card"><div className="verification-icon">{account?'✓':'+'}</div><h3>{account?'Payout Account Active':'Add Your Payout Account'}</h3><p>{account?'Your saved bank account or UPI destination is ready to receive approved withdrawals.':'Add a valid bank account or UPI ID to enable withdrawals.'}</p>{account&&<small>Ready for payouts</small>}</article>
            <article className="account-side-card"><h3><span>ⓘ</span> Important Information</h3><ul><li>Use a valid bank account or UPI ID.</li><li>Make sure the account belongs to you.</li><li>Saving a new destination replaces the active one.</li><li>Only eligible partner earnings can be withdrawn.</li><li>Pending withdrawals remain reserved until processed or rejected.</li></ul></article>
            <article className="account-support-card"><div><span>◉</span><div><small>NEED HELP?</small><strong>Questions about payouts?</strong><p>Use your withdrawal ID when contacting your ProPulse administrator.</p></div></div><Link to="/lead-partner/withdrawals">Go to Withdrawals →</Link></article>
          </aside>
        </section>}


        {tab==='transactions'&&<section className="account-transaction-panel account-card">
          <div className="account-card-head history-head">
            <div><h2>Transaction History</h2><p>Real earnings and withdrawal activity from your Lead Partner ledger.</p></div>
            <button type="button" className="account-refresh" onClick={loadTransactions} disabled={transactionsLoading}>{transactionsLoading?'Refreshing…':'↻ Refresh'}</button>
          </div>
                              <div className="transaction-balance-grid">
            <div><span>Current ledger balance</span><strong>{transactionsLoading && !transactions.length ? '—' : money(transactionFunds.available)}</strong><small>Eligible balance available for withdrawal</small></div>
            <div><span>Transaction net balance</span><strong className={Number(transactionFunds.transaction_net||0)<0?'negative-balance':'addition-balance'}>{transactionsLoading && !transactions.length ? '—' : money(transactionFunds.transaction_net)}</strong><small>Signed net of the transactions shown below</small></div>
            <div><span>Total additions</span><strong className="addition-balance">{transactionsLoading && !transactions.length ? '—' : '+'+money(transactionFunds.total_additions)}</strong><small>Total earnings credited</small></div>
            <div><span>Total deductions</span><strong className="deduction-balance">{transactionsLoading && !transactions.length ? '—' : '−'+money(transactionFunds.total_deductions)}</strong><small>Pending and paid withdrawals</small></div>
            <div><span>Recovery outstanding</span><strong className="recovery-balance">{transactionsLoading && !transactions.length ? '—' : money(transactionFunds.recovery_outstanding)}</strong><small>Recovered from future eligible earnings</small></div>
          </div>
          {transactionError&&<div className="account-message error">{transactionError}</div>}
          {transactionsLoading&&!transactions.length?<div className="account-loading">Loading transaction history…</div>:!transactions.length?<div className="account-empty-state"><span>◷</span><div><strong>No transactions yet</strong><small>Your earnings and withdrawal activity will appear here as transactions are created.</small></div></div>:
          <div className="account-table-wrap"><table className="account-table"><thead><tr><th>DATE</th><th>TYPE</th><th>DESCRIPTION</th><th>STATUS</th><th>ADDITION / DEDUCTION</th><th>BALANCE</th><th>REFERENCE</th></tr></thead><tbody>
            {transactions.map(tx=><tr key={tx.id}><td>{dateTime(tx.created_at)}</td><td><span className={`account-tx-type ${tx.type}`}>{tx.type==='earning'?'Earning':tx.type==='reversal'?'Refund / Reversal':'Withdrawal'}</span></td><td><b>{tx.description}</b>{tx.lead_id&&<small>Lead #{tx.lead_id}</small>}{tx.reason&&<small>Reason: {tx.reason}</small>}</td><td><span className={`account-tx-status ${tx.status}`}>{tx.status==='reversed'?'Invalidated / Refunded':tx.status}</span></td><td><strong className={tx.direction==='credit'?'credit':tx.direction==='debit'?'debit':'neutral'}>{tx.direction==='credit'?'+':tx.direction==='debit'?'−':'•'}{money(tx.amount)}</strong></td><td><strong className="row-balance">{money(tx.balance_after)}</strong></td><td>{tx.transfer_reference||tx.rejection_reason||'—'}</td></tr>)}
          </tbody></table></div>}
        </section>}
        {tab==='settings'&&<section className="account-main-grid">
          <div className="account-left-column">
            <article className="account-card">
              <div className="account-card-head"><div><h2>Account information</h2><p>Your authenticated ProPulse account details.</p></div></div>
              {settingsError&&<div className="account-message error">{settingsError}</div>}
              {settingsLoading?<div className="account-loading">Loading account settings…</div>:<div className="settings-list">
                <div><span>Full name</span><strong>{me?.name||user?.name||'—'}</strong></div>
                <div><span>Email address</span><strong>{me?.email||user?.email||'—'}</strong></div>
                <div><span>Account role</span><strong>{String(me?.role||user?.role||'lead_partner').replace(/_/g,' ')}</strong></div>
                <div><span>Lead Partner status</span><strong>Active</strong></div>
              </div>}
            </article>
          </div>
          <aside className="account-right-column">
            <article className="account-side-card"><div className="verification-icon">✓</div><h3>Account active</h3><p>Your Lead Partner account is currently authenticated and active.</p><small>Secure session</small></article>
            <article className="account-side-card"><h3><span>ⓘ</span> Account guidance</h3><ul><li>Keep your email address current.</li><li>Keep payout details up to date.</li><li>Review transactions after processed payouts.</li><li>Use the withdrawal page for payout activity.</li></ul></article>
            <article className="account-support-card"><div><span>◉</span><div><small>FINANCE</small><strong>Review your withdrawals</strong><p>Open Earnings & Withdrawals to submit or track payout requests.</p></div></div><Link to="/lead-partner/withdrawals">View withdrawals →</Link></article>
          </aside>
        </section>}      </div>
    </main>
  </div>;
}
