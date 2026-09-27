import { useCallback, useEffect, useMemo, useState } from 'react';
import { authRequest, getUser } from '../../utils/auth';
import './AdminUsers.css';

const dateOnly = value => value ? new Date(value).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits:2 })}`;
const emptyService = () => ({ industryId: '', serviceId: '', subserviceId: '' });
const emptyLocation = () => ({ stateId: '', cityId: '', subcityId: '', pincode: '' });
const listData = value => Array.isArray(value) ? value : (Array.isArray(value?.data) ? value.data : []);
const accountTypeLabel = role => role === 'business' ? 'User' : role === 'lead_partner' ? 'Lead Partner' : 'Admin';

export default function AdminUsers() {
  const [users, setUsers] = useState([]), [catalogs, setCatalogs] = useState(null), [subcitiesByCity, setSubcitiesByCity] = useState({});
  const [query, setQuery] = useState(''), [role, setRole] = useState('all'), [status, setStatus] = useState('all'), [userPage, setUserPage] = useState(1), [userPagination, setUserPagination] = useState(null);
  const [loading, setLoading] = useState(true), [catalogLoading, setCatalogLoading] = useState(false), [error, setError] = useState(''), [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false), [roleSaving, setRoleSaving] = useState(false), [roleDraft, setRoleDraft] = useState('business');
  const [showCreate, setShowCreate] = useState(false), [form, setForm] = useState({ name: '', email: '', password: '' });
  const [editForm, setEditForm] = useState(null);
  const [user360,setUser360]=useState(null), [user360Loading,setUser360Loading]=useState(false), [userTab,setUserTab]=useState('overview'), [userBusy,setUserBusy]=useState('');
  const [membershipDays,setMembershipDays]=useState(30), [membershipExpiry,setMembershipExpiry]=useState(''), [membershipPlanId,setMembershipPlanId]=useState(''), [membershipReason,setMembershipReason]=useState('');
  const [walletAmount,setWalletAmount]=useState(''), [walletReason,setWalletReason]=useState('');
  const currentUser = getUser();

  const loadUsers = useCallback(async () => {
    try { setLoading(true); setError(''); const p = new URLSearchParams({ search: query, role, status, page: String(userPage), pageSize: '100' }); const response = await authRequest(`/admin/users?${p}`); setUsers(listData(response)); setUserPagination(response?.pagination || null); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [query, role, status, userPage]);
  async function loadCatalogs() {
    if (catalogs) return catalogs;
    const [industries, services, subservices, states, cities, subcities] = await Promise.all([
      authRequest('/industries'), authRequest('/services'), authRequest('/subservices'), authRequest('/states'), authRequest('/cities'), authRequest('/subcities'),
    ]);
    const value = { industries: listData(industries), services: listData(services), subservices: listData(subservices), states: listData(states), cities: listData(cities), subcities: listData(subcities) };
    setCatalogs(value); setSubcitiesByCity((value.subcities || []).reduce((map, item) => { (map[item.city_id] ||= []).push(item); return map; }, {}));
    return value;
  }
  useEffect(() => { let active=true; queueMicrotask(()=>{if(active)setUserPage(1)}); return()=>{active=false}; }, [query, role, status]);
  useEffect(() => { let active=true; queueMicrotask(()=>{if(active)loadUsers()}); return()=>{active=false}; }, [loadUsers]);

  const active = users.filter(u => u.is_active).length, businesses = users.filter(u => u.role === 'business').length, admins = users.filter(u => u.role === 'admin').length;
  const leadPartners = users.filter(u => u.role === 'lead_partner').length;
  const inactive = users.filter(u => !u.is_active).length;
  const hasFilters = Boolean(query || role !== 'all' || status !== 'all');
  const clearFilters = () => { setQuery(''); setRole('all'); setStatus('all'); setUserPage(1); };

  const serviceOptions = useMemo(() => editForm && catalogs ? editForm.services.map(x => catalogs.services.filter(s => String(s.industry_id) === String(x.industryId))) : [], [editForm, catalogs]);
  const subserviceOptions = useMemo(() => editForm && catalogs ? editForm.services.map(x => catalogs.subservices.filter(s => String(s.service_id) === String(x.serviceId))) : [], [editForm, catalogs]);
  const cityOptions = useMemo(() => editForm && catalogs ? editForm.locations.map(x => catalogs.cities.filter(c => String(c.state_id) === String(x.stateId))) : [], [editForm, catalogs]);
  const subcityOptions = useMemo(() => editForm ? editForm.locations.map(x => subcitiesByCity[x.cityId] || []) : [], [editForm, subcitiesByCity]);

  async function loadUser360(userId, silent=false) {
    try {
      if(!silent)setUser360Loading(true);
      const data=await authRequest(`/admin/users/${userId}/360`);
      setUser360(data);
      const current=data?.snapshot?.currentMembership;
      setMembershipExpiry(current?.expires_at ? new Date(current.expires_at).toISOString().slice(0,10) : '');
      setMembershipPlanId(current?.plan_id ? String(current.plan_id) : '');
      return data;
    } catch(e) {
      setError(e.message||'Failed to load account workspace');
      return null;
    } finally {
      if(!silent)setUser360Loading(false);
    }
  }
  async function openUser(u) {
    setSelected(u); setEditing(false); setError(''); setRoleDraft(u.role || 'business'); setUserTab('overview'); setUser360(null);
    setMembershipDays(30); setMembershipReason(''); setWalletAmount(''); setWalletReason('');
    setEditForm({
      name: u.name || '', email: u.email || '', phone: u.phone || '', businessName: u.business_name || '', businessDetails: u.business_details || '',
      services: (u.services || []).map(x => ({ industryId: String(x.industryId), serviceId: String(x.serviceId), subserviceId: x.subserviceId ? String(x.subserviceId) : '' })),
      locations: (u.locations || []).map(x => ({ stateId: String(x.stateId), cityId: String(x.cityId), subcityId: x.subcityId ? String(x.subcityId) : '', pincode: x.pincode || '' })),
    });
    const data=await loadUser360(u.id);
    if(data?.user){
      setSelected(v=>v?{...v,...data.user}:v);
      setRoleDraft(data.user.role||u.role||'business');
    }
  }
  async function startBusinessEdit() {
    setEditing(true); setCatalogLoading(true); setError('');
    try { await loadCatalogs(); } catch (e) { setError(e.message); } finally { setCatalogLoading(false); }
  }
  async function toggleStatus(u) {
    try { setError(''); const x = await authRequest(`/admin/users/${u.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !u.is_active }) }); setUsers(c => c.map(v => v.id === u.id ? { ...v, ...x } : v)); setSelected(v => v && v.id === u.id ? { ...v, ...x } : v); if(selected?.id===u.id)await loadUser360(u.id,true); }
    catch (e) { setError(e.message); }
  }
  async function changeRole() {
    if (!selected || roleDraft === selected.role) return;
    if (!window.confirm(`Change ${selected.name || 'this account'} from ${accountTypeLabel(selected.role)} to ${accountTypeLabel(roleDraft)}?`)) return;
    try {
      setRoleSaving(true); setError('');
      const updated = await authRequest(`/admin/users/${selected.id}/role`, { method: 'PATCH', body: JSON.stringify({ role: roleDraft }) });
      setUsers(current => current.map(item => item.id === selected.id ? { ...item, ...updated } : item));
      setSelected(current => current ? { ...current, ...updated } : current);
      setRoleDraft(updated.role);
    } catch (e) { setError(e.message); setRoleDraft(selected.role); }
    finally { setRoleSaving(false); }
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
    if (['business', 'lead_partner'].includes(selected.role) && (!editForm.services.length || editForm.services.some(x => !x.industryId || !x.serviceId))) return setError('Complete every service selection.');
    if (['business', 'lead_partner'].includes(selected.role) && (!editForm.locations.length || editForm.locations.some(x => !x.stateId || !x.cityId))) return setError('Complete every location selection.');
    try {
      setSaving(true); setError('');
      const payload = { ...editForm };
      if (['business', 'lead_partner'].includes(selected.role)) {
        payload.services = editForm.services.map(x => ({ industryId: Number(x.industryId), serviceId: Number(x.serviceId), subserviceId: x.subserviceId ? Number(x.subserviceId) : null }));
        payload.locations = editForm.locations.map(x => ({ stateId: Number(x.stateId), cityId: Number(x.cityId), subcityId: x.subcityId ? Number(x.subcityId) : null, pincode: x.pincode || null }));
      }
      const saved = await authRequest(`/admin/users/${selected.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setEditing(false); await loadUsers();
      const freshResponse = await authRequest(`/admin/users?search=${encodeURIComponent(payload.email)}&page=1&pageSize=100`); const fresh = listData(freshResponse).find(v => v.id === selected.id);
      if (fresh) await openUser(fresh); else { setSelected(v => v ? { ...v, ...saved } : v); await loadUser360(selected.id,true); }
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function manageMembership(action, membership=user360?.snapshot?.currentMembership) {
    if(!selected||!membership)return;
    const body={action};
    if(action==='extend'||action==='reduce')body.days=Number(membershipDays);
    if(action==='set_expiry')body.expiresAt=membershipExpiry;
    const label=action.replace('_',' ');
    if(!window.confirm(`${label} ${membership.plan_name||'membership'} for ${selected.business_name||selected.name}?`))return;
    try{
      setUserBusy(`membership-${action}`);setError('');
      await authRequest(`/payments/memberships/${membership.membership_id}`,{method:'PATCH',body:JSON.stringify(body)});
      await Promise.all([loadUser360(selected.id,true),loadUsers()]);
    }catch(e){setError(e.message||'Failed to update membership')}
    finally{setUserBusy('')}
  }

  async function assignMembershipPlan(){
    if(!selected||!membershipPlanId)return setError('Choose a GROW or SCALE plan.');
    if(!membershipReason.trim())return setError('Enter a reason for this membership change.');
    const plan=user360?.availablePlans?.find(item=>String(item.id)===String(membershipPlanId));
    if(!window.confirm(`Apply ${plan?.name||'this plan'} to ${selected.business_name||selected.name}?`))return;
    try{
      setUserBusy('membership-plan');setError('');
      await authRequest(`/admin/users/${selected.id}/membership`,{method:'POST',body:JSON.stringify({planId:Number(membershipPlanId),days:Number(membershipDays)||undefined,reason:membershipReason.trim()})});
      setMembershipReason('');
      await Promise.all([loadUser360(selected.id,true),loadUsers()]);
    }catch(e){setError(e.message||'Failed to apply membership')}
    finally{setUserBusy('')}
  }

  async function adjustUserWallet(action){
    if(!selected)return;
    const amount=Number(walletAmount);
    if(!Number.isFinite(amount)||amount<=0)return setError('Enter a valid wallet amount.');
    if(!walletReason.trim())return setError('Enter a reason for the wallet adjustment.');
    if(action==='debit'&&amount>Number(user360?.snapshot?.walletBalance||0))return setError('Debit cannot exceed the current wallet balance.');
    if(!window.confirm(`${action==='debit'?'Deduct':'Add'} ${money(amount)} ${action==='debit'?'from':'to'} this wallet?`))return;
    try{
      setUserBusy(`wallet-${action}`);setError('');
      await authRequest(`/wallet/admin/history/customers/${selected.id}/adjust`,{method:'POST',body:JSON.stringify({action,amount,reason:walletReason.trim()})});
      setWalletAmount('');setWalletReason('');
      await Promise.all([loadUser360(selected.id,true),loadUsers()]);
    }catch(e){setError(e.message||'Failed to adjust wallet')}
    finally{setUserBusy('')}
  }

  async function createAdmin(e) { e.preventDefault(); try { setSaving(true); setError(''); await authRequest('/admin/users/admin', { method: 'POST', body: JSON.stringify(form) }); setShowCreate(false); setForm({ name: '', email: '', password: '' }); await loadUsers(); } catch (e) { setError(e.message); } finally { setSaving(false); } }

  return <section className="admin-users-page premium-users-page">
    <section className="users-premium-hero">
      <div className="users-premium-hero-copy">
        <span>ACCOUNT OPERATIONS / DIRECTORY</span>
        <h1>Users</h1>
        <p>Manage customers, Lead Partners and administrators from one account workspace.</p>
      </div>
      <div className="users-hero-actions">
        <div className="users-hero-count"><span>Directory</span><strong>{Number(userPagination?.total ?? users.length).toLocaleString('en-IN')}</strong><small>accounts</small></div>
        <button className="admin-primary-btn users-create-admin" onClick={() => setShowCreate(true)}>＋ Create Admin</button>
      </div>
    </section>

    <section className="users-premium-stats">
      <article className="users-stat-card total"><div className="users-stat-icon">Σ</div><div><span>Total accounts</span><strong>{Number(userPagination?.total ?? users.length).toLocaleString('en-IN')}</strong><small>Directory total</small></div></article>
      <article className="users-stat-card active"><div className="users-stat-icon">✓</div><div><span>Active</span><strong>{active}</strong><small>On this page</small></div></article>
      <article className="users-stat-card business"><div className="users-stat-icon">U</div><div><span>Users</span><strong>{businesses}</strong><small>Business accounts</small></div></article>
      <article className="users-stat-card partner"><div className="users-stat-icon">P</div><div><span>Lead Partners</span><strong>{leadPartners}</strong><small>Partner accounts</small></div></article>
      <article className="users-stat-card admin"><div className="users-stat-icon">A</div><div><span>Admins</span><strong>{admins}</strong><small>Admin accounts</small></div></article>
    </section>

    <section className="users-directory-panel">
      <div className="users-directory-head">
        <div><span>ACCOUNT DIRECTORY</span><h2>Manage accounts</h2></div>
        <div className="users-directory-meta"><span>{users.length} shown</span>{inactive > 0 && <span className="inactive-count">{inactive} inactive</span>}</div>
      </div>

      <div className="users-command-bar">
        <div className="users-search-box">
          <span>⌕</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email, phone or business…" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="all">All account types</option>
          <option value="business">Users</option>
          <option value="lead_partner">Lead Partners</option>
          <option value="admin">Admins</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {hasFilters && <button type="button" className="users-clear-filters" onClick={clearFilters}>Clear</button>}
      </div>

      {error && !selected && !showCreate && <div className="users-error">{error}</div>}

      {loading ? <div className="empty-users premium-empty-users"><span className="users-loading-ring"/><strong>Loading accounts…</strong></div> : !users.length ? <div className="empty-users premium-empty-users"><div className="empty-users-icon">⌕</div><strong>No users found</strong><small>Try clearing or changing the filters.</small>{hasFilters && <button type="button" onClick={clearFilters}>Clear filters</button>}</div> : <div className="users-card-grid">
        {users.map(u => {
          const initials=(u.name||u.business_name||'?').trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join('')||'?';
          const scopeCount=Number(u.service_count||0)+Number(u.location_count||0);
          return <article className={`premium-user-card ${u.is_active?'':'is-inactive'}`} key={u.id}>
            <div className="premium-user-card-top">
              <div className="premium-user-identity">
                <div className={`premium-user-avatar ${u.role}`}>{initials}</div>
                <div>
                  <div className="premium-user-title-row"><h3>{u.business_name||u.name}</h3><span className={`status ${u.is_active?'active':'inactive'}`}>{u.is_active?'Active':'Inactive'}</span></div>
                  {u.business_name && <strong className="premium-user-person">{u.name}</strong>}
                  <span className="premium-user-id">#{u.id}</span>
                </div>
              </div>
              <em className={`role ${u.role}`}>{accountTypeLabel(u.role)}</em>
            </div>

            <div className="premium-user-contact">
              <div><span>Email</span><strong title={u.email}>{u.email}</strong></div>
              <div><span>Phone</span><strong>{u.phone||'—'}</strong></div>
            </div>

            {u.role==='business' && <div className="premium-user-commercial">
              <div className={`user-plan-pill ${u.membership_plan_group||'none'}`}>
                <span>Membership</span>
                <strong>{u.membership_plan_group ? String(u.membership_plan_group).toUpperCase() : 'NO PLAN'}</strong>
                <small>{u.membership_expires_at ? `until ${dateOnly(u.membership_expires_at)}` : 'No active membership'}</small>
              </div>
              <div className="user-wallet-pill"><span>Wallet</span><strong>{money(u.wallet_balance)}</strong><small>{u.is_verified?'Verified business':'Not verified'}</small></div>
            </div>}

            {['business','lead_partner'].includes(u.role) ? <div className="premium-user-scope">
              <div><span>Services</span><strong>{u.service_count||0}</strong></div>
              <i/>
              <div><span>Locations</span><strong>{u.location_count||0}</strong></div>
              <div className={`scope-health ${scopeCount>0?'configured':'empty'}`}>{scopeCount>0?'Configured':'Setup needed'}</div>
            </div> : <div className="premium-user-scope admin-scope"><span>Account access</span><strong>{u.role==='admin'?'Administration':'Platform'}</strong></div>}

            <div className="premium-user-card-foot">
              <div className="premium-user-joined"><span>Joined</span><strong>{dateOnly(u.created_at)}</strong></div>
              <div className="premium-user-actions">
                <button className="manage-user-btn" type="button" onClick={() => openUser(u)}>Manage</button>
                <button className={`status-user-btn ${u.is_active?'deactivate':'activate'}`} type="button" onClick={() => toggleStatus(u)}>{u.is_active?'Deactivate':'Activate'}</button>
              </div>
            </div>
          </article>
        })}
      </div>}

      {userPagination && userPagination.totalPages > 1 && <div className="users-pagination premium-users-pagination">
        <span>Page <strong>{userPagination.page}</strong> of {userPagination.totalPages} · {Number(userPagination.total||0).toLocaleString('en-IN')} accounts</span>
        <div><button type="button" disabled={userPagination.page <= 1 || loading} onClick={() => setUserPage(p => Math.max(1, p - 1))}>← Previous</button><button type="button" disabled={userPagination.page >= userPagination.totalPages || loading} onClick={() => setUserPage(p => p + 1)}>Next →</button></div>
      </div>}
    </section>

    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="user-modal user-management-modal premium-user-modal" onClick={e => e.stopPropagation()}><div className="modal-head premium-user-modal-head"><div><span className="eyebrow">ACCOUNT MANAGEMENT</span><h2>{selected.business_name || selected.name}</h2><small className="management-subtitle">#{selected.id} · {accountTypeLabel(selected.role)} account · {selected.is_active?'Active':'Inactive'}</small></div><button onClick={() => setSelected(null)}>×</button></div>{error && <div className="users-error">{error}</div>}
      <div className="management-section role-management-section"><div className="management-section-head"><div><b>Account type</b><small>Change this account between User, Lead Partner, and Admin.</small></div></div><div className="role-management-controls"><select value={roleDraft} onChange={e => setRoleDraft(e.target.value)} disabled={roleSaving || Number(currentUser?.id) === Number(selected.id)}><option value="business">User</option><option value="lead_partner">Lead Partner</option><option value="admin">Admin</option></select><button type="button" className="admin-primary-btn" onClick={changeRole} disabled={roleSaving || roleDraft === selected.role || Number(currentUser?.id) === Number(selected.id)}>{roleSaving ? 'Updating...' : 'Change account type'}</button></div>{Number(currentUser?.id) === Number(selected.id) && <div className="role-management-note">You cannot change your own administrator role.</div>}</div>
      <form onSubmit={saveProfile}>{editing && <div className="inline-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button className="admin-primary-btn" type="submit" disabled={saving || catalogLoading}>{saving ? 'Saving...' : 'Save all business changes'}</button></div>}<div className="management-section"><div className="management-section-head"><div><b>User & business details</b></div>{!editing && <button type="button" onClick={() => ['business', 'lead_partner'].includes(selected.role) ? startBusinessEdit() : setEditing(true)}>Edit</button>}</div>
      {editing ? <div className="management-grid"><label>Name<input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></label><label>Email<input required type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></label>{['business', 'lead_partner'].includes(selected.role) && <><label>Phone<input required value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></label><label>Business name<input required value={editForm.businessName} onChange={e => setEditForm({ ...editForm, businessName: e.target.value })} /></label><label className="management-wide">Business details<textarea required rows="3" value={editForm.businessDetails} onChange={e => setEditForm({ ...editForm, businessDetails: e.target.value })} /></label><div className="management-wide configuration-editor">{catalogLoading && <div className="configuration-loading">Loading configuration options…</div>}<div className="configuration-title"><b>Services</b><button type="button" onClick={() => setEditForm({ ...editForm, services: [...editForm.services, emptyService()] })}>+ Add service</button></div>{editForm.services.map((x, i) => <div className="configuration-row" key={`service-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><select required value={x.industryId} onChange={e => updateService(i, 'industryId', e.target.value)}><option value="">Industry</option>{(catalogs?.industries || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!x.industryId} value={x.serviceId} onChange={e => updateService(i, 'serviceId', e.target.value)}><option value="">Service</option>{serviceOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!x.serviceId} value={x.subserviceId} onChange={e => updateService(i, 'subserviceId', e.target.value)}><option value="">All subservices</option>{subserviceOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><button type="button" className="add-all-services" onClick={() => addAllServicesForIndustry(i)} disabled={!x.industryId}>Add all services</button><button type="button" onClick={() => setEditForm({ ...editForm, services: editForm.services.filter((_, n) => n !== i) })}>Remove</button></div>)}</div><div className="management-wide configuration-editor"><div className="configuration-title"><b>Locations</b><button type="button" onClick={() => setEditForm({ ...editForm, locations: [...editForm.locations, emptyLocation()] })}>+ Add location</button></div>{editForm.locations.map((x, i) => <div className="configuration-row location-config" key={`location-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><select required value={x.stateId} onChange={e => updateLocation(i, 'stateId', e.target.value)}><option value="">State / UT</option>{(catalogs?.states || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!x.stateId} value={x.cityId} onChange={e => updateLocation(i, 'cityId', e.target.value)}><option value="">City</option>{cityOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!x.cityId} value={x.subcityId} onChange={e => updateLocation(i, 'subcityId', e.target.value)}><option value="">All areas</option>{subcityOptions[i]?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!x.cityId} value={x.pincode} onChange={e => updateLocation(i, 'pincode', e.target.value)}><option value="">Pincode</option>{((catalogs?.cities || []).find(v => String(v.id) === String(x.cityId))?.pincodes || []).map(v => <option key={v.id} value={v.pincode}>{v.pincode}{v.officeName ? ` · ${v.officeName}` : ''}</option>)}</select><button type="button" onClick={() => setEditForm({ ...editForm, locations: editForm.locations.filter((_, n) => n !== i) })}>Remove</button></div>)}</div></>}</div> : <div className="detail-list"><div><span>Name</span><b>{selected.name}</b></div><div><span>Email</span><b>{selected.email}</b></div><div><span>Phone</span><b>{selected.phone || '—'}</b></div><div><span>Business</span><b>{selected.business_name || '—'}</b></div>{['business', 'lead_partner'].includes(selected.role) && <div className="management-wide"><span>Business details</span><b>{selected.business_details || '—'}</b></div>}</div>}</div>

      {['business', 'lead_partner'].includes(selected.role) && <div className="management-section"><div className="management-section-head"><div><b>Business configuration</b><small>Live service and location coverage.</small></div><button type="button" onClick={startBusinessEdit}>Edit configuration</button></div><div className="detail-list"><div className="management-wide"><span>Services</span><div className="account-tags">{selected.services?.length ? selected.services.map((s, i) => <span key={i}>{s.industryName} · {s.serviceName}{s.subserviceName ? ` · ${s.subserviceName}` : ''}</span>) : <small>None configured</small>}</div></div><div className="management-wide"><span>Locations</span><div className="account-tags">{selected.locations?.length ? selected.locations.map((l, i) => <span key={i}>{l.subcityName ? `${l.subcityName}, ` : ''}{l.cityName}, {l.stateName}{l.pincode ? ` · ${l.pincode}` : ''}</span>) : <small>None configured</small>}</div></div></div></div>}
      </form>
      <div className="modal-actions"><button type="button" onClick={() => toggleStatus(selected)}>{selected.is_active ? 'Deactivate account' : 'Activate account'}</button><button type="button" onClick={() => setSelected(null)}>Close</button></div>
    </div></div>}

    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="user-modal create-user-modal premium-create-admin-modal" onClick={e => e.stopPropagation()} onSubmit={createAdmin}><div className="modal-head"><div><span className="eyebrow">NEW ADMIN</span><h2>Create Administrator</h2></div><button type="button" onClick={() => setShowCreate(false)}>×</button></div><div className="create-grid"><label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Password<input required type="password" minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label></div><div className="modal-actions"><button className="admin-primary-btn" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create administrator'}</button><button type="button" onClick={() => setShowCreate(false)}>Cancel</button></div></form></div>}
  </section>;
}
