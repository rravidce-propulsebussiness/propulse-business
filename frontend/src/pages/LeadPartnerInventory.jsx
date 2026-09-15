import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authRequest } from '../utils/auth';
import './LeadPartnerInventory.css';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const statusLabel = value => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());

export default function LeadPartnerInventory() {
  const fileRef = useRef(null);
  const [data, setData] = useState({ data: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      setLoading(true);
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

  const stats = data.stats || {};

  return (
    <main className="partner-inventory-page">
      <header className="partner-inventory-header">
        <div>
          <span className="partner-eyebrow">LEAD PARTNER · INVENTORY</span>
          <h1>Lead Inventory</h1>
          <p>Upload and manage the leads you supply to ProPulse. Imported leads remain owned by your partner account.</p>
        </div>
        <Link className="partner-back-link" to="/lead-partner">← Dashboard</Link>
      </header>

      {message && <div className={`partner-alert ${message.type}`}>{message.text}</div>}

      <section className="partner-import-grid">
        <article className="partner-import-card">
          <div className="partner-card-kicker">GOOGLE SHEETS</div>
          <h2>Connect a Google Sheet</h2>
          <p>Paste a shareable Google Sheets link and import the rows into your lead inventory.</p>
          <form onSubmit={importGoogleSheet} className="partner-sheet-form">
            <input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
            <button disabled={importing}>{importing ? 'Importing…' : 'Import Sheet'}</button>
          </form>
          <small>Set the sheet access to “Anyone with the link · Viewer”.</small>
        </article>

        <article className="partner-import-card">
          <div className="partner-card-kicker">CSV UPLOAD</div>
          <h2>Upload a CSV</h2>
          <p>Use the same lead columns you already use for ProPulse sheet imports.</p>
          <button className="partner-upload-btn" type="button" disabled={importing} onClick={() => fileRef.current?.click()}>
            {importing ? 'Importing…' : 'Choose CSV file'}
          </button>
          <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={e => importCsv(e.target.files?.[0])} />
          <small>Maximum 2,000 leads per import.</small>
        </article>
      </section>

      <section className="partner-stats">
        <article><span>Total Leads</span><strong>{stats.total ?? 0}</strong></article>
        <article><span>Active</span><strong>{stats.active ?? 0}</strong></article>
        <article><span>Sold</span><strong>{stats.sold ?? 0}</strong></article>
        <article><span>Closed</span><strong>{stats.closed ?? 0}</strong></article>
      </section>

      <section className="partner-inventory-panel">
        <div className="partner-panel-head">
          <div><span className="partner-card-kicker">YOUR INVENTORY</span><h2>Uploaded Leads</h2></div>
          <div className="partner-filters">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone or requirement" />
            <select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select>
          </div>
        </div>
        <div className="partner-table-wrap">
          {loading ? <div className="partner-empty">Loading inventory…</div> : !data.data?.length ? <div className="partner-empty">No partner leads found.</div> : (
            <table>
              <thead><tr><th>ID</th><th>LEAD</th><th>SERVICE</th><th>LOCATION</th><th>TYPE</th><th>BUYERS</th><th>STATUS</th><th>ADDED</th></tr></thead>
              <tbody>{data.data.map(lead => (
                <tr key={lead.id}>
                  <td>#{lead.id}</td>
                  <td><b>{lead.customer_name}</b><small>{lead.customer_phone}</small></td>
                  <td><b>{lead.industry_name}</b><small>{lead.service_name}{lead.lead_type === 'premium' ? ' · Premium' : ''}</small></td>
                  <td>{lead.city_name}<small>{lead.state_name} · {lead.pincode}</small></td>
                  <td>{lead.is_exclusive ? 'Exclusive' : 'Shared'}</td>
                  <td>{lead.buyer_capacity}</td>
                  <td><span className={`partner-status ${lead.status}`}>{statusLabel(lead.status)}</span></td>
                  <td>{new Date(lead.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
