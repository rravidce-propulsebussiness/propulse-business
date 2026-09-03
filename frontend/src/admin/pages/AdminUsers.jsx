import { useEffect, useMemo, useState } from 'react';
import { authRequest } from '../../utils/auth';
import './AdminUsers.css';

const dateOnly = value => value ? new Date(value).toLocaleDateString() : '—';
const dateInput = value => value ? new Date(value).toISOString().slice(0, 10) : '';
const membershipLabel = u => u.membership_plan_name || 'No active membership';
const billingLabel = u => {
  if (!u.membership_billing_period) return '';
  const p = String(u.membership_billing_period).replace(/[_-]/g, ' ');
  const months = Number(u.membership_billing_months || 0);
  return months > 1 ? `${p} · ${months} months` : p;
};
const emptyService = () => ({ industryId: '', serviceId: '', subserviceId: '' });
const emptyLocation = () => ({ stateId: '', cityId: '' });

export default function AdminUsers() {
  const [users, setUsers] = useState([]), [plans, setPlans] = useState([]), [catalogs, setCatalogs] = useState(null);
  const [query, setQuery] = useState(''), [role, setRole] = useState('all'), [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false), [membershipAction, setMembershipAction] = useState('');
  const [showCreate, setShowCreate] = useState(false), [form, setForm] = useState({ name: '', email: '', password: '' });
  const [editForm, setEditForm] = useState(null), [membershipForm, setMembershipForm] = useState({ planId: '', startsAt: '', expiresAt: '', days: '30' });

  async function loadUsers() {
    try { setLoading(true); setError(''); const p = new URLSearchParams({ search: query, role, status }); setUsers(await authRequest(`/admin/users?${p}`)); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  async function loadPlans() {
    try { const data = await authRequest('/membership-plans'); setPlans((data || []).filter(p => String(p.plan_type || '').toLowerCase() === 'pro' && p.is_active)); }
    catch (e) { setError(e.message); }
  }
  async function loadCatalogs() {
    if (catalogs) return catalogs;
    const [industries, services, subservices, states, cities] = await Promise.all([
      authRequest('/industries'), authRequest('/services'), authRequest('/subservices'), authRequest('/states'), authRequest('/cities'),
    ]);
    const value = { industries, services, subservices, states, cities };
    setCatalogs(value);
    return value;
  }
  useEffect(() => { loadUsers(); }, [query, role, status]);
  useEffect(() => { loadPlans(); }, []);

  const active = users.filter(u => u.is_active).length, businesses = users.filter(u => u.role === 'business').length, admins = users.filter(u => u.role === 'admin').length;
  const serviceOptions = useMemo(() => editForm && catalogs ? editForm.services.map(x => catalogs.services.filter(s => String(s.industry_id) === String(x.industryId))) : [], [editForm, catalogs]);
  const subserviceOptions = useMemo(() => editForm && catalogs ? editForm.services.map(x => catalogs.subservices.filter(s => String(s.service_id) === String(x.serviceId))) : [], [editForm, catalogs]);
  const cityOptions = useMemo(() => editForm && catalogs ? editForm.locations.map(x => catalogs.cities.filter(c => String(c.state_id) === String(x.stateId))) : [], [editForm, catalogs]);

  function openUser(u) {
    setSelected(u); setEditing(false); setError('');
    setEditForm({
      name: u.name || '', email: u.email || '', phone: u.phone || '', businessName: u.business_name || '', businessDetails: u.business_details || '',
      services: (u.services || []).map(x => ({ industryId: String(x.industryId), serviceId: String(x.serviceId), subserviceId: x.subserviceId ? String(x.subserviceId) : '' })),
      locations: (u.locations || []).map(x => ({ stateId: String(x.stateId), cityId: String(x.cityId) })),
    });
    setMembershipForm({ planId: u.membership_plan_id || '', startsAt: dateInput(u.membership_started_at), expiresAt: dateInput(u.membership_expires_at), days: '30' });
  }
  async function startBusinessEdit() {
    try { setError(''); await loadCatalogs(); setEditing(true); } catch (e) { setError(e.message); }
  }
  async function toggleStatus(u) {
    try { setError(''); const x = await authRequest(`/admin/users/${u.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !u.is_active }) }); setUsers(c => c.map(v => v.id === u.id ? { ...v, ...x } : v)); setSelected(v => v && v.id === u.id ? { ...v, ...x } : v); }
    catch (e) { setError(e.message); }
  }
  function updateService(index, field, value) {
    setEditForm(x => ({ ...x, services: x.services.map((item, i) => i !== index ? item : field === 'industryId' ? { industryId: value, serviceId: '', subserviceId: '' } : field === 'serviceId' ? { ...item, serviceId: value, subserviceId: '' } : { ...item, [field]: value }) }));
  }
  function updateLocation(index, field, value) {
    setEditForm(x => ({ ...x, locations: x.locations.map((item, i) => i !== index ? item : field === 'stateId' ? { stateId: value, cityId: '' } : { ...item, cityId: value }) }));
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
        payload.locations = editForm.locations.map(x => ({ stateId: Number(x.stateId), cityId: Number(x.cityId) }));
      }
      const saved = await authRequest(`/admin/users/${selected.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setEditing(false); await loadUsers();
      const fresh = (await authRequest(`/admin/users?search=${encodeURIComponent(payload.email)}`)).find(v => v.id === selected.id);
      if (fresh) openUser(fresh); else setSelected(v => v ? { ...v, ...saved } : v);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function applyMembership(action) {
    if (!selected) return;
    let body = { action };
    if (action === 'activate') { body.planId = membershipForm.planId; body.startsAt = membershipForm.startsAt; body.expiresAt = membershipForm.expiresAt || undefined; }
    else if (action === 'extend' || action === 'reduce') body.days = membershipForm.days;
    const label = { activate: 'activate', extend: 'extend', reduce: 'reduce', terminate: 'terminate' }[action];
    if (!window.confirm(`Are you sure you want to ${label} this user's Pro membership?`)) return;
    try {
      setMembershipAction(action); setError('');
      await authRequest(`/admin/users/${selected.id}/membership`, { method: 'PATCH', body: JSON.stringify(body) });
      await loadUsers();
      const fresh = (await authRequest(`/admin/users?search=${encodeURIComponent(selected.email)}`)).find(v => v.id === selected.id);
      if (fresh) openUser(fresh);
    } catch (e) { setError(e.message); } finally { setMembershipAction(''); }
  }
  async function createAdmin(e) { e.preventDefault(); try { setSaving(true); setError(''); await authRequest('/admin/users/admin', { method: 'POST', body: JSON.stringify(form) }); setShowCreate(false); setForm({ name: '', email: '', password: '' }); await loadUsers(); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  function selectPlan(id) {
    const plan = plans.find(p => String(p.id) === String(id));
    setMembershipForm(v => { const next = { ...v, planId: id }; if (plan && !v.startsAt) next.startsAt = new Date().toISOString().slice(0, 10); if (plan && !v.expiresAt && next.startsAt) { const d = new Date(`${next.startsAt}T00:00:00`); d.setDate(d.getDate() + Number(plan.duration_days || 30)); next.expiresAt = d.toISOString().slice(0, 10); } return next; });
  }

  return <section className="admin-users-page">
    <div className="users-heading"><div><span className="eyebrow">ACCOUNT MANAGEMENT</span><h1>Users</h1><p>Manage user, business and membership details from one place.</p></div><button className="admin-primary-btn" onClick={() => setShowCreate(true)}>+ Create Admin</button></div>
    <div className="users-stats"><div><span>Total users</span><strong>{users.length}</strong></div><div><span>Active</span><strong>{active}</strong></div><div><span>Businesses</span><strong>{businesses}</strong></div><div><span>Admins</span><strong>{admins}</strong></div></div>
    <div className="users-panel"><div className="users-toolbar"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email, phone or business..."/><select value={role} onChange={e => setRole(e.target.value)}><option value="all">All account types</option><option value="business">Businesses</option><option value="admin">Admins</option></select><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>{error && <div className="users-error">{error}</div>}<div className="users-table-wrap">{loading ? <div className="empty-users">Loading users...</div> : !users.length ? <div className="empty-users">No users found.</div> : <table><thead><tr><th>ID</th><th>USER</th><th>BUSINESS</th><th>SCOPE</th><th>MEMBERSHIP</th><th>TYPE</th><th>STATUS</th><th>JOINED</th><th /></tr></thead><tbody>{users.map(u => <tr key={u.id}><td className="user-id">#{u.id}</td><td><div className="user-cell"><span>{(u.name || '?').charAt(0).toUpperCase()}</span><div><b>{u.name}</b><small>{u.email}</small>{u.phone && <small>{u.phone}</small>}</div></div></td><td>{u.business_name || <span className="muted">—</span>}</td><td>{u.role === 'business' ? <span className="scope-count">{u.service_count || 0} services · {u.location_count || 0} locations</span> : <span className="muted">—</span>}</td><td><div className="membership-cell"><b>{membershipLabel(u)}</b>{u.membership_status && <small className={u.pro_active ? 'membership-active' : ''}>{u.membership_status}</small>}{billingLabel(u) && <small>{billingLabel(u)}</small>}</div></td><td><em className={`role ${u.role}`}>{u.role === 'business' ? 'Business' : 'Admin'}</em></td><td><em className={`status ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</em></td><td>{dateOnly(u.created_at)}</td><td><div className="actions"><button onClick={() => openUser(u)}>Manage</button><button onClick={() => toggleStatus(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table>}</div></div>

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="user-modal user-management-modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ACCOUNT MANAGEMENT</span><h2>{selected.business_name || selected.name}</h2><small className="management-subtitle">#{selected.id} · {selected.role === 'business' ? 'Business account' : 'Administrator'}</small></div><button onClick={() => setSelected(null)}>×</button></div>{error && <div className="users-error">{error}</div>}
      <form onSubmit={saveProfile}><div className="management-section"><div className="management-section-head"><div><b>User & business details</b><small>Edit account identity, contact information and business configuration.</small></div>{!editing && <button type="button" onClick={selected.role === 'business' ? startBusinessEdit : () => setEditing(true)}>Edit</button>}</div>
      {editing ? <div className="management-grid"><label>Name<input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></label><label>Email<input required type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></label>{selected.role === 'business' && <><label>Phone<input required value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></label><label>Business name<input required value={editForm.businessName} onChange={e => setEditForm({ ...editForm, businessName: e.target.value })} /></label><label className="management-wide">Business details<textarea required rows="3" value={editForm.businessDetails} onChange={e => setEditForm({ ...editForm, businessDetails: e.target.value })} /></label><div className="management-wide configuration-editor"><div className="configuration-title"><b>Services</b><button type="button" onClick={() => setEditForm({ ...editForm, services: [...editForm.services, emptyService()] })}>+ Add service</button></div>{editForm.services.map((x, i) => <div className="configuration-row" key={`service-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><select required value={x.industryId} onChange={e => updateService(i, 'industryId', e.target.value)}><option value="">Industry</option>{catalogs.industries.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!x.industryId} value={x.serviceId} onChange={e => updateService(i, 'serviceId', e.target.value)}><option value="">Service</option>{serviceOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!x.serviceId} value={x.subserviceId} onChange={e => updateService(i, 'subserviceId', e.target.value)}><option value="">All subservices</option>{subserviceOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><button type="button" onClick={() => setEditForm({ ...editForm, services: editForm.services.filter((_, n) => n !== i) })}>Remove</button></div>)}</div><div className="management-wide configuration-editor"><div className="configuration-title"><b>Locations</b><button type="button" onClick={() => setEditForm({ ...editForm, locations: [...editForm.locations, emptyLocation()] })}>+ Add location</button></div>{editForm.locations.map((x, i) => <div className="configuration-row location-config" key={`location-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><select required value={x.stateId} onChange={e => updateLocation(i, 'stateId', e.target.value)}><option value="">State / UT</option>{catalogs.states.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!x.stateId} value={x.cityId} onChange={e => updateLocation(i, 'cityId', e.target.value)}><option value="">City</option>{cityOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><button type="button" onClick={() => setEditForm({ ...editForm, locations: editForm.locations.filter((_, n) => n !== i) })}>Remove</button></div>)}</div></>}</div> : <div className="detail-list"><div><span>Name</span><b>{selected.name}</b></div><div><span>Email</span><b>{selected.email}</b></div><div><span>Phone</span><b>{selected.phone || '—'}</b></div><div><span>Business</span><b>{selected.business_name || '—'}</b></div>{selected.role === 'business' && <div className="management-wide"><span>Business details</span><b>{selected.business_details || '—'}</b></div>}</div>}{editing && <div className="inline-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button className="admin-primary-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save all business changes'}</button></div>}</div></form>

      <div className="management-section"><div className="management-section-head"><div><b>Membership</b><small>Activate, change dates, extend, reduce or terminate Pro access.</small></div><em className={`status ${selected.pro_active ? 'active' : 'inactive'}`}>{selected.pro_active ? 'Active' : 'Inactive'}</em></div><div className="detail-list"><div><span>Plan</span><b>{membershipLabel(selected)}</b><small>{billingLabel(selected) || '—'}</small></div><div><span>Status</span><b>{selected.membership_status || 'No membership'}</b></div><div><span>Starts</span><b>{dateOnly(selected.membership_started_at)}</b></div><div><span>Expires</span><b>{dateOnly(selected.membership_expires_at)}</b></div></div><div className="membership-editor"><div className="management-grid"><label>Pro plan<select value={membershipForm.planId} onChange={e => selectPlan(e.target.value)}><option value="">Select active Pro plan</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} · {p.duration_days} days</option>)}</select></label><label>Start date<input type="date" value={membershipForm.startsAt} onChange={e => setMembershipForm({ ...membershipForm, startsAt: e.target.value })} /></label><label>Expiry date<input type="date" value={membershipForm.expiresAt} onChange={e => setMembershipForm({ ...membershipForm, expiresAt: e.target.value })} /></label><label>Days for extend/reduce<input type="number" min="1" max="3650" value={membershipForm.days} onChange={e => setMembershipForm({ ...membershipForm, days: e.target.value })} /></label></div><div className="membership-actions"><button type="button" disabled={!!membershipAction || !membershipForm.planId} onClick={() => applyMembership('activate')}>{membershipAction === 'activate' ? 'Applying...' : selected.pro_active ? 'Update / activate' : 'Activate Pro'}</button><button type="button" disabled={!!membershipAction || !selected.pro_active} onClick={() => applyMembership('extend')}>{membershipAction === 'extend' ? 'Working...' : 'Extend'}</button><button type="button" disabled={!!membershipAction || !selected.pro_active} onClick={() => applyMembership('reduce')}>{membershipAction === 'reduce' ? 'Working...' : 'Reduce'}</button><button type="button" className="danger-action" disabled={!!membershipAction || !selected.pro_active} onClick={() => applyMembership('terminate')}>{membershipAction === 'terminate' ? 'Terminating...' : 'Terminate'}</button></div></div></div>

      {selected.role === 'business' && <div className="management-section"><div className="management-section-head"><div><b>Business configuration</b><small>Live service and location coverage.</small></div><button type="button" onClick={startBusinessEdit}>Edit configuration</button></div><div className="detail-list"><div className="management-wide"><span>Services</span><div className="account-tags">{selected.services?.length ? selected.services.map((s, i) => <span key={i}>{s.industryName} · {s.serviceName}{s.subserviceName ? ` · ${s.subserviceName}` : ''}</span>) : <small>None configured</small>}</div></div><div className="management-wide"><span>Locations</span><div className="account-tags">{selected.locations?.length ? selected.locations.map((l, i) => <span key={i}>{l.cityName}, {l.stateName}</span>) : <small>None configured</small>}</div></div></div></div>}
      <div className="modal-actions"><button type="button" onClick={() => toggleStatus(selected)}>{selected.is_active ? 'Deactivate account' : 'Activate account'}</button><button type="button" onClick={() => setSelected(null)}>Close</button></div>
    </div></div>}

    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="user-modal create-user-modal" onClick={e => e.stopPropagation()} onSubmit={createAdmin}><div className="modal-head"><div><span className="eyebrow">NEW ADMIN</span><h2>Create Administrator</h2></div><button type="button" onClick={() => setShowCreate(false)}>×</button></div><div className="create-grid"><label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Password<input required type="password" minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label></div><div className="modal-actions"><button type="button" onClick={() => setShowCreate(false)}>Cancel</button><button className="admin-primary-btn" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Admin'}</button></div></form></div>}
  </section>;
}