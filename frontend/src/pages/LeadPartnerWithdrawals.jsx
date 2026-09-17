import { useEffect,useState } from 'react';
import { authRequest } from '../utils/auth';

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function LeadPartnerWithdrawals(){
 const [funds,setFunds]=useState(null),[amount,setAmount]=useState(''),[notes,setNotes]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=()=>{setLoading(true);authRequest('/lead-partner/funds').then(setFunds).catch(e=>setError(e.message||'Failed to load funds')).finally(()=>setLoading(false));};
 useEffect(load,[]);
 const submit=async e=>{e.preventDefault();setError('');setMessage('');setSaving(true);try{await authRequest('/lead-partner/withdrawals',{method:'POST',body:JSON.stringify({amount:Number(amount),notes})});setAmount('');setNotes('');setMessage('Withdrawal request submitted for Admin review.');load();}catch(e){setError(e.message||'Failed to submit withdrawal');}finally{setSaving(false)}};
 if(loading)return <div style={{padding:32}}>Loading withdrawals…</div>;
 const account=funds?.payout_account;
 return <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px',fontFamily:'inherit'}}>
  <h1 style={{marginBottom:6}}>Earnings & Withdrawals</h1><p style={{color:'#667085',marginTop:0}}>Withdraw eligible Lead Partner earnings to your saved Bank Account or UPI.</p>
  {error&&<div style={{padding:12,background:'#fff1f0',color:'#b42318',borderRadius:10,marginBottom:16}}>{error}</div>}
  {message&&<div style={{padding:12,background:'#ecfdf3',color:'#027a48',borderRadius:10,marginBottom:16}}>{message}</div>}
  {Number(funds?.recovery_outstanding||0)>0&&<div style={{padding:14,background:'#fff8e6',color:'#8a5a00',border:'1px solid #f5d48a',borderRadius:12,marginBottom:18}}><b>Recovery adjustment: {money(funds.recovery_outstanding)}</b><div style={{fontSize:13,marginTop:4}}>This amount is being recovered from future eligible earnings and is not available for withdrawal.</div></div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:14,marginBottom:24}}>
   {[['Available',funds?.available],['Pending',funds?.reserved],['Paid',funds?.paid],['Recovery outstanding',funds?.recovery_outstanding]].map(([label,value])=><div key={label} style={{padding:20,border:'1px solid #e4e7ec',borderRadius:14}}><div style={{fontSize:13,color:'#667085'}}>{label}</div><strong style={{display:'block',fontSize:25,marginTop:7}}>{money(value)}</strong></div>)}
  </div>
  <div style={{display:'grid',gridTemplateColumns:'minmax(280px,1fr) minmax(320px,1fr)',gap:20,alignItems:'start'}}>
   <section style={{border:'1px solid #e4e7ec',borderRadius:14,padding:20}}><h2 style={{fontSize:18,marginTop:0}}>Request withdrawal</h2><p style={{fontSize:13,color:'#667085'}}>Available now: {money(funds?.available)}</p>
    <form onSubmit={submit}><label>Amount<input required min="0.01" max={funds?.available||0} step="0.01" type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={input}/></label><label style={{display:'block',marginTop:14}}>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows="3" style={input}/></label><button disabled={saving||!account||Number(amount)<=0||Number(amount)>Number(funds?.available||0)} style={button}>{saving?'Submitting…':'Request withdrawal'}</button>{!account&&<p style={{color:'#b54708',fontSize:13}}>Add a payout account before withdrawing.</p>}</form>
   </section>
   <section style={{border:'1px solid #e4e7ec',borderRadius:14,padding:20}}><h2 style={{fontSize:18,marginTop:0}}>Payout account</h2>{account?<pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',color:'#344054'}}>{account.method==='upi'?`UPI\n${account.upi_id}`:`Bank Account\n${account.account_holder_name}\n${account.bank_name}\n${account.ifsc_code}\n${account.account_number_masked}`}</pre>:<p style={{color:'#667085'}}>No active payout account.</p>}</section>
  </div>
  <section style={{marginTop:24,border:'1px solid #e4e7ec',borderRadius:14,padding:20}}><h2 style={{fontSize:18}}>Withdrawal history</h2><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['ID','Amount','Status','Method','Requested','Processed','Reference'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{(funds?.requests||[]).map(r=><tr key={r.id}>{[r.id,money(r.amount),r.status,r.payout_method,r.requested_at?new Date(r.requested_at).toLocaleString():'—',r.processed_at?new Date(r.processed_at).toLocaleString():'—',r.transfer_reference||r.rejection_reason||'—'].map((x,i)=><td key={i} style={td}>{x}</td>)}</tr>)}</tbody></table></div></section>
 </div>
}
const input={width:'100%',boxSizing:'border-box',padding:11,border:'1px solid #d0d5dd',borderRadius:9,marginTop:6};
const button={marginTop:16,padding:'11px 16px',border:0,borderRadius:9,cursor:'pointer'};
const th={textAlign:'left',padding:10,borderBottom:'1px solid #e4e7ec',fontSize:12};const td={padding:10,borderBottom:'1px solid #f2f4f7',fontSize:13};
