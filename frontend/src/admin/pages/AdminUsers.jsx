import { useEffect, useMemo, useState } from 'react';
import { authRequest } from '../../utils/auth';
import './AdminUsers.css';

const dateOnly = value => value ? new Date(value).toLocaleDateString() : '—';
const emptyService = () => ({ industryId: '', serviceId: '', subserviceId: '' });
const emptyLocation = () => ({ stateId: '', cityId: '', subcityId: '', pincode: '' });

export default function AdminUsers() {
  const [users, setUsers] = useState([]), [catalogs, setCatalogs] = useState(null), [subcitiesByCity, setSubcitiesByCity] = useState({});
  const [query, setQuery] = useState(''), [role, setRole] = useState('all'), [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true), [catalogLoading, setCatalogLoading] = useState(false), [error, setError] = useState(''), [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false), [form, setForm] = useState({ name: '', email: '', password: '' });
  const [editForm, setEditForm] = useState(null);

  async function loadUsers() {
    try { setLoading(true); setError(''); const p = new URLSearchParams({ search: query, role, status }); setUsers(await authRequest(`/admin/users?${p}`)); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function loadCatalogs() {
    if (catalogs) return catalogs;
    const [industries, services, subservices, states, cities, subcities] = await Promise.all([
      authRequest('/industries'), authRequest('/services'), authRequest('/subservices'), authRequest('/states'), authRequest('/cities'), authRequest('/subcities'),
    ]);
    const value = { industries: industries || [], services: services || [], subservices: subservices || [], states: states || [], cities: cities || [], subcities: subcities || [] };
    setCatalogs(value); setSubcitiesByCity((value.subcities || []).reduce((map, item) => { (map[item.city_id] ||= []).push(item); return map; }, {}));
    return value;
  }
  useEffect(() => { loadUsers(); }, [query, role, status]);

  const active = users.filter(u => u.is_active).length, businesses = users.filter(u => u.role === 'business').length, admins = users.filter(u => u.role === 'admin').length;
  const serviceOptions = useMemo(() => editForm && catalogs ? editForm.services.map(x => catalogs.services.filter(s => String(s.industry_id) === String(x.industryId))) : [], [editForm, catalogs]);
  const subserviceOptions = useMemo(() => editForm && catalogs ? editForm.services.map(x => catalogs.subservices.filter(s => String(s.service_id) === String(x.serviceId))) : [], [editForm, catalogs]);
  const cityOptions = useMemo(() => editForm && catalogs ? editForm.locations.map(x => catalogs.cities.filter(c => String(c.state_id) === String(x.stateId))) : [], [editForm, catalogs]);
  const subcityOptions = useMemo(() => editForm ? editForm.locations.map(x => subcitiesByCity[x.cityId] || []) : [], [editForm, subcitiesByCity]);

  function openUser(u) {
    setSelected(u); setEditing(false); setError('');
    setEditForm({
      name: u.name || '', email: u.email || '', phone: u.phone || '', businessName: u.business_name || '', businessDetails: u.business_details || '',
      services: (u.services || []).map(x => ({ industryId: String(x.industryId), serviceId: String(x.serviceId), subserviceId: x.subserviceId ? String(x.subserviceId) : '' })),
      locations: (u.locations || []).map(x => ({ stateId: String(x.stateId), cityId: String(x.cityId), subcityId: x.subcityId ? String(x.subcityId) : '', pincode: x.pincode || '' })),
    });
  }
  async function startBusinessEdit() {
    setEditing(true); setCatalogLoading(true); setError('');
    try { await loadCatalogs(); } catch (e) { setError(e.message); } finally { setCatalogLoading(false); }
  }
  async function toggleStatus(u) {
    try { setError(''); const x = await authRequest(`/admin/users/${u.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !u.is_active }) }); setUsers(c => c.map(v => v.id === u.id ? { ...v, ...x } : v)); setSelected(v => v && v.id === u.id ? { ...v, ...x } : v); }
    catch (e) { setError(e.message); }
  }
  function updateService(index, field, value) {
    setEditForm(x => ({ ...x, services: x.services.map((item, i) => i !== index ? item : field === 'industryId' ? { industryId: value, serviceId: '', subserviceId: '' } : field === 'serviceId' ? { ...item, serviceId: value, subserviceId: '' } : { ...item, [field]: value }) }));
  }
  function addAllServicesForIndustry(index) {
    const industryId = editForm?.services[index]?.industryId;
    if (!industryId) return setError('Select an industry first.');
    const available = (catalogs?.services || []).filter(service => String(service.industry_id) === String(industryId));
    if (!available.length) return setError('No services are available for this industry.');
    setEditForm(x => {
      const existing = new Set(x.services.map(item => `${item.industryId}:${item.serviceId}`));
      const additions = available.filter(service => !existing.has(`${industryId}:${service.id}`)).map(service => ({ industryId: String(industryId), serviceId: String(service.id), subserviceId: '' }));
      return additions.length ? { ...x, services: [...x.services, ...additions] } : x;
    });
    setError('');
  }
  function updateLocation(index, field, value) {
    setEditForm(x => ({ ...x, locations: x.locations.map((item, i) => i !== index ? item : field === 'stateId' ? { stateId: value, cityId: '', subcityId: '', pincode: '' } : field === 'cityId' ? { ...item, cityId: value, subcityId: '', pincode: '' } : { ...item, [field]: value }) }));
  }
  async function saveProfile(e) {
    e.preventDefault();
    if (!editForm) return;
    if (selected.role === 'business' && (!editForm.services.length || editForm.services.some(x => !x.industryId || !x.serviceId))) return setError('Complete every service selection.');
    if (selected.role === 'business' && (!editForm.locations.length || editForm.locations.some(x => !x.stateId || !x.cityId))) return setError('Complete every location selection.');
    try {
      setSaving(true); setError('');
      const payload = { ...editForm };
      if (selected.role === 'business') {
        payload.services = editForm.services.map(x => ({ industryId: Number(x.industryId), serviceId: Number(x.serviceId), subserviceId: x.subserviceId ? Number(x.subserviceId) : null }));
        payload.locations = editForm.locations.map(x => ({ stateId: Number(x.stateId), cityId: Number(x.cityId), subcityId: x.subcityId ? Number(x.subcityId) : null, pincode: x.pincode || null }));
      }
      const saved = await authRequest(`/admin/users/${selected.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setEditing(false); await loadUsers();
      const fresh = (await authRequest(`/admin/users?search=${encodeURIComponent(payload.email)}`)).find(v => v.id === selected.id);
      if (fresh) openUser(fresh); else setSelected(v => v ? { ...v, ...saved } : v);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function createAdmin(e) { e.preventDefault(); try { setSaving(true); setError(''); await authRequest('/admin/users/admin', { method: 'POST', body: JSON.stringify(form) }); setShowCreate(false); setForm({ name: '', email: '', password: '' }); await loadUsers(); } catch (e) { setError(e.message); } finally { setSaving(false); } }

  return <section className="admin-users-page">
    <div className="users-heading"><div><h1>Users</h1><p className="management-subtitle">Manage account identity, business details and account status. Memberships, payments and wallet activity are managed in their dedicated sections.</p></div><button className="admin-primary-btn" onClick={() => setShowCreate(true)}>+ Create Admin</button></div>
    <div className="users-stats"><div><span>Total users</span><strong>{users.length}</strong></div><div><span>Active</span><strong>{active}</strong></div><div><span>Businesses</span><strong>{businesses}</strong></div><div><span>Admins</span><strong>{admins}</strong></div></div>
    <div className="users-panel"><div className="users-toolbar"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email, phone or business..."/><select value={role} onChange={e => setRole(e.target.value)}><option value="all">All account types</option><option value="business">Businesses</option><option value="admin">Admins</option></select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>{error && <div className="users-error">{error}</div>}<div className="users-table-wrap">{loading ? <div className="empty-users">Loading users...</div> : !users.length ? <div className="empty-users">No users found.</div> : <table><thead><tr><th>ID</th><th>USER</th><th>BUSINESS</th><th>SCOPE</th><th>TYPE</th><th>STATUS</th><th>JOINED</th><th className="actions-header">ACTIONS</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td className="user-id">#{u.id}</td><td><div className="user-cell"><span>{(u.name || '?').charAt(0).toUpperCase()}</span><div><b>{u.name}</b><small>{u.email}</small>{u.phone && <small>{u.phone}</small>}</div></div></td><td>{u.business_name || <span className="muted">—</span>}</td><td>{u.role === 'business' ? <span className="scope-count">{u.service_count || 0} services · {u.location_count || 0} locations</span> : <span className="muted">—</span>}</td><td><em className={`role ${u.role}`}>{u.role === 'business' ? 'Business' : 'Admin'}</em></td><td><em className={`status ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</em></td><td>{dateOnly(u.created_at)}</td><td className="actions-cell"><div className="actions"><button onClick={() => openUser(u)}>Manage</button><button onClick={() => toggleStatus(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table>}</div></div>

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="user-modal user-management-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><h2>{selected.business_name || selected.name}</h2><small className="management-subtitle">#{selected.id} · {selected.role === 'business' ? 'Business account' : 'Administrator'}</small></div><button onClick={() => setSelected(null)}>×</button></div>{error && <div className="users-error">{error}</div>}
      <form onSubmit={saveProfile}>{editing && <div className="inline-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button className="admin-primary-btn" type="submit" disabled={saving || catalogLoading}>{saving ? 'Saving...' : 'Save all business changes'}</button></div>}<div className="management-section"><div className="management-section-head"><div><b>User & business details</b></div>{!editing && <button type="button" onClick={() => selected.role === 'business' ? startBusinessEdit() : setEditing(true)}>Edit</button>}</div>
      {editing ? <div className="management-grid"><label>Name<input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></label><label>Email<input required type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></label>{selected.role === 'business' && <><label>Phone<input required value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></label><label>Business name<input required value={editForm.businessName} onChange={e => setEditForm({ ...editForm, businessName: e.target.value })} /></label><label className="management-wide">Business details<textarea required rows="3" value={editForm.businessDetails} onChange={e => setEditForm({ ...editForm, businessDetails: e.target.value })} /></label><div className="management-wide configuration-editor">{catalogLoading && <div className="configuration-loading">Loading configuration options…</div>}<div className="configuration-title"><b>Services</b><button type="button" onClick={() => setEditForm({ ...editForm, services: [...editForm.services, emptyService()] })}>+ Add service</button></div>{editForm.services.map((x, i) => <div className="configuration-row" key={`service-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><select required value={x.industryId} onChange={e => updateService(i, 'industryId', e.target.value)}><option value="">Industry</option>{(catalogs?.industries || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!x.industryId} value={x.serviceId} onChange={e => updateService(i, 'serviceId', e.target.value)}><option value="">Service</option>{serviceOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!x.serviceId} value={x.subserviceId} onChange={e => updateService(i, 'subserviceId', e.target.value)}><option value="">All subservices</option>{subserviceOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><button type="button" className="add-all-services" onClick={() => addAllServicesForIndustry(i)} disabled={!x.industryId}>Add all services</button><button type="button" onClick={() => setEditForm({ ...editForm, services: editForm.services.filter((_, n) => n !== i) })}>Remove</button></div>)}</div><div className="management-wide configuration-editor"><div className="configuration-title"><b>Locations</b><button type="button" onClick={() => setEditForm({ ...editForm, locations: [...editForm.locations, emptyLocation()] })}>+ Add location</button></div>{editForm.locations.map((x, i) => <div className="configuration-row location-config" key={`location-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><select required value={x.stateId} onChange={e => updateLocation(i, 'stateId', e.target.value)}><option value="">State / UT</option>{(catalogs?.states || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!x.stateId} value={x.cityId} onChange={e => updateLocation(i, 'cityId', e.target.value)}><option value="">City</option>{cityOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!x.cityId} value={x.subcityId} onChange={e => updateLocation(i, 'subcityId', e.target.value)}><option value="">All areas</option>{subcityOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!x.cityId} value={x.pincode} onChange={e => updateLocation(i, 'pincode', e.target.value)}><option value="">Pincode</option>{((catalogs?.cities || []).find(v => String(v.id) === String(x.cityId))?.pincodes || []).map(v => <option key={v.id} value={v.pincode}>{v.pincode}{v.officeName ? ` · ${v.officeName}` : ''}</option>)}</select><button type="button" onClick={() => setEditForm({ ...editForm, locations: editForm.locations.filter((_, n) => n !== i) })}>Remove</button></div>)}</div></>}</div> : <div className="detail-list"><div><span>Name</span><b>{selected.name}</b></div><div><span>Email</span><b>{selected.email}</b></div><div><span>Phone</span><b>{selected.phone || '—'}</b></div><div><span>Business</span><b>{selected.business_name || '—'}</b></div>{selected.role === 'business' && <div className="management-wide"><span>Business details</span><b>{selected.business_details || '—'}</b></div>}</div>}</div>

      {selected.role === 'business' && <div className="management-section"><div className="management-section-head"><div><b>Business configuration</b><small>Live service and location coverage.</small></div><button type="button" onClick={startBusinessEdit}>Edit configuration</button></div><div className="detail-list"><div className="management-wide"><span>Services</span><div className="account-tags">{selected.services?.length ? selected.services.map((s, i) => <span key={i}>{s.industryName} · {s.serviceName}{s.subserviceName ? ` · ${s.subserviceName}` : ''}</span>) : <small>None configured</small>}</div></div><div className="management-wide"><span>Locations</span><div className="account-tags">{selected.locations?.length ? selected.locations.map((l, i) => <span key={i}>{l.subcityName ? `${l.subcityName}, ` : ''}{l.cityName}, {l.stateName}{l.pincode ? ` · ${l.pincode}` : ''}</span>) : <small>None configured</small>}</div></div></div></div>}
      </form>
      <div className="modal-actions"><button type="button" onClick={() => toggleStatus(selected)}>{selected.is_active ? 'Deactivate account' : 'Activate account'}</button><button type="button" onClick={() => setSelected(null)}>Close</button></div>
    </div></div>}

    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="user-modal create-user-modal" onClick={e => e.stopPropagation()} onSubmit={createAdmin}><div className="modal-head"><div><span className="eyebrow">NEW ADMIN</span><h2>Create Administrator</h2></div><button type="button" onClick={() => setShowCreate(false)}>×</button></div><div className="create-grid"><label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Password<input required type="password" minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label></div><div className="modal-actions"><button className="admin-primary-btn" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create administrator'}</button><button type="button" onClick={() => setShowCreate(false)}>Cancel</button></div></form></div>}
  </section>;
}
