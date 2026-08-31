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
const DEFAULT_LEADS = [
  { type: 'shared', monthly_quantity: 3, period_total_quantity: 3, complimentary: true },
  { type: 'premium', monthly_quantity: 1, period_total_quantity: 1, complimentary: true },
];
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function makeForm(type = 'pro') {
  const cycles = DEFAULT_CYCLES.map(c => ({
    ...c,
    enabled: true,
    leadEntitlements: type === 'booster' ? [] : DEFAULT_LEADS.map(x => ({ ...x, period_total_quantity: x.monthly_quantity * c.months })),
  }));
  return {
    name: type === 'booster' ? 'Booster' : 'Pro',
    planType: type,
    monthlyBasePrice: '',
    periods: cycles,
    pricing: Object.fromEntries(cycles.map(c => [c.key, { discount: 0, price: '', customPrice: false }])),
    benefits: type === 'booster' ? ['Website Builder', 'Website publishing & hosting', 'Growth tools'] : ['Priority lead access'],
    addOns: type === 'booster' ? [
      { name: 'Website Building & Maintenance', price: 4999 },
      { name: 'Digital Marketing', price: 7999 },
    ] : [],
  };
}

export default function AdminMembershipPlansConfigV2() {
  const nav = useNavigate();
  const [tab, setTab] = useState('pro');
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(makeForm('pro'));
  const [editing, setEditing] = useState(null);
  const [investor, setInvestor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function req(path, options = {}) {
    const token = getToken();
    if (!token) { clearSession(); nav('/login', { replace: true }); throw new Error('Session expired'); }
    const response = await fetch(API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { clearSession(); nav('/login', { replace: true }); throw new Error('Session expired'); }
    if (!response.ok) throw new Error(data.detail ? `${data.error}: ${data.detail}` : (data.error || 'Request failed'));
    return data;
  }

  async function load() {
    setLoading(true);
    try {
      const [membershipPlans, investorSettings] = await Promise.all([
        req('/membership-plans'),
        req('/admin/commercial/investor-settings'),
      ]);
      setPlans(membershipPlans);
      setInvestor(investorSettings);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const map = {};
    plans.forEach(p => {
      const type = p.plan_type || 'non_pro';
      if (!['pro', 'booster', 'non_pro'].includes(type)) return;
      const key = p.plan_group || p.name.replace(/\s+[^\s]+$/i, '');
      (map[`${type}:${key}`] ||= []).push(p);
    });
    return Object.values(map);
  }, [plans]);

  const visibleGroups = groups.filter(group => group[0]?.plan_type === tab);

  const switchTab = next => {
    setTab(next);
    setEditing(null);
    setForm(makeForm(next));
    setError('');
  };
  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const setPricing = (key, field, value) => setForm(f => ({ ...f, pricing: { ...f.pricing, [key]: { ...f.pricing[key], [field]: value } } }));
  const setPeriod = (key, field, value) => setForm(f => ({
    ...f,
    periods: f.periods.map(p => p.key === key ? {
      ...p,
      [field]: value,
      leadEntitlements: field === 'months' && f.planType !== 'booster'
        ? p.leadEntitlements.map(x => ({ ...x, period_total_quantity: Number(x.monthly_quantity || 0) * Number(value || 1) }))
        : p.leadEntitlements,
    } : p),
  }));
  const setLead = (periodKey, index, field, value) => setForm(f => ({
    ...f,
    periods: f.periods.map(p => p.key !== periodKey ? p : {
      ...p,
      leadEntitlements: p.leadEntitlements.map((x, i) => {
        if (i !== index) return x;
        const next = { ...x, [field]: value };
        if (field === 'monthly_quantity') next.period_total_quantity = Number(value || 0) * Number(p.months || 1);
        return next;
      }),
    }),
  }));
  const addLead = key => setForm(f => ({ ...f, periods: f.periods.map(p => p.key === key ? {
    ...p, leadEntitlements: [...p.leadEntitlements, { type: 'shared', monthly_quantity: 1, period_total_quantity: Number(p.months || 1), complimentary: true }],
  } : p) }));
  const removeLead = (key, index) => setForm(f => ({ ...f, periods: f.periods.map(p => p.key === key ? { ...p, leadEntitlements: p.leadEntitlements.filter((_, i) => i !== index) } : p) }));

  function addCycle() {
    const label = prompt('Cycle name', '6 Months');
    if (!label?.trim()) return;
    const months = Number(prompt('Number of months', '6'));
    if (!Number.isFinite(months) || months <= 0) return;
    const key = `${slug(label)}-${Date.now()}`;
    setForm(f => ({
      ...f,
      periods: [...f.periods, {
        key, label: label.trim(), months, enabled: true,
        leadEntitlements: f.planType === 'booster' ? [] : DEFAULT_LEADS.map(x => ({ ...x, period_total_quantity: x.monthly_quantity * months })),
      }],
      pricing: { ...f.pricing, [key]: { discount: 0, price: '', customPrice: false } },
    }));
  }
  function removeCycle(key) {
    setForm(f => ({ ...f, periods: f.periods.filter(p => p.key !== key), pricing: Object.fromEntries(Object.entries(f.pricing).filter(([k]) => k !== key)) }));
  }

  function priceFor(period) {
    const base = Number(form.monthlyBasePrice || 0) * Number(period.months || 1);
    const cfg = form.pricing[period.key] || {};
    const discounted = base * (1 - Number(cfg.discount || 0) / 100);
    const final = cfg.customPrice && cfg.price !== '' ? Number(cfg.price) : discounted;
    return { base, final, saving: Math.max(0, base - final) };
  }

  async function saveBundle(e) {
    e.preventDefault(); setError('');
    const periods = form.periods.filter(p => p.enabled !== false && Number(p.months) > 0);
    if (!periods.length) { setError('Enable at least one billing cycle.'); return; }
    try {
      await req('/membership-plans', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(), planGroup: form.name.trim(), planType: form.planType, bundle: true,
          monthlyBasePrice: Number(form.monthlyBasePrice || 0), benefits: form.benefits,
          addOns: form.addOns, leadRolloverEnabled: true, leadExpiryDays: null,
          periods: periods.map(p => ({ ...p, months: Number(p.months), leadEntitlements: form.planType === 'booster' ? [] : p.leadEntitlements.map(x => ({ ...x, monthly_quantity: Number(x.monthly_quantity || 0), period_total_quantity: Number(x.period_total_quantity || 0), quantity: Number(x.monthly_quantity || 0) })) })),
          pricing: Object.fromEntries(periods.map(p => [p.key, { discount: Number(form.pricing[p.key]?.discount || 0), price: form.pricing[p.key]?.price || '', customPrice: Boolean(form.pricing[p.key]?.customPrice) }])),
        }),
      });
      setForm(makeForm(form.planType));
      await load();
    } catch (e) { setError(e.message); }
  }

  function beginEdit(plan) {
    const key = `edit-${plan.id}`;
    const leads = Array.isArray(plan.lead_entitlements) ? plan.lead_entitlements : [];
    const type = plan.plan_type === 'booster' ? 'booster' : 'pro';
    setTab(type); setEditing(plan.id);
    setForm({
      name: plan.plan_group || plan.name.replace(/\s+[^\s]+$/i, ''), planType: type,
      monthlyBasePrice: plan.monthly_base_price || '',
      periods: [{ key, label: plan.billing_period || 'Monthly', months: Number(plan.billing_months || 1), enabled: true,
        leadEntitlements: type === 'booster' ? [] : leads.map(x => ({ ...x, monthly_quantity: Number(x.monthly_quantity ?? x.quantity ?? 0), period_total_quantity: Number(x.period_total_quantity ?? x.quantity ?? 0) })) }],
      pricing: { [key]: { discount: Number(plan.discount_percent || 0), price: plan.price ?? '', customPrice: true } },
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [], addOns: Array.isArray(plan.add_ons) ? plan.add_ons : [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveEdit(e) {
    e.preventDefault(); setError('');
    const p = form.periods[0]; const cfg = form.pricing[p.key] || {};
    try {
      await req(`/membership-plans/${editing}`, { method: 'PUT', body: JSON.stringify({
        name: `${form.name.trim()} ${p.label}`, planGroup: form.name.trim(), planType: form.planType,
        billingPeriod: p.label, billingMonths: Number(p.months), monthlyBasePrice: Number(form.monthlyBasePrice || 0),
        discountPercent: Number(cfg.discount || 0), priceOverride: cfg.customPrice ? Number(cfg.price || 0) : '',
        benefits: form.benefits, leadEntitlements: form.planType === 'booster' ? [] : p.leadEntitlements,
        addOns: form.addOns, leadRolloverEnabled: true, leadExpiryDays: null,
      }) });
      setEditing(null); setForm(makeForm(form.planType)); await load();
    } catch (e) { setError(e.message); }
  }

  async function toggle(plan) {
    try { await req(`/membership-plans/${plan.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !plan.is_active }) }); await load(); }
    catch (e) { setError(e.message); }
  }
  async function remove(plan) {
    if (!confirm(`Delete ${plan.name}?`)) return;
    try { await req(`/membership-plans/${plan.id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e.message); }
  }

  const setAddon = (index, field, value) => setForm(f => ({ ...f, addOns: f.addOns.map((x, i) => i === index ? { ...x, [field]: value } : x) }));
  const addAddon = () => setForm(f => ({ ...f, addOns: [...f.addOns, { name: 'New add-on', price: 0 }] }));
  const removeAddon = index => setForm(f => ({ ...f, addOns: f.addOns.filter((_, i) => i !== index) }));

  async function saveInvestor(e) {
    e.preventDefault(); setError('');
    try {
      await req('/admin/commercial/investor-settings', { method: 'PUT', body: JSON.stringify({
        globalLimit: Number(investor.global_limit || 0), defaultIndustryLimit: Number(investor.default_industry_limit || 0),
        customerIndustryLimit: Number(investor.customer_industry_limit ?? 10), minInvestment: Number(investor.min_investment || 0),
        maxInvestment: investor.max_investment === '' ? null : investor.max_investment, enabled: Boolean(investor.enabled),
        requiresPro: true, industryLimits: investor.industryLimits || [],
      }) });
      await load();
    } catch (e) { setError(e.message); }
  }
  const updateIndustryLimit = (id, field, value) => setInvestor(s => ({ ...s, industryLimits: (s.industryLimits || []).map(x => x.id === id ? { ...x, [field]: value } : x) }));

  return <main className="commercial-page membership-config-page">
    <header className="commercial-head"><h1>Membership Plans</h1></header>
    {error && <div className="error">{error}</div>}
    <nav className="tabs">
      <button className={tab === 'pro' ? 'selected' : ''} onClick={() => switchTab('pro')}>Pro</button>
      <button className={tab === 'booster' ? 'selected' : ''} onClick={() => switchTab('booster')}>Booster</button>
      <button className={tab === 'investor' ? 'selected' : ''} onClick={() => { setTab('investor'); setEditing(null); setError(''); }}>Investor</button>
    </nav>

    {tab !== 'investor' && <>
      <section className="create-card hero-card">
        <div className="card-heading"><h2>{editing ? `Edit ${form.name}` : `Configure ${form.name}`}</h2><span className="status on">Active</span></div>
        <form onSubmit={editing ? saveEdit : saveBundle}>
          <div className="two">
            <label>Plan name<input value={form.name} onChange={e => setField('name', e.target.value)} required /></label>
            <label>Base price / month ₹<input type="number" min="0" step="0.01" value={form.monthlyBasePrice} onChange={e => setField('monthlyBasePrice', e.target.value)} required /></label>
          </div>
          <div className="section-label cycle-heading"><b>Billing cycles</b><button type="button" className="mini-action" onClick={addCycle}>＋ Add cycle</button></div>
          <div className="pricing-grid">
            {form.periods.map(period => {
              const cfg = form.pricing[period.key] || {}; const price = priceFor(period);
              return <div className={`pricing-box ${period.enabled ? '' : 'muted-box'}`} key={period.key}>
                <div className="period-editor">
                  <input className="cycle-toggle" type="checkbox" checked={period.enabled !== false} onChange={e => setPeriod(period.key, 'enabled', e.target.checked)} />
                  <input className="period-name" value={period.label} onChange={e => setPeriod(period.key, 'label', e.target.value)} />
                  <input className="months-input" type="number" min="1" value={period.months} onChange={e => setPeriod(period.key, 'months', Number(e.target.value || 1))} />
                  <span className="months-label">mo</span>
                  {!['monthly', 'quarterly', 'yearly'].includes(period.key) && <button type="button" className="remove-period" onClick={() => removeCycle(period.key)}>×</button>}
                </div>
                <label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount || 0} onChange={e => setPricing(period.key, 'discount', e.target.value)} /></label>
                <label className="check-row"><input type="checkbox" checked={Boolean(cfg.customPrice)} onChange={e => setPricing(period.key, 'customPrice', e.target.checked)} /> Custom price</label>
                {cfg.customPrice && <label>Final price ₹<input type="number" min="0" step="0.01" value={cfg.price} onChange={e => setPricing(period.key, 'price', e.target.value)} /></label>}
                <div className="live-price"><span>Customer pays</span><strong>{money(price.final)}</strong>{price.saving > 0 && <small>Save {money(price.saving)}</small>}</div>

                {form.planType !== 'booster' && <div className="period-leads">
                  <div className="benefit-head"><b>Leads</b><button type="button" className="mini-action" onClick={() => addLead(period.key)}>＋ Add</button></div>
                  {period.leadEntitlements.map((lead, index) => <div className="lead-row" key={index}>
                    <select value={lead.type} onChange={e => setLead(period.key, index, 'type', e.target.value)}><option value="shared">Shared</option><option value="premium">Premium</option></select>
                    <label>Monthly<input type="number" min="0" value={lead.monthly_quantity ?? lead.quantity ?? 0} onChange={e => setLead(period.key, index, 'monthly_quantity', e.target.value)} /></label>
                    <label>Total<input type="number" min="0" value={lead.period_total_quantity ?? 0} onChange={e => setLead(period.key, index, 'period_total_quantity', e.target.value)} /></label>
                    <label className="check-row"><input type="checkbox" checked={lead.complimentary !== false} onChange={e => setLead(period.key, index, 'complimentary', e.target.checked)} /> Free</label>
                    <button type="button" className="remove-lead" onClick={() => removeLead(period.key, index)}>×</button>
                  </div>)}
                </div>}
              </div>;
            })}
          </div>

          {form.planType === 'booster' && <div className="editor-section"><div className="benefit-head"><b>Add-ons</b><button type="button" className="mini-action" onClick={addAddon}>＋ Add</button></div>
            {form.addOns.map((item, index) => <div className="addon-row" key={index}><input value={item.name} onChange={e => setAddon(index, 'name', e.target.value)} /><input type="number" min="0" value={item.price} onChange={e => setAddon(index, 'price', Number(e.target.value || 0))} /><button type="button" className="remove-lead" onClick={() => removeAddon(index)}>×</button></div>)}
          </div>}

          <div className="editor-section"><div className="benefit-head"><b>Features</b><button type="button" className="mini-action" onClick={() => { const v = prompt('Feature name'); if (v?.trim()) setField('benefits', [...form.benefits, v.trim()]); }}>＋ Add</button></div>
            <div className="chips">{form.benefits.map((item, i) => <span key={i}>{item}<button type="button" onClick={() => setField('benefits', form.benefits.filter((_, n) => n !== i))}>×</button></span>)}</div>
          </div>
          <div className="form-footer"><button className="primary create-btn">{editing ? 'Save changes' : `Create ${form.name}`}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(makeForm(tab)); }}>Cancel</button>}</div>
        </form>
      </section>

      <section className="plans-list">
        {loading ? <div className="empty">Loading…</div> : visibleGroups.length === 0 ? <div className="empty"><strong>No {tab} plans</strong></div> : visibleGroups.map(group => <div className="plan-group" key={`${group[0].plan_type}-${group[0].plan_group || group[0].id}`}>
          <div className="group-head"><h2>{group[0].plan_group || tab}</h2><span className="live-count">{group.filter(p => p.is_active).length}/{group.length} active</span></div>
          {group.slice().sort((a, b) => Number(a.billing_months || 1) - Number(b.billing_months || 1)).map(plan => <div className="option" key={plan.id}>
            <div><b>{plan.billing_period}</b><small>{plan.billing_months} mo · {plan.discount_percent || 0}% off</small></div>
            <strong>{money(plan.price)}</strong>
            <div className="actions"><button onClick={() => beginEdit(plan)}>Edit</button><button onClick={() => toggle(plan)}>{plan.is_active ? 'Disable' : 'Enable'}</button><button className="danger" onClick={() => remove(plan)}>Delete</button></div>
          </div>)}
        </div>)}
      </section>
    </>}

    {tab === 'investor' && investor && <section className="create-card hero-card">
      <div className="card-heading"><h2>Investor</h2><label className="switch-label"><input type="checkbox" checked={Boolean(investor.enabled)} onChange={e => setInvestor({ ...investor, enabled: e.target.checked })} /> Enabled</label></div>
      <form onSubmit={saveInvestor}>
        <div className="two">
          <label>Global limit<input type="number" min="0" value={investor.global_limit} onChange={e => setInvestor({ ...investor, global_limit: e.target.value })} /></label>
          <label>Default industry limit<input type="number" min="0" value={investor.default_industry_limit} onChange={e => setInvestor({ ...investor, default_industry_limit: e.target.value })} /></label>
          <label>Customer limit / industry<input type="number" min="0" value={investor.customer_industry_limit ?? 10} onChange={e => setInvestor({ ...investor, customer_industry_limit: e.target.value })} /></label>
          <label>Minimum investment ₹<input type="number" min="0" value={investor.min_investment} onChange={e => setInvestor({ ...investor, min_investment: e.target.value })} /></label>
          <label>Maximum investment ₹<input type="number" min="0" value={investor.max_investment ?? ''} placeholder="No maximum" onChange={e => setInvestor({ ...investor, max_investment: e.target.value })} /></label>
        </div>
        <div className="editor-section"><div className="benefit-head"><b>Industry limits</b></div><div className="lead-editor">{(investor.industryLimits || []).map(item => <div className="lead-row investor-row" key={item.id}><strong>{item.name}</strong><input type="number" min="0" value={item.investor_limit} onChange={e => updateIndustryLimit(item.id, 'investor_limit', e.target.value)} /><label className="check-row"><input type="checkbox" checked={item.is_active !== false} onChange={e => updateIndustryLimit(item.id, 'is_active', e.target.checked)} /> Active</label></div>)}</div></div>
        <div className="form-footer"><button className="primary create-btn">Save</button></div>
      </form>
    </section>}
  </main>;
}
