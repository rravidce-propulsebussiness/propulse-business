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
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ search, status });
      const result = await authRequest(`/lead-partner/pricing?${params}`);
      setData(result || { settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [] });
      setDrafts(Object.fromEntries((result?.leads || []).map(lead => [lead.id, (lead.pricing?.shares || []).map(tier => ({ shares: tier.shares, pro: tier.pro }))])));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [search, status]);

  const settings = data.settings || {};
  const uplift = Number(settings.normalPriceUplift ?? 100);
  const leads = useMemo(() => Array.isArray(data.leads) ? data.leads : [], [data.leads]);

  function changeDraft(leadId, shares, value) {
    setDrafts(current => ({ ...current, [leadId]: (current[leadId] || []).map(tier => tier.shares === shares ? { ...tier, pro: value } : tier) }));
    setSuccess('');
    setError('');
  }

  async function save(lead) {
    const tiers = drafts[lead.id] || [];
    try {
      setSavingId(lead.id); setError(''); setSuccess('');
      const result = await authRequest(`/lead-partner/pricing/${lead.id}`, { method: 'PUT', body: JSON.stringify({ shares: tiers.map(tier => ({ shares: tier.shares, pro: Number(tier.pro) })) }) });
      setDrafts(current => ({ ...current, [lead.id]: result.pricing.shares.map(tier => ({ shares: tier.shares, pro: tier.pro })) }));
      setData(current => ({ ...current, leads: current.leads.map(item => item.id === lead.id ? { ...item, pricing: result.pricing, overridden: true, updatedAt: new Date().toISOString() } : item) }));
      setSuccess(`Lead #${lead.id} pricing updated.`);
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
          <Link to="/lead-partner#account"><i>◎</i><span>Account</span></Link>
        </nav>
        <div className="partner-sidebar-bottom"><div className="partner-sidebar-user"><span>{initials}</span><div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div></div><button onClick={signOut}>↪ <span>Log out</span></button></div>
      </aside>

      <main className="partner-main">
        <header className="partner-topbar"><div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Pricing & Revenue</strong></div><div className="partner-top-status"><i /> Partner account</div></header>

        <div className="partner-content">
          <section className="partner-intro">
            <div><span className="partner-eyebrow">LEAD PARTNER PORTAL · PRICING</span><h1>Pricing & Revenue</h1><p>Set the Pro price for your uploaded leads. ProPulse automatically calculates the Normal customer price using the Admin uplift.</p></div>
            <div className="partner-live"><i /> Live pricing</div>
          </section>

          {(error || success) && <div className={`partner-pricing-message ${error ? 'error' : 'success'}`}>{error || success}</div>}

          <section className="partner-pricing-rule-banner">
            <article><span>ADMIN COMMISSION</span><strong>{settings.commissionPercent ?? 5}%</strong><small>Applied to partner transactions.</small></article>
            <article><span>ADMIN PRICE UPLIFT</span><strong>+{money(uplift)}</strong><small>Added automatically to every Pro price for Normal customers.</small></article>
            <article><span>PRICING RULE</span><strong>Pro + {money(uplift)}</strong><small>You set Pro; Normal price is calculated automatically.</small></article>
          </section>

          <section className="partner-panel partner-pricing-manager">
            <div className="partner-panel-head">
              <div><span className="partner-kicker">YOUR LEADS</span><h2>Set Pro prices</h2><p>Every uploaded lead starts with the Admin pricing configuration. You can override only its Pro price here.</p></div>
              <button className="partner-refresh-btn" type="button" onClick={load}>Refresh</button>
            </div>

            <div className="partner-pricing-toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone or requirement" /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select></div>

            {loading ? <div className="partner-empty">Loading pricing…</div> : !leads.length ? <div className="partner-empty">No uploaded leads are available for pricing yet.</div> : (
              <div className="partner-pricing-list">
                {leads.map(lead => {
                  const tiers = drafts[lead.id] || [];
                  const locked = ['sold', 'closed', 'invalid'].includes(lead.status);
                  return <article className="partner-pricing-lead" key={lead.id}>
                    <div className="partner-pricing-lead-head"><div><strong>#{lead.id} · {lead.customerName || 'Customer'}</strong><span>{lead.industryName} · {lead.serviceName} · {lead.cityName} · {cap(lead.leadType)}</span></div><div className="partner-pricing-lead-meta"><span className={`partner-status ${lead.status}`}>{cap(lead.status)}</span>{lead.overridden ? <em>Custom price</em> : <em>Admin default</em>}</div></div>
                    <div className="partner-pricing-tiers">
                      {tiers.map(tier => {
                        const adminPro = Number((lead.adminPricing?.shares || []).find(x => Number(x.shares) === Number(tier.shares))?.pro || 0);
                        return <div className="partner-pricing-tier" key={tier.shares}>
                          <div><span>{tier.shares} Share{tier.shares === 1 ? '' : 's'}</span><small>Admin Pro {money(adminPro)}</small></div>
                          <label><span>Your Pro Price</span><div><b>₹</b><input disabled={locked} type="number" min="0" step="0.01" value={tier.pro} onChange={e => changeDraft(lead.id, tier.shares, e.target.value)} /></div></label>
                          <div><span>Normal Price</span><strong>{money(Number(tier.pro) + uplift)}</strong><small>Pro + {money(uplift)}</small></div>
                        </div>;
                      })}
                    </div>
                    <div className="partner-pricing-lead-foot"><span>{locked ? 'Pricing is locked after a lead is sold or closed.' : 'Normal customer price is always calculated from your Pro price.'}</span><button type="button" disabled={locked || savingId === lead.id} onClick={() => save(lead)}>{savingId === lead.id ? 'Saving…' : locked ? 'Locked' : 'Save pricing'}</button></div>
                  </article>;
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
