import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getToken } from '../../utils/auth';
import './AdminMembershipPlans.css';
import './AdminMembershipPlansConfig.css';

const API = 'http://localhost:5000/api';
const DEFAULT_CYCLES = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: 'Quarterly', months: 3 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];
const BOOSTER_CYCLES = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: 'Quarterly', months: 3 },
  { key: 'halfYearly', label: 'Half-Yearly', months: 6 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];
const BOOSTER_ADDON_CYCLES = BOOSTER_CYCLES;
const DEFAULT_LEADS = [
  { type: 'shared', monthly_quantity: 3, period_total_quantity: 3, complimentary: true },
  { type: 'premium', monthly_quantity: 1, period_total_quantity: 1, complimentary: true },
];
const DEFAULT_BOOSTER_ADDONS = [
  { name: 'Website Building & Maintenance', cycles: { monthly: { price: 4999, enabled: true, discount: 0 }, quarterly: { price: 12999, enabled: true, discount: 0 }, halfYearly: { price: 23999, enabled: true, discount: 0 }, yearly: { price: 44999, enabled: true, discount: 0 } } },
  { name: 'Digital Marketing', cycles: { monthly: { price: 7999, enabled: true, discount: 0 }, quarterly: { price: 20999, enabled: true, discount: 0 }, halfYearly: { price: 38999, enabled: true, discount: 0 }, yearly: { price: 74999, enabled: true, discount: 0 } } },
];
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalizeAddon = item => {
  if (item?.cycles) return {
    name: item.name || 'Add-on',
    cycles: Object.fromEntries(BOOSTER_ADDON_CYCLES.map(c => [c.key, {
      price: Number(item.cycles?.[c.key]?.price ?? 0),
      enabled: item.cycles?.[c.key]?.enabled !== false,
      discount: Number(item.cycles?.[c.key]?.discount ?? 0),
    }])),
  };
  const legacy = Number(item?.price || 0);
  return {
    name: item?.name || 'Add-on',
    cycles: Object.fromEntries(BOOSTER_ADDON_CYCLES.map(c => [c.key, {
      price: legacy * c.months,
      enabled: true,
      discount: 0,
    }])),
  };
};

function freshForm(planType = 'pro') {
  if (planType === 'booster') {
    const periods = BOOSTER_CYCLES.map(c => ({ ...c, enabled: true }));
    return {
      name: 'Booster', planType: 'booster', monthlyBasePrice: '', periods,
      pricing: Object.fromEntries(periods.map(c => [c.key, { discount: 0, price: '', customPrice: false }])),
      benefits: ['Website Builder', 'Website publishing & hosting', 'Growth tools'],
      addOns: DEFAULT_BOOSTER_ADDONS.map(normalizeAddon),
    };
  }
  const cycles = DEFAULT_CYCLES.map(c => ({
    ...c,
    enabled: true,
    leadEntitlements: DEFAULT_LEADS.map(x => ({ ...x, period_total_quantity: x.monthly_quantity * c.months })),
  }));
  return {
    name: 'Pro', planType: 'pro', monthlyBasePrice: '', periods: cycles,
    pricing: Object.fromEntries(cycles.map(c => [c.key, { discount: 0, price: '', customPrice: false }])),
    benefits: ['Priority lead access'], addOns: [],
  };
}

export default function AdminMembershipPlansConfig() {
  const nav = useNavigate();
  const [tab, setTab] = useState('pro');
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(freshForm('pro'));
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
    try { const [membershipPlans, investorSettings] = await Promise.all([req('/membership-plans'), req('/admin/commercial/investor-settings')]); setPlans(membershipPlans); setInvestor(investorSettings); setError(''); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const map = {};
    plans.forEach(p => {
      if (!['pro', 'non_pro', 'booster'].includes(p.plan_type)) return;
      const key = p.plan_group || p.name.replace(/\s+[^\s]+$/i, '');
      (map[`${p.plan_type}:${key}`] ||= []).push(p);
    });
    return Object.values(map);
  }, [plans]);
  const visibleGroups = groups.filter(group => tab === 'booster' ? group[0]?.plan_type === 'booster' : group[0]?.plan_type === 'pro');

  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const setPricing = (key, field, value) => setForm(current => ({ ...current, pricing: { ...current.pricing, [key]: { ...current.pricing[key], [field]: value } } }));
  const setPeriod = (key, field, value) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key === key ? { ...p, [field]: value } : p) }));
  const setLead = (periodKey, index, field, value) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key !== periodKey ? p : { ...p, leadEntitlements: p.leadEntitlements.map((x, i) => i === index ? { ...x, [field]: value } : x) }) }));
  const syncLeadTotal = (period, lead) => Math.max(0, Number(lead?.monthly_quantity ?? lead?.quantity ?? 0)) * Math.max(1, Number(period.months || 1));
  const updateLeadMonthly = (periodKey, index, value) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key !== periodKey ? p : { ...p, leadEntitlements: p.leadEntitlements.map((x, i) => i === index ? { ...x, monthly_quantity: value, period_total_quantity: syncLeadTotal(p, { ...x, monthly_quantity: value }) } : x) }) }));
  const addLead = periodKey => setForm(current => ({ ...current, periods: current.periods.map(p => p.key !== periodKey ? p : { ...p, leadEntitlements: [...p.leadEntitlements, { type: 'shared', monthly_quantity: 1, period_total_quantity: Number(p.months || 1), complimentary: true }] }) }));
  const removeLead = (periodKey, index) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key !== periodKey ? p : { ...p, leadEntitlements: p.leadEntitlements.filter((_, i) => i !== index) }) }));
  function addCycle() {
    const value = prompt('Cycle name');
    if (!value?.trim()) return;
    const months = Number(prompt('Number of months', '6'));
    if (!Number.isFinite(months) || months <= 0) return;
    const key = `${slug(value)}-${Date.now()}`;
    setForm(current => ({ ...current, periods: [...current.periods, { key, label: value.trim(), months, enabled: true, leadEntitlements: DEFAULT_LEADS.map(x => ({ ...x, period_total_quantity: x.monthly_quantity * months })) }], pricing: { ...current.pricing, [key]: { discount: 0, price: '', customPrice: false } } }));
  }
  function removeCycle(key) { setForm(current => ({ ...current, periods: current.periods.filter(p => p.key !== key), pricing: Object.fromEntries(Object.entries(current.pricing).filter(([k]) => k !== key)) })); }
  const priceFor = period => { const base = Number(form.monthlyBasePrice || 0) * Number(period.months || 1); const cfg = form.pricing[period.key] || {}; const discounted = base * (1 - Number(cfg.discount || 0) / 100); const final = cfg.customPrice && cfg.price !== '' ? Number(cfg.price) : discounted; return { final, saving: Math.max(0, base - final), base }; };
  const addonPriceFor = (item, cycle) => {
    const cfg = item.cycles?.[cycle.key] || {};
    if (cycle.key === 'monthly') return { final: Number(cfg.price || 0), base: Number(cfg.price || 0), saving: 0 };
    const monthly = Number(item.cycles?.monthly?.price || 0);
    const base = monthly * cycle.months;
    const final = base * (1 - Number(cfg.discount || 0) / 100);
    return { final, base, saving: Math.max(0, base - final) };
  };
  function switchPlanTab(next) { setTab(next); setEditing(null); setForm(freshForm(next)); setError(''); }

  async function create(e) {
    e.preventDefault(); setError('');
    try {
      if (form.planType === 'booster') {
        const activePeriods = form.periods.filter(p => p.enabled !== false && Number(p.months) > 0);
        if (!activePeriods.length) { setError('Enable at least one Booster billing cycle.'); return; }
        const periods = activePeriods.map(p => ({ ...p, months: Number(p.months) }));
        await req('/membership-plans', { method: 'POST', body: JSON.stringify({ name: 'Booster', planGroup: 'Booster', planType: 'booster', bundle: true, monthlyBasePrice: Number(form.monthlyBasePrice || 0), benefits: form.benefits, addOns: form.addOns, leadRolloverEnabled: false, leadExpiryDays: null, periods, pricing: Object.fromEntries(periods.map(p => [p.key, { discount: Number(form.pricing[p.key]?.discount || 0), price: form.pricing[p.key]?.price || '', customPrice: Boolean(form.pricing[p.key]?.customPrice) }])) }) });
      } else {
        const activePeriods = form.periods.filter(p => p.enabled !== false && Number(p.months) > 0);
        if (!activePeriods.length) { setError('Enable at least one billing cycle.'); return; }
        const periods = activePeriods.map(p => ({ ...p, months: Number(p.months), leadEntitlements: p.leadEntitlements.map(x => ({ ...x, monthly_quantity: Number(x.monthly_quantity || 0), period_total_quantity: Number(x.period_total_quantity || 0), quantity: Number(x.monthly_quantity || 0) })) }));
        await req('/membership-plans', { method: 'POST', body: JSON.stringify({ name: form.name.trim(), planGroup: form.name.trim(), planType: 'pro', bundle: true, monthlyBasePrice: Number(form.monthlyBasePrice || 0), benefits: form.benefits, addOns: form.addOns, leadRolloverEnabled: true, leadExpiryDays: null, periods, pricing: Object.fromEntries(periods.map(p => [p.key, { discount: Number(form.pricing[p.key]?.discount || 0), price: form.pricing[p.key]?.price || '', customPrice: Boolean(form.pricing[p.key]?.customPrice) }])) }) });
      }
      setForm(freshForm(form.planType)); await load();
    } catch (e) { setError(e.message); }
  }

  function beginEdit(plan) {
    setEditing(plan.id); setTab(plan.plan_type === 'booster' ? 'booster' : 'pro');
    if (plan.plan_type === 'booster') {
      const rawAddons = Array.isArray(plan.add_ons) ? plan.add_ons : [];
      const addons = rawAddons.length ? rawAddons.map(normalizeAddon) : DEFAULT_BOOSTER_ADDONS.map(normalizeAddon);
      const periods = BOOSTER_CYCLES.map(c => ({ ...c, enabled: true }));
      setForm({ name: 'Booster', planType: 'booster', monthlyBasePrice: Number(plan.monthly_base_price || 0) || '', periods, pricing: Object.fromEntries(BOOSTER_CYCLES.map(c => [c.key, { discount: Number(c.key === 'monthly' ? 0 : 0), price: '', customPrice: false }])), benefits: Array.isArray(plan.benefits) ? plan.benefits : [], addOns: addons });
    } else {
      const leads = Array.isArray(plan.lead_entitlements) ? plan.lead_entitlements : []; const key = `edit-${plan.id}`; const months = Number(plan.billing_months || 1);
      setForm({
        name: plan.plan_group || plan.name.replace(/\s+[^\s]+$/i, ''),
        planType: 'pro', monthlyBasePrice: plan.monthly_base_price || '',
        periods: [{ key, label: plan.billing_period || 'Monthly', months, enabled: true, leadEntitlements: leads.map(x => ({ ...x, monthly_quantity: Number(x.monthly_quantity ?? x.quantity ?? 0), period_total_quantity: Number(x.period_total_quantity ?? (Number(x.monthly_quantity ?? x.quantity ?? 0) * months)) })) }],
        pricing: { [key]: { discount: Number(plan.discount_percent || 0), price: plan.price ?? '', customPrice: true } },
        benefits: Array.isArray(plan.benefits) ? plan.benefits : [], addOns: Array.isArray(plan.add_ons) ? plan.add_ons.map(normalizeAddon) : [],
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveEdit(e) {
    e.preventDefault(); setError('');
    try {
      if (form.planType === 'booster') {
        const activePeriods = form.periods.filter(p => p.enabled !== false && Number(p.months) > 0);
        if (!activePeriods.length) { setError('Enable at least one Booster billing cycle.'); return; }
        const periods = activePeriods.map(p => ({ ...p, months: Number(p.months) }));
        for (const period of periods) {
          const cfg = form.pricing[period.key] || {};
          const existing = plans.find(p => p.plan_type === 'booster' && p.plan_group === 'Booster' && Number(p.billing_months) === Number(period.months));
          const payload = { name: `Booster ${period.label}`, planGroup: 'Booster', planType: 'booster', billingPeriod: period.label, billingMonths: Number(period.months), monthlyBasePrice: Number(form.monthlyBasePrice || 0), discountPercent: Number(cfg.discount || 0), priceOverride: cfg.customPrice && cfg.price !== '' ? Number(cfg.price) : '', benefits: form.benefits, leadEntitlements: [], addOns: form.addOns, leadRolloverEnabled: false, leadExpiryDays: null };
          if (existing) await req(`/membership-plans/${existing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
          else await req('/membership-plans', { method: 'POST', body: JSON.stringify(payload) });
        }
      } else {
        const p = form.periods[0]; const cfg = form.pricing[p.key] || {};
        await req(`/membership-plans/${editing}`, { method: 'PUT', body: JSON.stringify({ name: `${form.name.trim()} ${p.label}`, planGroup: form.name.trim(), planType: 'pro', billingPeriod: p.label, billingMonths: Number(p.months), monthlyBasePrice: Number(form.monthlyBasePrice || 0), discountPercent: Number(cfg.discount || 0), priceOverride: cfg.customPrice ? Number(cfg.price || 0) : '', benefits: form.benefits, leadEntitlements: p.leadEntitlements, addOns: form.addOns, leadRolloverEnabled: true, leadExpiryDays: null }) });
      }
      setEditing(null); setForm(freshForm(form.planType)); await load();
    } catch (e) { setError(e.message); }
  }
  async function toggle(plan) { try { await req(`/membership-plans/${plan.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !plan.is_active }) }); load(); } catch (e) { setError(e.message); } }
  async function remove(plan) { if (!confirm(`Delete ${plan.name}?`)) return; try { await req(`/membership-plans/${plan.id}`, { method: 'DELETE' }); load(); } catch (e) { setError(e.message); } }

  const setAddon = (index, field, value) => setForm(current => ({ ...current, addOns: current.addOns.map((x, i) => i === index ? { ...x, [field]: value } : x) }));
  const setAddonCycle = (index, cycle, field, value) => setForm(current => ({ ...current, addOns: current.addOns.map((x, i) => i === index ? { ...x, cycles: { ...x.cycles, [cycle]: { ...x.cycles?.[cycle], [field]: value } } } : x) }));
  const updateAddonMonthly = (index, value) => setForm(current => ({ ...current, addOns: current.addOns.map((x, i) => i !== index ? x : { ...x, cycles: { ...x.cycles, monthly: { ...x.cycles?.monthly, price: Number(value || 0) } } }) }));
  const addAddon = () => setForm(current => ({ ...current, addOns: [...current.addOns, normalizeAddon({ name: 'New add-on', price: 0 })] }));
  const removeAddon = index => setForm(current => ({ ...current, addOns: current.addOns.filter((_, i) => i !== index) }));

  async function saveInvestor(e) { e.preventDefault(); setError(''); try { await req('/admin/commercial/investor-settings', { method: 'PUT', body: JSON.stringify({ globalLimit: Number(investor.global_limit || 0), defaultIndustryLimit: Number(investor.default_industry_limit || 0), customerIndustryLimit: Number(investor.customer_industry_limit ?? 10), minInvestment: Number(investor.min_investment || 0), maxInvestment: investor.max_investment === '' ? null : investor.max_investment, enabled: Boolean(investor.enabled), requiresPro: true, industryLimits: investor.industryLimits || [] }) }); await load(); } catch (e) { setError(e.message); } }
  const updateIndustryLimit = (id, field, value) => setInvestor(current => ({ ...current, industryLimits: current.industryLimits.map(item => item.id === id ? { ...item, [field]: value } : item) }));

  return <main className="commercial-page membership-config-page">
    <header className="commercial-head"><h1>Membership Plans</h1></header>
    {error && <div className="error">{error}</div>}
    <nav className="tabs"><button className={tab === 'pro' ? 'selected' : ''} onClick={() => switchPlanTab('pro')}>Pro</button><button className={tab === 'booster' ? 'selected' : ''} onClick={() => switchPlanTab('booster')}>Booster</button><button className={tab === 'investor' ? 'selected' : ''} onClick={() => { setTab('investor'); setEditing(null); setError(''); }}>Investor</button></nav>

    {tab !== 'investor' && <>
      <section className="create-card hero-card">
        <div className="card-heading"><h2>{editing ? `Edit ${form.name}` : `Configure ${form.name}`}</h2><span className="status on">Active</span></div>
        <form onSubmit={editing ? saveEdit : create}>
          <div className="two"><label>Plan name<input value={form.name} onChange={e => setField('name', e.target.value)} required /></label><label>Base price / month ₹<input type="number" min="0" step="0.01" value={form.monthlyBasePrice} onChange={e => setField('monthlyBasePrice', e.target.value)} required /></label></div>

          {form.planType === 'pro' && <>
            <div className="section-label cycle-heading"><b>Billing cycles</b><button type="button" className="mini-action" onClick={addCycle}>＋ Add cycle</button></div>
            <div className="pricing-grid">{form.periods.map(period => { const price = priceFor(period); const cfg = form.pricing[period.key] || {}; return <div className={`pricing-box ${period.enabled ? '' : 'muted-box'}`} key={period.key}>
              <div className="period-editor"><input className="cycle-toggle" type="checkbox" checked={period.enabled !== false} onChange={e => setPeriod(period.key, 'enabled', e.target.checked)} /><input className="period-name" value={period.label} onChange={e => setPeriod(period.key, 'label', e.target.value)} /><input className="months-input" type="number" min="1" value={period.months} onChange={e => setPeriod(period.key, 'months', Number(e.target.value || 1))} /><span className="months-label">mo</span>{!['monthly', 'quarterly', 'yearly'].includes(period.key) && <button type="button" className="remove-period" onClick={() => removeCycle(period.key)}>×</button>}</div>
              <label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount || 0} onChange={e => setPricing(period.key, 'discount', e.target.value)} /></label><label className="check-row"><input type="checkbox" checked={Boolean(cfg.customPrice)} onChange={e => setPricing(period.key, 'customPrice', e.target.checked)} /> Custom price</label>{cfg.customPrice && <label>Final price ₹<input type="number" min="0" step="0.01" value={cfg.price} onChange={e => setPricing(period.key, 'price', e.target.value)} /></label>}<div className="live-price"><span>Customer pays</span><strong>{money(price.final)}</strong>{price.saving > 0 && <small>Save {money(price.saving)}</small>}</div>
              <div className="period-leads"><div className="benefit-head"><b>Leads</b><button type="button" className="mini-action" onClick={() => addLead(period.key)}>＋ Add</button></div>{period.leadEntitlements.map((lead, index) => <div className="lead-row" key={index}><select value={lead.type} onChange={e => setLead(period.key, index, 'type', e.target.value)}><option value="shared">Shared</option><option value="premium">Premium</option><option value="exclusive">Exclusive</option></select><label>Monthly<input type="number" min="0" value={lead.monthly_quantity ?? lead.quantity ?? 0} onChange={e => updateLeadMonthly(period.key, index, e.target.value)} /></label><label>Total<input type="number" min="0" value={lead.period_total_quantity ?? syncLeadTotal(period, lead)} onChange={e => setLead(period.key, index, 'period_total_quantity', e.target.value)} /></label><label className="check-row"><input type="checkbox" checked={lead.complimentary !== false} onChange={e => setLead(period.key, index, 'complimentary', e.target.checked)} /> Free</label><button type="button" className="remove-lead" onClick={() => removeLead(period.key, index)}>×</button></div>)}</div>
            </div>; })}</div>
          </>}

          {form.planType === 'booster' && <>
            <div className="section-label cycle-heading booster-cycle-heading"><b>Billing cycles</b></div>
            <div className="pricing-grid booster-pricing-grid">{form.periods.map(period => { const price = priceFor(period); const cfg = form.pricing[period.key] || {}; const isMonthly = period.key === 'monthly'; return <div className={`pricing-box ${period.enabled ? '' : 'muted-box'}`} key={period.key}>
              <div className="period-editor"><input className="cycle-toggle" type="checkbox" checked={period.enabled !== false} onChange={e => setPeriod(period.key, 'enabled', e.target.checked)} /><span className="period-name booster-period-label">{period.label}</span><input className="months-input" type="number" min="1" value={period.months} onChange={e => setPeriod(period.key, 'months', Number(e.target.value || 1))} /><span className="months-label">mo</span></div>
              <label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount || 0} onChange={e => setPricing(period.key, 'discount', e.target.value)} /></label>
              {isMonthly ? <label>Monthly price ₹<input type="number" min="0" step="0.01" value={form.monthlyBasePrice} onChange={e => setField('monthlyBasePrice', e.target.value)} /></label> : <div className="auto-price"><span>Automatic price</span><strong>{money(price.final)}</strong><small>{money(form.monthlyBasePrice || 0)} × {period.months} months{Number(cfg.discount || 0) > 0 ? ` · ${cfg.discount}% off` : ''}</small></div>}
              {!isMonthly && <label className="check-row"><input type="checkbox" checked={Boolean(cfg.customPrice)} onChange={e => setPricing(period.key, 'customPrice', e.target.checked)} /> Custom price</label>}
              {!isMonthly && cfg.customPrice && <label>Final price ₹<input type="number" min="0" step="0.01" value={cfg.price} onChange={e => setPricing(period.key, 'price', e.target.value)} /></label>}
              <div className="live-price"><span>Customer pays</span><strong>{money(price.final)}</strong>{price.saving > 0 && <small>Save {money(price.saving)}</small>}</div>
            </div>; })}</div>
          </>}

          {form.planType === 'booster' && <div className="booster-config">
            <div className="booster-note">Booster add-on pricing: enter the Monthly price. Other periods calculate automatically from Monthly × months, then apply their discount.</div>
            <div className="editor-section">
              <div className="benefit-head"><b>Add-ons</b><button type="button" className="mini-action" onClick={addAddon}>＋ Add</button></div>
              <div className="booster-addons">{form.addOns.map((item, index) => <div className="booster-addon" key={index}>
                <div className="addon-title"><input value={item.name} onChange={e => setAddon(index, 'name', e.target.value)} /><button type="button" className="remove-lead" onClick={() => removeAddon(index)}>×</button></div>
                <div className="addon-cycles">{BOOSTER_ADDON_CYCLES.map(cycle => { const cfg = item.cycles?.[cycle.key] || { price: 0, enabled: false, discount: 0 }; const price = addonPriceFor(item, cycle); return <div className="addon-cycle" key={cycle.key}>
                  <div className="addon-cycle-head"><label className="check-row"><input type="checkbox" checked={cfg.enabled !== false} onChange={e => setAddonCycle(index, cycle.key, 'enabled', e.target.checked)} /> {cycle.label}</label><span>{cycle.months} mo</span></div>
                  {cycle.key === 'monthly' ? <label>Monthly price ₹<input type="number" min="0" step="0.01" value={cfg.price ?? 0} disabled={cfg.enabled === false} onChange={e => updateAddonMonthly(index, e.target.value)} /></label> : <><label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount || 0} disabled={cfg.enabled === false} onChange={e => setAddonCycle(index, cycle.key, 'discount', Number(e.target.value || 0))} /></label><div className="addon-auto-price"><span>Auto price</span><strong>{money(price.final)}</strong><small>{money(item.cycles?.monthly?.price || 0)} × {cycle.months}{Number(cfg.discount || 0) > 0 ? ` · ${cfg.discount}% off` : ''}</small></div></>}
                </div>; })}</div>
              </div>)}</div>
            </div>
          </div>}

          <div className="editor-section"><div className="benefit-head"><b>Features</b><button type="button" className="mini-action" onClick={() => { const value = prompt('Feature name'); if (value?.trim()) setField('benefits', [...form.benefits, value.trim()]); }}>＋ Add</button></div><div className="chips">{form.benefits.map((item, i) => <span key={i}>{item}<button type="button" onClick={() => setField('benefits', form.benefits.filter((_, n) => n !== i))}>×</button></span>)}</div></div>
          <div className="form-footer"><button className="primary create-btn">{editing ? 'Save changes' : `Create ${form.name}`}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(freshForm(tab)); }}>Cancel</button>}</div>
        </form>
      </section>

      <section className="plans-list">{loading ? <div className="empty">Loading…</div> : visibleGroups.length === 0 ? <div className="empty"><strong>No {tab === 'pro' ? 'Pro' : 'Booster'} plans</strong></div> : visibleGroups.map(group => <div className={`plan-group ${tab === 'booster' ? 'plan-booster' : ''}`} key={`${group[0].plan_type}-${group[0].plan_group || group[0].id}`}><div className="group-head"><h2>{group[0].plan_group || (tab === 'pro' ? 'Pro' : 'Booster')}</h2><span className="live-count">{group.filter(p => p.is_active).length}/{group.length} active</span></div>{group.slice().sort((a, b) => Number(a.billing_months || 1) - Number(b.billing_months || 1)).map(plan => <div className="option" key={plan.id}><div><b>{plan.billing_period}</b><small>{plan.billing_months} mo · {plan.discount_percent || 0}% off</small></div><strong>{money(plan.price)}</strong><div className="actions"><button onClick={() => beginEdit(plan)}>Edit</button><button onClick={() => toggle(plan)}>{plan.is_active ? 'Disable' : 'Enable'}</button><button className="danger" onClick={() => remove(plan)}>Delete</button></div></div>)}</div>)}</section>
    </>}

    {tab === 'investor' && investor && <section className="create-card hero-card"><div className="card-heading"><h2>Investor</h2><label className="switch-label"><input type="checkbox" checked={Boolean(investor.enabled)} onChange={e => setInvestor({ ...investor, enabled: e.target.checked })} /> Enabled</label></div><form onSubmit={saveInvestor}><div className="two"><label>Global limit<input type="number" min="0" value={investor.global_limit} onChange={e => setInvestor({ ...investor, global_limit: e.target.value })} /></label><label>Default industry limit<input type="number" min="0" value={investor.default_industry_limit} onChange={e => setInvestor({ ...investor, default_industry_limit: e.target.value })} /></label><label>Customer limit / industry<input type="number" min="0" value={investor.customer_industry_limit ?? 10} onChange={e => setInvestor({ ...investor, customer_industry_limit: e.target.value })} /></label><label>Minimum investment ₹<input type="number" min="0" value={investor.min_investment} onChange={e => setInvestor({ ...investor, min_investment: e.target.value })} /></label><label>Maximum investment ₹<input type="number" min="0" value={investor.max_investment ?? ''} placeholder="No maximum" onChange={e => setInvestor({ ...investor, max_investment: e.target.value })} /></label></div><div className="editor-section"><div className="benefit-head"><b>Industry limits</b></div><div className="lead-editor">{(investor.industryLimits || []).map(item => <div className="lead-row investor-row" key={item.id}><strong>{item.name}</strong><input type="number" min="0" value={item.investor_limit} onChange={e => updateIndustryLimit(item.id, 'investor_limit', e.target.value)} /><label className="check-row"><input type="checkbox" checked={item.is_active !== false} onChange={e => updateIndustryLimit(item.id, 'is_active', e.target.checked)} /> Active</label></div>)}</div></div><div className="form-footer"><button className="primary create-btn">Save</button></div></form></section>}
  </main>;
}
