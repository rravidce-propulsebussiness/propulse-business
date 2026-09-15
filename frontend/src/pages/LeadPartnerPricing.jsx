import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerHome.css';
import './LeadPartnerPricing.css';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const cap = value => String(value || '—').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
const defaultTiers = () => ({ shares: [{ shares: 1, pro: 0 }, { shares: 3, pro: 0 }, { shares: 5, pro: 0 }] });

export default function LeadPartnerPricing() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [data, setData] = useState({ settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [], rules: [] });
  const [industries, setIndustries] = useState([]);
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savingRule, setSavingRule] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [ruleForm, setRuleForm] = useState({ id: null, industryId: '', cityId: '', leadType: 'basic', pricing: defaultTiers(), isActive: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initials = useMemo(() => (user?.name || 'Lead Partner').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'LP', [user?.name]);
  const settings = data.settings || {};
  const uplift = Number(settings.normalPriceUplift ?? 100);
  const leads = useMemo(() => Array.isArray(data.leads) ? data.leads : [], [data.leads]);
  const rules = useMemo(() => Array.isArray(data.rules) ? data.rules : [], [data.rules]);

  async function load() {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams({ search, status });
      const result = await authRequest(`/lead-partner/pricing?${params}`);
      setData(result || { settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [], rules: [] });
      setDrafts(Object.fromEntries((result?.leads || []).map(lead => [lead.id, (lead.pricing?.shares || []).map(tier => ({ shares: Number(tier.shares), pro: tier.pro }))])));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadCatalogs() {
    try {
      const [industryRows, cityRows] = await Promise.all([authRequest('/industries'), authRequest('/cities')]);
      setIndustries(Array.isArray(industryRows) ? industryRows : []);
      setCities(Array.isArray(cityRows) ? cityRows : []);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { load(); loadCatalogs(); }, [search, status]);

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

  function resetRule() { setRuleForm({ id: null, industryId: '', cityId: '', leadType: 'basic', pricing: defaultTiers(), isActive: true }); }
  function editRule(rule) { setRuleForm({ id: rule.id, industryId: rule.industryId ?? '', cityId: rule.cityId ?? '', leadType: rule.leadType || 'basic', pricing: { shares: (rule.pricing?.shares || []).map(t => ({ shares: Number(t.shares), pro: t.pro })) }, isActive: rule.isActive !== false }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function setRuleTier(index, key, value) { setRuleForm(form => ({ ...form, pricing: { ...form.pricing, shares: form.pricing.shares.map((tier, i) => i === index ? { ...tier, [key]: value } : tier) } })); }
  function addRuleTier() { setRuleForm(form => { const used = new Set(form.pricing.shares.map(t => Number(t.shares))); let next = 1; while (used.has(next)) next += 1; return { ...form, pricing: { shares: [...form.pricing.shares, { shares: next, pro: 0 }] } }; }); }
  function removeRuleTier(index) { setRuleForm(form => ({ ...form, pricing: { shares: form.pricing.shares.filter((_, i) => i !== index) } })); }

  async function saveRule() {
    try {
      setSavingRule(true); setError(''); setSuccess('');
      if (!ruleForm.pricing.shares.length) throw new Error('At least one Pro pricing tier is required');
      const body = { industryId: ruleForm.industryId, cityId: ruleForm.cityId, leadType: ruleForm.leadType, pricing: { shares: ruleForm.pricing.shares.map(t => ({ shares: Number(t.shares), pro: Number(t.pro) })) }, isActive: ruleForm.isActive };
      if (ruleForm.id) await authRequest(`/lead-partner/pricing/config/${ruleForm.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await authRequest('/lead-partner/pricing/config', { method: 'POST', body: JSON.stringify(body) });
      resetRule();
      setSuccess(ruleForm.id ? 'Pricing configuration updated.' : 'Pricing configuration created.');
      await load();
    } catch (e) { setError(e.message); }
    finally { setSavingRule(false); }
  }

  async function deleteRule(id) {
    if (!window.confirm('Delete this pricing configuration? Existing custom lead prices will not be changed.')) return;
    try { setError(''); setSuccess(''); await authRequest(`/lead-partner/pricing/config/${id}`, { method: 'DELETE' }); setSuccess('Pricing configuration deleted.'); await load(); }
    catch (e) { setError(e.message); }
  }

  function signOut() { clearSession(); localStorage.removeItem('propulse_session_mode'); navigate('/login', { replace: true }); }

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

          <section className="partner-panel partner-rule-builder">
            <div className="partner-panel-head"><div><span className="partner-kicker">PRICE CONFIGURATION</span><h2>{ruleForm.id ? 'Edit Pro pricing configuration' : 'Create Pro pricing configuration'}</h2><p>Like Admin Lead Pricing, define Pro prices by Industry, City, Lead Type and sharing tier. Normal pricing is never editable here.</p></div>{ruleForm.id && <button className="partner-outline-btn" type="button" onClick={resetRule}>Cancel</button>}</div>
            <div className="partner-rule-scope"><label>Industry<select value={ruleForm.industryId} onChange={e => setRuleForm({ ...ruleForm, industryId:e.target.value })}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>City<select value={ruleForm.cityId} onChange={e => setRuleForm({ ...ruleForm, cityId:e.target.value })}><option value="">All cities</option>{cities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Lead type<select value={ruleForm.leadType} onChange={e => setRuleForm({ ...ruleForm, leadType:e.target.value })}><option value="basic">Basic</option><option value="premium">Premium</option></select></label><label className="partner-rule-active"><span>STATUS</span><label><input type="checkbox" checked={ruleForm.isActive} onChange={e => setRuleForm({ ...ruleForm, isActive:e.target.checked })}/> Active</label></label></div>
            <div className="partner-rule-tier-box"><div className="partner-rule-tier-head"><div><strong>Pro price by sharing tier</strong><small>Only Pro amounts are configurable by the partner.</small></div><button type="button" className="partner-add-tier" onClick={addRuleTier}>+ Add tier</button></div>{ruleForm.pricing.shares.map((tier, index) => <div className="partner-rule-tier" key={`${tier.shares}-${index}`}><label>Shares<input type="number" min="1" value={tier.shares} onChange={e => setRuleTier(index, 'shares', e.target.value)}/></label><label>Pro price<div className="partner-money-input"><b>₹</b><input type="number" min="0" step="0.01" value={tier.pro} onChange={e => setRuleTier(index, 'pro', e.target.value)}/></div></label><div className="partner-rule-normal"><span>Normal price</span><strong>{money(Number(tier.pro) + uplift)}</strong><small>Pro + {money(uplift)}</small></div><button type="button" className="partner-remove-tier" disabled={ruleForm.pricing.shares.length === 1} onClick={() => removeRuleTier(index)}>×</button></div>)}</div>
            <div className="partner-rule-foot"><span>When saved, this configuration becomes the Pro starting rule for matching partner leads. Active matching leads still using Admin pricing are updated; custom lead prices are preserved.</span><button className="partner-save-rule" disabled={savingRule} type="button" onClick={saveRule}>{savingRule ? 'Saving…' : ruleForm.id ? 'Update configuration' : 'Save configuration'}</button></div>
          </section>

          <section className="partner-panel partner-configurations"><div className="partner-panel-head"><div><span className="partner-kicker">YOUR CONFIGURATIONS</span><h2>Configured Pro pricing rules</h2><p>Only rules belonging to your Lead Partner account are shown.</p></div></div>{!rules.length ? <div className="partner-empty">No Pro pricing configurations yet. Create one above.</div> : <div className="partner-rule-list">{rules.map(rule => <article className="partner-rule-card" key={rule.id}><div className="partner-rule-card-head"><div><span className={`partner-config-type ${rule.leadType}`}>{cap(rule.leadType)}</span><h3>{rule.industryName || 'All industries'}</h3><p>{rule.cityName || 'All cities'}</p></div><div><span className={rule.isActive ? 'partner-rule-status active' : 'partner-rule-status'}>{rule.isActive ? 'ACTIVE' : 'OFF'}</span></div></div><div className="partner-rule-card-prices">{(rule.pricing?.shares || []).map(tier => <div key={tier.shares}><span>{tier.shares} Share{Number(tier.shares) === 1 ? '' : 's'}</span><strong>{money(tier.pro)}</strong><small>Pro price</small></div>)}</div><div className="partner-rule-card-actions"><button type="button" onClick={() => editRule(rule)}>Edit</button><button type="button" onClick={() => deleteRule(rule.id)}>Delete</button></div></article>)}</div>}</section>

          <section className="partner-panel partner-pricing-manager">
            <div className="partner-panel-head"><div><span className="partner-kicker">YOUR LEADS</span><h2>Lead-level Pro price overrides</h2><p>Use this section when one specific uploaded lead needs a price different from its configuration rule.</p></div></div>
            <div className="partner-pricing-toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone or requirement" /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select></div>
            {loading ? <div className="partner-empty">Loading pricing configuration…</div> : !leads.length ? <div className="partner-empty">No uploaded leads are available for pricing yet.</div> : <div className="partner-config-list">{leads.map(lead => {const tiers = drafts[lead.id] || []; const locked = ['sold','closed','invalid'].includes(lead.status); return <article className="partner-config-card" key={lead.id}><div className="partner-config-card-head"><div><span className={`partner-config-type ${lead.leadType}`}>{cap(lead.leadType)}</span><h3>#{lead.id} · {lead.customerName || 'Customer'}</h3><p>{lead.industryName || '—'} · {lead.serviceName || '—'} · {lead.cityName || '—'}</p></div><div className="partner-config-meta"><span className={`partner-status ${lead.status}`}>{cap(lead.status)}</span><em>{lead.overridden ? 'Custom Pro' : 'Config/Admin default'}</em></div></div><div className="partner-config-head"><span>SHARES</span><span>ADMIN PRO</span><span>YOUR PRO PRICE</span></div><div className="partner-config-rows">{tiers.map(tier => {const adminPro = Number((lead.adminPricing?.shares || []).find(x => Number(x.shares) === Number(tier.shares))?.pro || 0); return <div className="partner-config-row" key={tier.shares}><div><strong>{tier.shares}</strong><small>Share{tier.shares === 1 ? '' : 's'}</small></div><div><strong>{money(adminPro)}</strong><small>Starting price</small></div><label><span>Pro price</span><div className="partner-money-input"><b>₹</b><input disabled={locked} type="number" min="0" step="0.01" value={tier.pro} onChange={e => changeDraft(lead.id, Number(tier.shares), e.target.value)} /></div></label></div>})}</div><div className="partner-config-foot"><span>{locked ? 'Pricing is locked after this lead is sold or closed.' : `Normal price = Pro price + ${money(uplift)}.`}</span><button disabled={locked || savingId === lead.id} type="button" onClick={() => save(lead)}>{savingId === lead.id ? 'Saving…' : locked ? 'Locked' : 'Save Pro pricing'}</button></div></article>})}</div>}
            <div className="partner-pricing-note">Admin defines the initial Pro price; your configuration overrides only the Pro amount for matching leads. Normal customer pricing remains Admin-uplift driven.</div>
          </section>
        </div>
      </main>
    </div>
  );
}
