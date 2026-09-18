import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authRequest, clearSession, getUser } from '../utils/auth';
import './LeadPartnerHome.css';
import './LeadPartnerPricing.css';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const cap = value => String(value || '—').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
const SHARE_TIERS = [1, 2, 3];
const SHARE_PERCENT = { 1: 1, 2: 0.6, 3: 0.45 };
const defaultTiers = () => ({ shares: SHARE_TIERS.map(shares => ({ shares, pro: 0 })) });

function buildFixedPartnerTiers(oneSharePro) {
  const base = Number(oneSharePro);
  return SHARE_TIERS.map(shares => ({
    shares,
    pro: Number.isFinite(base) && base >= 0 ? Number((base * SHARE_PERCENT[shares]).toFixed(2)) : 0,
  }));
}

function normalizePartnerTiers(value) {
  const source = Array.isArray(value?.shares) ? value.shares : [];
  const one = source.find(row => Number(row?.shares) === 1);
  return buildFixedPartnerTiers(one?.pro ?? 0);
}

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
      setDrafts(Object.fromEntries((result?.leads || []).map(lead => [lead.id, normalizePartnerTiers(lead.pricing)])));
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
    if (Number(shares) !== 1) return;
    setDrafts(current => ({ ...current, [leadId]: buildFixedPartnerTiers(value) }));
    setSuccess(''); setError('');
  }

  async function save(lead) {
    const tiers = buildFixedPartnerTiers((drafts[lead.id] || []).find(tier => Number(tier.shares) === 1)?.pro ?? 0);
    try {
      setSavingId(lead.id); setError(''); setSuccess('');
      const result = await authRequest(`/lead-partner/pricing/${lead.id}`, { method: 'PUT', body: JSON.stringify({ shares: tiers.map(tier => ({ shares: tier.shares, pro: Number(tier.pro) })) }) });
      const nextTiers = normalizePartnerTiers(result.pricing);
      setDrafts(current => ({ ...current, [lead.id]: nextTiers }));
      setData(current => ({ ...current, leads: current.leads.map(item => item.id === lead.id ? { ...item, pricing: { shares: nextTiers.map(tier => ({ ...tier, normal: Number(tier.pro) + uplift })) }, overridden: true, updatedAt: new Date().toISOString() } : item) }));
      setSuccess(`Lead #${lead.id} Pro pricing updated.`);
    } catch (e) { setError(e.message); }
    finally { setSavingId(null); }
  }

  function resetRule() { setRuleForm({ id: null, industryId: '', cityId: '', leadType: 'basic', pricing: defaultTiers(), isActive: true }); }
  function editRule(rule) { setRuleForm({ id: rule.id, industryId: rule.industryId ?? '', cityId: rule.cityId ?? '', leadType: rule.leadType || 'basic', pricing: { shares: normalizePartnerTiers(rule.pricing) }, isActive: rule.isActive !== false }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function setRulePro(index, value) { if (index !== 0) return; setRuleForm(form => ({ ...form, pricing: { shares: buildFixedPartnerTiers(value) } })); }

  async function saveRule() {
    try {
      setSavingRule(true); setError(''); setSuccess('');
      const tiers = normalizePartnerTiers(ruleForm.pricing);
      const body = { industryId: ruleForm.industryId, cityId: ruleForm.cityId, leadType: ruleForm.leadType, pricing: { shares: tiers.map(t => ({ shares: t.shares, pro: Number(t.pro) })) }, isActive: ruleForm.isActive };
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
          <Link className={location.pathname.startsWith('/lead-partner/withdrawals') ? 'active' : ''} to="/lead-partner/withdrawals"><i>⇩</i><span>Earnings & Withdrawals</span></Link>
          <Link className={location.pathname.startsWith('/lead-partner/account') ? 'active' : ''} to="/lead-partner/account"><i>◎</i><span>Account</span></Link>
        </nav>
        <div className="partner-sidebar-bottom"><div className="partner-sidebar-user"><span>{initials}</span><div><b>{user?.name || 'Lead Partner'}</b><small>{user?.email || 'Partner account'}</small></div></div><button onClick={signOut}>↪ <span>Log out</span></button></div>
      </aside>
      <main className="partner-main">
        <header className="partner-topbar"><div className="partner-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Pricing & Revenue</strong></div><div className="partner-top-status"><i /> Partner account</div></header>
        <div className="partner-content">
          <section className="partner-intro"><div><span className="partner-eyebrow">LEAD PARTNER PORTAL · PRICING</span><h1>Pricing & Revenue</h1><p>Configure Pro pricing with fixed 1, 2 and 3-share ratios. Only the 1-share Pro amount is editable.</p></div><div className="partner-live"><i /> Live pricing</div></section>
          {(error || success) && <div className={`partner-pricing-message ${error ? 'error' : 'success'}`}>{error || success}</div>}
          <section className="partner-pricing-rule-banner"><article><span>ADMIN COMMISSION</span><strong>{settings.commissionPercent ?? 5}%</strong><small>Current partner transaction commission.</small></article><article><span>ADMIN UPLIFT</span><strong>+{money(uplift)}</strong><small>Added automatically when calculating Normal customer price.</small></article><article><span>FIXED SHARE RATIOS</span><strong>100% · 60% · 45%</strong><small>1 share · 2 shares · 3 shares.</small></article></section>
          <section className="partner-panel partner-rule-builder">
            <div className="partner-panel-head"><div><span className="partner-kicker">PRICE CONFIGURATION</span><h2>{ruleForm.id ? 'Edit Pro pricing configuration' : 'Create Pro pricing configuration'}</h2><p>Choose Industry, City and Lead Type, then enter the 1-share Pro price. 2-share and 3-share prices are fixed automatically at 60% and 45%.</p></div>{ruleForm.id && <button className="partner-outline-btn" type="button" onClick={resetRule}>Cancel</button>}</div>
            <div className="partner-rule-scope"><label>Industry<select value={ruleForm.industryId} onChange={e => setRuleForm({ ...ruleForm, industryId:e.target.value })}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>City<select value={ruleForm.cityId} onChange={e => setRuleForm({ ...ruleForm, cityId:e.target.value })}><option value="">All cities</option>{cities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Lead type<select value={ruleForm.leadType} onChange={e => setRuleForm({ ...ruleForm, leadType:e.target.value })}><option value="basic">Basic</option><option value="premium">Premium</option></select></label><label className="partner-rule-active"><span>STATUS</span><label><input type="checkbox" checked={ruleForm.isActive} onChange={e => setRuleForm({ ...ruleForm, isActive:e.target.checked })}/> Active</label></label></div>
            <div className="partner-rule-tier-box"><div className="partner-rule-tier-head"><div><strong>Pro price by sharing tier</strong><small>Only the 1-share Pro amount is configurable. 2-share = 60%, 3-share = 45%.</small></div></div>{ruleForm.pricing.shares.map((tier, index) => <div className="partner-rule-tier" key={tier.shares}><label>Shares<input type="text" value={tier.shares} disabled /></label><label>Pro price<div className="partner-money-input"><b>₹</b><input type="number" min="0" step="0.01" value={tier.pro} disabled={index !== 0} onChange={e => setRulePro(index, e.target.value)} /></div></label><div className="partner-rule-normal"><span>Normal price</span><strong>{money(Number(tier.pro) + uplift)}</strong><small>{tier.shares === 1 ? 'Partner-set Pro' : `${Math.round(SHARE_PERCENT[tier.shares] * 100)}% of 1-share Pro`} + {money(uplift)}</small></div></div>)}</div>
            <div className="partner-rule-foot"><span>Example: 1 Share ₹1,000 → 2 Shares ₹600 → 3 Shares ₹450. Normal price is Pro + Admin uplift.</span><button className="partner-save-rule" disabled={savingRule} type="button" onClick={saveRule}>{savingRule ? 'Saving…' : ruleForm.id ? 'Update configuration' : 'Save configuration'}</button></div>
          </section>
          <section className="partner-panel partner-configurations"><div className="partner-panel-head"><div><span className="partner-kicker">YOUR CONFIGURATIONS</span><h2>Configured Pro pricing rules</h2><p>Only rules belonging to your Lead Partner account are shown.</p></div></div>{!rules.length ? <div className="partner-empty">No Pro pricing configurations yet. Create one above.</div> : <div className="partner-rule-list">{rules.map(rule => <article className="partner-rule-card" key={rule.id}><div className="partner-rule-card-head"><div><span className={`partner-config-type ${rule.leadType}`}>{cap(rule.leadType)}</span><h3>{rule.industryName || 'All industries'}</h3><p>{rule.cityName || 'All cities'}</p></div><div><span className={rule.isActive ? 'partner-rule-status active' : 'partner-rule-status'}>{rule.isActive ? 'ACTIVE' : 'OFF'}</span></div></div><div className="partner-rule-card-prices">{SHARE_TIERS.map(shares => { const tier=(rule.pricing?.shares||[]).find(x=>Number(x.shares)===shares); return <div key={shares}><span>{shares} Share{shares === 1 ? '' : 's'}</span><strong>{money(tier?.pro)}</strong><small>Pro · {Math.round(SHARE_PERCENT[shares]*100)}%</small></div>; })}</div><div className="partner-rule-card-actions"><button type="button" onClick={() => editRule(rule)}>Edit</button><button type="button" onClick={() => deleteRule(rule.id)}>Delete</button></div></article>)}</div>}</section>
          <section className="partner-panel partner-pricing-manager"><div className="partner-panel-head"><div><span className="partner-kicker">YOUR LEADS</span><h2>Lead-level Pro price overrides</h2><p>Use this section when one specific uploaded lead needs a different 1-share Pro price. The other tiers remain fixed at 60% and 45%.</p></div></div><div className="partner-pricing-toolbar"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer, phone or requirement" /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select></div>{loading ? <div className="partner-empty">Loading pricing configuration…</div> : !leads.length ? <div className="partner-empty">No uploaded leads are available for pricing yet.</div> : <div className="partner-config-list">{leads.map(lead => {const tiers=normalizePartnerTiers({shares:drafts[lead.id]||[]});const locked=['sold','closed','invalid'].includes(lead.status);return <article className="partner-config-card" key={lead.id}><div className="partner-config-card-head"><div><span className={`partner-config-type ${lead.leadType}`}>{cap(lead.leadType)}</span><h3>#{lead.id} · {lead.customerName || 'Customer'}</h3><p>{lead.industryName || '—'} · {lead.serviceName || '—'} · {lead.cityName || '—'}</p></div><div className="partner-config-meta"><span className={`partner-status ${lead.status}`}>{cap(lead.status)}</span><em>{lead.overridden ? 'Custom Pro' : 'Config/Admin default'}</em></div></div><div className="partner-config-head"><span>SHARES</span><span>YOUR PRO PRICE</span><span>NORMAL PRICE</span></div><div className="partner-config-rows">{SHARE_TIERS.map(shares=>{const tier=tiers.find(x=>x.shares===shares);return <div className="partner-config-row" key={shares}><div><strong>{shares}</strong><small>Share{shares===1?'':'s'} · {Math.round(SHARE_PERCENT[shares]*100)}%</small></div><label><span>{shares===1?'Set 1-share Pro':'Fixed Pro price'}</span><div className="partner-money-input"><b>₹</b><input disabled={locked||shares!==1} type="number" min="0" step="0.01" value={tier.pro} onChange={e=>changeDraft(lead.id,shares,e.target.value)}/></div></label><div><span>Normal price</span><strong>{money(Number(tier.pro)+uplift)}</strong><small>Pro + {money(uplift)}</small></div></div>})}</div><div className="partner-config-foot"><span>{locked?'Pricing is locked after this lead is sold or closed.':'Only 1-share Pro can be changed; 2-share is fixed at 60% and 3-share at 45%.'}</span><button disabled={locked||savingId===lead.id} type="button" onClick={()=>save(lead)}>{savingId===lead.id?'Saving…':locked?'Locked':'Save Pro pricing'}</button></div></article>})}</div>}<div className="partner-pricing-note">Fixed partner pricing: 1 Share = 100%, 2 Shares = 60%, 3 Shares = 45% of the 1-share Pro price. Normal customer pricing remains the Pro amount plus the Admin-configured uplift.</div></section>
        </div>
      </main>
    </div>
  );
}
