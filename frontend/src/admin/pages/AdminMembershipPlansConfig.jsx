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
const TIER_DEFAULTS = {
  pro: {
    label: 'Pro',
    benefits: ['Priority lead access'],
    leads: [{ type: 'shared', quantity: 3, complimentary: true }, { type: 'premium', quantity: 1, complimentary: true }],
    addOns: [],
  },
  investor: {
    label: 'Investor',
    benefits: ['Everything in Pro', 'Pro features unlocked', 'Investor access', 'Investor opportunities'],
    leads: [{ type: 'shared', quantity: 5, complimentary: true }, { type: 'premium', quantity: 2, complimentary: true }],
    addOns: [],
  },
  booster: {
    label: 'Booster',
    benefits: ['Everything in Pro', 'Website Builder', 'Website publishing & hosting', 'Growth tools'],
    leads: [{ type: 'shared', quantity: 8, complimentary: true }, { type: 'premium', quantity: 3, complimentary: true }],
    addOns: [
      { name: 'Website Building & Maintenance', price: 4999 },
      { name: 'Digital Marketing', price: 7999 },
    ],
  },
};

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const freshPeriods = leads => PERIODS.map(p => ({ ...p, enabled: true, leadEntitlements: leads.map(x => ({ ...x })) }));
const freshForm = tier => ({
  name: TIER_DEFAULTS[tier].label,
  planType: tier,
  monthlyBasePrice: '',
  periods: freshPeriods(TIER_DEFAULTS[tier].leads),
  pricing: Object.fromEntries(PERIODS.map(p => [p.key, { discount: 0, price: '', customPrice: false }])),
  benefits: [...TIER_DEFAULTS[tier].benefits],
  addOns: TIER_DEFAULTS[tier].addOns.map(x => ({ ...x })),
});

export default function AdminMembershipPlansConfig() {
  const nav = useNavigate();
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(freshForm('pro'));
  const [editing, setEditing] = useState(null);
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
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function load() {
    setLoading(true);
    try { setPlans(await req('/membership-plans')); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const map = {};
    plans.forEach(p => { const key = p.plan_group || p.name.replace(/\s+(Monthly|Quarterly|Yearly)$/i, ''); (map[key] ||= []).push(p); });
    return Object.values(map).sort((a, b) => String(a[0].plan_group || a[0].name).localeCompare(String(b[0].plan_group || b[0].name)));
  }, [plans]);

  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const setPeriod = (key, field, value) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key === key ? { ...p, [field]: value } : p) }));
  const setPricing = (key, field, value) => setForm(current => ({ ...current, pricing: { ...current.pricing, [key]: { ...current.pricing[key], [field]: value } } }));
  const setLead = (periodKey, index, field, value) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key === periodKey ? { ...p, leadEntitlements: p.leadEntitlements.map((x, i) => i === index ? { ...x, [field]: value } : x) } : p) }));
  const addLead = periodKey => setForm(current => ({ ...current, periods: current.periods.map(p => p.key === periodKey ? { ...p, leadEntitlements: [...p.leadEntitlements, { type: 'shared', quantity: 1, complimentary: true }] } : p) }));
  const removeLead = (periodKey, index) => setForm(current => ({ ...current, periods: current.periods.map(p => p.key === periodKey ? { ...p, leadEntitlements: p.leadEntitlements.filter((_, i) => i !== index) } : p) }));
  const selectTier = tier => { setEditing(null); setForm(freshForm(tier)); setError(''); };

  const priceFor = period => {
    const base = Number(form.monthlyBasePrice || 0) * Number(period.months || 1);
    const cfg = form.pricing[period.key] || {};
    const discounted = base * (1 - (Number(cfg.discount) || 0) / 100);
    const final = cfg.customPrice && cfg.price !== '' ? Number(cfg.price) : discounted;
    return { base, final, saving: Math.max(0, base - final) };
  };

  async function create(e) {
    e.preventDefault(); setError('');
    try {
      const active = form.periods.filter(p => p.enabled !== false && Number(p.months) > 0);
      await req('/membership-plans', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(), planGroup: form.name.trim(), planType: form.planType, bundle: true,
          monthlyBasePrice: Number(form.monthlyBasePrice || 0), benefits: form.benefits, addOns: form.addOns,
          periods: active.map(p => ({ ...p, months: Number(p.months), leadEntitlements: p.leadEntitlements.map(x => ({ ...x, quantity: Number(x.quantity || 0) })) })),
          pricing: Object.fromEntries(active.map(p => [p.key, { discount: Number(form.pricing[p.key]?.discount || 0), price: form.pricing[p.key]?.price || '', customPrice: Boolean(form.pricing[p.key]?.customPrice) }])),
        }),
      });
      setForm(freshForm(form.planType)); await load();
    } catch (e) { setError(e.message); }
  }

  function beginEdit(plan) {
    setEditing(plan.id);
    setForm({
      name: plan.plan_group || plan.name.replace(/\s+(Monthly|Quarterly|Yearly)$/i, ''),
      planType: plan.plan_type === 'investor' || plan.plan_type === 'booster' ? plan.plan_type : 'pro',
      monthlyBasePrice: plan.monthly_base_price || '',
      periods: [{ key: 'edit', label: plan.billing_period || 'Monthly', months: Number(plan.billing_months || 1), enabled: true, leadEntitlements: Array.isArray(plan.lead_entitlements) ? plan.lead_entitlements.map(x => ({ ...x })) : [] }],
      pricing: { edit: { discount: Number(plan.discount_percent || 0), price: plan.price ?? '', customPrice: true } },
      benefits: Array.isArray(plan.benefits) ? plan.benefits : [],
      addOns: Array.isArray(plan.add_ons) ? plan.add_ons.map(x => ({ ...x })) : [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveEdit(e) {
    e.preventDefault(); setError(''); const p = form.periods[0]; const cfg = form.pricing.edit || {};
    try {
      await req(`/membership-plans/${editing}`, { method: 'PUT', body: JSON.stringify({
        name: `${form.name.trim()} ${p.label}`, planGroup: form.name.trim(), planType: form.planType,
        billingPeriod: p.label, billingMonths: Number(p.months), monthlyBasePrice: Number(form.monthlyBasePrice || 0),
        discountPercent: Number(cfg.discount || 0), priceOverride: cfg.customPrice ? Number(cfg.price || 0) : '',
        benefits: form.benefits, leadEntitlements: p.leadEntitlements, addOns: form.addOns,
      }) });
      setEditing(null); setForm(freshForm(form.planType)); await load();
    } catch (e) { setError(e.message); }
  }

  async function toggle(plan) { try { await req(`/membership-plans/${plan.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !plan.is_active }) }); load(); } catch (e) { setError(e.message); } }
  async function remove(plan) { if (!confirm(`Delete ${plan.name}?`)) return; try { await req(`/membership-plans/${plan.id}`, { method: 'DELETE' }); load(); } catch (e) { setError(e.message); } }

  return (
    <main className="commercial-page membership-config-page">
      <header className="commercial-head"><span>COMMERCIAL</span><h1>Membership Plans</h1></header>
      {error && <div className="error">{error}</div>}

      <section className="create-card hero-card">
        <div className="card-heading">
          <div><div className="eyebrow">PLAN BUILDER</div><h2>{editing ? 'Edit membership' : 'Create membership'}</h2></div>
          <div className="plan-presets">{Object.entries(TIER_DEFAULTS).map(([key, value]) => <button key={key} type="button" className={form.planType === key ? 'active' : ''} onClick={() => selectTier(key)}>{value.label}</button>)}</div>
        </div>

        <form onSubmit={editing ? saveEdit : create}>
          <div className="two">
            <label>Plan name<input value={form.name} onChange={e => setField('name', e.target.value)} required /></label>
            <label>Tier<select value={form.planType} onChange={e => selectTier(e.target.value)}><option value="pro">Pro</option><option value="investor">Investor</option><option value="booster">Booster</option></select></label>
            <label>Monthly base price ₹<input type="number" min="0" step="0.01" value={form.monthlyBasePrice} onChange={e => setField('monthlyBasePrice', e.target.value)} placeholder="5000" required /></label>
          </div>

          <div className="section-label"><div><b>Billing, discounts & leads</b><small>Each period has its own live price and lead allowance.</small></div></div>
          <div className="pricing-grid">
            {form.periods.map(period => {
              const price = priceFor(period); const cfg = form.pricing[period.key] || {};
              return <div className="pricing-box" key={period.key}>
                <div className="period-title"><b>{period.label}</b><span>{period.months} {Number(period.months) === 1 ? 'month' : 'months'}</span></div>
                <label>Duration<input type="number" min="1" value={period.months} onChange={e => setPeriod(period.key, 'months', e.target.value)} /></label>
                <label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount || 0} onChange={e => setPricing(period.key, 'discount', e.target.value)} /></label>
                <label className="inline-check"><input type="checkbox" checked={Boolean(cfg.customPrice)} onChange={e => setPricing(period.key, 'customPrice', e.target.checked)} /> Use custom final price</label>
                {cfg.customPrice && <label>Final price ₹<input type="number" min="0" step="0.01" value={cfg.price} onChange={e => setPricing(period.key, 'price', e.target.value)} /></label>}
                <div className="live-price"><span>Customer pays</span><strong>{money(price.final)}</strong></div>
                {price.saving > 0 && <small className="saving">Save {money(price.saving)}</small>}
                <div className="period-leads">
                  <div className="benefit-head"><div><b>Included leads</b><small>Complimentary or paid entitlement</small></div><button type="button" onClick={() => addLead(period.key)}>＋ Add</button></div>
                  {period.leadEntitlements.map((lead, index) => <div className="lead-row" key={index}>
                    <select value={lead.type} onChange={e => setLead(period.key, index, 'type', e.target.value)}><option value="shared">Shared</option><option value="premium">Premium</option><option value="exclusive">Exclusive</option></select>
                    <input type="number" min="0" value={lead.quantity} onChange={e => setLead(period.key, index, 'quantity', e.target.value)} />
                    <label className="inline-check"><input type="checkbox" checked={lead.complimentary !== false} onChange={e => setLead(period.key, index, 'complimentary', e.target.checked)} /> Free</label>
                    <button type="button" className="remove" onClick={() => removeLead(period.key, index)}>×</button>
                  </div>)}
                </div>
              </div>;
            })}
          </div>

          <div className="editor-section"><div className="benefit-head"><div><b>Included features</b><small>Features unlocked by this tier</small></div><button type="button" onClick={() => { const value = prompt('Feature name'); if (value?.trim()) setField('benefits', [...form.benefits, value.trim()]); }}>＋ Add</button></div><div className="chips">{form.benefits.map((item, i) => <span key={i}>{item}<button type="button" onClick={() => setField('benefits', form.benefits.filter((_, n) => n !== i))}>×</button></span>)}</div></div>

          <div className="editor-section"><div className="benefit-head"><div><b>Add-ons</b><small>Booster can sell website and marketing services separately.</small></div><button type="button" onClick={() => setField('addOns', [...form.addOns, { name: '', price: 0 }])}>＋ Add</button></div>{form.addOns.length === 0 ? <div className="muted-note">No add-ons configured.</div> : <div className="addon-editor">{form.addOns.map((item, i) => <div className="addon-row" key={i}><input value={item.name} onChange={e => setField('addOns', form.addOns.map((x, n) => n === i ? { ...x, name: e.target.value } : x))} placeholder="Service add-on" /><input type="number" min="0" value={item.price} onChange={e => setField('addOns', form.addOns.map((x, n) => n === i ? { ...x, price: e.target.value } : x))} /><button type="button" className="remove" onClick={() => setField('addOns', form.addOns.filter((_, n) => n !== i))}>×</button></div>)}</div>}</div>

          <div className="form-footer"><button className="primary create-btn">{editing ? 'Save changes' : `Create ${form.name || 'membership'} plan`}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(freshForm(form.planType)); }}>Cancel</button>}</div>
        </form>
      </section>

      <section className="plans-list">
        {loading ? <div className="empty">Loading…</div> : groups.length === 0 ? <div className="empty"><strong>No membership plans yet</strong><span>Create Pro, Investor or Booster above.</span></div> : groups.map(group => {
          const type = group[0].plan_type || 'non_pro';
          const features = Array.isArray(group[0].benefits) ? group[0].benefits : [];
          const addOns = Array.isArray(group[0].add_ons) ? group[0].add_ons : [];
          return <div className={`plan-group plan-${type}`} key={`${type}-${group[0].plan_group || group[0].id}`}>
            <div className="group-head"><div><div className="eyebrow">{type.toUpperCase()}</div><h2>{group[0].plan_group || group[0].name}</h2></div><span className="live-count">{group.filter(p => p.is_active).length}/{group.length} active</span></div>
            <div className="group-features">{features.map((x, i) => <span key={i}>✓ {x}</span>)}{addOns.map((x, i) => <span key={`addon-${i}`}>＋ {x.name} · {money(x.price)}</span>)}</div>
            {group.slice().sort((a, b) => Number(a.billing_months || 1) - Number(b.billing_months || 1)).map(plan => <div className="option" key={plan.id}>
              <div><b>{plan.billing_period}</b><small>{plan.billing_months} month{Number(plan.billing_months) === 1 ? '' : 's'} · {plan.discount_percent || 0}% off · {plan.is_active ? 'Active' : 'Inactive'}</small></div>
              <strong>{money(plan.price)}</strong>
              <div className="actions"><button onClick={() => beginEdit(plan)}>Edit</button><button onClick={() => toggle(plan)}>{plan.is_active ? 'Disable' : 'Enable'}</button><button className="danger" onClick={() => remove(plan)}>Delete</button></div>
            </div>)}
          </div>;
        })}
      </section>
    </main>
  );
}
