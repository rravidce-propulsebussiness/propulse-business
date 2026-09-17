import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerHome.css';
import './LeadPartnerInventory.css';

const statusLabel = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());

export default function LeadPartnerInventory() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const fileRef = useRef(null);
  const [data, setData] = useState({ data: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState(null);

  const initials = useMemo(() => (user?.name || 'Lead Partner').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'LP', [user?.name]);

  async function load() {
    try {
      setLoading(true);
      setMessage(null);
      const params = new URLSearchParams({ status, search });
      const result = await authRequest(`/lead-partner/inventory?${params}`);
      setData(result || { data: [], stats: {} });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status, search]);

  async function importGoogleSheet(e) {
    e.preventDefault();
    if (!sheetUrl.trim()) return setMessage({ type: 'error', text: 'Enter a Google Sheets URL.' });
    try {
      setImporting(true); setMessage(null);
      const result = await authRequest('/lead-partner/inventory/import/google-sheet', {
        method: 'POST', body: JSON.stringify({ url: sheetUrl.trim() }),
      });
      setMessage({ type: result.failed ? 'error' : 'success', text: `Imported ${result.created} leads. ${result.duplicate} duplicates, ${result.failed} failed.` });
      await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setImporting(false); }
  }

  async function importCsv(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return setMessage({ type: 'error', text: 'Please select a CSV file.' });
    try {
      setImporting(true); setMessage(null);
      const csv = await file.text();
      const result = await authRequest('/lead-partner/inventory/import/csv', {
        method: 'POST', body: JSON.stringify({ csv }),
      });
      setMessage({ type: result.failed ? 'error' : 'success', text: `Imported ${result.created} leads. ${result.duplicate} duplicates, ${result.failed} failed.` });
      await load();
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  function signOut() {
    clearSession();
    localStorage.removeItem('propulse_session_mode');
    navigate('/login', { replace: true });
  }

  const stats = data.stats || {};

  return (
    <div className="partner-shell">
      <aside className="partner-sidebar">
        <div className="partner-brand"><span className="partner-brand-mark">P</span><span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span></div>
        <div className="partner-nav-label">WORKSPACE</div>
        <nav className="partner-nav">
          <Link className={location.pathname === '/lead-partner' ? 'active' : ''} to="/lead-partner"><i>⌂</i><span>Overview</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/inventory') ? 'active' : ''} to="/lead-partner/inventory"><i>◈</i><span>Lead Inventory</span></Link>
          <Link to="/lead-partner#pricing"><i>₹</i><span>Pricing & Revenue</span></Link>
          <Link to="/lead-partner#account"><i>◎</i><span>Account</span></Link>
        </nav>
        <div className="partner-sidebar-bottom"><div className="partner-sidebar-user"><span>{initials}</span><div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div></div><button onClick={signOut}>↪ <span>Log out</span></button></div>
      </aside>

      <main className="partner-main">
        <header className="partner-topbar"><div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Lead Inventory</strong></div><div className="partner-top-status"><i /> Partner account</div></header>

        <div className="partner-content">
          <section className="partner-intro">
            <div><span className="partner-eyebrow">LEAD PARTNER PORTAL · INVENTORY</span><h1>Lead Inventory</h1><p>Upload and manage the leads you supply to ProPulse. Imported leads remain owned by your partner account.</p></div>
            <div className="partner-live"><i /> Live inventory</div>
          </section>

          {message && <div className={`partner-alert ${message.type}`}><strong>{message.type === 'success' ? 'Import complete' : 'Import needs attention'}</strong><span>{message.text}</span></div>}

          <section className="partner-section-head"><div><span>LEAD SOURCES</span><h2>Add leads to your inventory</h2></div><small>Google Sheets or CSV</small></section>

          <section className="partner-feature-grid partner-import-grid">
            <article className="partner-panel partner-import-card">
              <div className="partner-panel-head"><div><span className="partner-kicker">GOOGLE SHEETS</span><h2>Connect a Google Sheet</h2></div><span className="partner-badge">Import</span></div>
              <p>Paste a shareable Google Sheets link and import the rows into your partner inventory.</p>
              <form onSubmit={importGoogleSheet} className="partner-sheet-form"><input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." /><button disabled={importing}>{importing ? 'Importing…' : 'Import Sheet'}</button></form>
              <small>Set General access to “Anyone with the link · Viewer”.</small>
            </article>

            <article className="partner-panel partner-import-card">
              <div className="partner-panel-head"><div><span className="partner-kicker">CSV UPLOAD</span><h2>Upload a CSV</h2></div><span className="partner-badge">Import</span></div>
              <p>Use the same lead columns supported by ProPulse sheet imports.</p>
              <button className="partner-upload-btn" type="button" disabled={importing} onClick={() => fileRef.current?.click()}>{importing ? 'Importing…' : 'Choose CSV file'}</button>
              <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={e => importCsv(e.target.files?.[0])} />
              <small>No upload count limit.</small>
            </article>
          </section>

          <section className="partner-stats-grid">
            <article><span>Total leads</span><strong>{loading ? '—' : stats.total ?? 0}</strong><small>Added to your inventory</small></article>
            <article><span>Active leads</span><strong>{loading ? '—' : stats.active ?? 0}</strong><small>Available or paused</small></article>
            <article><span>Sold leads</span><strong>{loading ? '—' : stats.sold ?? 0}</strong><small>Successfully sold</small></article>
            <article><span>Closed leads</span><strong>{loading ? '—' : stats.closed ?? 0}</strong><small>Closed or completed</small></article>
          </section>

          <section className="partner-panel partner-leads-panel">
            <div className="partner-panel-head"><div><span className="partner-kicker">YOUR INVENTORY</span><h2>Uploaded Leads</h2><p>Search and filter the leads currently owned by your partner account.</p></div><div className="partner-filters"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone or requirement" /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select></div></div>
            <div className="partner-table-wrap">{loading ? <div className="partner-empty">Loading inventory…</div> : !data.data?.length ? <div className="partner-empty">No partner leads found.</div> : <table className="partner-table"><thead><tr><th>ID</th><th>LEAD</th><th>SERVICE</th><th>LOCATION</th><th>TYPE</th><th>BUYERS</th><th>STATUS</th><th>ADDED</th></tr></thead><tbody>{data.data.map(lead => <tr key={lead.id}><td>#{lead.id}</td><td><b>{lead.customer_name}</b><small>{lead.customer_phone}</small></td><td><b>{lead.industry_name}</b><small>{lead.service_name}{lead.lead_type === 'premium' ? ' · Premium' : ''}</small></td><td>{lead.city_name}<small>{lead.state_name} · {lead.pincode}</small></td><td>{lead.is_exclusive ? 'Exclusive' : 'Shared'}</td><td>{lead.buyer_capacity}</td><td><span className={`partner-status ${lead.status}`}>{statusLabel(lead.status)}</span></td><td>{new Date(lead.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table>}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
