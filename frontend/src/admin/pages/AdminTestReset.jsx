import { useEffect, useMemo, useState } from 'react'
import { authRequest } from '../../utils/auth'
import './AdminTestReset.css'

const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`

export default function AdminTestReset(){
  const [preview,setPreview]=useState(null)
  const [confirmation,setConfirmation]=useState('')
  const [loading,setLoading]=useState(true)
  const [resetting,setResetting]=useState(false)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')

  const load=async()=>{
    setLoading(true);setError('')
    try{setPreview(await authRequest('/admin/test-reset/preview'))}
    catch(e){setError(e.message||'Failed to load reset status')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[])

  const items=useMemo(()=>preview?Object.values(preview.counts||{}):[],[preview])
  const hasData=items.some(item=>Number(item.count)>0)||Number(preview?.wallets?.nonZero)>0

  const runReset=async()=>{
    if(resetting||confirmation!=='RESET TEST DATA')return
    if(!window.confirm('Reset all test transaction data now? Users and configuration will be preserved. This cannot be undone.'))return
    setResetting(true);setError('');setMessage('')
    try{
      const result=await authRequest('/admin/test-reset',{method:'POST',body:JSON.stringify({confirmation})})
      setPreview(result.after)
      setConfirmation('')
      setMessage('Test transaction data reset successfully. You can start a fresh end-to-end test.')
    }catch(e){setError(e.message||'Reset failed')}
    finally{setResetting(false)}
  }

  return <main className="admin-test-reset">
    <section className="test-reset-hero">
      <div><span>TESTING TOOL</span><h1>Reset test data</h1><p>Return transactional flows to a clean state without deleting users or platform configuration.</p></div>
      <div className={`test-reset-state ${preview?.enabled?'enabled':'disabled'}`}><i/>{preview?.enabled?'Reset enabled':'Reset disabled'}</div>
    </section>

    {error&&<div className="test-reset-alert error">{error}</div>}
    {message&&<div className="test-reset-alert success">{message}</div>}

    <section className="test-reset-panel">
      <div className="test-reset-panel-head"><div><span>CURRENT TEST DATA</span><h2>What will be cleared</h2></div><small>{loading?'Checking…':hasData?'Transactional data detected':'Already clean'}</small></div>
      <div className="test-reset-grid">
        {items.map(item=><article key={item.label}><span>{item.label}</span><strong>{loading?'—':Number(item.count||0).toLocaleString('en-IN')}</strong></article>)}
        <article className="wallet-card"><span>Wallet balances</span><strong>{loading?'—':money(preview?.wallets?.totalBalance)}</strong><small>{Number(preview?.wallets?.nonZero||0)} non-zero wallets</small></article>
      </div>
    </section>

    <section className="test-reset-panel preserved">
      <div className="test-reset-panel-head"><div><span>PRESERVED</span><h2>What stays untouched</h2></div></div>
      <div className="test-reset-preserved">{(preview?.preserved||[]).map(item=><div key={item}><b>✓</b><span>{item}</span></div>)}</div>
    </section>

    <section className="test-reset-panel danger">
      <div className="test-reset-panel-head"><div><span>FULL TEST RESET</span><h2>Start testing from zero</h2></div></div>
      <p>This clears leads, purchased leads, membership claims, lead CRM/reports, payments, wallet history/top-ups, active memberships, Lead Partner earnings/payouts, investments, investor allocations/withdrawals and related transaction records. Wallet balances become ₹0.</p>
      {!preview?.enabled&&<div className="test-reset-disabled">Production safety is active. Set <code>ALLOW_ADMIN_DATA_RESET=true</code> only if this database is intentionally being used for testing.</div>}
      <label>Type <strong>RESET TEST DATA</strong> to confirm<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder="RESET TEST DATA" autoComplete="off"/></label>
      <button type="button" onClick={runReset} disabled={!preview?.enabled||confirmation!=='RESET TEST DATA'||resetting}>{resetting?'Resetting…':'Reset Test Transaction Data'}</button>
    </section>
  </main>
}
