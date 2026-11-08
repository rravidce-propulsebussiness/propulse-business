import {useCallback,useEffect,useState} from 'react';
import {authRequest} from '../utils/auth';
import './MetaLeadsPanel.css';

const statusNames={pending:'Queued',retry:'Retrying',received:'Received',failed:'Needs attention'};
const dateText=value=>value?new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—';
const plain=value=>String(value??'').trim();

export default function MetaLeadsPanel({partner=false}){
  const [connections,setConnections]=useState([]);
  const [leads,setLeads]=useState([]);
  const [pagination,setPagination]=useState({page:1,total:0,limit:30});
  const [pageId,setPageId]=useState('');
  const [token,setToken]=useState('');
  const [status,setStatus]=useState('all');
  const [page,setPage]=useState(1);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const load=useCallback(async({silent=false}={})=>{
    try{
      if(!silent){setLoading(true);setError('');}
      const [pages,rows]=await Promise.all([
        authRequest('/meta-leads/connections'),
        authRequest('/meta-leads/leads?'+new URLSearchParams({status,page:String(page)}))
      ]);
      setConnections(Array.isArray(pages?.connections)?pages.connections:[]);
      setLeads(Array.isArray(rows?.items)?rows.items:[]);
      setPagination(rows?.pagination||{page,total:0,limit:30});
    }catch(e){if(!silent)setError(e?.message||'Unable to load Meta leads');}
    finally{if(!silent)setLoading(false);}
  },[page,status]);
  useEffect(()=>{load();const timer=window.setInterval(()=>load({silent:true}),30000);return()=>window.clearInterval(timer);},[load]);
  async function connect(e){
    e.preventDefault();
    if(saving)return;
    setSaving(true);setError('');setMessage('');
    try{
      await authRequest('/meta-leads/connections',{
        method:'POST',body:JSON.stringify({pageId:plain(pageId),pageAccessToken:plain(token)})
      });
      setPageId('');setToken('');
      setMessage('Meta Page subscribed. Future Instant Form leads will enter this inbox automatically.');
      await load();
    }catch(e){setError(e?.message||'Could not connect Meta Page');}
    finally{setSaving(false);}
  }
  async function disconnect(connection){
    if(!window.confirm('Disconnect '+connection.pageName+'? Already received leads will remain in the inbox.'))return;
    setSaving(true);setError('');setMessage('');
    try{
      await authRequest('/meta-leads/connections/'+connection.id,{method:'DELETE'});
      setMessage('Meta Page disconnected.');
      await load();
    }catch(e){setError(e?.message||'Unable to disconnect Page');}
    finally{setSaving(false);}
  }
  async function retry(lead){
    setSaving(true);setError('');setMessage('');
    try{
      await authRequest('/meta-leads/leads/'+lead.id+'/retry',{method:'POST'});
      setMessage('Lead retrieval queued for another attempt.');
      await load();
    }catch(e){setError(e?.message||'Could not retry lead');}
    finally{setSaving(false);}
  }
  const active=connections.filter(c=>c.status==='active').length;
  return <section className="meta-leads">
    <header className="meta-leads-hero">
      <div><span className="meta-leads-eyebrow">LEAD OPERATIONS / META LEAD ADS</span>
      <h1>Meta Lead Ads</h1>
      <p>Facebook and Instagram Instant Form submissions flow directly into ProPulse — never through Google Sheets.</p></div>
      <button type="button" onClick={load} disabled={loading} className="meta-leads-refresh">↻ Refresh</button>
    </header>
    <div className="meta-leads-stats">
      <article><span>Connected Pages</span><strong>{active}</strong><small>Active subscriptions</small></article>
      <article><span>Inbox leads</span><strong>{pagination.total||0}</strong><small>{status==='all'?'All statuses':statusNames[status]}</small></article>
      <article><span>Delivery</span><strong>Direct API</strong><small>No Google Sheets export</small></article>
    </div>
    {error&&<p role="alert" className="meta-leads-alert">{error}</p>}
    {message&&<p role="status" className="meta-leads-message">{message}</p>}
    <div className="meta-leads-layout">
      <section className="meta-leads-card">
        <div className="meta-leads-card-heading"><h2>Connect Meta Page</h2><span>Secure connection</span></div>
        <p className="meta-leads-muted">Use the Page ID and its authorized Page access token. ProPulse verifies the Page and subscribes it to leadgen webhooks. Tokens are encrypted on the server.</p>
        <form onSubmit={connect} className="meta-leads-form">
          <label>Facebook Page ID<input required inputMode="numeric" pattern="[0-9]{5,40}" value={pageId} onChange={e=>setPageId(e.target.value)} placeholder="Page ID"/></label>
          <label>Page access token<input required type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Meta Page access token"/></label>
          <button type="submit" disabled={saving}>{saving?'Connecting…':'Connect Meta Page'}</button>
        </form>
        <div className="meta-leads-pages">
          <h3>Connected Pages</h3>
          {connections.length===0?<p className="meta-leads-muted">No Meta Pages connected yet.</p>:connections.map(c=><div key={c.id} className="meta-leads-page">
            <div><strong>{c.pageName}</strong><small>{c.pageId} · {c.ownerType==='partner'?'Lead Partner':'Admin'}</small></div>
            <div><span className={'meta-leads-state '+c.status}>{c.status}</span>{c.status==='active'&&<button type="button" onClick={()=>disconnect(c)} disabled={saving}>Disconnect</button>}</div>
          </div>)}
        </div>
        <p className="meta-leads-muted meta-leads-note">This receives Meta Instant Form leads, not click-to-WhatsApp messages. Meta app permissions, Lead Access and webhook settings must also be approved and active.</p>
      </section>
      <section className="meta-leads-card meta-leads-inbox">
        <div className="meta-leads-card-heading"><div><h2>{partner?'My Meta Leads':'Meta Leads Inbox'}</h2><p className="meta-leads-muted">Only authorized Admins and the connected Lead Partner can access submissions.</p></div>
          <label className="meta-leads-filter">Status
            <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
              <option value="all">All</option><option value="received">Received</option><option value="pending">Queued</option><option value="retry">Retrying</option><option value="failed">Needs attention</option>
            </select>
          </label>
        </div>
        <div className="meta-leads-scroll">
          <table><thead><tr><th>Received</th><th>Contact</th><th>Meta source</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>{leads.map(l=><tr key={l.id}>
              <td><strong>#{l.id}</strong><small>{dateText(l.submitted_at||l.created_at)}</small></td>
              <td><strong>{l.customer_name||'Pending retrieval'}</strong>
                <small>{l.customer_phone||'—'}</small><small>{l.customer_email||''}</small></td>
              <td><strong>{l.page_name}</strong><small>Form {l.form_id||'—'}</small><small>Ad {l.ad_id||'—'}</small></td>
              <td><span className={'meta-leads-state '+l.status}>{statusNames[l.status]||l.status}</span>
                {l.status==='failed'&&<button type="button" disabled={saving} onClick={()=>retry(l)}>Retry</button>}</td>
              <td><details><summary>View</summary><div className="meta-leads-fields">
                <strong>Meta lead ID: {l.meta_leadgen_id}</strong>
                {Object.entries(l.fields||{}).map(([key,values])=><p key={key}><b>{key.replace(/_/g,' ')}</b><span>{(Array.isArray(values)?values:[]).join(', ')}</span></p>)}
                {l.last_error&&<small>Error code: {l.last_error}</small>}
              </div></details></td>
            </tr>)}</tbody>
          </table>
          {!loading&&!leads.length&&<div className="meta-leads-empty">No leads in this view. Once a connected Meta Page receives a Lead Ad submission, it will appear here automatically.</div>}
          {loading&&<div className="meta-leads-empty">Loading Meta leads…</div>}
        </div>
        <footer className="meta-leads-pager"><span>{pagination.total||0} submissions</span>
          <div><button type="button" disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button type="button" disabled={loading||page*30>=Number(pagination.total||0)} onClick={()=>setPage(p=>p+1)}>Next</button></div>
        </footer>
      </section>
    </div>
  </section>;
}
