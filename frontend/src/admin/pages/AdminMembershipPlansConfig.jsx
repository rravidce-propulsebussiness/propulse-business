import { useEffect, useState } from 'react';
import { apiRequest } from '../../utils/api';
import './AdminMembershipPlans.css';
import './AdminMembershipPlansConfig.css';

const DEFAULT_CYCLES = [
  { key: 'monthly', label: 'Monthly', months: 1 },
  { key: 'quarterly', label: 'Quarterly', months: 3 },
  { key: 'yearly', label: 'Yearly', months: 12 },
];
const DEFAULT_LEADS = [];
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalizeAddon = item => {
  if (item?.cycles) return {
    name: item.name || 'Add-on',
    cycles: Object.fromEntries(DEFAULT_CYCLES.map(c => [c.key, {
      price: Number(item.cycles?.[c.key]?.price ?? 0),
      enabled: item.cycles?.[c.key]?.enabled !== false,
      discount: Number(item.cycles?.[c.key]?.discount ?? 0),
    }])),
  };
  const legacy = Number(item?.price || 0);
  return {
    name: item?.name || 'Add-on',
    cycles: Object.fromEntries(DEFAULT_CYCLES.map(c => [c.key, {
      price: legacy * c.months,
      enabled: true,
      discount: 0,
    }])),
  };
};

function freshForm(packageKey = 'grow') {
  const isScale = packageKey === 'scale';
  const cycles = DEFAULT_CYCLES.map(c => ({
    ...c,
    enabled: true,
    leadEntitlements: DEFAULT_LEADS.map(item => ({ ...item, period_total_quantity: item.monthly_quantity * c.months })),
  }));
  return {
    name: isScale ? 'Scale' : 'Grow',
    planType: 'pro',
    monthlyBasePrice: '',
    periods: cycles,
    pricing: Object.fromEntries(cycles.map(c => [c.key, { discount: 0, price: '', customPrice: false }])),
    benefits: isScale
      ? ['Everything in GROW', 'Website development', 'SEO services', 'Website maintenance']
      : ['Best lead pricing', 'Exclusive Leads access', 'Investment access unlocked for eligible members'],
    addOns: [],
  };
}

function formFromPackage(packageKey, plans) {
  const normalizedKey = packageKey === 'scale' ? 'scale' : 'grow';
  const canonicalName = normalizedKey === 'scale' ? 'Scale' : 'Grow';
  const group = (Array.isArray(plans) ? plans : [])
    .filter(plan => String(plan?.plan_type || '').toLowerCase() === 'pro' && String(plan?.plan_group || '').toLowerCase() === normalizedKey)
    .slice()
    .sort((a,b)=>Number(a?.billing_months||1)-Number(b?.billing_months||1)||Number(a?.id||0)-Number(b?.id||0));
  if (!group.length) return freshForm(normalizedKey);

  const first=group[0];
  const existingByMonths=new Map(group.map(plan=>[Number(plan.billing_months||1),plan]));
  const periods=DEFAULT_CYCLES.map(cycle=>{
    const plan=existingByMonths.get(cycle.months);
    if(!plan) return {...cycle,enabled:false,leadEntitlements:[]};
    const leads=Array.isArray(plan.lead_entitlements)?plan.lead_entitlements:[];
    return {
      ...cycle,
      label:plan.billing_period||cycle.label,
      months:Number(plan.billing_months||cycle.months),
      enabled:plan.is_active!==false,
      leadEntitlements:leads.map(item=>({
        ...item,
        monthly_quantity:Number(item.monthly_quantity??item.quantity??0),
        period_total_quantity:Number(item.period_total_quantity??(Number(item.monthly_quantity??item.quantity??0)*Number(plan.billing_months||cycle.months))),
      })),
      sourceId:plan.id,
    };
  });
  group.filter(plan=>!DEFAULT_CYCLES.some(c=>c.months===Number(plan.billing_months||1))).forEach(plan=>{
    const months=Number(plan.billing_months||1);
    periods.push({
      key:`custom-${plan.id}`,
      label:plan.billing_period||`${months}-month`,
      months,
      enabled:plan.is_active!==false,
      sourceId:plan.id,
      leadEntitlements:(Array.isArray(plan.lead_entitlements)?plan.lead_entitlements:[]).map(item=>({
        ...item,
        monthly_quantity:Number(item.monthly_quantity??item.quantity??0),
        period_total_quantity:Number(item.period_total_quantity??(Number(item.monthly_quantity??item.quantity??0)*months)),
      })),
    });
  });
  periods.sort((a,b)=>Number(a.months)-Number(b.months));

  const pricing={};
  periods.forEach(period=>{
    const plan=group.find(row=>Number(row.billing_months||1)===Number(period.months));
    if(!plan){pricing[period.key]={discount:0,price:'',customPrice:false};return}
    const base=Number(plan.monthly_base_price??first.monthly_base_price??0)*Number(period.months||1);
    const discount=Number(plan.discount_percent||0);
    const calculated=base*(1-discount/100);
    const final=Number(plan.price||0);
    pricing[period.key]={discount,price:final,customPrice:Math.abs(final-calculated)>0.01};
  });

  return {
    name:canonicalName,
    planType:'pro',
    monthlyBasePrice:first.monthly_base_price??'',
    periods,
    pricing,
    benefits:Array.isArray(first.benefits)?first.benefits:[],
    addOns:Array.isArray(first.add_ons)?first.add_ons.map(normalizeAddon):[],
  };
}

export default function AdminMembershipPlansConfig() {
  const [tab, setTab] = useState('grow');
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(freshForm('grow'));
  const [investor, setInvestor] = useState(null);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function req(path, options = {}) {
    return apiRequest(path, options);
  }
  async function load() {
    setLoading(true);
    try {
      const [membershipPlans, investorSettings, stateData, cityData] = await Promise.all([
        req('/membership-plans'),
        req('/admin/commercial/investor-settings'),
        req('/states'),
        req('/cities'),
      ]);
      setPlans(Array.isArray(membershipPlans) ? membershipPlans : []);
      setInvestor(investorSettings);
      setStates(Array.isArray(stateData) ? stateData : []);
      setCities(Array.isArray(cityData) ? cityData : []);
      setError('');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { let active=true; queueMicrotask(()=>{if(active)load()}); return()=>{active=false}; }, []);
  useEffect(() => { if (tab === 'grow' || tab === 'scale') setForm(formFromPackage(tab, plans)); }, [tab, plans]);

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
  function switchPlanTab(next) { setTab(next); setError(''); }

  async function create(e) {
    e.preventDefault(); setError('');
    try {
      const activePeriods = form.periods.filter(p => p.enabled !== false && Number(p.months) > 0);
      if (!activePeriods.length) { setError('Enable at least one billing cycle.'); return; }
      const periods = activePeriods.map(p => ({ ...p, months: Number(p.months), leadEntitlements: p.leadEntitlements.map(x => ({ ...x, monthly_quantity: Number(x.monthly_quantity || 0), period_total_quantity: Number(x.period_total_quantity || 0), quantity: Number(x.monthly_quantity || 0) })) }));
      await req('/membership-plans', { method: 'POST', body: JSON.stringify({ name: form.name.trim(), planGroup: form.name.trim(), planType: 'pro', bundle: true, monthlyBasePrice: Number(form.monthlyBasePrice || 0), benefits: form.benefits, addOns: form.addOns, leadRolloverEnabled: true, leadExpiryDays: null, periods, pricing: Object.fromEntries(periods.map(p => [p.key, { discount: Number(form.pricing[p.key]?.discount || 0), price: form.pricing[p.key]?.price || '', customPrice: Boolean(form.pricing[p.key]?.customPrice) }])) }) });
      await load();
    } catch (e) { setError(e.message); }
  }

  async function saveInvestor(e) {
    e.preventDefault(); setError('');
    try {
      await req('/admin/commercial/investor-settings', { method: 'PUT', body: JSON.stringify({
        globalLimit: Number(investor.global_limit || 0),
        defaultIndustryLimit: Number(investor.default_industry_limit || 0),
        customerIndustryLimit: Number(investor.customer_industry_limit ?? 10),
        minInvestment: Number(investor.min_investment || 0),
        maxInvestment: investor.max_investment === '' ? null : investor.max_investment,
        enabled: Boolean(investor.enabled),
        requiresPro: true,
        industryLimits: investor.industryLimits || [],
      }) });
      await load();
    } catch (e) { setError(e.message); }
  }

  const updateIndustry = (index, field, value) => setInvestor(current => ({
    ...current,
    industryLimits: (current.industryLimits || []).map((item, i) => i === index ? { ...item, [field]: value } : item),
  }));
  const updateIndustryLocation = (industryIndex, locationIndex, field, value) => setInvestor(current => ({
    ...current,
    industryLimits: (current.industryLimits || []).map((industry, i) => i !== industryIndex ? industry : {
      ...industry,
      locations: (industry.locations || []).map((location, j) => j === locationIndex
        ? { ...location, [field]: value, ...(field === 'state_id' ? { city_id: null } : {}) }
        : location),
    }),
  }));
  const addIndustryLocation = industryIndex => setInvestor(current => ({
    ...current,
    industryLimits: (current.industryLimits || []).map((industry, i) => i !== industryIndex ? industry : {
      ...industry,
      locations: [...(industry.locations || []), {
        id: `new-${Date.now()}-${industryIndex}`,
        state_id: states[0]?.id || '',
        city_id: null,
        investor_limit: 0,
        is_active: true,
      }],
    }),
  }));
  const removeIndustryLocation = (industryIndex, locationIndex) => setInvestor(current => ({
    ...current,
    industryLimits: (current.industryLimits || []).map((industry, i) => i !== industryIndex ? industry : {
      ...industry,
      locations: (industry.locations || []).filter((_, j) => j !== locationIndex),
    }),
  }));
  const citiesForState = stateId => cities.filter(city => Number(city.state_id) === Number(stateId));
  return <main className="commercial-page membership-config-page compact-membership-page">
    <section className="membership-admin-hero">
      <div><span>MEMBERSHIP / PACKAGES</span><h1>Membership Packages</h1><p>Manage GROW and SCALE from one compact package editor. Service pricing is managed separately under Pricing → Service Pricing.</p></div>
      <div className="membership-admin-state"><span>2</span><div><strong>Packages</strong><small>GROW + SCALE</small></div></div>
    </section>
    {error && <div className="error">{error}</div>}
    <nav className="tabs membership-package-tabs"><button className={tab === 'grow' ? 'selected' : ''} onClick={() => switchPlanTab('grow')}>GROW</button><button className={tab === 'scale' ? 'selected' : ''} onClick={() => switchPlanTab('scale')}>SCALE</button><button className={tab === 'investor' ? 'selected' : ''} onClick={() => { setTab('investor'); setError(''); }}>Investor</button></nav>

    {(tab === 'grow' || tab === 'scale') && <section className="create-card hero-card membership-single-card">
      <div className="card-heading membership-package-head">
        <div><span className="membership-kicker">MEMBERSHIP PACKAGE</span><h2>{tab === 'scale' ? 'SCALE' : 'GROW'}</h2><small>One editor controls package price, billing cycles, lead allowances and features.</small></div>
        <div className="membership-package-summary"><span>BASE / MONTH</span><strong>{money(form.monthlyBasePrice)}</strong><small>{form.periods.filter(period=>period.enabled!==false).length} active cycle{form.periods.filter(period=>period.enabled!==false).length===1?'':'s'}</small></div>
      </div>
      <form onSubmit={create}>
        <div className="membership-base-row">
          <div className="package-name-lock"><span>PACKAGE</span><strong>{form.name}</strong><small>Package name is fixed.</small></div>
          <label>Base price / month ₹<input type="number" min="0" step="0.01" value={form.monthlyBasePrice} onChange={e => setField('monthlyBasePrice', e.target.value)} required /></label>
        </div>

        <div className="section-label cycle-heading"><div><b>Billing cycles</b><small>Enable only the cycles customers can buy.</small></div><button type="button" className="mini-action" onClick={addCycle}>＋ Add cycle</button></div>
        <div className="pricing-grid membership-cycle-grid">{form.periods.map(period => { const price = priceFor(period); const cfg = form.pricing[period.key] || {}; return <div className={`pricing-box membership-cycle-card ${period.enabled ? '' : 'muted-box'}`} key={period.key}>
          <div className="period-editor"><input className="cycle-toggle" type="checkbox" checked={period.enabled !== false} onChange={e => setPeriod(period.key, 'enabled', e.target.checked)} /><input className="period-name" value={period.label} onChange={e => setPeriod(period.key, 'label', e.target.value)} /><input className="months-input" type="number" min="1" value={period.months} onChange={e => setPeriod(period.key, 'months', Number(e.target.value || 1))} /><span className="months-label">mo</span>{!['monthly', 'quarterly', 'yearly'].includes(period.key) && <button type="button" className="remove-period" onClick={() => removeCycle(period.key)}>×</button>}</div>
          <div className="membership-cycle-pricing"><label>Discount %<input type="number" min="0" max="100" step="0.01" value={cfg.discount || 0} onChange={e => setPricing(period.key, 'discount', e.target.value)} /></label><label className="check-row"><input type="checkbox" checked={Boolean(cfg.customPrice)} onChange={e => setPricing(period.key, 'customPrice', e.target.checked)} /> Custom price</label>{cfg.customPrice && <label>Final price ₹<input type="number" min="0" step="0.01" value={cfg.price} onChange={e => setPricing(period.key, 'price', e.target.value)} /></label>}<div className="live-price"><span>Customer pays</span><strong>{money(price.final)}</strong>{price.saving > 0 && <small>Save {money(price.saving)}</small>}</div></div>
          <div className="period-leads"><div className="benefit-head"><b>Lead allowance</b><button type="button" className="mini-action" onClick={() => addLead(period.key)}>＋ Add</button></div>{period.leadEntitlements.length===0?<div className="membership-no-leads">No complimentary leads in this cycle.</div>:period.leadEntitlements.map((lead, index) => <div className="lead-row" key={index}><select value={lead.type} onChange={e => setLead(period.key, index, 'type', e.target.value)}><option value="shared">Shared</option><option value="premium">Premium</option><option value="exclusive">Exclusive</option></select><label>Monthly<input type="number" min="0" value={lead.monthly_quantity ?? lead.quantity ?? 0} onChange={e => updateLeadMonthly(period.key, index, e.target.value)} /></label><label>Total<input type="number" min="0" value={lead.period_total_quantity ?? syncLeadTotal(period, lead)} onChange={e => setLead(period.key, index, 'period_total_quantity', e.target.value)} /></label><label className="check-row"><input type="checkbox" checked={lead.complimentary !== false} onChange={e => setLead(period.key, index, 'complimentary', e.target.checked)} /> Free</label><button type="button" className="remove-lead" onClick={() => removeLead(period.key, index)}>×</button></div>)}</div>
        </div>; })}</div>

        <div className="editor-section membership-feature-section"><div className="benefit-head"><div><b>Package features</b><small>Shown on the customer membership page.</small></div><button type="button" className="mini-action" onClick={() => { const value = prompt('Feature name'); if (value?.trim()) setField('benefits', [...form.benefits, value.trim()]); }}>＋ Add</button></div><div className="chips">{form.benefits.map((item, i) => <span key={i}>{item}<button type="button" onClick={() => setField('benefits', form.benefits.filter((_, n) => n !== i))}>×</button></span>)}</div></div>
        <div className="membership-source-note"><span>Single source</span><p>GROW and SCALE package price, billing cycles, lead allowances and customer-facing features are managed only here.</p></div>
        <div className="form-footer membership-save-row"><button className="primary create-btn" disabled={loading}>{loading?'Loading…':`Save ${form.name} package`}</button></div>
      </form>
    </section>}

    {tab === 'investor' && investor && <section className="create-card hero-card"><div className="card-heading"><div><h2>Investor</h2><small>Configure capacity as Industry → Location → Limit</small></div><label className="switch-label"><input type="checkbox" checked={Boolean(investor.enabled)} onChange={e => setInvestor({ ...investor, enabled: e.target.checked })} /> Enabled</label></div><form onSubmit={saveInvestor}><div className="two"><label>Customer limit / industry<input type="number" min="0" value={investor.customer_industry_limit ?? 10} onChange={e => setInvestor({ ...investor, customer_industry_limit: e.target.value })} /></label><label>Minimum investment ₹<input type="number" min="0" value={investor.min_investment} onChange={e => setInvestor({ ...investor, min_investment: e.target.value })} /></label><label>Maximum investment ₹<input type="number" min="0" value={investor.max_investment ?? ''} placeholder="No maximum" onChange={e => setInvestor({ ...investor, max_investment: e.target.value })} /></label></div><div className="editor-section investor-hierarchy-section"><div className="benefit-head"><div><b>Industry → Location → Limit</b><small>Each industry's capacity is configured only through its locations. A state row can cover all cities, or a specific city can have its own limit.</small></div></div><div className="investor-hierarchy">{(investor.industryLimits || []).map((industry, industryIndex) => <div className="investor-industry-card" key={industry.id}><div className="investor-industry-head"><div><strong>{industry.name}</strong><small>{(industry.locations || []).length} location {(industry.locations || []).length === 1 ? 'rule' : 'rules'}</small></div><label className="check-row"><input type="checkbox" checked={industry.is_active !== false} onChange={e => updateIndustry(industryIndex, 'is_active', e.target.checked)} /> Active</label></div><div className="investor-location-list">{(industry.locations || []).length === 0 && <div className="empty investor-empty">No locations configured for this industry.</div>}{(industry.locations || []).map((location, locationIndex) => <div className="investor-location-row" key={location.id || `${industry.id}-${locationIndex}`}><label>Location<select value={location.state_id || ''} onChange={e => updateIndustryLocation(industryIndex, locationIndex, 'state_id', e.target.value)}><option value="">Select state</option>{states.map(state => <option key={state.id} value={state.id}>{state.name}</option>)}</select></label><label>City<select value={location.city_id ?? ''} disabled={!location.state_id} onChange={e => updateIndustryLocation(industryIndex, locationIndex, 'city_id', e.target.value || null)}><option value="">All cities</option>{citiesForState(location.state_id).map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label><label>Limit ₹<input type="number" min="0" step="0.01" value={location.investor_limit ?? 0} onChange={e => updateIndustryLocation(industryIndex, locationIndex, 'investor_limit', e.target.value)} /></label><label className="check-row"><input type="checkbox" checked={location.is_active !== false} onChange={e => updateIndustryLocation(industryIndex, locationIndex, 'is_active', e.target.checked)} /> Active</label><button type="button" className="remove-lead" onClick={() => removeIndustryLocation(industryIndex, locationIndex)}>×</button></div>)}</div><button type="button" className="mini-action" onClick={() => addIndustryLocation(industryIndex)}>＋ Add location to {industry.name}</button></div>)}</div></div><div className="form-footer"><button className="primary create-btn">Save Investor limits</button></div></form></section>}
  </main>;
}
