import { useEffect, useRef, useState } from 'react';
import './AdminLeads.css';
import { getToken } from '../../utils/auth';

const API = 'http://localhost:5000/api';
const EMPTY_PRICING = {
  normal: { oneShare: 0, threeShares: 0, fiveShares: 0 },
  pro: { oneShare: 0, threeShares: 0, fiveShares: 0 },
};

const text = (v) => String(v ?? '').trim();
const key = (v) => text(v).toLowerCase().replace(/[^a-z0-9]/g, '');
const title = (v) => String(v ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const clone = (v) => JSON.parse(JSON.stringify(v));

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    if (char === '"') {
      if (quoted && csvText[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csvText[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => text(value))) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => text(value))) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map(text);
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, text(values[index])]))
  );
}

function downloadSample() {
  const headers = [
    'Industry', 'Service', 'Subservice', 'State', 'City', 'Customer Name',
    'Customer Phone', 'Customer Email', 'Requirement', 'Property Type',
    'Budget', 'Source', 'Notes', 'Project Type', 'Area / Size', 'Preferred Date',
  ];
  const example = [
    'Construction & Contractors', 'Building Construction', '', 'Telangana', 'Hyderabad',
    'Example Customer', '9876500000', 'customer@example.com', 'Looking for a new house',
    'Residential', '2500000', 'Website', 'Example row', 'New Construction', '2000 sq ft', '2026-09-15',
  ];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csvText = `${headers.map(escape).join(',')}\n${example.map(escape).join(',')}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csvText], { type: 'text/csv' }));
  link.download = 'propulse-leads-sample.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function AdminLeadsV4() {
  const [leads, setLeads] = useState([]);
  const [cat, setCat] = useState({ industries: [], services: [], subservices: [], states: [], cities: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadPricing, setUploadPricing] = useState(clone(EMPTY_PRICING));
  const fileRef = useRef(null);

  const request = async (path, options = {}) => {
    const response = await fetch(API + path, {
      ...options,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  async function load() {
    try {
      setLoading(true);
      const [leadData, industries, servicesData, subservices, states, cities] = await Promise.all([
        request('/leads?status=all'),
        fetch(`${API}/industries`).then((r) => r.json()),
        fetch(`${API}/services`).then((r) => r.json()),
        fetch(`${API}/subservices`).then((r) => r.json()),
        fetch(`${API}/states`).then((r) => r.json()),
        fetch(`${API}/cities`).then((r) => r.json()),
      ]);
      setLeads(leadData);
      setCat({ industries, services: servicesData, subservices, states, cities });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadPricing() {
    try {
      const p = await request('/leads/pricing');
      setUploadPricing({
        normal: {
          oneShare: p?.normal_one_share ?? 0,
          threeShares: p?.normal_three_shares ?? 0,
          fiveShares: p?.normal_five_shares ?? 0,
        },
        pro: {
          oneShare: p?.pro_one_share ?? 0,
          threeShares: p?.pro_three_shares ?? 0,
          fiveShares: p?.pro_five_shares ?? 0,
        },
      });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    loadPricing();
  }, []);

  const servicesFor = (industryId) => cat.services.filter((item) => String(item.industry_id) === String(industryId));
  const subservicesFor = (serviceId) => cat.subservices.filter((item) => String(item.service_id) === String(serviceId));
  const citiesFor = (stateId) => cat.cities.filter((item) => String(item.state_id) === String(stateId));
  const findByName = (items, value) => items.find((item) => key(item.name) === key(value));

  function makePreviewRow(raw, index) {
    const get = (...names) => {
      const found = Object.keys(raw).find((name) => names.some((candidate) => key(name) === key(candidate)));
      return found ? raw[found] : '';
    };

    const industry = findByName(cat.industries, get('industry'));
    const service = industry ? findByName(servicesFor(industry.id), get('service')) : null;
    const subservice = service ? findByName(subservicesFor(service.id), get('subservice')) : null;
    const state = findByName(cat.states, get('state'));
    const city = state ? findByName(citiesFor(state.id), get('city')) : null;
    const known = ['industry', 'service', 'subservice', 'state', 'city', 'customername', 'customerphone', 'customeremail', 'requirement', 'propertytype', 'budget', 'source', 'notes'];
    const customFields = {};

    Object.entries(raw).forEach(([field, value]) => {
      if (!known.includes(key(field)) && text(value)) customFields[field] = value;
    });

    return {
      tmp: `${index}-${Date.now()}-${Math.random()}`,
      industryId: industry?.id || '',
      serviceId: service?.id || '',
      subserviceId: subservice?.id || '',
      stateId: state?.id || '',
      cityId: city?.id || '',
      customerName: get('customerName'),
      customerPhone: get('customerPhone'),
      customerEmail: get('customerEmail'),
      requirement: get('requirement'),
      propertyType: get('propertyType'),
      budget: get('budget'),
      source: get('source') || 'upload',
      notes: get('notes'),
      customFields,
      pricing: clone(uploadPricing),
      badI: !!get('industry') && !industry,
      badS: !!get('service') && !service,
      badST: !!get('state') && !state,
      badC: !!get('city') && !city,
    };
  }

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      if (!parsed.length) throw new Error('Sheet is empty');
      const preview = parsed.map(makePreviewRow);
      setRows(preview);
      setSelected(preview.map((row) => row.tmp));
      setShowUpload(true);
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
    }
  }

  function changeRow(id, field, value) {
    setRows((previous) => previous.map((row) => {
      if (row.tmp !== id) return row;
      const next = { ...row, [field]: value };
      if (field === 'industryId') {
        next.serviceId = '';
        next.subserviceId = '';
        next.badI = false;
      }
      if (field === 'serviceId') {
        next.subserviceId = '';
        next.badS = false;
      }
      if (field === 'stateId') {
        next.cityId = '';
        next.badST = false;
      }
      if (field === 'cityId') next.badC = false;
      return next;
    }));
  }

  function bulkChange(field, value) {
    setRows((previous) => previous.map((row) => {
      if (!selected.includes(row.tmp)) return row;
      const next = { ...row, [field]: value };
      if (field === 'industryId') {
        next.serviceId = '';
        next.subserviceId = '';
        next.badI = false;
      }
      if (field === 'stateId') {
        next.cityId = '';
        next.badST = false;
      }
      return next;
    }));
  }

  function updateUploadPrice(type, field, value) {
    setUploadPricing((previous) => ({
      ...previous,
      [type]: { ...previous[type], [field]: value },
    }));
  }

  function applyUploadPricing() {
    setRows((previous) => previous.map((row) => (
      selected.includes(row.tmp) ? { ...row, pricing: clone(uploadPricing) } : row
    )));
  }

  async function importRows() {
    setBusy(true);
    try {
      const chosen = rows.filter((row) => selected.includes(row.tmp));
      for (const row of chosen) {
        const payload = { ...row };
        delete payload.tmp;
        delete payload.badI;
        delete payload.badS;
        delete payload.badST;
        delete payload.badC;
        await request('/leads', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowUpload(false);
      setRows([]);
      setSelected([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveLead() {
    setBusy(true);
    try {
      await request(`/leads/${edit.id}`, { method: 'PUT', body: JSON.stringify(edit) });
      setEdit(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeLead(id) {
    if (!window.confirm('Delete this lead permanently?')) return;
    setBusy(true);
    try {
      await request(`/leads/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function editLead(lead) {
    setEdit({
      ...lead,
      industryId: lead.industry_id || '',
      serviceId: lead.service_id || '',
      subserviceId: lead.subservice_id || '',
      stateId: lead.state_id || '',
      cityId: lead.city_id || '',
      customerName: lead.customer_name || '',
      customerPhone: lead.customer_phone || '',
      customerEmail: lead.customer_email || '',
      requirement: lead.requirement || '',
      propertyType: lead.property_type || '',
      budget: lead.budget || '',
      source: lead.source || 'upload',
      status: lead.status || 'available',
      notes: lead.notes || '',
      customFields: lead.custom_fields || {},
      pricing: lead.pricing || clone(EMPTY_PRICING),
    });
  }

  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="admin-leads-page">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">MARKETPLACE</span>
          <h1>Leads</h1>
          <p>Upload, match, preview and manage your lead inventory.</p>
        </div>
        <div className="lead-head-actions">
          <button className="admin-secondary-btn" onClick={downloadSample}>↓ Sample Sheet</button>
          <button className="admin-primary-btn" onClick={() => fileRef.current?.click()}>↑ Upload Leads</button>
          <input ref={fileRef} hidden type="file" accept=".csv" onChange={handleUpload} />
        </div>
      </div>

      <div className="admin-leads-stats">
        <div className="admin-lead-stat"><span>Total Leads</span><strong>{leads.length}</strong></div>
        {['available', 'sold', 'closed'].map((status) => (
          <div className="admin-lead-stat" key={status}>
            <span>{title(status)}</span><strong>{leads.filter((lead) => lead.status === status).length}</strong>
          </div>
        ))}
      </div>

      {error && <div className="lead-alert">{error}<button onClick={() => setError('')}>×</button></div>}

      <div className="admin-leads-card">
        <div className="admin-leads-card-header">
          <div><h2>All Leads</h2><p>{leads.length} records · dynamic custom fields are preserved</p></div>
          <button className="admin-refresh-btn" onClick={load}>↻ Refresh</button>
        </div>
        {loading ? <div className="admin-leads-state">Loading...</div> : (
          <div className="admin-leads-table-wrap">
            <table className="admin-leads-table">
              <thead><tr><th>ID</th><th>Customer</th><th>Industry</th><th>Service</th><th>Location</th><th>Budget</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>#{lead.id}</td>
                    <td><div className="lead-customer"><strong>{lead.customer_name || '—'}</strong><span>{lead.customer_phone || 'No phone'}</span></div></td>
                    <td>{lead.industry_name || 'Unclassified'}</td>
                    <td>{lead.service_name || 'Unclassified'}</td>
                    <td>{lead.city_name || '—'}{lead.state_name && <span className="muted"> · {lead.state_name}</span>}</td>
                    <td>{lead.budget || '—'}</td>
                    <td><span className={`lead-status lead-status-${lead.status}`}>{lead.status}</span></td>
                    <td><div className="row-actions"><button onClick={() => setView(lead)}>View</button><button onClick={() => editLead(lead)}>Edit</button><button className="danger" onClick={() => removeLead(lead.id)}>Delete</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && (
        <div className="modal-backdrop">
          <div className="lead-modal wide upload-modal">
            <div className="modal-title">
              <div><h2>Preview & Match</h2><p>{rows.length} rows · unmatched values are highlighted.</p></div>
              <button onClick={() => setShowUpload(false)}>×</button>
            </div>

            <div className="upload-toolbar">
              <label className="select-all-label">
                <input type="checkbox" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row.tmp) : [])} />
                Select all ({selected.length})
              </label>
              <select defaultValue="" onChange={(event) => event.target.value && bulkChange('industryId', event.target.value)}>
                <option value="">Bulk Industry</option>
                {cat.industries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select defaultValue="" onChange={(event) => event.target.value && bulkChange('stateId', event.target.value)}>
                <option value="">Bulk State</option>
                {cat.states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>

            <div className="upload-pricing">
              <div className="upload-pricing-heading">
                <div><strong>Pricing for this upload</strong><span>Set the 3 + 3 prices before importing. These prices are saved with each selected lead.</span></div>
                <button className="admin-secondary-btn" onClick={applyUploadPricing}>Apply to selected</button>
              </div>
              <div className="upload-pricing-grid">
                {['normal', 'pro'].map((type) => (
                  <div className="upload-pricing-tier" key={type}>
                    <strong>{title(type)} User</strong>
                    {[['oneShare', '1 Share'], ['threeShares', '3 Shares'], ['fiveShares', '5 Shares']].map(([field, label]) => (
                      <label key={field}>{label}<input type="number" min="0" value={uploadPricing[type][field]} onChange={(event) => updateUploadPrice(type, field, event.target.value)} /></label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="preview-wrap">
              <table className="preview-table">
                <thead><tr><th></th><th>Industry</th><th>Service</th><th>Subservice</th><th>State</th><th>City</th><th>Customer</th><th>Requirement</th><th>Custom Fields</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.tmp}>
                      <td><input type="checkbox" checked={selected.includes(row.tmp)} onChange={(event) => setSelected((items) => event.target.checked ? [...items, row.tmp] : items.filter((id) => id !== row.tmp))} /></td>
                      <td><select className={row.badI ? 'bad' : ''} value={row.industryId} onChange={(event) => changeRow(row.tmp, 'industryId', event.target.value)}><option value="">None</option>{cat.industries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                      <td><select className={row.badS ? 'bad' : ''} value={row.serviceId} onChange={(event) => changeRow(row.tmp, 'serviceId', event.target.value)}><option value="">None</option>{servicesFor(row.industryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                      <td><select value={row.subserviceId} onChange={(event) => changeRow(row.tmp, 'subserviceId', event.target.value)}><option value="">None</option>{subservicesFor(row.serviceId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                      <td><select className={row.badST ? 'bad' : ''} value={row.stateId} onChange={(event) => changeRow(row.tmp, 'stateId', event.target.value)}><option value="">None</option>{cat.states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                      <td><select className={row.badC ? 'bad' : ''} value={row.cityId} onChange={(event) => changeRow(row.tmp, 'cityId', event.target.value)}><option value="">None</option>{citiesFor(row.stateId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>
                      <td>{row.customerName || '—'}</td>
                      <td className="req-cell">{row.requirement || '—'}</td>
                      <td>{Object.entries(row.customFields).map(([field, value]) => <span className="custom-pill" key={field}>{title(field)}: {value}</span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <span>Nothing is compulsory. Blank values remain blank.</span>
              <button className="admin-secondary-btn" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="admin-primary-btn" disabled={!selected.length || busy} onClick={importRows}>{busy ? 'Importing…' : `Import ${selected.length} Leads`}</button>
            </div>
          </div>
        </div>
      )}

      {view && (
        <div className="modal-backdrop">
          <div className="lead-modal">
            <div className="modal-title"><div><span className="admin-eyebrow">LEAD DETAILS</span><h2>#{view.id} {view.customer_name || 'Untitled'}</h2></div><button onClick={() => setView(null)}>×</button></div>
            <div className="detail-grid">
              {[['Industry', view.industry_name], ['Service', view.service_name], ['Subservice', view.subservice_name], ['State', view.state_name], ['City', view.city_name], ['Phone', view.customer_phone], ['Email', view.customer_email], ['Requirement', view.requirement], ['Property Type', view.property_type], ['Budget', view.budget], ['Source', view.source], ['Status', view.status]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || '—'}</strong></div>)}
              {Object.entries(view.custom_fields || {}).map(([field, value]) => <div key={field}><span>{title(field)}</span><strong>{String(value)}</strong></div>)}
            </div>
            <div className="pricing-read"><h3>Share Pricing</h3><div>{['normal', 'pro'].flatMap((type) => [['oneShare', '1'], ['threeShares', '3'], ['fiveShares', '5']].map(([field, count]) => <span key={`${type}-${field}`}>{title(type)} {count}: ₹{view.pricing?.[type]?.[field] ?? 0}</span>))}</div></div>
          </div>
        </div>
      )}

      {edit && <EditModal data={edit} setData={setEdit} cat={cat} servicesFor={servicesFor} subservicesFor={subservicesFor} citiesFor={citiesFor} save={saveLead} close={() => setEdit(null)} busy={busy} />}
    </div>
  );
}

function EditModal({ data, setData, cat, servicesFor, subservicesFor, citiesFor, save, close, busy }) {
  const set = (field, value) => setData((previous) => ({ ...previous, [field]: value }));

  return (
    <div className="modal-backdrop">
      <div className="lead-modal">
        <div className="modal-title"><div><h2>Edit Lead #{data.id}</h2><p>All fields are optional.</p></div><button onClick={close}>×</button></div>
        <div className="edit-grid">
          {[['industryId', 'Industry', cat.industries], ['serviceId', 'Service', servicesFor(data.industryId)], ['subserviceId', 'Subservice', subservicesFor(data.serviceId)], ['stateId', 'State', cat.states], ['cityId', 'City', citiesFor(data.stateId)]].map(([field, label, options]) => (
            <label key={field}>{label}<select value={data[field] || ''} onChange={(event) => set(field, event.target.value)}><option value="">None</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          ))}
          {[['customerName', 'Customer Name'], ['customerPhone', 'Phone'], ['customerEmail', 'Email'], ['propertyType', 'Property Type'], ['budget', 'Budget'], ['source', 'Source'], ['requirement', 'Requirement'], ['notes', 'Notes']].map(([field, label]) => (
            <label key={field}>{label}{field === 'requirement' || field === 'notes' ? <textarea value={data[field] || ''} onChange={(event) => set(field, event.target.value)} /> : <input value={data[field] || ''} onChange={(event) => set(field, event.target.value)} />}</label>
          ))}
        </div>
        <div className="modal-footer"><button className="admin-secondary-btn" onClick={close}>Cancel</button><button className="admin-primary-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save Changes'}</button></div>
      </div>
    </div>
  );
}
