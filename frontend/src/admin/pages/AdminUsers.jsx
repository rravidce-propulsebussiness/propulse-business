import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [loading, setLoading] = useState(true), [catalogLoading, setCatalogLoading] = useState(false), [error, setError] = useState(''), [notice,setNotice]=useState(''), [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false), [roleSaving, setRoleSaving] = useState(false), [roleDraft, setRoleDraft] = useState('business');
  const [showCreate, setShowCreate] = useState(false), [form, setForm] = useState({ name: '', email: '', password: '' });
  const [editForm, setEditForm] = useState(null);
  const [user360,setUser360]=useState(null), [user360Loading,setUser360Loading]=useState(false), [userTab,setUserTab]=useState('overview'), [userBusy,setUserBusy]=useState('');
  const [membershipDays,setMembershipDays]=useState(30), [membershipExpiry,setMembershipExpiry]=useState(''), [membershipPlanId,setMembershipPlanId]=useState(''), [membershipReason,setMembershipReason]=useState('');
  const [walletAmount,setWalletAmount]=useState(''), [walletReason,setWalletReason]=useState(''), [walletPageBusy,setWalletPageBusy]=useState('');
  const user360BodyRef=useRef(null);
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
  useEffect(() => {
    if(!selected)return undefined;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKeyDown=event=>{if(event.key==='Escape')setSelected(null)};
    window.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown)};
  }, [selected]);
  useEffect(() => {
    if(!selected)return;
    user360BodyRef.current?.scrollTo({top:0,behavior:'auto'});
  }, [userTab,selected]);

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
    setSelected(u); setEditing(false); setError(''); setNotice(''); setRoleDraft(u.role || 'business'); setUserTab('overview'); setUser360(null);
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
  async function sendPasswordResetLink(){
    if(!selected)return;
    if(!selected.is_active)return setError('Activate this account before sending a password reset link.');
    if(!window.confirm(`Send a password reset link to ${selected.email}?`))return;
    try{
      setUserBusy('password-reset');setError('');setNotice('');
      const result=await authRequest(`/admin/users/${selected.id}/password-reset`,{method:'POST'});
      setNotice(result?.message||'Reset link sent. Ask the user to check Inbox, Spam or Promotions.');
      await loadUser360(selected.id,true);
    }catch(e){setError(e.message||'Failed to send password reset link')}
    finally{setUserBusy('')}
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
      await loadUser360(selected.id,true);
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
    if(!membershipReason.trim())return setError('Enter a reason for this membership action.');
    const body={action,reason:membershipReason.trim()};
    if(action==='extend'||action==='reduce')body.days=Number(membershipDays);
    if(action==='set_expiry')body.expiresAt=membershipExpiry;
    const label=action.replace('_',' ');
    if(!window.confirm(`${label} ${membership.plan_name||'membership'} for ${selected.business_name||selected.name}?`))return;
    try{
      setUserBusy(`membership-${action}`);setError('');
      await authRequest(`/payments/memberships/${membership.membership_id}`,{method:'PATCH',body:JSON.stringify(body)});
      setMembershipReason('');
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
      await authRequest(`/admin/users/${selected.id}/membership`,{method:'POST',body:JSON.stringify({planId:Number(membershipPlanId),days:currentMembership?undefined:(Number(membershipDays)||undefined),reason:membershipReason.trim()})});
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

  async function loadMoreWallet(kind){
    if(!selected||!user360?.wallet)return;
    const pageInfo=user360.wallet.pagination?.[kind];
    if(!pageInfo||Number(pageInfo.page||1)>=Number(pageInfo.pages||1))return;
    const nextPage=Number(pageInfo.page||1)+1;
    const params=new URLSearchParams({
      rechargePage:String(kind==='recharges'?nextPage:Number(user360.wallet.pagination?.recharges?.page||1)),
      rechargeLimit:'50',
      transactionPage:String(kind==='transactions'?nextPage:Number(user360.wallet.pagination?.transactions?.page||1)),
      transactionLimit:'100'
    });
    try{
      setWalletPageBusy(kind);setError('');
      const data=await authRequest(`/wallet/admin/history/customers/${selected.id}?${params}`);
      setUser360(prev=>{
        if(!prev)return prev;
        const currentWallet=prev.wallet||{};
        const existing=Array.isArray(currentWallet[kind])?currentWallet[kind]:[];
        const incoming=Array.isArray(data?.[kind])?data[kind]:[];
        const seen=new Set(existing.map(item=>String(item.id)));
        return{...prev,wallet:{...currentWallet,[kind]:[...existing,...incoming.filter(item=>!seen.has(String(item.id)))],pagination:{...(currentWallet.pagination||{}),[kind]:data?.pagination?.[kind]||pageInfo}}};
      });
    }catch(e){setError(e.message||'Failed to load more wallet history')}
    finally{setWalletPageBusy('')}
  }

  async function createAdmin(e) { e.preventDefault(); try { setSaving(true); setError(''); await authRequest('/admin/users/admin', { method: 'POST', body: JSON.stringify(form) }); setShowCreate(false); setForm({ name: '', email: '', password: '' }); await loadUsers(); } catch (e) { setError(e.message); } finally { setSaving(false); } }

  const currentMembership=user360?.snapshot?.currentMembership||null;
  const manageableMembership=currentMembership||user360?.membership?.plans?.[0]||null;
  const manageableMembershipActive=Boolean(manageableMembership&&manageableMembership.status==='active');
  const userSnapshot=user360?.snapshot||{};
  const wallet360=user360?.wallet||{wallet:{balance:0},recharges:[],transactions:[],totals:{}};
  const membership360=user360?.membership||{plans:[],history:[]};

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
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email, phone, user ID, payment ID, UTR or lead ID…" />
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

    {selected && <div className="modal-backdrop users-360-backdrop" onClick={() => setSelected(null)}>
      <div className="user-modal user-360-modal" onClick={e => e.stopPropagation()}>
        <div className="user-360-head">
          <div className="user-360-identity">
            <div className={'user-360-avatar ' + selected.role}>{(selected.name||selected.business_name||'?').trim().split(/\s+/).slice(0,2).map(part=>part.charAt(0).toUpperCase()).join('')}</div>
            <div>
              <span>ACCOUNT 360</span>
              <h2>{selected.business_name||selected.name}</h2>
              <p>#{selected.id} · {selected.email} · {accountTypeLabel(selected.role)}</p>
            </div>
          </div>
          <div className="user-360-head-summary">
            {selected.role==='business' && <span className={'user-360-plan ' + (currentMembership?.plan_group||'none')}>{currentMembership?.plan_group?String(currentMembership.plan_group).toUpperCase():'NO PLAN'}</span>}
            <span className={'user-360-status ' + (selected.is_active?'active':'inactive')}>{selected.is_active?'Active':'Inactive'}</span>
            <button className="user-360-close" type="button" onClick={() => setSelected(null)}>×</button>
          </div>
        </div>

        {error && <div className="users-error user-360-error">{error}</div>}
        {notice && <div className="users-success user-360-success" role="status">{notice}</div>}

        {user360Loading ? <div className="user-360-loading"><span className="users-loading-ring"/><strong>Loading account workspace…</strong></div> : <>
          <div className="user-360-snapshot">
            <div><span>Membership</span><strong>{currentMembership?.plan_group?String(currentMembership.plan_group).toUpperCase():'No plan'}</strong><small>{currentMembership?.expires_at ? ('Expires ' + dateOnly(currentMembership.expires_at)) : 'No active membership'}</small></div>
            <div><span>Wallet</span><strong>{money(userSnapshot.walletBalance)}</strong><small>{Number(wallet360?.pagination?.recharges?.total??wallet360?.recharges?.length??0)} recharge records</small></div>
            <div><span>Leads</span><strong>{Number(userSnapshot.leadsAccessed||0)}</strong><small>Purchased / claimed</small></div>
            <div><span>Total paid</span><strong>{money(userSnapshot.totalPaid)}</strong><small>Successful payments</small></div>
            <div><span>Entitlements</span><strong>{Number(userSnapshot.activeEntitlements?.shared?.remaining||0)} / {Number(userSnapshot.activeEntitlements?.premium?.remaining||0)}</strong><small>Basic / Premium left</small></div>
          </div>

          {user360?.attention?.length>0 && <div className="user-360-attention">
            {user360.attention.map(item=><div className={'attention-item ' + item.level} key={item.code}><span>!</span><strong>{item.text}</strong></div>)}
          </div>}

          <nav className="user-360-tabs">
            {[
              ['overview','Overview'],['membership','Membership'],['wallet','Wallet'],['leads','Leads'],
              ['payments','Payments'],['entitlements','Entitlements'],['profile','Profile'],['activity','Activity']
            ].map(([key,label])=><button type="button" className={userTab===key?'active':''} onClick={()=>setUserTab(key)} key={key}>{label}</button>)}
          </nav>

          <div className="user-360-body" ref={user360BodyRef}>
            {userTab==='overview' && <div className="user-360-pane">
              <div className="user-360-section-head"><div><span>SUPPORT SNAPSHOT</span><h3>Account overview</h3></div><button type="button" className={selected.is_active?'danger-lite':'success-lite'} onClick={()=>toggleStatus(selected)}>{selected.is_active?'Deactivate account':'Activate account'}</button></div>
              <div className="overview-360-grid">
                <article><span>Verification</span><strong>{user360?.user?.is_verified?'Verified':'Not verified'}</strong><small>{user360?.user?.phone||'No phone'}</small></article>
                <article><span>Membership remaining</span><strong>{userSnapshot.membershipRemainingDays===null?'—':(userSnapshot.membershipRemainingDays+' days')}</strong><small>{currentMembership?.billing_period||'No billing cycle'}</small></article>
                <article><span>Pending payments</span><strong>{userSnapshot.pendingPayments||0}</strong><small>{userSnapshot.pendingTopups||0} wallet top-ups pending</small></article>
                <article><span>Joined</span><strong>{dateOnly(user360?.user?.created_at)}</strong><small>{user360?.user?.role==='business'?'Business account':'Platform account'}</small></article>
              </div>
              <div className="user-360-quick-actions">
                <button type="button" onClick={()=>setUserTab('membership')}>Manage membership</button>
                <button type="button" onClick={()=>setUserTab('wallet')}>Adjust wallet</button>
                <button type="button" onClick={()=>setUserTab('leads')}>View lead history</button>
                <button type="button" onClick={()=>setUserTab('entitlements')}>View entitlements</button>
                <button type="button" onClick={()=>setUserTab('profile')}>Edit profile</button>
                <button type="button" disabled={!selected.is_active||userBusy==='password-reset'} onClick={sendPasswordResetLink}>{userBusy==='password-reset'?'Sending reset link…':'Send password reset link'}</button>
              </div>
              <div className="user-360-recent">
                <div className="user-360-section-head"><div><span>RECENT</span><h3>Latest activity</h3></div></div>
                {(user360?.activity||[]).slice(0,8).map((item,i)=><div className="activity-row" key={item.type+'-'+item.at+'-'+i}><span className={'activity-dot '+item.type}/><div><strong>{item.title}</strong><small>{item.detail}</small></div><div><b>{item.status||'—'}</b><small>{dateTime(item.at)}</small></div></div>)}
                {!user360?.activity?.length && <div className="user-360-empty">No activity yet.</div>}
              </div>
            </div>}

            {userTab==='membership' && <div className="user-360-pane">
              <div className="user-360-section-head"><div><span>MEMBERSHIP</span><h3>GROW / SCALE management</h3></div></div>
              <div className="membership-360-current">
                <div className={'membership-360-badge '+(currentMembership?.plan_group||'none')}><span>Current</span><strong>{currentMembership?.plan_group?String(currentMembership.plan_group).toUpperCase():'NO ACTIVE PLAN'}</strong><small>{currentMembership?.plan_name||'Assign a membership below'}</small></div>
                <div><span>Started</span><strong>{dateOnly(currentMembership?.starts_at)}</strong></div>
                <div><span>Expires</span><strong>{dateOnly(currentMembership?.expires_at)}</strong></div>
                <div><span>Remaining</span><strong>{userSnapshot.membershipRemainingDays===null?'—':userSnapshot.membershipRemainingDays+' days'}</strong></div>
              </div>

              <div className="membership-360-reason">
                <span>Admin reason</span>
                <textarea rows="2" value={membershipReason} onChange={e=>setMembershipReason(e.target.value)} placeholder="Reason required for membership changes, extensions or status updates…"/>
              </div>

              <div className="membership-360-actions">
                <div className="membership-360-action-card">
                  <span>Assign / change plan</span>
                  <div className="membership-plan-controls">
                    <select value={membershipPlanId} onChange={e=>setMembershipPlanId(e.target.value)}>
                      <option value="">Choose GROW / SCALE plan</option>
                      {(user360?.availablePlans||[]).map(plan=><option value={plan.id} key={plan.id}>{String(plan.plan_group||'').toUpperCase()} · {plan.billing_period||plan.name} · {money(plan.price)}</option>)}
                    </select>
                    {!currentMembership ? <input type="number" min="1" max="3650" value={membershipDays} onChange={e=>setMembershipDays(e.target.value)} placeholder="Initial days"/> : <div className="membership-preserve-expiry">Keeps current expiry</div>}
                  </div>
                  <button type="button" className="admin-primary-btn" disabled={userBusy==='membership-plan'} onClick={assignMembershipPlan}>{userBusy==='membership-plan'?'Applying…':(currentMembership?'Change membership':'Activate membership')}</button>
                </div>

                {manageableMembership && <div className="membership-360-action-card">
                  <span>Existing membership controls</span>
                  <div className="membership-inline-control"><input type="number" min="1" max="3650" value={membershipDays} onChange={e=>setMembershipDays(e.target.value)}/><button type="button" onClick={()=>manageMembership('extend',manageableMembership)}>Extend</button><button type="button" onClick={()=>manageMembership('reduce',manageableMembership)}>Reduce</button></div>
                  <div className="membership-inline-control"><input type="date" value={membershipExpiry} onChange={e=>setMembershipExpiry(e.target.value)}/><button type="button" onClick={()=>manageMembership('set_expiry',manageableMembership)}>Set expiry</button></div>
                  <button type="button" className={manageableMembershipActive?'danger-lite':'success-lite'} onClick={()=>manageMembership(manageableMembershipActive?'deactivate':'activate',manageableMembership)}>{manageableMembershipActive?'Deactivate membership':'Activate membership'}</button>
                </div>}
              </div>

              <div className="user-360-section-head compact"><div><span>HISTORY</span><h3>Membership records</h3></div><small>{membership360.plans?.length||0} records</small></div>
              <div className="user-360-card-list">
                {(membership360.plans||[]).map(plan=><article className="history-360-card" key={plan.membership_id}><div><span>{String(plan.plan_group||plan.plan_type||'plan').toUpperCase()}</span><h4>{plan.plan_name}</h4><small>{dateOnly(plan.starts_at)} → {dateOnly(plan.expires_at)}</small></div><div><b className={'mini-status '+plan.status}>{plan.status}</b><strong>{plan.payment_amount!==null&&plan.payment_amount!==undefined?money(plan.payment_amount):'Admin / legacy'}</strong><small>{plan.billing_period||'—'}</small></div></article>)}
                {!membership360.plans?.length && <div className="user-360-empty">No membership history.</div>}
              </div>
            </div>}

            {userTab==='wallet' && <div className="user-360-pane">
              <div className="user-360-section-head"><div><span>WALLET</span><h3>{money(wallet360?.wallet?.balance)} available</h3></div></div>
              <div className="wallet-360-totals">
                <div><span>Recharged</span><strong>{money(wallet360?.totals?.total_recharged)}</strong></div>
                <div><span>Credits</span><strong>{money(wallet360?.totals?.total_credits)}</strong></div>
                <div><span>Debits</span><strong>{money(wallet360?.totals?.total_debits)}</strong></div>
                <div><span>Refunds</span><strong>{money(wallet360?.totals?.total_refunds)}</strong></div>
              </div>
              <div className="wallet-adjust-360">
                <div><span>Admin adjustment</span><div className="wallet-adjust-inputs"><input type="number" min="0.01" step="0.01" value={walletAmount} onChange={e=>setWalletAmount(e.target.value)} placeholder="Amount"/><input value={walletReason} onChange={e=>setWalletReason(e.target.value)} placeholder="Reason required"/></div></div>
                <div className="wallet-adjust-actions"><button type="button" onClick={()=>adjustUserWallet('credit')}>Credit</button><button type="button" onClick={()=>adjustUserWallet('refund')}>Refund</button><button type="button" className="danger-lite" onClick={()=>adjustUserWallet('debit')}>Debit</button></div>
              </div>
              <div className="user-360-section-head compact"><div><span>RECHARGES</span><h3>Recharge history</h3></div><small>{wallet360?.recharges?.length||0} of {wallet360?.pagination?.recharges?.total??wallet360?.recharges?.length??0}</small></div>
              <div className="user-360-card-list">
                {(wallet360?.recharges||[]).map(item=><article className="history-360-card" key={'topup-'+item.id}><div><span>Recharge #{item.id}</span><h4>{money(item.amount)}</h4><small>{item.reference||'No reference'} · {dateTime(item.created_at)}</small></div><div><b className={'mini-status '+item.status}>{item.status}</b><small>{item.payment_method||'manual'}</small></div></article>)}
                {!wallet360?.recharges?.length && <div className="user-360-empty">No wallet recharges.</div>}
              </div>
              {Number(wallet360?.pagination?.recharges?.page||1)<Number(wallet360?.pagination?.recharges?.pages||1)&&<button type="button" className="wallet-360-load-more" disabled={walletPageBusy==='recharges'} onClick={()=>loadMoreWallet('recharges')}>{walletPageBusy==='recharges'?'Loading…':'Load older recharges'}</button>}
              <div className="user-360-section-head compact"><div><span>LEDGER</span><h3>Wallet transactions</h3></div><small>{wallet360?.transactions?.length||0} of {wallet360?.pagination?.transactions?.total??wallet360?.transactions?.length??0}</small></div>
              <div className="user-360-card-list compact-list">
                {(wallet360?.transactions||[]).map(item=><article className="history-360-card" key={'wallet-'+item.id}><div><span>{item.type}</span><h4>{item.description||'Wallet transaction'}</h4><small>{dateTime(item.created_at)}</small></div><div><strong>{item.type==='debit'?'-':'+'}{money(item.amount)}</strong><small>Balance {money(item.balance_after)}</small></div></article>)}
                {!wallet360?.transactions?.length && <div className="user-360-empty">No wallet transactions.</div>}
              </div>
              {Number(wallet360?.pagination?.transactions?.page||1)<Number(wallet360?.pagination?.transactions?.pages||1)&&<button type="button" className="wallet-360-load-more" disabled={walletPageBusy==='transactions'} onClick={()=>loadMoreWallet('transactions')}>{walletPageBusy==='transactions'?'Loading…':'Load older transactions'}</button>}
            </div>}

            {userTab==='leads' && <div className="user-360-pane">
              <div className="user-360-section-head"><div><span>LEAD HISTORY</span><h3>Purchased & claimed leads</h3></div><small>{user360?.leads?.length||0} leads</small></div>
              <div className="leads-360-grid">
                {(user360?.leads||[]).map(lead=><article className="lead-360-card" key={(lead.access_id||'lead')+'-'+lead.lead_id}><div className="lead-360-head"><div><span>#L-{String(lead.lead_id).padStart(6,'0')}</span><h4>{lead.requirement||lead.property_type||lead.industry_name||'Lead'}</h4></div><b>{lead.pricing_tier||lead.payment_method||'access'}</b></div><div className="lead-360-tags"><span>{lead.industry_name||'—'}</span><span>{lead.city_name||lead.state_name||'—'}</span><span>{lead.shares||1} share</span></div><div className="lead-360-meta"><div><span>Amount</span><strong>{money(lead.amount)}</strong></div><div><span>Accessed</span><strong>{dateOnly(lead.created_at)}</strong></div><div><span>CRM</span><strong>{lead.crm_status||'new'}</strong></div></div></article>)}
                {!user360?.leads?.length && <div className="user-360-empty">No lead history.</div>}
              </div>
            </div>}

            {userTab==='payments' && <div className="user-360-pane">
              <div className="user-360-section-head"><div><span>PAYMENTS</span><h3>Payment history</h3></div><small>{user360?.payments?.length||0} records</small></div>
              <div className="user-360-card-list">
                {(user360?.payments||[]).map(item=><article className="history-360-card" key={'payment-'+item.id}><div><span>{item.purchase_type||'payment'} · #{item.id}</span><h4>{item.membership_plan_name||((item.purchase_type==='lead'&&item.lead_id)?('Lead #'+item.lead_id):'Payment')}</h4><small>{item.manual_reference||item.gateway_payment_id||'No reference'} · {dateTime(item.paid_at||item.created_at)}</small></div><div><b className={'mini-status '+item.status}>{item.status}</b><strong>{money(item.amount)}</strong><small>Wallet {money(item.wallet_amount)} · Direct {money(item.external_amount)}</small></div></article>)}
                {!user360?.payments?.length && <div className="user-360-empty">No payment history.</div>}
              </div>
            </div>}

            {userTab==='entitlements' && <div className="user-360-pane">
              <div className="user-360-section-head"><div><span>ENTITLEMENTS</span><h3>Lead credits & grants</h3></div></div>
              <div className="entitlement-360-summary">
                <div><span>Basic</span><strong>{Number(user360?.entitlementSummary?.shared?.remaining||0)}</strong><small>{Number(user360?.entitlementSummary?.shared?.used||0)} used / {Number(user360?.entitlementSummary?.shared?.allowance||0)} total</small></div>
                <div><span>Premium</span><strong>{Number(user360?.entitlementSummary?.premium?.remaining||0)}</strong><small>{Number(user360?.entitlementSummary?.premium?.used||0)} used / {Number(user360?.entitlementSummary?.premium?.allowance||0)} total</small></div>
              </div>
              <div className="user-360-card-list">
                {(user360?.entitlements||[]).map(item=><article className="history-360-card" key={'entitlement-'+item.id}><div><span>{item.source}</span><h4>{item.campaign_name||item.registration_rule_name||('Entitlement #'+item.id)}</h4><small>{dateOnly(item.starts_at)} → {dateOnly(item.expires_at)}</small></div><div><b className={'mini-status '+(item.revoked_at?'cancelled':'active')}>{item.revoked_at?'revoked':'active'}</b><strong>{item.shared_quantity||0} Basic · {item.premium_quantity||0} Premium</strong><small>{item.used_shared||0} / {item.used_premium||0} used</small></div></article>)}
                {!user360?.entitlements?.length && <div className="user-360-empty">No entitlement history.</div>}
              </div>
            </div>}

            {userTab==='profile' && <div className="user-360-pane">
              <div className="management-section role-management-section user-360-profile-section">
                <div className="management-section-head"><div><b>Account type</b><small>User, Lead Partner or Admin</small></div></div>
                <div className="role-management-controls"><select value={roleDraft} onChange={e => setRoleDraft(e.target.value)} disabled={roleSaving || Number(currentUser?.id) === Number(selected.id)}><option value="business">User</option><option value="lead_partner">Lead Partner</option><option value="admin">Admin</option></select><button type="button" className="admin-primary-btn" onClick={changeRole} disabled={roleSaving || roleDraft === selected.role || Number(currentUser?.id) === Number(selected.id)}>{roleSaving ? 'Updating...' : 'Change account type'}</button></div>
                {Number(currentUser?.id) === Number(selected.id) && <div className="role-management-note">You cannot change your own administrator role.</div>}
              </div>

              <form onSubmit={saveProfile} className="user-360-profile-form">
                {editing && <div className="inline-actions"><button type="button" onClick={() => setEditing(false)}>Cancel</button><button className="admin-primary-btn" type="submit" disabled={saving || catalogLoading}>{saving ? 'Saving...' : 'Save changes'}</button></div>}
                <div className="management-section">
                  <div className="management-section-head"><div><b>User & business details</b></div>{!editing && <button type="button" onClick={() => ['business','lead_partner'].includes(selected.role)?startBusinessEdit():setEditing(true)}>Edit</button>}</div>
                  {editing ? <div className="management-grid"><label>Name<input required value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></label><label>Email<input required type="email" value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})}/></label>{['business','lead_partner'].includes(selected.role)&&<><label>Phone<input required value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/></label><label>Business name<input required value={editForm.businessName} onChange={e=>setEditForm({...editForm,businessName:e.target.value})}/></label><label className="management-wide">Business details<textarea required rows="3" value={editForm.businessDetails} onChange={e=>setEditForm({...editForm,businessDetails:e.target.value})}/></label>
                    <div className="management-wide configuration-editor"><div className="configuration-title"><b>Services</b><button type="button" onClick={()=>setEditForm({...editForm,services:[...editForm.services,emptyService()]})}>+ Add service</button></div>{editForm.services.map((item,i)=><div className="configuration-row" key={'service-'+i}><span>{String(i+1).padStart(2,'0')}</span><select required value={item.industryId} onChange={e=>updateService(i,'industryId',e.target.value)}><option value="">Industry</option>{(catalogs?.industries||[]).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!item.industryId} value={item.serviceId} onChange={e=>updateService(i,'serviceId',e.target.value)}><option value="">Service</option>{serviceOptions[i]?.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!item.serviceId} value={item.subserviceId} onChange={e=>updateService(i,'subserviceId',e.target.value)}><option value="">All subservices</option>{subserviceOptions[i]?.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><button type="button" className="add-all-services" onClick={()=>addAllServicesForIndustry(i)} disabled={!item.industryId}>Add all</button><button type="button" onClick={()=>setEditForm({...editForm,services:editForm.services.filter((_,n)=>n!==i)})}>Remove</button></div>)}</div>
                    <div className="management-wide configuration-editor"><div className="configuration-title"><b>Locations</b><button type="button" onClick={()=>setEditForm({...editForm,locations:[...editForm.locations,emptyLocation()]})}>+ Add location</button></div>{editForm.locations.map((item,i)=><div className="configuration-row location-config" key={'location-'+i}><span>{String(i+1).padStart(2,'0')}</span><select required value={item.stateId} onChange={e=>updateLocation(i,'stateId',e.target.value)}><option value="">State / UT</option>{(catalogs?.states||[]).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><select required disabled={!item.stateId} value={item.cityId} onChange={e=>updateLocation(i,'cityId',e.target.value)}><option value="">City</option>{cityOptions[i]?.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!item.cityId} value={item.subcityId} onChange={e=>updateLocation(i,'subcityId',e.target.value)}><option value="">All areas</option>{subcityOptions[i]?.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select><select disabled={!item.cityId} value={item.pincode} onChange={e=>updateLocation(i,'pincode',e.target.value)}><option value="">Pincode</option>{((catalogs?.cities||[]).find(v=>String(v.id)===String(item.cityId))?.pincodes||[]).map(v=><option key={v.id} value={v.pincode}>{v.pincode}</option>)}</select><button type="button" onClick={()=>setEditForm({...editForm,locations:editForm.locations.filter((_,n)=>n!==i)})}>Remove</button></div>)}</div>
                  </>}</div> : <div className="detail-list"><div><span>Name</span><b>{selected.name}</b></div><div><span>Email</span><b>{selected.email}</b></div><div><span>Phone</span><b>{selected.phone||'—'}</b></div><div><span>Business</span><b>{selected.business_name||'—'}</b></div>{['business','lead_partner'].includes(selected.role)&&<div className="management-wide"><span>Business details</span><b>{selected.business_details||'—'}</b></div>}</div>}
                </div>
              </form>
              <div className="management-section user-360-proof-section">
                <div className="management-section-head"><div><b>Verification documents</b><small>Company proof review history</small></div></div>
                <div className="user-360-card-list">
                  {(user360?.proofs||[]).map(item=><article className="history-360-card" key={'proof-'+item.id}><div><span>Proof #{item.id}</span><h4>{item.original_name}</h4><small>{dateTime(item.created_at)}{item.reviewer_name?(' · reviewed by '+item.reviewer_name):''}</small></div><div><b className={'mini-status '+item.status}>{item.status}</b>{item.review_reason&&<small>{item.review_reason}</small>}</div></article>)}
                  {!user360?.proofs?.length && <div className="user-360-empty">No verification documents.</div>}
                </div>
              </div>
            </div>}

            {userTab==='activity' && <div className="user-360-pane">
              <div className="user-360-section-head"><div><span>ACTIVITY & AUDIT</span><h3>Account timeline</h3></div><small>{user360?.activity?.length||0} events</small></div>
              <div className="user-360-timeline">
                {(user360?.activity||[]).map((item,i)=><div className="timeline-row" key={item.type+'-'+item.at+'-'+i}><span className={'activity-dot '+item.type}/><div><strong>{item.title}</strong><small>{item.detail}</small></div><div><b>{item.status||'—'}</b><small>{dateTime(item.at)}</small></div></div>)}
                {!user360?.activity?.length && <div className="user-360-empty">No activity yet.</div>}
              </div>
            </div>}
          </div>
        </>}
      </div>
    </div>}

    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><form className="user-modal create-user-modal premium-create-admin-modal" onClick={e => e.stopPropagation()} onSubmit={createAdmin}><div className="modal-head"><div><span className="eyebrow">NEW ADMIN</span><h2>Create Administrator</h2></div><button type="button" onClick={() => setShowCreate(false)}>×</button></div><div className="create-grid"><label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Password<input required type="password" minLength="8" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label></div><div className="modal-actions"><button className="admin-primary-btn" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create administrator'}</button><button type="button" onClick={() => setShowCreate(false)}>Cancel</button></div></form></div>}
  </section>;
}
