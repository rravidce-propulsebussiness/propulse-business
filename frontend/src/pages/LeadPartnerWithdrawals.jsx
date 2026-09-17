import { useEffect,useMemo,useState } from 'react';
import { Link,useLocation,useNavigate } from 'react-router-dom';
import { authRequest,clearSession,getUser } from '../utils/auth';
import './LeadPartnerHome.css';
import './LeadPartnerAccount.css';

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function LeadPartnerWithdrawals(){
 const navigate=useNavigate(),location=useLocation(),user=getUser();
 const [funds,setFunds]=useState(null),[amount,setAmount]=useState(''),[notes,setNotes]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const initials=useMemo(()=>(user?.name||'Lead Partner').split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'LP',[user?.name]);

 async function load(){
   try{setLoading(true);setError('');setFunds(await authRequest('/lead-partner/funds'))}
   catch(e){setError(e.message||'Unable to load earnings and withdrawals')}
   finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 async function submit(e){
   e.preventDefault();setError('');setMessage('');setSaving(true);
   try{await authRequest('/lead-partner/withdrawals',{method:'POST',body:JSON.stringify({amount:Number(amount),notes})});setAmount('');setNotes('');setMessage('Withdrawal request submitted for Admin review.');await load()}
   catch(e){setError(e.message||'Unable to submit withdrawal')}
   finally{setSaving(false)}
 }
 function signOut(){clearSession();localStorage.removeItem('propulse_session_mode');navigate('/login',{replace:true})}
 const account=funds?.payout_account;
 return <div className="partner-shell">
  <aside className="partner-sidebar">
   <div className="partner-brand"><span className="partner-brand-mark">P</span><span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span></div>
   <div className="partner-nav-label">WORKSPACE</div>
   <nav className="partner-nav">
    <Link className={location.pathname==='/lead-partner'?'active':''} to="/lead-partner"><i>⌂</i><span>Overview</span></Link>
    <Link className={location.pathname.startsWith('/lead-partner/inventory')?'active':''} to="/lead-partner/inventory"><i>◈</i><span>Lead Inventory</span></Link>
    <Link className={location.pathname.startsWith('/lead-partner/pricing')?'active':''} to="/lead-partner/pricing"><i>₹</i><span>Pricing & Revenue</span></Link>
    <Link className={location.pathname.startsWith('/lead-partner/withdrawals')?'active':''} to="/lead-partner/withdrawals"><i>⇩</i><span>Earnings & Withdrawals</span></Link>
    <Link className={location.pathname.startsWith('/lead-partner/account')?'active':''} to="/lead-partner/account"><i>◎</i><span>Account</span></Link>
   </nav>
   <div className="partner-sidebar-bottom"><div className="partner-sidebar-user"><span>{initials}</span><div><b>{user?.name||'Lead Partner'}</b><small>{user?.email||'Partner account'}</small></div></div><button onClick={signOut}>↪ <span>Log out</span></button></div>
  </aside>
  <main className="partner-main">
   <header className="partner-topbar"><div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Earnings & Withdrawals</strong></div><div className="partner-top-status"><i/> Partner account</div></header>
   <div className="partner-content">
    <section className="partner-intro"><div><span className="partner-eyebrow">LEAD PARTNER PORTAL · FINANCE</span><h1>Earnings & Withdrawals</h1><p>Track eligible partner earnings and request payouts from the same ProPulse workspace.</p></div><div className="partner-live"><i/> Live earnings</div></section>
    {error&&<div className="partner-payout-message error">{error}</div>}
    {message&&<div className="partner-payout-message success">{message}</div>}
    {loading?<div className="partner-panel"><div className="partner-empty">Loading earnings…</div></div>:<>
      {Number(funds?.recovery_outstanding||0)>0&&<div className="partner-alert"><strong>Recovery adjustment: {money(funds.recovery_outstanding)}</strong><span>This amount is being recovered from future eligible earnings and is not available for withdrawal.</span></div>}
      <section className="partner-stats-grid">
       {[['Available',funds?.available],['Pending',funds?.reserved],['Paid',funds?.paid],['Recovery outstanding',funds?.recovery_outstanding]].map(([label,value])=><article key={label}><span>{label}</span><strong>{money(value)}</strong><small>{label==='Available'?'Eligible for a new withdrawal':label==='Pending'?'Awaiting Admin payout processing':label==='Paid'?'Successfully processed payouts':'Being recovered from future earnings'}</small></article>)}
      </section>
      <section className="partner-payout-grid">
       <article className="partner-panel">
        <div className="partner-panel-head"><div><span className="partner-kicker">WITHDRAW EARNINGS</span><h2>Request a payout</h2><p>Requests are reserved immediately and reviewed by Admin.</p></div></div>
        <form className="partner-payout-form" onSubmit={submit}>
         <label>Amount<input required min="0.01" max={funds?.available||0} step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
         <label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows="4" placeholder="Optional note for Admin"/></label>
         <button className="partner-payout-save" disabled={saving||!account||Number(amount)<=0||Number(amount)>Number(funds?.available||0)}>{saving?'Submitting…':'Request withdrawal'} <span>→</span></button>
         {!account&&<small style={{color:'#b54708'}}>Add a payout account in Account before requesting a withdrawal.</small>}
        </form>
       </article>
       <article className="partner-panel">
        <div className="partner-panel-head"><div><span className="partner-kicker">PAYOUT DESTINATION</span><h2>{account?'Active payout account':'No payout account'}</h2><p>{account?'Your saved destination will be used for approved payouts.':'Add a Bank Account or UPI to enable withdrawals.'}</p></div><Link className="partner-account-pill" to="/lead-partner/account">Manage account →</Link></div>
        {account?<div className="partner-payout-current">{account.method==='upi'?<div><span>UPI ID</span><strong>{account.upi_id}</strong></div>:<><div><span>ACCOUNT HOLDER</span><strong>{account.account_holder_name}</strong></div><div><span>BANK</span><strong>{account.bank_name}</strong></div><div><span>ACCOUNT NUMBER</span><strong>{account.account_number_masked}</strong></div><div><span>IFSC</span><strong>{account.ifsc_code}</strong></div></>}</div>:<div className="partner-empty"><Link to="/lead-partner/account">Add payout account →</Link></div>}
       </article>
      </section>
      <section className="partner-panel" style={{marginTop:20}}>
       <div className="partner-panel-head"><div><span className="partner-kicker">PAYOUT HISTORY</span><h2>Withdrawal history</h2><p>Pending, rejected and paid requests are retained here.</p></div></div>
       <div style={{overflowX:'auto'}}><table className="partner-table"><thead><tr>{['ID','Amount','Status','Method','Requested','Processed','Reference / Reason'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{(funds?.requests||[]).map(r=><tr key={r.id}><td>#{r.id}</td><td><b>{money(r.amount)}</b></td><td><span className={`partner-status ${r.status}`}>{r.status}</span></td><td>{r.payout_method||'—'}</td><td>{r.requested_at?new Date(r.requested_at).toLocaleString('en-IN'):'—'}</td><td>{r.processed_at?new Date(r.processed_at).toLocaleString('en-IN'):'—'}</td><td>{r.transfer_reference||r.rejection_reason||'—'}</td></tr>)}</tbody></table>{!(funds?.requests||[]).length&&<div className="partner-empty">No withdrawal requests yet.</div>}</div>
      </section>
    </>}
   </div>
  </main>
 </div>
}
