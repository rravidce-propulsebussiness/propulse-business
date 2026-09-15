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

  return <>
    <style>{`
      .partner-pricing-manager{margin:0 0 14px}.partner-pricing-manager .partner-panel-head{margin-bottom:16px}.partner-pricing-manager .partner-panel-head p{max-width:780px}
      .partner-pricing-rule-banner{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 15px}.partner-pricing-rule-banner>div{padding:13px;border:1px solid #e7ebf1;border-radius:11px;background:#fbfcfe}.partner-pricing-rule-banner span,.partner-pricing-tier>div>span,.partner-pricing-tier label>span{display:block;color:#94a0af;font-size:8px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.partner-pricing-rule-banner strong{display:block;color:#183a67;font-size:15px;margin-top:6px}.partner-pricing-rule-banner small{display:block;color:#8795a8;font-size:9px;line-height:1.45;margin-top:4px}
      .partner-pricing-message{padding:10px 12px;border-radius:9px;font-size:10px;font-weight:800;margin-bottom:12px}.partner-pricing-message.error{border:1px solid #f1c9c3;background:#fff5f3;color:#a52e22}.partner-pricing-message.success{border:1px solid #cbead5;background:#effaf3;color:#207442}
      .partner-pricing-toolbar{display:flex;gap:8px;margin-bottom:14px}.partner-pricing-toolbar input,.partner-pricing-toolbar select{min-width:0;border:1px solid #d8e1ec;border-radius:9px;background:#fff;padding:9px 10px;color:#29415f;font-size:10px;outline:none}.partner-pricing-toolbar input{flex:1}.partner-pricing-toolbar select{width:145px}.partner-pricing-toolbar button,.partner-pricing-lead-foot button{border:0;border-radius:9px;background:#0a2d68;color:#fff;padding:9px 13px;font-size:10px;font-weight:900;cursor:pointer}.partner-pricing-toolbar button{background:#eef4fb;color:#174b8d;border:1px solid #d5e0ed}
      .partner-pricing-list{display:grid;gap:10px}.partner-pricing-lead{border:1px solid #e4e9f0;border-radius:12px;overflow:hidden;background:#fff}.partner-pricing-lead-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:13px 14px;background:#fbfcfe;border-bottom:1px solid #edf1f5}.partner-pricing-lead-head strong{display:block;color:#214064;font-size:11px}.partner-pricing-lead-head>div:first-child>span{display:block;margin-top:4px;color:#8895a7;font-size:9px}.partner-pricing-lead-meta{display:flex;align-items:center;gap:7px}.partner-pricing-lead-meta em{font-style:normal;font-size:8px;font-weight:900;padding:5px 7px;border-radius:16px;background:#f2f4f7;color:#6f7c8f}.partner-pricing-tiers{display:grid;gap:0}.partner-pricing-tier{display:grid;grid-template-columns:1fr 180px 180px;gap:14px;align-items:end;padding:13px 14px;border-bottom:1px solid #edf1f5}.partner-pricing-tier>div:first-child{align-self:center}.partner-pricing-tier>div:first-child>span{color:#294d7f;font-size:10px;letter-spacing:.04em}.partner-pricing-tier>div:first-child small{display:block;margin-top:5px;color:#8b97a7;font-size:9px}.partner-pricing-tier label{display:block}.partner-pricing-tier label>span{margin-bottom:5px}.partner-pricing-tier label>div{display:flex;align-items:center;border:1px solid #d8e1ec;border-radius:8px;overflow:hidden;background:#fff}.partner-pricing-tier label b{padding:0 8px;color:#6c7b90;font-size:10px}.partner-pricing-tier label input{width:100%;min-width:0;border:0;outline:none;padding:9px 9px;font-size:10px;color:#203b5d;font-weight:800}.partner-pricing-tier>div:last-child{padding:9px 10px;border:1px solid #e7ebf1;border-radius:8px;background:#fbfcfe}.partner-pricing-tier>div:last-child>strong{display:block;color:#183a67;font-size:12px;margin-top:5px}.partner-pricing-tier>div:last-child small{display:block;margin-top:4px;color:#8b97a7;font-size:8px}.partner-pricing-lead-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px}.partner-pricing-lead-foot span{color:#8b97a7;font-size:8px}.partner-pricing-lead-foot button:disabled{opacity:.6;cursor:wait}
      @media(max-width:900px){.partner-pricing-rule-banner{grid-template-columns:1fr}.partner-pricing-tier{grid-template-columns:1fr 1fr}.partner-pricing-tier>div:last-child{grid-column:1/-1}.partner-pricing-toolbar{flex-direction:column}.partner-pricing-toolbar input,.partner-pricing-toolbar select{width:100%}}
      @media(max-width:620px){.partner-pricing-tier{grid-template-columns:1fr}.partner-pricing-lead-head,.partner-pricing-lead-foot{flex-direction:column;align-items:stretch}.partner-pricing-lead-foot button{width:100%}}
    `}</style>
    <section className="partner-panel partner-pricing-manager" id="pricing">
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
    </section>
  </>;
}
