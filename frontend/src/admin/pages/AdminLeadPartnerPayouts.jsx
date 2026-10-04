import {useCallback,useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {authRequest} from '../../utils/auth';
import {openApiBlob} from '../../utils/api';
import {payoutProofError,readPayoutProofDataUrl} from '../utils/payoutProof';
import './AdminLeadPartnerPayouts.css';
import {formatInr,formatSnakeTitle} from '../utils/formatters';

const money=v=>formatInr(v,{minimumFractionDigits:2});
const date=v=>v?new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
const title=formatSnakeTitle;
const emptyTransfer=()=>({reference:'',proof:'',proofName:'',notes:''});

export default function AdminLeadPartnerPayouts(){
  const [params]=useSearchParams();
  const [rows,setRows]=useState([]);
  const [meta,setMeta]=useState({total:0,pages:1,stats:{}});
  const [page,setPage]=useState(1);
  const [partners,setPartners]=useState([]);
  const [status,setStatus]=useState('pending');
  const [search,setSearch]=useState(()=>params.get('search')||'');
  const [query,setQuery]=useState(()=>params.get('search')||'');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(null);
  const [selected,setSelected]=useState(null);
  const [transfer,setTransfer]=useState(emptyTransfer);
  const [reason,setReason]=useState('');
  const [directOpen,setDirectOpen]=useState(false);
  const [directPartnerId,setDirectPartnerId]=useState('');
  const [directAmount,setDirectAmount]=useState('');
  const [directDetails,setDirectDetails]=useState(null);
  const [directLoading,setDirectLoading]=useState(false);
  const [directTransfer,setDirectTransfer]=useState(emptyTransfer);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  const load=useCallback(async(nextPage=1)=>{
    setError('');
    setLoading(true);
    try{
      const [payouts,partnerData]=await Promise.all([
        authRequest(`/admin/lead-partner-payouts?status=${encodeURIComponent(status)}&search=${encodeURIComponent(query)}&page=${nextPage}&limit=50`),
        authRequest('/admin/lead-partners?status=active&limit=100')
      ]);
      setRows(Array.isArray(payouts?.items)?payouts.items:[]);
      setMeta({total:Number(payouts?.total||0),pages:Number(payouts?.pages||1),stats:payouts?.stats||{}});
      setPage(Number(payouts?.page||nextPage));
      setPartners(Array.isArray(partnerData?.partners)?partnerData.partners:[]);
    }catch(e){setError(e.message||'Failed to load partner payouts')}
    finally{setLoading(false)}
  },[query,status]);

  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)load(1)});return()=>{active=false}},[load]);

  const visibleRows=rows;
  const stats=useMemo(()=>({
    pending:Number(meta.stats?.pending_amount||0),
    pendingCount:Number(meta.stats?.pending_count||0),
    paid:Number(meta.stats?.paid_amount||0),
    paidCount:Number(meta.stats?.paid_count||0),
    rejectedCount:Number(meta.stats?.rejected_count||0),
    directCount:Number(meta.stats?.direct_count||0),
    totalCount:Number(meta.stats?.total_count||0)
  }),[meta.stats]);

  const selectedDirectPartner=useMemo(()=>partners.find(p=>String(p.id)===String(directPartnerId))||null,[partners,directPartnerId]);

  async function openStoredProof(payout){
    setError('');
    const basePath=`/admin/lead-partner-payouts/${payout.id}/proof`;
    try{
      await openApiBlob(`${basePath}/file`);
    }catch(streamError){
      try{
        const data=await authRequest(basePath);
        const source=String(data?.proof_url||'').trim();
        if(!source){setError('No payment proof is available for this payout.');return}
        const win=window.open('','_blank');
        if(!win){setError('Allow pop-ups to view the payment proof.');return}
        const doc=win.document;
        doc.title=`Payout #${payout.id} proof`;
        const style=doc.createElement('style');
        style.textContent='body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:95vw;max-height:95vh;object-fit:contain}';
        doc.head.appendChild(style);
        const image=doc.createElement('img');
        image.src=source;
        image.alt=`Payout #${payout.id} payment proof`;
        doc.body.replaceChildren(image);
      }catch(e){setError(e.message||streamError.message||'Unable to load payout proof')}
    }
  }

  async function readProof(event,setter){
    const file=event.target.files?.[0];
    if(!file)return;
    const validation=payoutProofError(file);
    if(validation){setError(validation);event.target.value='';return}
    setError('');
    try{
      const proof=await readPayoutProofDataUrl(file);
      setter(current=>({...current,proof,proofName:file.name}));
    }catch(error){
      setter(current=>({...current,proof:'',proofName:''}));
      setError(error.message||'Could not read the payment proof image.');
    }
  }

  function closeReview(){setSelected(null);setTransfer(emptyTransfer());setReason('')}

  async function process(action){
    if(!selected)return;
    setError('');setMessage('');
    if(action==='reject'&&!reason.trim()){setError('Enter a rejection reason before rejecting the payout.');return}
    if(action==='paid'&&!transfer.proof){setError('Upload the payment proof screenshot before marking the payout as paid.');return}
    if(action==='paid'&&!transfer.reference.trim()){setError('Transfer reference / UTR is required.');return}
    setBusy(`review-${selected.id}`);
    try{
      await authRequest(`/admin/lead-partner-payouts/${selected.id}`,{method:'PATCH',body:JSON.stringify(action==='paid'?{action,transferReference:transfer.reference,proofUrl:transfer.proof,notes:transfer.notes}:{action:'reject',rejectionReason:reason})});
      setMessage(action==='paid'?`Payout #${selected.id} marked paid successfully.`:`Payout #${selected.id} rejected and reserved earnings released.`);
      closeReview();
      await load(page);
    }catch(e){setError(e.message||'Failed to process payout')}
    finally{setBusy(null)}
  }

  async function chooseDirectPartner(value){
    setDirectPartnerId(value);
    setDirectDetails(null);
    setDirectAmount('');
    if(!value)return;
    setDirectLoading(true);
    try{setDirectDetails(await authRequest(`/admin/lead-partners/${value}/financials`))}
    catch(e){setError(e.message||'Failed to load partner payout details')}
    finally{setDirectLoading(false)}
  }

  function closeDirect(){
    setDirectOpen(false);setDirectPartnerId('');setDirectAmount('');setDirectDetails(null);setDirectTransfer(emptyTransfer());
  }

  async function submitDirect(){
    setError('');setMessage('');
    const amount=Number(directAmount);
    const available=Number(directDetails?.availableEarnings??selectedDirectPartner?.available_earnings??0);
    if(!directPartnerId){setError('Select a Lead Partner.');return}
    if(!Number.isFinite(amount)||amount<=0){setError('Enter a valid transfer amount.');return}
    if(amount>available+0.001){setError(`Transfer cannot exceed the available balance of ${money(available)}.`);return}
    if(!directTransfer.reference.trim()){setError('Transfer reference / UTR is required.');return}
    if(!directTransfer.proof){setError('Upload the payment proof screenshot.');return}
    setBusy('direct');
    try{
      const result=await authRequest('/admin/lead-partner-payouts/direct',{method:'POST',body:JSON.stringify({partnerId:Number(directPartnerId),amount,transferReference:directTransfer.reference,proofUrl:directTransfer.proof,notes:directTransfer.notes})});
      setMessage(`Direct transfer ${money(result.amount)} completed as payout #${result.id}.`);
      closeDirect();
      await load(page);
    }catch(e){setError(e.message||'Failed to complete direct transfer')}
    finally{setBusy(null)}
  }

  const submitSearch=e=>{e?.preventDefault();setPage(1);setQuery(search.trim())};

  return <main className="alpp-page">
    <section className="alpp-hero">
      <div>
        <span>PARTNER FINANCE / PAYOUT CONTROL</span>
        <h1>Partner payouts</h1>
        <p>Settle partner withdrawal requests or make a direct transfer from available earnings. Both actions use the same payout ledger, earning allocation and transfer history.</p>
      </div>
      <button type="button" onClick={()=>setDirectOpen(true)}><span>₹</span><div><b>Transfer amount</b><small>Pay a partner directly</small></div></button>
    </section>

    <section className="alpp-kpis">
      <article className="attention"><span>PENDING TRANSFER</span><strong>{money(stats.pending)}</strong><small>{stats.pendingCount} request{stats.pendingCount===1?'':'s'} waiting</small></article>
      <article><span>TOTAL TRANSFERRED</span><strong>{money(stats.paid)}</strong><small>{stats.paidCount} completed payouts</small></article>
      <article><span>DIRECT PAYOUTS</span><strong>{stats.directCount}</strong><small>Admin-initiated transfers</small></article>
      <article><span>REJECTED</span><strong>{stats.rejectedCount}</strong><small>Requests returned to balance</small></article>
    </section>

    {error&&<div className="alpp-alert error"><b>Action needed</b><span>{error}</span><button onClick={()=>setError('')}>×</button></div>}
    {message&&<div className="alpp-alert success"><b>Completed</b><span>{message}</span><button onClick={()=>setMessage('')}>×</button></div>}

    <section className="alpp-panel">
      <div className="alpp-panel-head">
        <div><span>TRANSFER LEDGER</span><h2>Payout activity</h2><p>Partner requests and direct admin transfers stay in one auditable history.</p></div>
        <form className="alpp-search" onSubmit={submitSearch}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search partner, email, payout ID or UTR"/>
          <button type="submit">Search</button>
          {query&&<button type="button" className="clear" onClick={()=>{setSearch('');setQuery('')}}>Clear</button>}
        </form>
      </div>

      <div className="alpp-tabs">
        {[['pending','Pending',stats.pendingCount],['paid','Paid',stats.paidCount],['rejected','Rejected',stats.rejectedCount],['all','All',stats.totalCount]].map(([key,label,count])=><button key={key} type="button" className={status===key?'active':''} onClick={()=>{setPage(1);setStatus(key)}}>{label}<b>{count}</b></button>)}
        <button type="button" className="refresh" onClick={()=>load(page)} disabled={loading}>↻ Refresh</button>
      </div>

      {loading?<div className="alpp-state"><div className="alpp-spinner"/>Loading payout ledger…</div>:!visibleRows.length?<div className="alpp-empty"><div>₹</div><h3>No payouts in this view</h3><p>{status==='pending'?'There are no partner withdrawal requests waiting for transfer.':'Try another status or clear the search.'}</p></div>:<div className="alpp-table-wrap">
        <table className="alpp-table">
          <thead><tr><th>PAYOUT</th><th>PARTNER</th><th>AMOUNT</th><th>SOURCE</th><th>METHOD</th><th>REQUESTED</th><th>STATUS</th><th>TRANSFER REF</th><th>ACTION</th></tr></thead>
          <tbody>{visibleRows.map(r=><tr key={r.id} className={r.status==='pending'?'pending-row':''}>
            <td><b>#{r.id}</b><small>{r.status==='paid'&&r.paid_at?`Paid ${date(r.paid_at)}`:'Payout record'}</small></td>
            <td><div className="alpp-person"><span>{String(r.user_name||'?').charAt(0).toUpperCase()}</span><div><b>{r.user_name||'Unnamed partner'}</b><small>{r.user_email||'—'}</small></div></div></td>
            <td><strong className="amount">{money(r.amount)}</strong></td>
            <td><span className={`alpp-source ${r.request_source||'partner'}`}>{(r.request_source||'partner')==='admin'?'Admin direct':'Partner request'}</span></td>
            <td><b>{String(r.payout_method||'—').toUpperCase()}</b></td>
            <td>{date(r.requested_at)}</td>
            <td><span className={`alpp-status ${r.status}`}>{title(r.status)}</span></td>
            <td><b>{r.transfer_reference||'—'}</b>{r.rejection_reason&&<small className="reason">{r.rejection_reason}</small>}</td>
            <td>{r.status==='pending'?<button className="review" type="button" onClick={()=>{setSelected(r);setTransfer(emptyTransfer());setReason('')}}>Review & transfer</button>:<div className="alpp-processed-actions"><span className="processed">Completed</span>{r.status==='paid'&&r.has_proof&&<button className="proof-link" type="button" onClick={()=>openStoredProof(r)}>View proof</button>}</div>}</td>
          </tr>)}</tbody>
        </table>
        {meta.pages>1&&<div className="alpp-pagination"><button type="button" disabled={loading||page<=1} onClick={()=>load(page-1)}>← Previous</button><span>Page <b>{page}</b> of <b>{meta.pages}</b> · {meta.total} records</span><button type="button" disabled={loading||page>=meta.pages} onClick={()=>load(page+1)}>Next →</button></div>}
      </div>}
    </section>

    {selected&&<div className="alpp-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeReview()}}>
      <section className="alpp-modal">
        <header><div><span>WITHDRAWAL REQUEST</span><h2>Review payout #{selected.id}</h2><p>Requested by {selected.user_name||selected.user_email}</p></div><button onClick={closeReview}>×</button></header>
        <div className="alpp-modal-body">
          <div className="alpp-review-grid"><article><span>AMOUNT DUE</span><strong>{money(selected.amount)}</strong></article><article><span>METHOD</span><strong>{String(selected.payout_method||'—').toUpperCase()}</strong></article><article><span>REQUESTED</span><strong>{date(selected.requested_at)}</strong></article></div>
          <PayoutAccount snapshot={selected.payout_account_snapshot}/>
          <TransferFields value={transfer} setValue={setTransfer} onProof={e=>readProof(e,setTransfer)}/>
          <div className="alpp-divider"><span>OR REJECT REQUEST</span></div>
          <label className="alpp-field"><span>Rejection reason</span><textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Required only when rejecting this request"/></label>
        </div>
        <footer><button className="ghost" onClick={closeReview}>Cancel</button><button className="danger" disabled={busy===`review-${selected.id}`} onClick={()=>process('reject')}>Reject request</button><button className="primary" disabled={busy===`review-${selected.id}`} onClick={()=>process('paid')}>{busy===`review-${selected.id}`?'Processing…':'Confirm transfer paid'}</button></footer>
      </section>
    </div>}

    {directOpen&&<div className="alpp-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)closeDirect()}}>
      <section className="alpp-modal direct">
        <header><div><span>DIRECT PARTNER TRANSFER</span><h2>Transfer available earnings</h2><p>This creates and settles a payout in the existing ledger in one operation.</p></div><button onClick={closeDirect} disabled={!!busy}>×</button></header>
        <div className="alpp-modal-body">
          <label className="alpp-field"><span>Lead Partner</span><select value={directPartnerId} onChange={e=>chooseDirectPartner(e.target.value)}><option value="">Select partner</option>{partners.map(p=><option key={p.id} value={p.id}>{p.user_name||p.business_name||`Partner #${p.id}`} · {p.user_email} · Available {money(p.available_earnings)}</option>)}</select></label>
          {directLoading?<div className="alpp-inline-loading">Loading partner balance and payout account…</div>:selectedDirectPartner&&<>
            <div className="alpp-direct-summary"><article><span>AVAILABLE NOW</span><strong>{money(directDetails?.availableEarnings??selectedDirectPartner.available_earnings)}</strong><small>Excludes amounts reserved by pending requests</small></article><article><span>PENDING REQUESTS</span><strong>{money(directDetails?.pendingTransfer??selectedDirectPartner.pending_transfer)}</strong><small>{selectedDirectPartner.pending_payout_count||0} request{Number(selectedDirectPartner.pending_payout_count||0)===1?'':'s'}</small></article></div>
            <PayoutAccount snapshot={directDetails?.partner?.payout_method==='upi'?{method:'upi',upi_id:directDetails?.partner?.upi_id}:directDetails?.partner?.payout_method==='bank'?{method:'bank',account_holder_name:directDetails?.partner?.account_holder_name,account_number:directDetails?.partner?.account_number,ifsc_code:directDetails?.partner?.ifsc_code,bank_name:directDetails?.partner?.bank_name}:null}/>
            <label className="alpp-field"><span>Transfer amount</span><div className="alpp-money-input"><b>₹</b><input type="number" min="0.01" step="0.01" max={Number((directDetails?.availableEarnings??selectedDirectPartner.available_earnings)||0)} value={directAmount} onChange={e=>setDirectAmount(e.target.value)} placeholder="0.00"/></div><small>Maximum available: {money(directDetails?.availableEarnings??selectedDirectPartner.available_earnings)}</small></label>
            <TransferFields value={directTransfer} setValue={setDirectTransfer} onProof={e=>readProof(e,setDirectTransfer)}/>
          </>}
        </div>
        <footer><button className="ghost" onClick={closeDirect} disabled={!!busy}>Cancel</button><button className="primary" disabled={busy==='direct'||!directPartnerId||directLoading} onClick={submitDirect}>{busy==='direct'?'Transferring…':'Complete direct transfer'}</button></footer>
      </section>
    </div>}
  </main>
}

function PayoutAccount({snapshot}){
  if(!snapshot)return <div className="alpp-account missing"><div><span>PAYOUT ACCOUNT</span><b>Not configured</b></div><p>This partner needs to add a payout account before money can be transferred.</p></div>;
  const bank=snapshot.method==='bank';
  return <div className="alpp-account"><div className="icon">{bank?'▣':'UPI'}</div><div><span>{bank?'BANK ACCOUNT':'UPI ACCOUNT'}</span><b>{bank?(snapshot.bank_name||snapshot.account_holder_name||'Bank transfer'):(snapshot.upi_id||'UPI')}</b><small>{bank?`${snapshot.account_holder_name||'—'} · ${snapshot.account_number||'—'} · ${snapshot.ifsc_code||'—'}`:'Transfer to the saved UPI ID'}</small></div></div>;
}

function TransferFields({value,setValue,onProof}){
  return <div className="alpp-transfer-fields">
    <label className="alpp-field"><span>Transfer reference / UTR</span><input value={value.reference} onChange={e=>setValue(c=>({...c,reference:e.target.value}))} placeholder="Enter bank reference or UTR"/></label>
    <label className="alpp-field"><span>Payment proof</span><div className="alpp-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={onProof}/><div><b>{value.proofName||'Upload payment screenshot'}</b><small>PNG, JPG or WebP · max 6 MB</small></div><strong>Choose file</strong></div></label>
    {value.proof&&<div className="alpp-proof"><img src={value.proof} alt="Payment proof preview"/><div><b>Proof ready</b><small>{value.proofName}</small></div></div>}
    <label className="alpp-field"><span>Internal note <em>optional</em></span><textarea value={value.notes} onChange={e=>setValue(c=>({...c,notes:e.target.value}))} placeholder="Add a note for finance history"/></label>
  </div>
}
