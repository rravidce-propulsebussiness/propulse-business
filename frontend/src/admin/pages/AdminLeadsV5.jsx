import { useEffect, useRef, useState } from 'react';
import './AdminLeads.css';
import { getToken } from '../../utils/auth';

const API = 'http://localhost:5000/api';
const EMPTY_PRICING = { normal: { oneShare: 0, threeShares: 0, fiveShares: 0 }, pro: { oneShare: 0, threeShares: 0, fiveShares: 0 } };
const text = (v) => String(v ?? '').trim();
const key = (v) => text(v).toLowerCase().replace(/[^a-z0-9]/g, '');
const title = (v) => text(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const clone = (v) => JSON.parse(JSON.stringify(v));

function parseCsv(csv) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && csv[i + 1] === '\n') i += 1; row.push(cell); if (row.some(text)) rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); if (row.some(text)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(text);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, text(values[i])] )));
}

function downloadSample() {
  const headers = ['Industry','Service','Subservice','State','City','Customer Name','Customer Phone','Customer Email','Requirement','Property Type','Budget','Source','Notes','Project Type','Area / Size','Preferred Date'];
  const example = ['Construction & Contractors','Building Construction','','Telangana','Hyderabad','Example Customer','9876500000','customer@example.com','Looking for a new house','Residential','2500000','Website','Example row','New Construction','2000 sq ft','2026-09-15'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`${headers.map(esc).join(',')}\n${example.map(esc).join(',')}`], { type: 'text/csv' })); a.download = 'propulse-leads-sample.csv'; a.click(); URL.revokeObjectURL(a.href);
}

export default function AdminLeadsV5() {
  const [leads, setLeads] = useState([]);
  const [cat, setCat] = useState({ industries: [], services: [], subservices: [], states: [], cities: [] });
  const [rows, setRows] = useState([]); const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false); const [edit, setEdit] = useState(null); const [view, setView] = useState(null);
  const [uploadPricing, setUploadPricing] = useState(clone(EMPTY_PRICING)); const fileRef = useRef(null);

  const request = async (path, options = {}) => {
    const r = await fetch(API + path, { ...options, headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed'); return d;
  };

  async function load() {
    try {
      setLoading(true);
      const [leadData, industries, services, subservices, states, cities] = await Promise.all([
        request('/leads?status=all'), fetch(`${API}/industries`).then((r) => r.json()), fetch(`${API}/services`).then((r) => r.json()),
        fetch(`${API}/subservices`).then((r) => r.json()), fetch(`${API}/states`).then((r) => r.json()), fetch(`${API}/cities`).then((r) => r.json()),
      ]);
      setLeads(leadData); setCat({ industries, services, subservices, states, cities });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function loadPricing() {
    try { const p = await request('/leads/pricing'); setUploadPricing({ normal: { oneShare: p?.normal_one_share ?? 0, threeShares: p?.normal_three_shares ?? 0, fiveShares: p?.normal_five_shares ?? 0 }, pro: { oneShare: p?.pro_one_share ?? 0, threeShares: p?.pro_three_shares ?? 0, fiveShares: p?.pro_five_shares ?? 0 } }); } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); loadPricing(); }, []);

  const servicesFor = (industryId) => cat.services.filter((x) => String(x.industry_id) === String(industryId));
  const subservicesFor = (serviceId) => cat.subservices.filter((x) => String(x.service_id) === String(serviceId));
  const citiesFor = (stateId) => cat.cities.filter((x) => String(x.state_id) === String(stateId));
  const findByName = (items, value) => items.find((x) => key(x.name) === key(value));

  function makeRow(raw, i) {
    const get = (...names) => { const k = Object.keys(raw).find((n) => names.some((candidate) => key(n) === key(candidate))); return k ? raw[k] : ''; };
    const industry = findByName(cat.industries, get('industry')); const service = industry ? findByName(servicesFor(industry.id), get('service')) : null;
    const subservice = service ? findByName(subservicesFor(service.id), get('subservice')) : null; const state = findByName(cat.states, get('state')); const city = state ? findByName(citiesFor(state.id), get('city')) : null;
    const known = ['industry','service','subservice','state','city','customername','customerphone','customeremail','requirement','propertytype','budget','source','notes']; const customFields = {};
    Object.entries(raw).forEach(([f, v]) => { if (!known.includes(key(f)) && text(v)) customFields[f] = v; });
    return { tmp: `${Date.now()}-${i}-${Math.random()}`, industryId: industry?.id || '', serviceId: service?.id || '', subserviceId: subservice?.id || '', stateId: state?.id || '', cityId: city?.id || '', customerName: get('customerName'), customerPhone: get('customerPhone'), customerEmail: get('customerEmail'), requirement: get('requirement'), propertyType: get('propertyType'), budget: get('budget'), source: get('source') || 'upload', notes: get('notes'), customFields, pricing: clone(uploadPricing), badI: !!get('industry') && !industry, badS: !!get('service') && !service, badSS: !!get('subservice') && !subservice, badST: !!get('state') && !state, badC: !!get('city') && !city };
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try { const parsed = parseCsv(await file.text()); if (!parsed.length) throw new Error('Sheet is empty'); const preview = parsed.map(makeRow); setRows(preview); setSelected(preview.map((x) => x.tmp)); setShowUpload(true); }
    catch (err) { setError(err.message); } finally { e.target.value = ''; }
  }

  function changeRow(id, field, value) {
    setRows((all) => all.map((row) => {
      if (row.tmp !== id) return row; const n = { ...row, [field]: value };
      if (field === 'industryId') { n.serviceId = ''; n.subserviceId = ''; n.badI = false; n.badS = false; n.badSS = false; }
      if (field === 'serviceId') { n.subserviceId = ''; n.badS = false; n.badSS = false; }
      if (field === 'subserviceId') n.badSS = false;
      if (field === 'stateId') { n.cityId = ''; n.badST = false; n.badC = false; } if (field === 'cityId') n.badC = false;
      return n;
    }));
  }

  function bulkChange(field, value) {
    setRows((all) => all.map((row) => {
      if (!selected.includes(row.tmp)) return row; const n = { ...row, [field]: value };
      if (field === 'industryId') { n.serviceId = ''; n.subserviceId = ''; n.badI = false; n.badS = false; n.badSS = false; }
      if (field === 'serviceId') { n.subserviceId = ''; n.badS = false; n.badSS = false; }
      if (field === 'subserviceId') n.badSS = false;
      if (field === 'stateId') { n.cityId = ''; n.badST = false; n.badC = false; }
      return n;
    }));
  }

  const updatePrice = (type, field, value) => setUploadPricing((p) => ({ ...p, [type]: { ...p[type], [field]: value } }));
  const applyPricing = () => setRows((all) => all.map((r) => selected.includes(r.tmp) ? { ...r, pricing: clone(uploadPricing) } : r));

  async function importRows() {
    setBusy(true); try {
      for (const source of rows.filter((r) => selected.includes(r.tmp))) { const payload = { ...source }; ['tmp','badI','badS','badSS','badST','badC'].forEach((k) => delete payload[k]); await request('/leads', { method: 'POST', body: JSON.stringify(payload) }); }
      setShowUpload(false); setRows([]); setSelected([]); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function saveLead() { setBusy(true); try { await request(`/leads/${edit.id}`, { method: 'PUT', body: JSON.stringify(edit) }); setEdit(null); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function removeLead(id) { if (!window.confirm('Delete this lead permanently?')) return; setBusy(true); try { await request(`/leads/${id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e.message); } finally { setBusy(false); } }

  function startEdit(lead) {
    setEdit({ ...lead, industryId: lead.industry_id || '', serviceId: lead.service_id || '', subserviceId: lead.subservice_id || '', stateId: lead.state_id || '', cityId: lead.city_id || '', customerName: lead.customer_name || '', customerPhone: lead.customer_phone || '', customerEmail: lead.customer_email || '', requirement: lead.requirement || '', propertyType: lead.property_type || '', budget: lead.budget || '', source: lead.source || 'upload', status: lead.status || 'available', notes: lead.notes || '', customFields: lead.custom_fields || {}, pricing: lead.pricing || clone(EMPTY_PRICING) });
  }

  const allSelected = rows.length > 0 && selected.length === rows.length;
  return <div className="admin-leads-page">
    <div className="admin-page-heading"><div><span className="admin-eyebrow">MARKETPLACE</span><h1>Leads</h1><p>Upload, match, preview and manage your lead inventory.</p></div><div className="lead-head-actions"><button className="admin-secondary-btn" onClick={downloadSample}>↓ Sample Sheet</button><button className="admin-primary-btn" onClick={() => fileRef.current?.click()}>↑ Upload Leads</button><input ref={fileRef} hidden type="file" accept=".csv" onChange={handleUpload}/></div></div>
    <div className="admin-leads-stats"><div className="admin-lead-stat"><span>Total Leads</span><strong>{leads.length}</strong></div>{['available','sold','closed'].map((s) => <div className="admin-lead-stat" key={s}><span>{title(s)}</span><strong>{leads.filter((l) => l.status === s).length}</strong></div>)}</div>
    {error && <div className="lead-alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <div className="admin-leads-card"><div className="admin-leads-card-header"><div><h2>All Leads</h2><p>{leads.length} records · edit or delete any uploaded lead</p></div><button className="admin-refresh-btn" onClick={load}>↻ Refresh</button></div>
      {loading ? <div className="admin-leads-state">Loading...</div> : <div className="admin-leads-table-wrap"><table className="admin-leads-table"><thead><tr><th>ID</th><th>Customer</th><th>Industry</th><th>Service</th><th>Subservice</th><th>Location</th><th>Budget</th><th>Status</th><th>Actions</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td>#{lead.id}</td><td><div className="lead-customer"><strong>{lead.customer_name || '—'}</strong><span>{lead.customer_phone || 'No phone'}</span></div></td><td>{lead.industry_name || 'Unclassified'}</td><td>{lead.service_name || 'Unclassified'}</td><td>{lead.subservice_name || '—'}</td><td>{lead.city_name || '—'}{lead.state_name && <span className="muted"> · {lead.state_name}</span>}</td><td>{lead.budget || '—'}</td><td><span className={`lead-status lead-status-${lead.status}`}>{lead.status}</span></td><td><div className="row-actions"><button onClick={() => setView(lead)}>View</button><button onClick={() => startEdit(lead)}>Edit</button><button className="danger" onClick={() => removeLead(lead.id)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    </div>

    {showUpload && <div className="modal-backdrop"><div className="lead-modal wide upload-modal"><div className="modal-title"><div><h2>Preview & Match</h2><p>{rows.length} rows · unmatched values are highlighted.</p></div><button onClick={() => setShowUpload(false)}>×</button></div>
      <div className="upload-toolbar"><label className="select-all-label"><input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.tmp) : [])}/> Select all ({selected.length})</label>
        <select defaultValue="" onChange={(e) => e.target.value && bulkChange('industryId', e.target.value)}><option value="">Bulk Industry</option>{cat.industries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select defaultValue="" onChange={(e) => e.target.value && bulkChange('serviceId', e.target.value)}><option value="">Bulk Service</option>{cat.services.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select defaultValue="" onChange={(e) => e.target.value && bulkChange('subserviceId', e.target.value)}><option value="">Bulk Subservice</option>{cat.subservices.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select defaultValue="" onChange={(e) => e.target.value && bulkChange('stateId', e.target.value)}><option value="">Bulk State</option>{cat.states.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </div>
      <div className="upload-pricing"><div className="upload-pricing-heading"><div><strong>Pricing for this upload</strong><span>Set 3 + 3 prices before importing.</span></div><button className="admin-secondary-btn" onClick={applyPricing}>Apply to selected</button></div><div className="upload-pricing-grid">{['normal','pro'].map((type) => <div className="upload-pricing-tier" key={type}><strong>{title(type)} User</strong>{[['oneShare','1 Share'],['threeShares','3 Shares'],['fiveShares','5 Shares']].map(([f,l]) => <label key={f}>{l}<input type="number" min="0" value={uploadPricing[type][f]} onChange={(e) => updatePrice(type,f,e.target.value)}/></label>)}</div>)}</div></div>
      <div className="preview-wrap"><table className="preview-table"><thead><tr><th></th><th>Industry</th><th>Service</th><th>Subservice</th><th>State</th><th>City</th><th>Customer</th><th>Requirement</th><th>Custom Fields</th></tr></thead><tbody>{rows.map((r) => <tr key={r.tmp}><td><input type="checkbox" checked={selected.includes(r.tmp)} onChange={(e) => setSelected((a) => e.target.checked ? [...a,r.tmp] : a.filter((id) => id !== r.tmp))}/></td><td><select className={r.badI ? 'bad' : ''} value={r.industryId} onChange={(e) => changeRow(r.tmp,'industryId',e.target.value)}><option value="">None</option>{cat.industries.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td><select className={r.badS ? 'bad' : ''} value={r.serviceId} onChange={(e) => changeRow(r.tmp,'serviceId',e.target.value)}><option value="">None</option>{servicesFor(r.industryId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td><select className={r.badSS ? 'bad' : ''} value={r.subserviceId} onChange={(e) => changeRow(r.tmp,'subserviceId',e.target.value)}><option value="">None</option>{subservicesFor(r.serviceId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td><select className={r.badST ? 'bad' : ''} value={r.stateId} onChange={(e) => changeRow(r.tmp,'stateId',e.target.value)}><option value="">None</option>{cat.states.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td><select className={r.badC ? 'bad' : ''} value={r.cityId} onChange={(e) => changeRow(r.tmp,'cityId',e.target.value)}><option value="">None</option>{citiesFor(r.stateId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td><td>{r.customerName || '—'}</td><td className="req-cell">{r.requirement || '—'}</td><td>{Object.entries(r.customFields).map(([f,v]) => <span className="custom-pill" key={f}>{title(f)}: {v}</span>)}</td></tr>)}</tbody></table></div>
      <div className="modal-footer"><span>Nothing is compulsory. Blank values remain blank.</span><button className="admin-secondary-btn" onClick={() => setShowUpload(false)}>Cancel</button><button className="admin-primary-btn" disabled={!selected.length || busy} onClick={importRows}>{busy ? 'Importing…' : `Import ${selected.length} Leads`}</button></div>
    </div></div>}

    {view && <div className="modal-backdrop"><div className="lead-modal"><div className="modal-title"><div><span className="admin-eyebrow">LEAD DETAILS</span><h2>#{view.id} {view.customer_name || 'Untitled'}</h2></div><button onClick={() => setView(null)}>×</button></div><div className="detail-grid">{[['Industry',view.industry_name],['Service',view.service_name],['Subservice',view.subservice_name],['State',view.state_name],['City',view.city_name],['Phone',view.customer_phone],['Email',view.customer_email],['Requirement',view.requirement],['Property Type',view.property_type],['Budget',view.budget],['Source',view.source],['Status',view.status]].map(([l,v]) => <div key={l}><span>{l}</span><strong>{v || '—'}</strong></div>)}{Object.entries(view.custom_fields || {}).map(([f,v]) => <div key={f}><span>{title(f)}</span><strong>{String(v)}</strong></div>)}</div><div className="pricing-read"><h3>Share Pricing</h3><div>{['normal','pro'].flatMap((t) => [['oneShare','1'],['threeShares','3'],['fiveShares','5']].map(([f,c]) => <span key={`${t}-${f}`}>{title(t)} {c}: ₹{view.pricing?.[t]?.[f] ?? 0}</span>))}</div></div></div></div>}
    {edit && <EditModal data={edit} setData={setEdit} cat={cat} servicesFor={servicesFor} subservicesFor={subservicesFor} citiesFor={citiesFor} save={saveLead} close={() => setEdit(null)} busy={busy}/>} 
  </div>;
}

function EditModal({ data, setData, cat, servicesFor, subservicesFor, citiesFor, save, close, busy }) {
  const set = (field, value) => setData((p) => ({ ...p, [field]: value }));
  const select = (field, label, options, reset = []) => <label key={field}>{label}<select value={data[field] || ''} onChange={(e) => { set(field,e.target.value); reset.forEach((f) => set(f,'')); }}><option value="">None</option>{options.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>;
  return <div className="modal-backdrop"><div className="lead-modal"><div className="modal-title"><div><h2>Edit Lead #{data.id}</h2><p>All fields are optional.</p></div><button onClick={close}>×</button></div><div className="edit-grid">
    {select('industryId','Industry',cat.industries,['serviceId','subserviceId'])}{select('serviceId','Service',servicesFor(data.industryId),['subserviceId'])}{select('subserviceId','Subservice',subservicesFor(data.serviceId))}{select('stateId','State',cat.states,['cityId'])}{select('cityId','City',citiesFor(data.stateId))}
    {[['customerName','Customer Name'],['customerPhone','Phone'],['customerEmail','Email'],['propertyType','Property Type'],['budget','Budget'],['source','Source'],['requirement','Requirement'],['notes','Notes']].map(([f,l]) => <label key={f}>{l}{f === 'requirement' || f === 'notes' ? <textarea value={data[f] || ''} onChange={(e) => set(f,e.target.value)}/> : <input value={data[f] || ''} onChange={(e) => set(f,e.target.value)}/>}</label>)}
    <label>Status<select value={data.status || 'available'} onChange={(e) => set('status',e.target.value)}><option value="available">Available</option><option value="paused">Paused</option><option value="sold">Sold</option><option value="closed">Closed</option><option value="invalid">Invalid</option></select></label>
  </div><div className="modal-footer"><button className="admin-secondary-btn" onClick={close}>Cancel</button><button className="admin-primary-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save Changes'}</button></div></div></div>;
}
