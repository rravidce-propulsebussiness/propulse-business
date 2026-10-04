import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../utils/api'
import { getToken } from '../../utils/auth'
import './AdminPaymentDetails.css'

const empty={
  label:'',
  methodType:'upi',
  accountName:'',
  upiId:'',
  bankName:'',
  accountNumber:'',
  ifscCode:'',
  branchName:'',
  qrCode:'',
  instructions:'',
  isActive:true,
  sortOrder:0
}

const methodLabel=value=>value==='both'?'UPI + Bank':value==='bank'?'Bank':'UPI'
const isImageSource=value=>{
  const source=String(value||'').trim()
  return /^data:image\//i.test(source)||/^https?:\/\//i.test(source)
}

export default function AdminPaymentDetails(){
  const [items,setItems]=useState([])
  const [form,setForm]=useState(empty)
  const [editing,setEditing]=useState(null)
  const [open,setOpen]=useState(false)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [copied,setCopied]=useState('')
  const [options,setOptions]=useState({offlineEnabled:true,onlineEnabled:false,onlineDisplayMode:'coming_soon',onlineLabel:'Pay Online',onlineComingSoonMessage:'Online payment is coming soon.',offlineLabel:'UPI / Bank Transfer'})
  const [savingOptions,setSavingOptions]=useState(false)

  const load=async()=>{
    try{
      setLoading(true)
      setError('')
      const [data,paymentOptions]=await Promise.all([apiRequest('/payment-receiving-details/admin'),apiRequest('/payment-receiving-details/admin/options')])
      setItems(Array.isArray(data)?data:[])
      if(paymentOptions)setOptions(paymentOptions)
    }catch(e){
      setError(e.message||'Failed to load receiving details')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{
    let active=true
    queueMicrotask(()=>{if(active&&getToken())load()})
    return()=>{active=false}
  },[])

  useEffect(()=>{
    if(!open)return undefined
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKeyDown=event=>{
      if(event.key==='Escape'&&!busy){
        setOpen(false)
        setEditing(null)
        setForm(empty)
      }
    }
    window.addEventListener('keydown',onKeyDown)
    return()=>{
      document.body.style.overflow=previousOverflow
      window.removeEventListener('keydown',onKeyDown)
    }
  },[open,busy])

  const stats=useMemo(()=>({
    total:items.length,
    active:items.filter(item=>item.is_active).length,
    upi:items.filter(item=>['upi','both'].includes(item.method_type)).length,
    bank:items.filter(item=>['bank','both'].includes(item.method_type)).length
  }),[items])

  const set=(key,value)=>setForm(current=>({...current,[key]:value}))

  const edit=item=>{
    setEditing(item.id)
    setForm({
      label:item.label||'',
      methodType:item.method_type||'upi',
      accountName:item.account_name||'',
      upiId:item.upi_id||'',
      bankName:item.bank_name||'',
      accountNumber:item.account_number||'',
      ifscCode:item.ifsc_code||'',
      branchName:item.branch_name||'',
      qrCode:item.qr_code||'',
      instructions:item.instructions||'',
      isActive:item.is_active!==false,
      sortOrder:Number(item.sort_order||0)
    })
    setOpen(true)
    setMessage('')
    setError('')
  }

  const add=()=>{
    setEditing(null)
    setForm(empty)
    setOpen(true)
    setMessage('')
    setError('')
  }

  const close=()=>{
    if(busy)return
    setOpen(false)
    setEditing(null)
    setForm(empty)
  }

  const save=async event=>{
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try{
      const body={...form,sortOrder:Number(form.sortOrder)||0}
      const data=editing
        ?await apiRequest(`/payment-receiving-details/admin/${editing}`,{method:'PATCH',body:JSON.stringify(body)})
        :await apiRequest('/payment-receiving-details/admin',{method:'POST',body:JSON.stringify(body)})
      setItems(list=>(editing?list.map(item=>item.id===editing?data:item):[...list,data]).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||Number(a.id||0)-Number(b.id||0)))
      setOpen(false)
      setMessage(editing?'Payment account updated.':'Payment account added.')
      setForm(empty)
      setEditing(null)
    }catch(e){
      setError(e.message||'Failed to save payment account')
    }finally{
      setBusy(false)
    }
  }

  const remove=async item=>{
    if(!window.confirm(`Remove "${item.label}"? Customers will no longer be able to use this receiving account.`))return
    try{
      setBusy(true)
      setError('')
      await apiRequest(`/payment-receiving-details/admin/${item.id}`,{method:'DELETE'})
      setItems(list=>list.filter(current=>current.id!==item.id))
      setMessage('Payment account removed.')
    }catch(e){
      setError(e.message||'Failed to remove payment account')
    }finally{
      setBusy(false)
    }
  }

  const saveOptions=async()=>{
    try{
      setSavingOptions(true);setError('');setMessage('')
      const saved=await apiRequest('/payment-receiving-details/admin/options',{method:'PUT',body:JSON.stringify(options)})
      setOptions(saved);setMessage('Payment availability updated.')
    }catch(e){setError(e.message||'Failed to update payment availability')}
    finally{setSavingOptions(false)}
  }

  const copy=async(value,key)=>{
    const text=String(value||'').trim()
    if(!text)return
    try{
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(()=>setCopied(current=>current===key?'':current),1400)
    }catch{
      setError('Could not copy to clipboard.')
    }
  }

  return <section className="admin-payment-details premium-receiving-page">
    <section className="receiving-premium-hero">
      <div className="receiving-hero-copy">
        <span>FINANCE SETUP / CUSTOMER PAYMENT DESTINATIONS</span>
        <h1>Payment Receiving</h1>
        <p>Control the UPI and bank accounts customers see when they add wallet balance or make a manual payment.</p>
      </div>
      <div className="receiving-hero-actions">
        <div className="receiving-hero-live"><i/><div><strong>{stats.active}</strong><span>customer-visible</span></div></div>
        <button type="button" onClick={add}>＋ Add account</button>
      </div>
    </section>

    <section className="receiving-kpi-grid">
      <article className="receiving-kpi total"><div className="receiving-kpi-icon">Σ</div><div><span>Total accounts</span><strong>{stats.total}</strong><small>Configured destinations</small></div></article>
      <article className="receiving-kpi active"><div className="receiving-kpi-icon">✓</div><div><span>Visible</span><strong>{stats.active}</strong><small>Shown to customers</small></div></article>
      <article className="receiving-kpi upi"><div className="receiving-kpi-icon">U</div><div><span>UPI enabled</span><strong>{stats.upi}</strong><small>UPI-capable accounts</small></div></article>
      <article className="receiving-kpi bank"><div className="receiving-kpi-icon">B</div><div><span>Bank enabled</span><strong>{stats.bank}</strong><small>Bank-transfer accounts</small></div></article>
    </section>

    {error&&<div className="apd-alert error">{error}</div>}
    {message&&<div className="apd-alert success">{message}</div>}

    <section className="payment-availability-panel">
      <div className="payment-availability-head"><div><span>PAYMENT AVAILABILITY</span><h2>Customer payment modes</h2><p>Control online gateway and manual UPI / bank payments independently.</p></div><button type="button" onClick={saveOptions} disabled={savingOptions}>{savingOptions?'Saving…':'Save payment modes'}</button></div>
      <div className="payment-availability-grid">
        <article className={`payment-mode-card ${options.onlineEnabled?'live':options.onlineDisplayMode==='coming_soon'?'soon':'off'}`}>
          <div className="payment-mode-card-head"><div className="payment-mode-symbol">⚡</div><div><span>ONLINE GATEWAY</span><h3>{options.onlineLabel||'Pay Online'}</h3></div><label className="payment-toggle"><input type="checkbox" checked={Boolean(options.onlineEnabled)} onChange={e=>setOptions(v=>({...v,onlineEnabled:e.target.checked,onlineDisplayMode:e.target.checked?'live':v.onlineDisplayMode==='live'?'coming_soon':v.onlineDisplayMode}))}/><i/></label></div>
          <p>{options.onlineEnabled?'Customers can start Razorpay checkout now.':'Online checkout is disabled. Choose whether customers should see Coming Soon or nothing.'}</p>
          {!options.onlineEnabled&&<label className="payment-mode-field">When disabled<select value={options.onlineDisplayMode==='live'?'coming_soon':options.onlineDisplayMode} onChange={e=>setOptions(v=>({...v,onlineDisplayMode:e.target.value}))}><option value="coming_soon">Show “Coming Soon”</option><option value="hidden">Hide online payment</option></select></label>}
          <label className="payment-mode-field">Button label<input maxLength="80" value={options.onlineLabel||''} onChange={e=>setOptions(v=>({...v,onlineLabel:e.target.value}))}/></label>
          {!options.onlineEnabled&&options.onlineDisplayMode==='coming_soon'&&<label className="payment-mode-field">Coming Soon message<input maxLength="220" value={options.onlineComingSoonMessage||''} onChange={e=>setOptions(v=>({...v,onlineComingSoonMessage:e.target.value}))}/></label>}
        </article>
        <article className={`payment-mode-card ${options.offlineEnabled?'live':'off'}`}>
          <div className="payment-mode-card-head"><div className="payment-mode-symbol">₹</div><div><span>OFFLINE / MANUAL</span><h3>{options.offlineLabel||'UPI / Bank Transfer'}</h3></div><label className="payment-toggle"><input type="checkbox" checked={Boolean(options.offlineEnabled)} onChange={e=>setOptions(v=>({...v,offlineEnabled:e.target.checked}))}/><i/></label></div>
          <p>{options.offlineEnabled?'Customers can use configured UPI / bank accounts and submit UTR / proof.':'Manual UPI / bank payment is disabled across checkout APIs.'}</p>
          <label className="payment-mode-field">Customer label<input maxLength="80" value={options.offlineLabel||''} onChange={e=>setOptions(v=>({...v,offlineLabel:e.target.value}))}/></label>
        </article>
      </div>
      {options.onlineEnabled&&options.gatewayConfigured===false&&<div className="payment-availability-warning">Online payment is enabled, but Razorpay credentials are not configured on the backend. Customers will not be allowed to start online checkout until the gateway is configured.</div>}
      {!options.onlineEnabled&&!options.offlineEnabled&&<div className="payment-availability-warning">Both payment methods are disabled. Wallet-only and zero-payable transactions can still complete, but customers cannot pay an external amount.</div>}
    </section>

    <section className="receiving-accounts-panel">
      <div className="receiving-panel-head">
        <div><span>RECEIVING ACCOUNTS</span><h2>Customer payment destinations</h2></div>
        <div className="receiving-panel-meta"><span>{stats.total} configured</span><span>{stats.active} visible</span></div>
      </div>

      {loading?<div className="apd-empty premium-apd-empty"><span className="receiving-loading-ring"/><strong>Loading payment accounts…</strong></div>
        :!items.length?<div className="apd-empty premium-apd-empty"><div className="receiving-empty-icon">₹</div><strong>No receiving account configured</strong><small>Add a UPI ID, bank account, or both so customers know where to pay.</small><button type="button" onClick={add}>＋ Add first account</button></div>
        :<div className="apd-list premium-receiving-grid">
          {items.map((item,index)=><article className={`apd-card premium-receiving-card ${item.is_active?'active':'inactive'}`} key={item.id}>
            <div className="receiving-card-head">
              <div className="receiving-card-title">
                <div className={`receiving-method-icon ${item.method_type}`}>{item.method_type==='bank'?'B':item.method_type==='both'?'₹':'U'}</div>
                <div>
                  <span>ACCOUNT #{item.id}</span>
                  <h3>{item.label}</h3>
                  <small>{methodLabel(item.method_type)} · Priority {Number(item.sort_order||0)}</small>
                </div>
              </div>
              <div className={`receiving-visibility ${item.is_active?'visible':'hidden'}`}><i/>{item.is_active?'Visible':'Hidden'}</div>
            </div>

            <div className="receiving-method-summary">
              {item.account_name&&<div><span>Account name</span><strong>{item.account_name}</strong></div>}
              {item.upi_id&&<div className="copyable"><span>UPI ID</span><strong>{item.upi_id}</strong><button type="button" onClick={()=>copy(item.upi_id,`upi-${item.id}`)}>{copied===`upi-${item.id}`?'Copied':'Copy'}</button></div>}
              {item.bank_name&&<div><span>Bank</span><strong>{item.bank_name}</strong></div>}
              {item.account_number&&<div className="copyable"><span>Account number</span><strong>{item.account_number}</strong><button type="button" onClick={()=>copy(item.account_number,`account-${item.id}`)}>{copied===`account-${item.id}`?'Copied':'Copy'}</button></div>}
              {item.ifsc_code&&<div className="copyable"><span>IFSC</span><strong>{item.ifsc_code}</strong><button type="button" onClick={()=>copy(item.ifsc_code,`ifsc-${item.id}`)}>{copied===`ifsc-${item.id}`?'Copied':'Copy'}</button></div>}
              {item.branch_name&&<div><span>Branch</span><strong>{item.branch_name}</strong></div>}
            </div>

            {(item.qr_code||item.instructions)&&<div className="receiving-customer-preview">
              {item.qr_code&&<div className="receiving-qr-preview">
                {isImageSource(item.qr_code)?<img src={item.qr_code} alt={`${item.label} payment QR`}/>:<div className="receiving-qr-placeholder">QR</div>}
                <div><span>Customer QR</span><strong>{isImageSource(item.qr_code)?'Preview available':'QR data configured'}</strong></div>
              </div>}
              {item.instructions&&<div className="receiving-instructions"><span>Customer instructions</span><p>{item.instructions}</p></div>}
            </div>}

            <div className="receiving-card-foot">
              <div><span>Display order</span><strong>#{index+1}</strong></div>
              <div className="apd-actions">
                <button type="button" onClick={()=>edit(item)}>Edit account</button>
                <button type="button" className="danger" onClick={()=>remove(item)} disabled={busy}>Remove</button>
              </div>
            </div>
          </article>)}
        </div>}
    </section>

    {open&&<div className="apd-backdrop" onClick={close}>
      <form className="apd-modal premium-receiving-modal" onSubmit={save} onClick={event=>event.stopPropagation()}>
        <div className="receiving-modal-head">
          <div><span>RECEIVING ACCOUNT</span><h3>{editing?'Edit payment destination':'Add payment destination'}</h3><p>Configure exactly what customers should see while making a manual payment.</p></div>
          <button type="button" className="apd-close" onClick={close}>×</button>
        </div>

        <div className="receiving-modal-body">
          <section className="receiving-form-section">
            <div className="receiving-form-section-title"><span>01</span><div><strong>Account identity</strong><small>Name, method and display priority</small></div></div>
            <div className="apd-form-grid">
              <label>Label<input required value={form.label} onChange={event=>set('label',event.target.value)} placeholder="Propulse Main Account"/></label>
              <label>Method<select value={form.methodType} onChange={event=>set('methodType',event.target.value)}><option value="upi">UPI</option><option value="bank">Bank</option><option value="both">UPI + Bank</option></select></label>
              <label>Account name<input value={form.accountName} onChange={event=>set('accountName',event.target.value)} placeholder="Propulse Business"/></label>
              <label>Display priority<input type="number" min="0" step="1" value={form.sortOrder} onChange={event=>set('sortOrder',event.target.value)} placeholder="0"/></label>
            </div>
          </section>

          {['upi','both'].includes(form.methodType)&&<section className="receiving-form-section">
            <div className="receiving-form-section-title"><span>02</span><div><strong>UPI details</strong><small>UPI destination and optional QR</small></div></div>
            <div className="apd-form-grid">
              <label>UPI ID<input value={form.upiId} onChange={event=>set('upiId',event.target.value)} placeholder="business@upi"/></label>
              <label>QR code URL / data<input value={form.qrCode} onChange={event=>set('qrCode',event.target.value)} placeholder="Optional image URL or QR data"/></label>
            </div>
          </section>}

          {['bank','both'].includes(form.methodType)&&<section className="receiving-form-section">
            <div className="receiving-form-section-title"><span>{form.methodType==='both'?'03':'02'}</span><div><strong>Bank details</strong><small>Transfer destination shown to customers</small></div></div>
            <div className="apd-form-grid">
              <label>Bank name<input value={form.bankName} onChange={event=>set('bankName',event.target.value)}/></label>
              <label>Account number<input value={form.accountNumber} onChange={event=>set('accountNumber',event.target.value)}/></label>
              <label>IFSC code<input value={form.ifscCode} onChange={event=>set('ifscCode',event.target.value)} placeholder="ABCD0123456"/></label>
              <label>Branch<input value={form.branchName} onChange={event=>set('branchName',event.target.value)}/></label>
            </div>
          </section>}

          <section className="receiving-form-section">
            <div className="receiving-form-section-title"><span>{form.methodType==='both'?'04':'03'}</span><div><strong>Customer experience</strong><small>Visibility and payment instructions</small></div></div>
            <div className="apd-form-grid">
              <label className="wide">Customer instructions<textarea value={form.instructions} onChange={event=>set('instructions',event.target.value)} placeholder="Use this UPI / bank account to add wallet balance. Add your UTR after payment."/></label>
              <label className="check receiving-visibility-control"><input type="checkbox" checked={form.isActive} onChange={event=>set('isActive',event.target.checked)}/><span><strong>Show this account to customers</strong><small>Turn this off to keep the account saved without publishing it.</small></span></label>
            </div>
          </section>
        </div>

        <div className="apd-modal-actions">
          <button type="button" onClick={close}>Cancel</button>
          <button className="primary" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Add account'}</button>
        </div>
      </form>
    </div>}
  </section>
}
