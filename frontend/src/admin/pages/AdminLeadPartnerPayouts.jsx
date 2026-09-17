import {useEffect,useState} from 'react';
import {authRequest} from '../../utils/auth';

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function AdminLeadPartnerPayouts(){
  const [rows,setRows]=useState([]),[status,setStatus]=useState('pending'),[search,setSearch]=useState(''),[busy,setBusy]=useState(null),[selected,setSelected]=useState(null),[reference,setReference]=useState(''),[proof,setProof]=useState(''),[proofName,setProofName]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState('');

  async function load(){setError('');try{const data=await authRequest(`/admin/lead-partner-payouts?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`);setRows(Array.isArray(data)?data:[]);}catch(e){setError(e.message||'Failed to load payouts')}}
  useEffect(()=>{load()},[status]);

  const chooseProof=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Payment proof must be a PNG, JPG, or WebP image.');e.target.value='';return}
    if(file.size>6*1024*1024){setError('Payment proof must be 6 MB or smaller.');e.target.value='';return}
    setError('');
    setProofName(file.name);
    const reader=new FileReader();
    reader.onload=()=>setProof(String(reader.result||''));
    reader.onerror=()=>{setProof('');setProofName('');setError('Could not read the payment proof image.')};
    reader.readAsDataURL(file);
  };

  const process=async action=>{
    if(!selected)return;
    setError('');
    if(action==='paid'&&!proof) {setError('Upload the payment proof screenshot before marking the payout as paid.');return}
    if(action==='paid'&&!reference.trim()) {setError('Transfer reference / UTR is required.');return}
    setBusy(selected.id);
    try{
      await authRequest(`/admin/lead-partner-payouts/${selected.id}`,{method:'PATCH',body:JSON.stringify(action==='paid'?{action,transferReference:reference,proofUrl:proof}:{action:'reject',rejectionReason:reason})});
      setSelected(null);setReference('');setProof('');setProofName('');setReason('');await load();
    }catch(e){setError(e.message||'Failed to process payout')}finally{setBusy(null)}
  };

  return <div style={{padding:24,maxWidth:1250,margin:'0 auto'}}>
    <h1>Lead Partner Payouts</h1>
    <p style={{color:'#667085'}}>Review withdrawal requests and record completed transfers.</p>
    {error&&<div style={{padding:12,background:'#fff1f0',color:'#b42318',borderRadius:9,marginBottom:15}}>{error}</div>}
    <div style={{display:'flex',gap:10,marginBottom:18}}>
      <select value={status} onChange={e=>setStatus(e.target.value)}><option value="pending">Pending</option><option value="paid">Paid</option><option value="rejected">Rejected</option><option value="all">All</option></select>
      <input placeholder="Search partner" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} style={{padding:9,minWidth:240}}/>
      <button onClick={load}>Search</button>
    </div>
    <div style={{overflowX:'auto',border:'1px solid #e4e7ec',borderRadius:12}}>
      <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['ID','Partner','Amount','Method','Status','Requested','Action'].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead>
      <tbody>{rows.map(r=><tr key={r.id}><td style={td}>#{r.id}</td><td style={td}><strong>{r.user_name||'—'}</strong><br/><small>{r.user_email}</small></td><td style={td}>{money(r.amount)}</td><td style={td}>{r.payout_method}</td><td style={td}>{r.status}</td><td style={td}>{r.requested_at?new Date(r.requested_at).toLocaleString():'—'}</td><td style={td}>{r.status==='pending'?<button onClick={()=>setSelected(r)}>Review</button>:<span>Processed</span>}</td></tr>)}</tbody></table>
    </div>
    {selected&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',display:'grid',placeItems:'center',padding:20}}>
      <div style={{background:'#fff',borderRadius:14,padding:24,width:'min(560px,100%)',maxHeight:'90vh',overflowY:'auto'}}>
        <h2>Review payout #{selected.id}</h2>
        <p><strong>{selected.user_name}</strong> — {money(selected.amount)}</p>
        <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',background:'#f8fafc',padding:12,borderRadius:9}}>{JSON.stringify(selected.payout_account_snapshot,null,2)}</pre>
        <label>Transfer reference / UTR<input value={reference} onChange={e=>setReference(e.target.value)} style={input}/></label>
        <label>Payment proof screenshot
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseProof} style={{display:'block',margin:'7px 0 5px'}}/>
        </label>
        {proofName&&<div style={{fontSize:13,color:'#475467',marginBottom:8}}>Selected: {proofName}</div>}
        {proof&&<img src={proof} alt="Payment proof preview" style={{display:'block',maxWidth:'100%',maxHeight:260,objectFit:'contain',border:'1px solid #e4e7ec',borderRadius:8,marginBottom:12}}/>}
        <div style={{fontSize:12,color:'#667085',marginBottom:12}}>PNG, JPG or WebP · maximum 6 MB</div>
        <label>Rejection reason<textarea value={reason} onChange={e=>setReason(e.target.value)} style={input}/></label>
        <div style={{display:'flex',gap:10,marginTop:18}}><button disabled={busy===selected.id} onClick={()=>process('paid')}>Mark Paid</button><button disabled={busy===selected.id} onClick={()=>process('reject')}>Reject</button><button onClick={()=>setSelected(null)}>Cancel</button></div>
      </div>
    </div>}
  </div>
}

const th={textAlign:'left',padding:11,borderBottom:'1px solid #e4e7ec',fontSize:12};
const td={padding:11,borderBottom:'1px solid #f2f4f7',fontSize:13};
const input={display:'block',width:'100%',boxSizing:'border-box',padding:10,margin:'5px 0 12px',border:'1px solid #d0d5dd',borderRadius:8};
