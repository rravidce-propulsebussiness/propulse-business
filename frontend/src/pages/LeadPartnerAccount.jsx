import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerHome.css';
import './LeadPartnerAccount.css';

const emptyForm = { accountHolderName:'', accountNumber:'', ifscCode:'', bankName:'', upiId:'' };

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
  const initials = useMemo(() => (user?.name || 'Lead Partner').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'LP',[user?.name]);

  useEffect(()=>{
    authRequest('/lead-partner/payout-account')
      .then(result=>{ setAccount(result); if(result?.method) setMethod(result.method); })
      .catch(e=>setError(e.message || 'Unable to load payout account'))
      .finally(()=>setLoading(false));
  },[]);

  const update=(key,value)=>setForm(current=>({...current,[key]:value}));

  async function save(event){
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    try{
      const result = await authRequest('/lead-partner/payout-account',{method:'POST',body:JSON.stringify({method,...form,ifscCode:String(form.ifscCode||'').toUpperCase()})});
      setAccount(result); setMessage('Payout account saved successfully.'); setForm(emptyForm);
    }catch(e){ setError(e.message || 'Unable to save payout account'); }
    finally{ setSaving(false); }
  }

  function signOut(){ clearSession(); localStorage.removeItem('propulse_session_mode'); navigate('/login',{replace:true}); }

  return <div className="partner-shell">
    <aside className="partner-sidebar">
      <div className="partner-brand"><span className="partner-brand-mark">P</span><span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span></div>
      <div className="partner-nav-label">WORKSPACE</div>
      <nav className="partner-nav">
        <Link className={location.pathname==='/lead-partner'?'active':''} to="/lead-partner"><i>⌂</i><span>Overview</span></Link>
        <Link className={location.pathname.startsWith('/lead-partner/inventory')?'active':''} to="/lead-partner/inventory"><i>◈</i><span>Lead Inventory</span></Link>
        <Link className={location.pathname.startsWith('/lead-partner/pricing')?'active':''} to="/lead-partner/pricing"><i>₹</i><span>Pricing & Revenue</span></Link>
        <Link className={location.pathname.startsWith('/lead-partner/pricing')?'active':''} to="/lead-partner/pricing"><i>₹</i><span>Pricing & Revenue</span></Link><Link className={location.pathname.startsWith('/lead-partner/withdrawals')?'active':''} to="/lead-partner/withdrawals"><i>⇩</i><span>Earnings & Withdrawals</span></Link><Link className={location.pathname.startsWith('/lead-partner/account')?'active':''} to="/lead-partner/account"><i>◎</i><span>Account</span></Link>
      </nav>
      <div className="partner-sidebar-bottom"><div className="partner-sidebar-user"><span>{initials}</span><div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div></div><button onClick={signOut}>↪ <span>Log out</span></button></div>
    </aside>
    <main className="partner-main">
      <header className="partner-topbar"><div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Account</strong></div><div className="partner-top-status"><i /> Partner account</div></header>
      <div className="partner-content">
        <section className="partner-intro"><div><span className="partner-eyebrow">LEAD PARTNER PORTAL · ACCOUNT</span><h1>Payout Account</h1><p>Add the bank account or UPI ID where ProPulse can send your partner earnings.</p></div><div className="partner-live"><i /> Secure payout details</div></section>
        {message && <div className="partner-payout-message success">{message}</div>}
        {error && <div className="partner-payout-message error">{error}</div>}
        <section className="partner-payout-grid">
          <article className="partner-panel">
            <div className="partner-panel-head"><div><span className="partner-kicker">ACTIVE PAYOUT ACCOUNT</span><h2>{loading ? 'Loading…' : account ? (account.method==='upi'?'UPI account':'Bank account') : 'Not added yet'}</h2><p>{account ? 'Your active payout destination is shown below in masked form.' : 'Add a payout destination before requesting a withdrawal.'}</p></div>{account?.is_verified ? <span className="partner-account-pill">Verified</span> : account ? <span className="partner-badge">Verification pending</span> : null}</div>
            {account ? <div className="partner-payout-current">{account.method==='upi' ? <><div><span>UPI ID</span><strong>{account.upi_id}</strong></div></> : <><div><span>ACCOUNT HOLDER</span><strong>{account.account_holder_name}</strong></div><div><span>BANK</span><strong>{account.bank_name}</strong></div><div><span>ACCOUNT NUMBER</span><strong>{account.account_number_masked}</strong></div><div><span>IFSC</span><strong>{account.ifsc_code}</strong></div></>}</div> : <div className="partner-empty">No payout account has been added.</div>}
          </article>
          <article className="partner-panel">
            <div className="partner-panel-head"><div><span className="partner-kicker">ADD / REPLACE</span><h2>Payout destination</h2><p>Saving a new destination replaces the currently active one.</p></div></div>
            <form className="partner-payout-form" onSubmit={save}>
              <div className="partner-payout-methods"><button type="button" className={method==='bank'?'selected':''} onClick={()=>setMethod('bank')}><b>Bank Account</b><small>Direct bank transfer</small></button><button type="button" className={method==='upi'?'selected':''} onClick={()=>setMethod('upi')}><b>UPI</b><small>Instant UPI transfer</small></button></div>
              {method==='bank' ? <div className="partner-payout-fields"><label>Account holder name<input value={form.accountHolderName} onChange={e=>update('accountHolderName',e.target.value)} required /></label><label>Bank name<input value={form.bankName} onChange={e=>update('bankName',e.target.value)} required /></label><label>Account number<input inputMode="numeric" value={form.accountNumber} onChange={e=>update('accountNumber',e.target.value.replace(/\D/g,''))} required /></label><label>IFSC code<input value={form.ifscCode} onChange={e=>update('ifscCode',e.target.value.toUpperCase())} maxLength="11" required /></label></div> : <label className="partner-payout-upi">UPI ID<input placeholder="yourname@upi" value={form.upiId} onChange={e=>update('upiId',e.target.value)} required /><small>Example: name@okaxis or name@ybl</small></label>}
              <button className="partner-payout-save" disabled={saving}>{saving?'Saving…':'Save payout account'} <span>→</span></button>
            </form>
          </article>
        </section>
      </div>
    </main>
  </div>
}
