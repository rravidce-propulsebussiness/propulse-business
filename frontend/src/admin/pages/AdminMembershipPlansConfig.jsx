import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getToken } from '../../utils/auth';
import './AdminMembershipPlans.css';
import './AdminMembershipPlansConfig.css';

const API = 'http://localhost:5000/api';
const PERIODS = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: 'Quarterly', months: 3 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const defaultLeads = [
  { type: 'shared', monthly_quantity: 3, period_total_quantity: 3, complimentary: true },
  { type: 'premium', monthly_quantity: 1, period_total_quantity: 1, complimentary: true },
];
const freshForm = () => ({
  name: 'Pro', planType: 'pro', monthlyBasePrice: '',
  periods: PERIODS.map(p => ({ ...p, enabled: true, leadEntitlements: defaultLeads.map(x => ({ ...x, period_total_quantity: x.monthly_quantity * p.months })) })),
  pricing: Object.fromEntries(PERIODS.map(p => [p.key, { discount: 0, price: '', customPrice: false }])),
  benefits: ['Priority lead access'],
});

export default function AdminMembershipPlansConfig() {
  const nav = useNavigate();
  const [tab, setTab] = useState('pro');
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(freshForm());
  const [editing, setEditing] = useState(null);
  const [investor, setInvestor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function req(path, options = {}) {
    const token = getToken();
    if (!token) { clearSession(); nav('/login', { replace: true }); throw new Error('Session expired'); }
    const response = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}), Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { clearSession(); nav('/login', { replace: true }); throw new Error('Session expired'); }
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function load() {
    setLoading(true);
    try {
      const [membershipPlans, investorSettings] = await Promise.all([req('/membership-plans'), req('/admin/commercial/investor-settings')]);
      setPlans(membershipPlans); setInvestor(investorSettings); setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const map = {};
    plans.filter(p => p.plan_type === 'pro' || !p.plan_type).forEach(p => { const key = p.plan_group || p.name.replace(/\s+(Monthly|Quarterly|Yearly)$/i, ''); (map[key] ||= []).push(p); });
    return Object.values(map);
  }, [plans]);

  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const setPricing = (key, field, value) => setForm(current => ({ ...current, pricing: { ...current.pricing, [key]: { ...current.pricing[key], [field]: value } } }));
  const setLead = (periodKey, index, field, value) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key !== periodKey ? p : { ...p, leadEntitlements: p.leadEntitlements.map((x, i) => i === index ? { ...x, [field]: value } : x) }) }));
  const addLead = periodKey => setForm(current => ({ ...current, periods: current.periods.map(p => p.key !== periodKey ? p : { ...p, leadEntitlements: [...p.leadEntitlements, { type: 'shared', monthly_quantity: 1, period_total_quantity: Number(p.months), complimentary: true }] }) }));
  const removeLead = (periodKey, index) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key !== periodKey ? p : { ...p, leadEntitlements: p.leadEntitlements.filter((_, i) => i !== index) }) }));

  const priceFor = period => {
    const base = Number(form.monthlyBasePrice || 0) * Number(period.months || 1);
    const cfg = form.pricing[period.key] || {};
    const discounted = base * (1 - Number(cfg.discount || 0) / 100);
    const final = cfg.customPrice && cfg.price !== '' ? Number(cfg.price) : discounted;
    return { final, saving: Math.max(0, base - final) };
  };

  async function create(e) {
    e.preventDefault(); setError('');
    try {
      const periods = form.periods.map(p => ({ ...p, months: Number(p.months), leadEntitlements: p.leadEntitlements.map(x => ({ ...x, monthly_quantity: Number(x.monthly_quantity || 0), period_total_quantity: Number(x.period_total_quantity || 0), quantity: Number(x.monthly_quantity || 0) })) }));
      await req('/membership-plans', { method: 'POST', body: JSON.stringify({
        name: form.name.trim(), planGroup: form.name.trim(), planType: 'pro', bundle: true,
        monthlyBasePrice: Number(form.monthlyBasePrice || 0), benefits: form.benefits, addOns: [],
        leadRolloverEnabled: true, leadExpiryDays: null, periods,
        pricing: Object.fromEntries(periods.map(p => [p.key, { discount: Number(form.pricing[p.key]?.discount || 0), price: form.pricing[p.key]?.price || '', customPrice: Boolean(form.pricing[p.key]?.customPrice) }])),
      }) });
      setForm(freshForm()); await load();
    } catch (e) { setError(e.message); }
  }

  function beginEdit(plan) {
    setEditing(plan.id); setTab('pro');
    const leads = Array.isArray(plan.lead_entitlements) ? plan.lead_entitlements : [];
    setForm({
      name: plan.plan_group || plan.name.replace(/\s+(Monthly|Quarterly|Yearly)$/i, ''), planType: 'pro', monthlyBasePrice: plan.monthly_base_price || '',
      periods: [{ key: 'edit', label: plan.billing_period || 'Monthly', months: Number(plan.billing_months || 1), enabled: true, leadEntitlements: leads.map(x => ({ ...x, monthly_quantity: Number(x.monthly_quantity ?? x.quantity ?? 0), period_total_quantity: Number(x.period_total_quantity ?? x.quantity ?? 0) })) }],
      pricing: { edit: { discount: Number(plan.discount_percent || 0), price: plan.price ?? '', customPrice: true } },
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveEdit(e) {
    e.preventDefault(); setError(''); const p = form.periods[0]; const cfg = form.pricing.edit || {};
    try {
      await req(`/membership-plans/${editing}`, { method: 'PUT', body: JSON.stringify({ name: `${form.name.trim()} ${p.label}`, planGroup: form.name.trim(), planType: 'pro', billingPeriod: p.label, billingMonths: Number(p.months), monthlyBasePrice: Number(form.monthlyBasePrice || 0), discountPercent: Number(cfg.discount || 0), priceOverride: cfg.customPrice ? Number(cfg.price || 0) : '', benefits: form.benefits, leadEntitlements: p.leadEntitlements, addOns: [], leadRolloverEnabled: true, leadExpiryDays: null }) });
      setEditing(null); setForm(freshForm()); await load();
    } catch (e) { setError(e.message); }
  }

  async function toggle(plan) { try { await req(`/membership-plans/${plan.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !plan.is_active }) }); load(); } catch (e) { setError(e.message); } }
  async function remove(plan) { if (!confirm(`Delete ${plan.name}?`)) return; try { await req(`/membership-plans/${plan.id}`, { method: 'DELETE' }); load(); } catch (e) { setError(e.message); } }

  async function saveInvestor(e) {
    e.preventDefault(); setError('');
    try {
      await req('/admin/commercial/investor-settings', { method: 'PUT', body: JSON.stringify({
        globalLimit: Number(investor.global_limit || 0), defaultIndustryLimit: Number(investor.default_industry_limit || 0), customerIndustryLimit: Number(investor.customer_industry_limit ?? 10), minInvestment: Number(investor.min_investment || 0), maxInvestment: investor.max_investment === '' ? null : investor.max_investment, enabled: Boolean(investor.enabled), requiresPro: true, industryLimits: investor.industryLimits || [],
      }) });
      await load();
    } catch (e) { setError(e.message); }
  }

  const updateIndustryLimit = (id, field, value) => setInvestor(current => ({ ...current, industryLimits: current.industryLimits.map(item => item.id === id ? { ...item, [field]: field === 'is_active' ? value : value } : item) }));

  return <main className="commercial-page membership-config-page">
    <header className="commercial-head"><span>COMMERCIAL</span><h1>Membership Plans</h1></header>
    {error && <div className="error">{error}</div>}
    <nav className="tabs"><button className={tab === 'pro' ? 'selected' : ''} onClick={() => setTab('pro')}>Pro Membership</button><button className={tab === 'investor' ? 'selected' : ''} onClick={() => setTab('investor')}>Investor</button></nav>

    {tab === 'pro' && <>
      <section className="create-card hero-card">
        <div className="card-heading"><div><div className="eyebrow">PRO</div><h2>{editing ? 'Edit Pro plan' : 'Configure Pro plan'}</h2></div><span className="status on">Lead rollover ON</span></div>
        <form onSubmit={editing ? saveEdit : create}>
          <div className="two"><label>Plan name<input value={form.name} onChange={e => setField('name', e.target.value)} required /></label><label>Monthly base price ₹<input type="number" min="0" step="0.01" value={form.monthlyBasePrice} onChange={e => setField('monthlyBasePrice', e.target.value)} placeholder="5000" required /></label></div>
          <div className="section-label"><div><b>Billing & lead limits</b><small>Unused monthly leads roll forward. Leads have no expiry.</small></div></div>
          <div className="pricing-grid">{form.periods.map(period => { const price = priceFor(period); const cfg = form.pricing[period.key] || {}; return <div className="pricing-box" key={period.key}>
            <div className="period-title"><b>{period.label}</b><span>{period.months} month{Number(period.months) === 1 ? '' : 's'}</span></div>
            <label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount || 0} onChange={e => setPricing(period.key, 'discount', e.target.value)} /></label>
            <label className="inline-check"><input type="checkbox" checked={Boolean(cfg.customPrice)} onChange={e => setPricing(period.key, 'customPrice', e.target.checked)} /> Custom final price</label>
            {cfg.customPrice && <label>Final price ₹<input type="number" min="0" step="0.01" value={cfg.price} onChange={e => setPricing(period.key, 'price', e.target.value)} /></label>}
            <div className="live-price"><span>Customer pays</span><strong>{money(price.final)}</strong></div>{price.saving > 0 && <small className="saving">Save {money(price.saving)}</small>}
            <div className="period-leads"><div className="benefit-head"><div><b>Lead allowance</b><small>Monthly + full-period limit</small></div><button type="button" onClick={() => addLead(period.key)}>＋ Add</button></div>
              {period.leadEntitlements.map((lead, index) => <div className="lead-row" key={index}><select value={lead.type} onChange={e => setLead(period.key, index, 'type', e.target.value)}><option value="shared">Shared</option><option value="premium">Premium</option><option value="exclusive">Exclusive</option></select><label>Monthly<input type="number" min="0" value={lead.monthly_quantity ?? lead.quantity ?? 0} onChange={e => setLead(period.key, index, 'monthly_quantity', e.target.value)} /></label><label>Total<input type="number" min="0" value={lead.period_total_quantity ?? 0} onChange={e => setLead(period.key, index, 'period_total_quantity', e.target.value)} /></label><label className="inline-check"><input type="checkbox" checked={lead.complimentary !== false} onChange={e => setLead(period.key, index, 'complimentary', e.target.checked)} /> Free</label><button type="button" className="remove" onClick={() => removeLead(period.key, index)}>×</button></div>)}
              <small className="muted-note">Example: 50/month and 600/year. Unused leads carry into the next month; no lead expiry.</small>
            </div>
          </div>; })}</div>
          <div className="editor-section"><div className="benefit-head"><div><b>Included features</b><small>Features unlocked by Pro</small></div><button type="button" onClick={() => { const value = prompt('Feature name'); if (value?.trim()) setField('benefits', [...form.benefits, value.trim()]); }}>＋ Add</button></div><div className="chips">{form.benefits.map((item, i) => <span key={i}>{item}<button type="button" onClick={() => setField('benefits', form.benefits.filter((_, n) => n !== i))}>×</button></span>)}</div></div>
          <div className="form-footer"><button className="primary create-btn">{editing ? 'Save Pro changes' : 'Create Pro plans'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(freshForm()); }}>Cancel</button>}</div>
        </form>
      </section>
      <section className="plans-list">{loading ? <div className="empty">Loading…</div> : groups.length === 0 ? <div className="empty"><strong>No Pro plans yet</strong></div> : groups.map(group => <div className="plan-group plan-pro" key={group[0].plan_group || group[0].id}><div className="group-head"><div><div className="eyebrow">PRO</div><h2>{group[0].plan_group || 'Pro'}</h2></div><span className="live-count">{group.filter(p => p.is_active).length}/{group.length} active</span></div>{group.slice().sort((a, b) => Number(a.billing_months || 1) - Number(b.billing_months || 1)).map(plan => <div className="option" key={plan.id}><div><b>{plan.billing_period}</b><small>{plan.billing_months} month{Number(plan.billing_months) === 1 ? '' : 's'} · {plan.discount_percent || 0}% off · rollover {plan.lead_rollover_enabled ? 'on' : 'off'}</small></div><strong>{money(plan.price)}</strong><div className="actions"><button onClick={() => beginEdit(plan)}>Edit</button><button onClick={() => toggle(plan)}>{plan.is_active ? 'Disable' : 'Enable'}</button><button className="danger" onClick={() => remove(plan)}>Delete</button></div></div>)}</div>)}</section>
    </>}

    {tab === 'investor' && investor && <section className="create-card hero-card">
      <div className="card-heading"><div><div className="eyebrow">INVESTOR</div><h2>Investor access</h2></div><span className={investor.enabled ? 'status on' : 'status'}>{investor.enabled ? 'Enabled' : 'Disabled'}</span></div>
      <form onSubmit={saveInvestor}>
        <div className="two"><label>Global active investor limit<input type="number" min="0" value={investor.global_limit} onChange={e => setInvestor({ ...investor, global_limit: e.target.value })} /></label><label>Default industry limit<input type="number" min="0" value={investor.default_industry_limit} onChange={e => setInvestor({ ...investor, default_industry_limit: e.target.value })} /></label><label>Max investments per customer / industry<input type="number" min="0" value={investor.customer_industry_limit ?? 10} onChange={e => setInvestor({ ...investor, customer_industry_limit: e.target.value })} /></label><label>Minimum investment ₹<input type="number" min="0" value={investor.min_investment} onChange={e => setInvestor({ ...investor, min_investment: e.target.value })} /></label><label>Maximum investment ₹<input type="number" min="0" value={investor.max_investment ?? ''} placeholder="No maximum" onChange={e => setInvestor({ ...investor, max_investment: e.target.value })} /></label><label className="inline-check"><input type="checkbox" checked={Boolean(investor.enabled)} onChange={e => setInvestor({ ...investor, enabled: e.target.checked })} /> Enable Investor</label></div>
        <div className="muted-note">Investor is separate from membership. Access requires an active Pro membership. Minimum and maximum investment are configurable, and the customer can be limited to a set number of investments in each industry.</div>
        <div className="editor-section"><div className="benefit-head"><div><b>Industry limits</b><small>Configure the investor opportunity limit for each industry.</small></div></div><div className="lead-editor">{(investor.industryLimits || []).map(item => <div className="lead-row" key={item.id}><strong>{item.name}</strong><input type="number" min="0" value={item.investor_limit} onChange={e => updateIndustryLimit(item.id, 'investor_limit', e.target.value)} /><label className="inline-check"><input type="checkbox" checked={item.is_active !== false} onChange={e => updateIndustryLimit(item.id, 'is_active', e.target.checked)} /> Active</label></div>)}</div></div>
        <div className="form-footer"><button className="primary create-btn">Save Investor settings</button></div>
      </form>
    </section>}
  </main>;
}
