import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerAccount.css';

const emptyForm = { accountHolderName:'', accountNumber:'', ifscCode:'', bankName:'', upiId:'' };

function maskAccount(value){
  const raw = String(value || '').replace(/\D/g,'');
  return raw ? `•••• ${raw.slice(-4)}` : '••••';
}

export default function LeadPartnerAccount(){
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [account,setAccount] = useState(null);
  const [method,setMethod] = useState('bank');
  const [form,setForm] = useState(emptyForm);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  const initials = useMemo(
    () => (user?.name || 'Lead Partner').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'LP',
    [user?.name]
  );

  useEffect(()=>{
    authRequest('/lead-partner/payout-account')
      .then(result=>{
        setAccount(result);
        if(result?.method) setMethod(result.method);
        if(result?.method === 'upi'){
          setForm(current=>({...current, upiId:result.upi_id || ''}));
        }else if(result){
          setForm(current=>({
            ...current,
            accountHolderName:result.account_holder_name || '',
            bankName:result.bank_name || '',
            ifscCode:result.ifsc_code || ''
          }));
        }
      })
      .catch(e=>setError(e.message || 'Unable to load payout account'))
      .finally(()=>setLoading(false));
  },[]);

  const update=(key,value)=>setForm(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try{
      const result = await authRequest('/lead-partner/payout-account',{
        method:'POST',
        body:JSON.stringify({
          method,
          ...form,
          ifscCode:String(form.ifscCode || '').toUpperCase()
        })
      });
      setAccount(result);
      setMessage('Payout account saved successfully. It is now available for withdrawal requests.');
      setForm(current=>method==='upi'
        ? ({...emptyForm,upiId:result?.upi_id || current.upiId})
        : ({
            ...emptyForm,
            accountHolderName:result?.account_holder_name || current.accountHolderName,
            bankName:result?.bank_name || current.bankName,
            ifscCode:result?.ifsc_code || current.ifscCode
          }));
    }catch(e){
      setError(e.message || 'Unable to save payout account');
    }finally{
      setSaving(false);
    }
  }

  function chooseMethod(next){
    setMethod(next);
    setError('');
    setMessage('');
  }

  function signOut(){
    clearSession();
    localStorage.removeItem('propulse_session_mode');
    navigate('/login',{replace:true});
  }

  const verified = account?.is_verified === true;
  const statusText = loading ? 'Loading…' : !account ? 'Not configured' : verified ? 'Verified' : 'Verification pending';

  return <div className="account-shell">
    <aside className="account-sidebar">
      <div className="account-brand">
        <span className="account-brand-mark">P</span>
        <span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span>
      </div>
      <div className="account-nav-label">WORKSPACE</div>
      <nav className="account-nav">
        <Link className={location.pathname==='/lead-partner'?'active':''} to="/lead-partner"><i>⌂</i><span>Overview</span></Link>
        <Link className={location.pathname.startsWith('/lead-partner/inventory')?'active':''} to="/lead-partner/inventory"><i>◈</i><span>Lead Inventory</span></Link>
        <Link className={location.pathname.startsWith('/lead-partner/pricing')?'active':''} to="/lead-partner/pricing"><i>₹</i><span>Pricing & Revenue</span></Link>
        <Link className={location.pathname.startsWith('/lead-partner/withdrawals')?'active':''} to="/lead-partner/withdrawals"><i>⇩</i><span>Earnings & Withdrawals</span></Link>
        <Link className={location.pathname.startsWith('/lead-partner/account')?'active':''} to="/lead-partner/account"><i>◎</i><span>Account</span></Link>
      </nav>
      <div className="account-sidebar-bottom">
        <div className="account-user"><span>{initials}</span><div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div></div>
        <button onClick={signOut}>↪ <span>Log out</span></button>
      </div>
    </aside>

    <main className="account-main">
      <header className="account-topbar">
        <div className="account-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Account</strong></div>
        <div className="account-top-right"><span className="account-live-dot"/> <b>Partner account</b><span className="account-bell">●</span></div>
      </header>

      <div className="account-content">
        <section className="account-heading">
          <div>
            <span className="account-eyebrow">LEAD PARTNER PORTAL</span>
            <h1>Payout Account</h1>
            <p>Add or update the bank account or UPI ID where ProPulse can send your eligible partner earnings.</p>
          </div>
          <div className="account-secure"><span>✓</span><div><strong>Secure payout details</strong><small>Only masked payout information is shown in the portal.</small></div></div>
        </section>

        {message && <div className="account-message success">✓ {message}</div>}
        {error && <div className="account-message error">{error}</div>}

        <div className="account-tabs" role="tablist" aria-label="Account sections">
          <span className="active">▣ &nbsp;Payout Account</span>
          <span>◷ &nbsp;Transaction History</span>
          <span>⚙ &nbsp;Account Settings</span>
        </div>

        <section className="account-main-grid">
          <div className="account-left-column">
            <article className="account-card current-card">
              <div className="account-card-head">
                <div><span className="account-kicker">CURRENT PAYOUT CONFIGURATION</span><h2>Current payout account</h2></div>
                <span className={account ? (verified ? 'account-status verified' : 'account-status pending') : 'account-status idle'}>● {statusText}</span>
              </div>
              {loading ? <div className="account-loading">Loading payout configuration…</div> :
                account ? <div className="account-current-box">
                  <div className="account-bank-symbol">{account.method==='upi'?'@':'▥'}</div>
                  <div className="account-current-primary">
                    <strong>{account.method==='upi'?'UPI account':account.bank_name || 'Bank account'}</strong>
                    <span>{account.method==='upi' ? account.upi_id : maskAccount(account.account_number_masked)}</span>
                    <small>{account.method==='upi' ? 'UPI payout destination' : account.account_holder_name || 'Account holder'}</small>
                  </div>
                  <div className="account-current-details">
                    {account.method==='upi' ? <><span>Method <b>UPI</b></span><span>Status <b>{verified?'Verified':'Pending verification'}</b></span></> :
                      <><span>IFSC Code <b>{account.ifsc_code || '—'}</b></span><span>Bank <b>{account.bank_name || '—'}</b></span></>}
                  </div>
                  <div className="account-current-actions">
                    <button type="button" onClick={()=>document.getElementById('payout-form')?.scrollIntoView({behavior:'smooth',block:'center'})}>✎ Update</button>
                  </div>
                </div> :
                <div className="account-empty-state"><span>+</span><div><strong>No payout account yet</strong><small>Add a Bank Account or UPI destination below to enable withdrawal requests.</small></div></div>
              }
            </article>

            <article className="account-card edit-card" id="payout-form">
              <div className="account-card-head">
                <div><span className="account-kicker">ADD / UPDATE PAYOUT DETAILS</span><h2>{account ? 'Update payout details' : 'Add payout details'}</h2><p>Saving a new destination replaces the currently active payout account.</p></div>
              </div>

              <div className="account-methods">
                <button type="button" className={method==='bank'?'active':''} onClick={()=>chooseMethod('bank')}><span>▥</span><div><strong>Bank Account</strong><small>Direct bank transfer</small></div></button>
                <button type="button" className={method==='upi'?'active':''} onClick={()=>chooseMethod('upi')}><span>@</span><div><strong>UPI Account</strong><small>UPI transfer</small></div></button>
              </div>

              <form onSubmit={save}>
                {method==='bank' ? <div className="account-form-grid">
                  <label>Account holder name *<input value={form.accountHolderName} onChange={e=>update('accountHolderName',e.target.value)} placeholder="Enter account holder name" required /></label>
                  <label>Account number *<input inputMode="numeric" value={form.accountNumber} onChange={e=>update('accountNumber',e.target.value.replace(/\D/g,''))} placeholder={account?'Re-enter account number':'Enter account number'} required /></label>
                  <label>IFSC code *<input value={form.ifscCode} onChange={e=>update('ifscCode',e.target.value.toUpperCase())} maxLength="11" placeholder="Enter IFSC code" required /></label>
                  <label>Bank name *<input value={form.bankName} onChange={e=>update('bankName',e.target.value)} placeholder="Enter bank name" required /></label>
                </div> : <label className="account-upi-field">UPI ID *<input placeholder="yourname@upi" value={form.upiId} onChange={e=>update('upiId',e.target.value)} required /><small>Example: name@okaxis or name@ybl</small></label>}

                <div className="account-form-footer">
                  <div className="account-info-note"><span>i</span><p>Make sure the payout details are correct. Approved withdrawals are sent to this active destination.</p></div>
                  <button className="account-save" disabled={saving || loading}>{saving ? 'Saving…' : 'Save Payout Account'} <span>→</span></button>
                </div>
              </form>
            </article>

            <article className="account-privacy">
              <span>✓</span><div><strong>Your privacy matters</strong><p>Your account number is stored and displayed using masked details. Payout requests use the active destination saved to your account.</p></div>
            </article>
          </div>

          <aside className="account-right-column">
            <article className="account-side-card verification-card">
              <div className="verification-icon">{verified ? '✓' : '!'}</div>
              <h3>{verified ? 'Account Verified' : account ? 'Verification Pending' : 'Add Your Payout Account'}</h3>
              <p>{verified ? 'Your payout details have been verified for eligible payouts.' : account ? 'Your payout details are saved. Admin verification is still pending.' : 'Add a valid bank account or UPI ID to enable withdrawals.'}</p>
              {account && <small>{verified ? 'Verified account' : 'Awaiting verification'}</small>}
            </article>

            <article className="account-side-card">
              <h3><span>ⓘ</span> Important Information</h3>
              <ul>
                <li>Use a valid bank account or UPI ID.</li>
                <li>Make sure the account belongs to you.</li>
                <li>Saving a new destination replaces the active one.</li>
                <li>Only eligible partner earnings can be withdrawn.</li>
                <li>Pending withdrawals remain reserved until processed or rejected.</li>
              </ul>
            </article>

            <article className="account-support-card">
              <div><span>◉</span><div><small>NEED HELP?</small><strong>Questions about payouts?</strong><p>Use your withdrawal ID when contacting your ProPulse administrator.</p></div></div>
              <Link to="/lead-partner/withdrawals">Go to Withdrawals →</Link>
            </article>
          </aside>
        </section>
      </div>
    </main>
  </div>;
}
