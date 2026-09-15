import { useEffect, useMemo, useState } from 'react';
import { authRequest } from '../utils/auth';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const cap = value => String(value || '—').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());

export default function LeadPartnerPricing() {
  const [data, setData] = useState({ settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [] });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      setLoading(true); setError('');
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
    setSuccess(''); setError('');
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

  return <section className="partner-panel partner-pricing-manager" id="pricing">
    <div className="partner-panel-head">
      <div><span className="partner-kicker">PRICING & REVENUE</span><h2>Set your Pro lead prices</h2><p>New partner leads start with the Admin pricing rule. You control the Pro price for each uploaded lead; the Normal price is calculated automatically.</p></div>
      <span className="partner-badge">{settings.commissionPercent ?? 5}% commission</span>
    </div>

    <div className="partner-pricing-rule-banner"><div><span>ADMIN-CONTROLLED UPLIFT</span><strong>+{money(uplift)}</strong><small>Added automatically to every Partner Pro price for Normal customers.</small></div><div><span>EXAMPLE</span><strong>{money(500)} → {money(500 + uplift)}</strong><small>Pro price → Normal customer price</small></div><div><span>IMPORTANT</span><strong>Partner sets Pro only</strong><small>Normal price cannot be edited separately.</small></div></div>

    {(error || success) && <div className={`partner-pricing-message ${error ? 'error' : 'success'}`}>{error || success}</div>}

    <div className="partner-pricing-toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone or requirement" /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select><button type="button" onClick={load}>Refresh</button></div>

    {loading ? <div className="partner-empty">Loading pricing…</div> : !leads.length ? <div className="partner-empty">No uploaded leads are available for pricing yet.</div> : <div className="partner-pricing-list">{leads.map(lead => {
      const tiers = drafts[lead.id] || [];
      return <article className="partner-pricing-lead" key={lead.id}>
        <div className="partner-pricing-lead-head"><div><strong>#{lead.id} · {lead.customerName || 'Customer'}</strong><span>{lead.industryName} · {lead.serviceName} · {lead.cityName} · {cap(lead.leadType)}</span></div><div className="partner-pricing-lead-meta"><span className={`partner-status ${lead.status}`}>{cap(lead.status)}</span>{lead.overridden ? <em>Custom price</em> : <em>Admin default</em>}</div></div>
        <div className="partner-pricing-tiers">{tiers.map(tier => <div className="partner-pricing-tier" key={tier.shares}><div><span>{tier.shares} Share{tier.shares === 1 ? '' : 's'}</span><small>Admin Pro {money((lead.adminPricing?.shares || []).find(x => x.shares === tier.shares)?.pro)}</small></div><label><span>Your Pro Price</span><div><b>₹</b><input type="number" min="0" step="0.01" value={tier.pro} onChange={e => changeDraft(lead.id, tier.shares, e.target.value)} /></div></label><div><span>Normal Price</span><strong>{money(Number(tier.pro) + uplift)}</strong><small>Pro + {money(uplift)}</small></div></div>)}</div>
        <div className="partner-pricing-lead-foot"><span>Normal customer prices are controlled by the Admin uplift.</span><button type="button" disabled={savingId === lead.id} onClick={() => save(lead)}>{savingId === lead.id ? 'Saving…' : 'Save pricing'}</button></div>
      </article>;
    })}</div>}
  </section>;
}
