import { useEffect, useMemo, useState } from 'react';
import { getToken } from '../../utils/auth';
import './AdminBusinesses.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      const res = await fetch(`${API}/admin/businesses?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load businesses');
      setBusinesses(data);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [status]);
  const activeCount = useMemo(() => businesses.filter((b) => b.is_active).length, [businesses]);

  async function toggleStatus(business) {
    try {
      const res = await fetch(`${API}/admin/businesses/${business.user_id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ isActive: !business.is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setBusinesses((items) => items.map((x) => x.user_id === business.user_id ? { ...x, is_active: data.is_active } : x));
    } catch (e) { setError(e.message); }
  }

  return (
    <section className="admin-businesses">
      <div className="admin-page-head">
        <div><span className="admin-eyebrow">BUSINESS DIRECTORY</span><h1>Businesses</h1><p>Review and manage every business account on Propulse.</p></div>
        <div className="admin-page-count"><strong>{businesses.length}</strong><span>shown · {activeCount} active</span></div>
      </div>

      <div className="business-toolbar">
        <div className="business-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Search business, owner, email or phone" /></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All accounts</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <button className="business-search-btn" onClick={load}>Search</button>
      </div>

      {error && <div className="business-error">{error}</div>}
      {loading ? <div className="business-empty">Loading businesses…</div> : !businesses.length ? <div className="business-empty"><strong>No businesses yet</strong><span>Business accounts created through signup will appear here.</span></div> : (
        <div className="business-list">
          {businesses.map((business) => {
            const open = expanded === business.user_id;
            return <article className={`business-row ${open ? 'open' : ''}`} key={business.user_id}>
              <button className="business-main" onClick={() => setExpanded(open ? null : business.user_id)}>
                <span className="business-avatar">{(business.business_name || business.name || 'B').slice(0, 1).toUpperCase()}</span>
                <span className="business-identity"><strong>{business.business_name || 'Business profile pending'}</strong><small>{business.name} · {business.email}</small></span>
                <span className={`business-status ${business.is_active ? 'active' : 'inactive'}`}>{business.is_active ? 'Active' : 'Inactive'}</span>
                <span className="business-chevron">{open ? '⌃' : '⌄'}</span>
              </button>
              {open && <div className="business-details">
                <div className="business-detail-grid">
                  <div><small>Owner</small><b>{business.name}</b></div><div><small>Email</small><b>{business.email}</b></div><div><small>Phone</small><b>{business.phone || '—'}</b></div><div><small>Joined</small><b>{new Date(business.created_at).toLocaleDateString()}</b></div>
                </div>
                <div className="business-detail-block"><small>Services</small><div className="business-tags">{business.services?.length ? business.services.map((s, i) => <span key={i}>{s.industryName} · {s.serviceName}{s.subserviceName ? ` · ${s.subserviceName}` : ''}</span>) : <em>None</em>}</div></div>
                <div className="business-detail-block"><small>Locations</small><div className="business-tags">{business.locations?.length ? business.locations.map((l, i) => <span key={i}>{l.cityName}, {l.stateName}</span>) : <em>None</em>}</div></div>
                <div className="business-actions"><button onClick={() => toggleStatus(business)}>{business.is_active ? 'Deactivate account' : 'Activate account'}</button></div>
              </div>}
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
