import { useEffect, useState } from 'react'
import { authRequest } from '../utils/auth'
import './PayoutAccount.css'

export default function PayoutAccount(){
  const [account,setAccount]=useState(null)
  const [method,setMethod]=useState('bank')
  const [form,setForm]=useState({accountHolderName:'',accountNumber:'',ifscCode:'',bankName:'',upiId:''})
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')

  useEffect(()=>{
    authRequest('/investor/payout-account').then(result=>{setAccount(result);if(result?.method)setMethod(result.method)}).catch(e=>setError(e.message||'Unable to load payout account')).finally(()=>setLoading(false))
  },[])

  const update=(key,value)=>setForm(x=>({...x,[key]:value}))
  const save=async e=>{
    e.preventDefault();setSaving(true);setError('');setMessage('')
    try{
      const result=await authRequest('/investor/payout-account',{method:'POST',body:JSON.stringify({method,...form,ifscCode:form.ifscCode.toUpperCase()})})
      setAccount(result);setMessage('Payout account saved successfully.');
      setForm({accountHolderName:'',accountNumber:'',ifscCode:'',bankName:'',upiId:''})
    }catch(e){setError(e.message||'Unable to save payout account')}finally{setSaving(false)}
  }

  if(loading)return <main className="payout-account-page"><div className="payout-account-shell">Loading payout account…</div></main>
  return <main className="payout-account-page"><div className="payout-account-shell">
    <header className="payout-account-head"><div><span>PAYOUT ACCOUNT</span><h1>Where should we send your earnings?</h1><p>Add a bank account or UPI ID before requesting a transfer of non-auto-invest earnings.</p></div></header>
    {message&&<div className="payout-account-alert success">{message}</div>}{error&&<div className="payout-account-alert error">{error}</div>}
    {account&&<section className="payout-account-current"><div><span>CURRENT ACTIVE ACCOUNT</span><strong>{account.method==='upi'?'UPI':'Bank Account'}</strong></div><div>{account.method==='upi'?<b>{account.upi_id}</b>:<><b>{account.bank_name}</b><small>{account.account_holder_name} · {account.account_number_masked} · {account.ifsc_code}</small></>}</div></section>}
    <form className="payout-account-form" onSubmit={save}>
      <div className="payout-methods"><button type="button" className={method==='bank'?'selected':''} onClick={()=>setMethod('bank')}><b>Bank Account</b><small>Direct bank transfer</small></button><button type="button" className={method==='upi'?'selected':''} onClick={()=>setMethod('upi')}><b>UPI</b><small>Transfer to your UPI ID</small></button></div>
      {method==='bank'?<div className="payout-fields"><label>Account holder name<input value={form.accountHolderName} onChange={e=>update('accountHolderName',e.target.value)} required /></label><label>Bank name<input value={form.bankName} onChange={e=>update('bankName',e.target.value)} required /></label><label>Account number<input inputMode="numeric" value={form.accountNumber} onChange={e=>update('accountNumber',e.target.value.replace(/\D/g,''))} required /></label><label>IFSC code<input value={form.ifscCode} onChange={e=>update('ifscCode',e.target.value.toUpperCase())} maxLength="11" required /></label></div>:<label className="payout-upi-field">UPI ID<input placeholder="yourname@upi" value={form.upiId} onChange={e=>update('upiId',e.target.value)} required /><small>Example: name@okaxis, name@ybl</small></label>}
      <button className="payout-save" disabled={saving}>{saving?'Saving…':'Save payout account'} <span>→</span></button>
    </form>
  </div></main>
}
