import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerHome.css';
import './LeadPartnerPricing.css';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const cap = value => String(value || '—').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());

export default function LeadPartnerPricing() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [data, setData] = useState({ settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [] });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initials = useMemo(() => (user?.name || 'Lead Partner').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'LP', [user?.name]);

  async function load() {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams({ search, status });
      const result = await authRequest(`/lead-partner/pricing?${params}`);
      setData(result || { settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [] });
      setDrafts(Object.fromEntries((result?.leads || []).map(lead => [lead.id, (lead.pricing?.shares || []).map(tier => ({ shares: Number(tier.shares), pro: tier.pro }))])));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [search, status]);

  const settings = data.settings || {};
  const uplift = Number(settings.normalPriceUplift ?? 100);
  const leads = useMemo(() => Array.isArray(data.leads) ? data.leads : [], [data.leads]);

  function changeDraft(leadId, shares, value) {
    setDrafts(current => ({ ...current, [leadId]: (current[leadId] || []).map(tier => tier.shares === shares ? { ...tier, pro: value } : tier) }));
    setSuccess(''); setError('');
  }

  async function save(lead) {
    const tiers = drafts[lead.id] || [];
    try {
      setSavingId(lead.id); setError(''); setSuccess('');
      const result = await authRequest(`/lead-partner/pricing/${lead.id}`, { method: 'PUT', body: JSON.stringify({ shares: tiers.map(tier => ({ shares: tier.shares, pro: Number(tier.pro) })) }) });
      const nextTiers = result.pricing.shares.map(tier => ({ shares: Number(tier.shares), pro: tier.pro }));
      setDrafts(current => ({ ...current, [lead.id]: nextTiers }));
      setData(current => ({ ...current, leads: current.leads.map(item => item.id === lead.id ? { ...item, pricing: result.pricing, overridden: true, updatedAt: new Date().toISOString() } : item) }));
      setSuccess(`Lead #${lead.id} Pro pricing updated.`);
    } catch (e) { setError(e.message); }
    finally { setSavingId(null); }
  }

  function signOut() {
    clearSession();
    localStorage.removeItem('propulse_session_mode');
    navigate('/login', { replace: true });
  }

  return (
    <div className="partner-shell">
      <aside className="partner-sidebar">
        <div className="partner-brand"><span className="partner-brand-mark">P</span><span><b>PRO<span>PULSE</span></b><small>LEAD PARTNER</small></span></div>
        <div className="partner-nav-label">WORKSPACE</div>
        <nav className="partner-nav">
          <Link className={location.pathname === '/lead-partner' ? 'active' : ''} to="/lead-partner"><i>⌂</i><span>Overview</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/inventory') ? 'active' : ''} to="/lead-partner/inventory"><i>◈</i><span>Lead Inventory</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/pricing') ? 'active' : ''} to="/lead-partner/pricing"><i>₹</i><span>Pricing & Revenue</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/account') ? 'active' : ''} to="/lead-partner/account"><i>◎</i><span>Account</span></Link>
        </nav>
        <div className="partner-sidebar-bottom"><div className="partner-sidebar-user"><span>{initials}</span><div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div></div><button onClick={signOut}>↪ <span>Log out</span></button></div>
      </aside>
      <main className="partner-main">
        <header className="partner-topbar"><div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Pricing & Revenue</strong></div><div className="partner-top-status"><i /> Partner account</div></header>
        <div className="partner-content">
          <section className="partner-intro"><div><span className="partner-eyebrow">LEAD PARTNER PORTAL · PRICING</span><h1>Pricing & Revenue</h1><p>Configure Pro pricing for your uploaded leads using the same sharing-tier approach as Admin Lead Pricing.</p></div><div className="partner-live"><i /> Live pricing</div></section>
          {(error || success) && <div className={`partner-pricing-message ${error ? 'error' : 'success'}`}>{error || success}</div>}
          <section className="partner-pricing-rule-banner"><article><span>ADMIN COMMISSION</span><strong>{settings.commissionPercent ?? 5}%</strong><small>Current partner transaction commission.</small></article><article><span>ADMIN UPLIFT</span><strong>+{money(uplift)}</strong><small>Added automatically when calculating Normal customer price.</small></article><article><span>PARTNER CONTROL</span><strong>PRO ONLY</strong><small>You configure Pro price; Normal stays system-calculated.</small></article></section>
          <section className="partner-panel partner-pricing-manager">
            <div className="partner-panel-head"><div><span className="partner-kicker">PRICE CONFIGURATION</span><h2>Your lead pricing matrix</h2><p>Each uploaded lead starts with the Admin Pro pricing. Update only the Pro amounts for its existing share tiers.</p></div></div>
            <div className="partner-pricing-toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone or requirement" /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select></div>
            {loading ? <div className="partner-empty">Loading pricing configuration…</div> : !leads.length ? <div className="partner-empty">No uploaded leads are available for pricing yet.</div> : (
              <div className="partner-config-list">{leads.map(lead => {const tiers = drafts[lead.id] || []; const locked = ['sold','closed','invalid'].includes(lead.status); return <article className="partner-config-card" key={lead.id}><div className="partner-config-card-head"><div><span className={`partner-config-type ${lead.leadType}`}>{cap(lead.leadType)}</span><h3>#{lead.id} · {lead.customerName || 'Customer'}</h3><p>{lead.industryName || '—'} · {lead.serviceName || '—'} · {lead.cityName || '—'}</p></div><div className="partner-config-meta"><span className={`partner-status ${lead.status}`}>{cap(lead.status)}</span><em>{lead.overridden ? 'Custom Pro' : 'Admin default'}</em></div></div><div className="partner-config-head"><span>SHARES</span><span>ADMIN PRO</span><span>YOUR PRO PRICE</span></div><div className="partner-config-rows">{tiers.map(tier => {const adminPro = Number((lead.adminPricing?.shares || []).find(x => Number(x.shares) === Number(tier.shares))?.pro || 0); return <div className="partner-config-row" key={tier.shares}><div><strong>{tier.shares}</strong><small>Share{tier.shares === 1 ? '' : 's'}</small></div><div><strong>{money(adminPro)}</strong><small>Starting price</small></div><label><span>Pro price</span><div className="partner-money-input"><b>₹</b><input disabled={locked} type="number" min="0" step="0.01" value={tier.pro} onChange={e => changeDraft(lead.id, Number(tier.shares), e.target.value)} /></div></label></div>})}</div><div className="partner-config-foot"><span>{locked ? 'Pricing is locked after this lead is sold or closed.' : `Normal price = Pro price + ${money(uplift)}.`}</span><button disabled={locked || savingId === lead.id} type="button" onClick={() => save(lead)}>{savingId === lead.id ? 'Saving…' : locked ? 'Locked' : 'Save Pro pricing'}</button></div></article>})}</div>)}
            <div className="partner-pricing-note">Admin defines the initial Pro price for each industry, location, lead type and share tier. Partners can adjust only the Pro price on leads they uploaded. Normal customer pricing cannot be independently edited.</div>
          </section>
        </div>
      </main>
    </div>
  );
}
