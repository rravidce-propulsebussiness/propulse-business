import { useCallback, useEffect, useMemo, useState } from 'react';
import LeadPartnerSidebar from '../components/LeadPartnerSidebar';
import { useNavigate } from 'react-router-dom';
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
  const user = getUser();
  const [data, setData] = useState({ settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [], rules: [] });
  const [industries, setIndustries] = useState([]);
  const [cities, setCities] = useState([]);
  const [search] = useState('');
  const [status] = useState('all');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [savingRule, setSavingRule] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [ruleForm, setRuleForm] = useState({ id: null, industryId: '', cityId: '', leadType: 'basic', pricing: defaultTiers(), isActive: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const settings = data.settings || {};
  const uplift = Number(settings.normalPriceUplift ?? 100);
  const leads = useMemo(() => Array.isArray(data.leads) ? data.leads : [], [data.leads]);
  const rules = useMemo(() => Array.isArray(data.rules) ? data.rules : [], [data.rules]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams({ search, status });
      const result = await authRequest(`/lead-partner/pricing?${params}`);
      setData(result || { settings: { commissionPercent: 5, normalPriceUplift: 100 }, leads: [], rules: [] });
      setDrafts(Object.fromEntries((result?.leads || []).map(lead => [lead.id, normalizePartnerTiers(lead.pricing)])));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, status])

  const loadCatalogs = useCallback(async () => {
    try {
      const [industryRows, cityRows] = await Promise.all([authRequest('/industries'), authRequest('/cities')]);
      setIndustries(Array.isArray(industryRows) ? industryRows : []);
      setCities(Array.isArray(cityRows) ? cityRows : []);
    } catch (e) { setError(e.message); }
  }, [])

  useEffect(() => { let active=true; queueMicrotask(()=>{if(active){load();loadCatalogs()}}); return()=>{active=false}; }, [load, loadCatalogs]);

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

  function setRulePro(index, value) {
    if (index !== 0) return;
    setRuleForm(current => ({ ...current, pricing: { shares: buildFixedPartnerTiers(value) } }));
    setSuccess('');
    setError('');
  }

  async function saveRule() {
    const oneShare = ruleForm.pricing?.shares?.find(tier => Number(tier.shares) === 1)?.pro ?? 0;
    const pricing = { shares: buildFixedPartnerTiers(oneShare) };
    const path = ruleForm.id ? `/lead-partner/pricing/config/${ruleForm.id}` : '/lead-partner/pricing/config';
    try {
      setSavingRule(true);
      setError('');
      setSuccess('');
      await authRequest(path, {
        method: ruleForm.id ? 'PUT' : 'POST',
        body: JSON.stringify({ ...ruleForm, pricing }),
      });
      setSuccess(ruleForm.id ? 'Pricing configuration updated.' : 'Pricing configuration saved.');
      resetRule();
      await load();
    } catch (e) {
      setError(e.message || 'Unable to save pricing configuration');
    } finally {
      setSavingRule(false);
    }
  }

  function signOut() { clearSession(); localStorage.removeItem('propulse_session_mode'); navigate('/login', { replace: true }); }

  return (
    <div className="pricing-shell">
      <LeadPartnerSidebar user={user} onSignOut={signOut} />

      <main className="pricing-main">
        <header className="pricing-topbar"><div className="pricing-breadcrumb"><span>Lead Partner</span><b>/</b><strong>Pricing & Revenue</strong></div><div className="pricing-top-actions"><span><i /> Partner account</span><b>♧</b></div></header>

        <div className="pricing-content">
          <section className="pricing-hero"><div><h1>Pricing & Revenue</h1></div></section>

          {(error || success) && <div className={`pricing-message ${error ? 'error' : 'success'}`}>{error || success}</div>}

          <section className="pricing-kpis">
            <article><div className="pricing-kpi-icon blue">%</div><div><span>ADMIN COMMISSION</span><strong>{settings.commissionPercent ?? 5}%</strong><p>Current partner transaction commission.</p></div></article>
            <article><div className="pricing-kpi-icon blue">₹</div><div><span>ADMIN UPLIFT</span><strong>+{money(uplift)}</strong><p>Added automatically when calculating Normal customer price.</p></div></article>
            <article><div className="pricing-kpi-icon blue">♟</div><div><span>FIXED SHARE RATIOS</span><strong>100% · 60% · 45%</strong><p>1 share = 100% &nbsp;·&nbsp; 2 shares = 60% &nbsp;·&nbsp; 3 shares = 45%<br/>(Fixed automatically)</p></div></article>
          </section>

          <section className="pricing-panel builder">
            <div className="pricing-panel-title"><div><span className="pricing-kicker">PRICE CONFIGURATION</span><h2>{ruleForm.id ? 'Edit Pro pricing configuration' : 'Create Pro pricing configuration'}</h2><p>Choose Industry, City and Lead Type. Then enter the 1-share Pro price. Other share prices are calculated automatically.</p></div>{ruleForm.id && <button className="pricing-secondary" type="button" onClick={resetRule}>Reset</button>}</div>

            <div className="pricing-scope">
              <label>INDUSTRY<select value={ruleForm.industryId} onChange={e => setRuleForm({ ...ruleForm, industryId:e.target.value })}><option value="">All industries</option>{industries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>CITY<select value={ruleForm.cityId} onChange={e => setRuleForm({ ...ruleForm, cityId:e.target.value })}><option value="">All cities</option>{cities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>LEAD TYPE<select value={ruleForm.leadType} onChange={e => setRuleForm({ ...ruleForm, leadType:e.target.value })}><option value="basic">Basic</option><option value="premium">Premium</option></select></label>
              <label className="pricing-status">STATUS<div><input type="checkbox" checked={ruleForm.isActive} onChange={e => setRuleForm({ ...ruleForm, isActive:e.target.checked })}/><span>Active</span><small>Enable this pricing rule</small></div></label>
            </div>

            <div className="pricing-tier-heading"><div><span>₹</span><div><strong>Pro price by sharing tier</strong><small>Only the 1-share Pro price is editable. Other share prices are calculated automatically.</small></div></div><aside><strong>▣ &nbsp; Normal customer price</strong><small>Calculated as: Pro price + {money(uplift)} (Admin uplift)</small><b>Auto calculated</b></aside></div>

            <div className="pricing-tiers">{ruleForm.pricing.shares.map((tier,index) => <article className={`pricing-tier ${index===0?'editable':''}`} key={tier.shares}><div className="tier-icon">{tier.shares===1?'♟':'♟♟'}</div><h3>{tier.shares} Share{tier.shares===1?'':'s'}</h3><p>Pro price {index===0?'(Editable)':`(${Math.round(SHARE_PERCENT[tier.shares]*100)}%)`}</p><div className="tier-input"><b>₹</b><input type="number" min="0" step="0.01" value={tier.pro} disabled={index!==0} onChange={e=>setRulePro(index,e.target.value)}/></div><small>{index===0?'Set the base Pro price for 1 share.':`Automatically calculated at ${Math.round(SHARE_PERCENT[tier.shares]*100)}% of 1-share price.`}</small></article>)}</div>

            <div className="pricing-builder-foot"><span>Example: 1 Share ₹1,000 → 2 Shares ₹600 → 3 Shares ₹450.</span><div><button className="pricing-secondary" type="button" onClick={resetRule}>↶ Reset</button><button className="pricing-primary" disabled={savingRule} type="button" onClick={saveRule}>▣ &nbsp; {savingRule?'Saving…':ruleForm.id?'Update configuration':'Save configuration'}</button></div></div>
          </section>

          <div className="pricing-bottom">
            <section className="pricing-panel rules-panel">
              <div className="pricing-panel-title compact"><div><span className="pricing-kicker">YOUR CONFIGURATIONS</span><h2>Configured Pro pricing rules</h2><p>Only rules belonging to your Lead Partner account are shown.</p></div><input placeholder="⌕  Search industry, city or lead type..." /></div>
              {!rules.length ? <div className="pricing-empty">No Pro pricing configurations yet. Create one above.</div> : <div className="pricing-table-wrap"><table className="pricing-table"><thead><tr><th>#</th><th>Industry</th><th>City</th><th>Lead Type</th><th>1 Share (₹)</th><th>2 Shares (60%)</th><th>3 Shares (45%)</th><th>Status</th><th>Updated</th></tr></thead><tbody>{rules.map((rule,i)=><tr key={rule.id}><td>{i+1}</td><td>{rule.industryName||'All industries'}</td><td>{rule.cityName||'All cities'}</td><td>{cap(rule.leadType)}</td>{SHARE_TIERS.map(shares=>{const tier=(rule.pricing?.shares||[]).find(x=>Number(x.shares)===shares);return <td key={shares}>{money(tier?.pro)}</td>})}<td><span className="status-active">{rule.isActive?'Active':'Off'}</span></td><td>{rule.updatedAt?new Date(rule.updatedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td></tr>)}</tbody></table></div>}
            </section>

            <section className="pricing-panel overrides-panel">
              <div className="pricing-panel-title compact"><div><span className="pricing-kicker">YOUR LEADS</span><h2>Lead-level Pro price overrides</h2><p>Set custom Pro prices for specific high-value leads.</p></div><button className="pricing-outline">＋ Add Override</button></div>
              <div className="override-list">{loading ? <div className="pricing-empty">Loading…</div> : !leads.length ? <div className="pricing-empty">No uploaded leads are available for pricing yet.</div> : leads.slice(0,5).map(lead=>{const tiers=normalizePartnerTiers({shares:drafts[lead.id]||[]});const locked=['sold','closed','invalid'].includes(lead.status);return <article key={lead.id}><div><span>#{lead.id}</span><strong>{lead.customerName||'Customer'}</strong><small>{lead.phone||lead.email||'No contact'}</small></div><label>1-share Pro<input disabled={locked} type="number" value={tiers[0]?.pro||0} onChange={e=>changeDraft(lead.id,1,e.target.value)}/></label><span className={`override-status ${lead.status}`}>{cap(lead.status)}</span><button disabled={locked||savingId===lead.id} onClick={()=>save(lead)}>{savingId===lead.id?'…':'Save'}</button></article>})}</div>
              <div className="override-note">Only 1-share Pro can be changed. 2-share = 60% and 3-share = 45%.</div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}