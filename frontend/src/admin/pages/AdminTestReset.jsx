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
  const [launchPreview,setLaunchPreview]=useState(null)
  const [launchConfirmation,setLaunchConfirmation]=useState('')
  const [launchAcknowledged,setLaunchAcknowledged]=useState(false)
  const [launchBusy,setLaunchBusy]=useState(false)

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const [testData,launchData]=await Promise.all([
        authRequest('/admin/test-reset/preview'),
        authRequest('/admin/launch-cleanup/preview')
      ])
      setPreview(testData)
      setLaunchPreview(launchData)
    }
    catch(e){setError(e.message||'Failed to load reset status')}
    finally{setLoading(false)}
  }

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load()});return()=>{active=false}},[])

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

  const launchCounts=launchPreview?.counts||{}
  const readyForLaunch=Boolean(launchPreview?.allowed)&&launchAcknowledged&&
    launchConfirmation===launchPreview?.confirmation&&!launchBusy
  const runLaunchCleanup=async()=>{
    if(!readyForLaunch)return
    if(!window.confirm('This will permanently remove ALL non-admin accounts and ALL leads. Both admins remain. Old sheet imports will be disabled. This cannot be undone. Proceed?'))return
    setLaunchBusy(true);setError('');setMessage('')
    try{
      const result=await authRequest('/admin/launch-cleanup',{
        method:'POST',
        body:JSON.stringify({
          confirmation:launchConfirmation,
          acknowledged:launchAcknowledged,
          expected:{
            non_admin_users:launchCounts.non_admin_users,
            leads:launchCounts.leads,
            payments:launchCounts.payments,
            purchases:launchCounts.purchases
          }
        })
      })
      setLaunchPreview(result.after)
      setLaunchConfirmation('')
      setLaunchAcknowledged(false)
      await load()
      setMessage(`Launch cleanup complete. Removed ${result.deleted.users} non-admin users and ${result.deleted.leads} leads. Kept all administrators.`)
    }catch(e){setError(e.message||'Launch cleanup failed. Refresh the preview and review any blockers.')}
    finally{setLaunchBusy(false)}
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


    <section id="launch-cleanup" className="test-reset-panel danger launch-cleanup-panel">
      <div className="test-reset-panel-head">
        <div><span>ONE-TIME PRODUCTION CLEANUP</span><h2>Start live with clean accounts &amp; leads</h2></div>
        <small>{loading?'Checking safeguards…':launchPreview?.allowed?'Financial safeguards passed':'Review required'}</small>
      </div>
      <p>Remove business users, Lead Partners and all leads, including cancelled lead purchases and rejected payment records. All administrator accounts and platform configuration remain. Connected admin sheets are disabled, not deleted, so removed test leads cannot be reimported automatically.</p>
      <div className="launch-reset-counts" aria-live="polite">
        <div><span>Administrators preserved</span><strong>{loading?'—':launchCounts.admins??'—'}</strong></div>
        <div><span>Non-admin accounts deleted</span><strong>{loading?'—':launchCounts.non_admin_users??'—'}</strong></div>
        <div><span>Leads deleted</span><strong>{loading?'—':launchCounts.leads??'—'}</strong></div>
        <div><span>Cancelled purchases / rejected payments</span><strong>{loading?'—':`${launchCounts.purchases??0} / ${launchCounts.payments??0}`}</strong></div>
      </div>
      {!!launchPreview?.blockedReasons?.length&&(
        <div className="test-reset-disabled" role="alert">
          <strong>Cleanup unavailable while financial records require review:</strong>
          <ul>{launchPreview.blockedReasons.map(reason=><li key={reason}>{reason}</li>)}</ul>
        </div>
      )}
      <p className="launch-reset-warning"><strong>Permanent:</strong> {launchPreview?.warning||'Preview required before launch cleanup.'} Ensure your backup is available before continuing.</p>
      <label className="launch-reset-ack">
        <input type="checkbox" checked={launchAcknowledged} onChange={event=>setLaunchAcknowledged(event.target.checked)} />
        <span>I understand that deleted accounts, leads and their associated records cannot be restored from this screen, and my database backup is ready.</span>
      </label>
      <label>Type <strong>{launchPreview?.confirmation||'DELETE NON-ADMIN USERS AND LEADS'}</strong> to confirm
        <input value={launchConfirmation} onChange={event=>setLaunchConfirmation(event.target.value)}
          placeholder="DELETE NON-ADMIN USERS AND LEADS" autoComplete="off" spellCheck={false}/>
      </label>
      <button type="button" onClick={runLaunchCleanup} disabled={!readyForLaunch||loading}>
        {launchBusy?'Cleaning up…':'Delete Non-Admin Accounts & All Leads'}
      </button>
      <button type="button" className="launch-reset-refresh" onClick={load} disabled={launchBusy||loading}>Refresh safety preview</button>
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
