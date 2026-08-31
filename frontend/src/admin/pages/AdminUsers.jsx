import { useEffect, useState } from 'react';
import { authRequest } from '../../utils/auth';
import './AdminUsers.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadUsers() {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams({ search: query, role, status });
      const data = await authRequest(`/admin/users?${params.toString()}`);
      setUsers(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, [query, role, status]);

  async function toggleStatus(user) {
    try {
      const updated = await authRequest(`/admin/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !user.is_active }) });
      setUsers((current) => current.map((u) => u.id === user.id ? { ...u, is_active: updated.is_active } : u));
    } catch (err) { setError(err.message); }
  }

  const total = users.length;
  const active = users.filter((u) => u.is_active).length;
  const businesses = users.filter((u) => u.role === 'business').length;
  const admins = users.filter((u) => u.role === 'admin').length;

  return (
    <section className="admin-users-page">
      <div className="users-heading">
        <div><span className="eyebrow">ACCOUNT MANAGEMENT</span><h1>Users</h1><p>Manage business owners and administrators.</p></div>
        <button className="primary-btn" disabled>+ Create user</button>
      </div>

      <div className="users-stats">
        <div><span>Total users</span><strong>{total}</strong></div>
        <div><span>Active</span><strong>{active}</strong></div>
        <div><span>Business owners</span><strong>{businesses}</strong></div>
        <div><span>Admins</span><strong>{admins}</strong></div>
      </div>

      <div className="users-panel">
        <div className="users-toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or business..." />
          <select value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All roles</option><option value="business">Business owners</option><option value="admin">Admins</option></select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        {error && <div className="users-error">{error}</div>}
        <div className="users-table-wrap">
          {loading ? <div className="empty-users">Loading users...</div> : users.length === 0 ? <div className="empty-users">No users found.</div> :
            <table><thead><tr><th>ID</th><th>USER</th><th>BUSINESS</th><th>ROLE</th><th>STATUS</th><th>JOINED</th><th></th></tr></thead><tbody>
              {users.map((u) => <tr key={u.id}>
                <td className="user-id">#{u.id}</td>
                <td><div className="user-cell"><span>{u.name.charAt(0).toUpperCase()}</span><div><b>{u.name}</b><small>{u.email}</small>{u.role === 'business' && u.phone && <small>{u.phone}</small>}</div></div></td>
                <td>{u.business_name || <span className="muted">—</span>}</td>
                <td><em className={`role ${u.role}`}>{u.role === 'business' ? 'Business owner' : 'Admin'}</em></td>
                <td><em className={`status ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</em></td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td><div className="actions"><button onClick={() => toggleStatus(u)}>{u.is_active ? 'Deactivate' : 'Activate'}</button></div></td>
              </tr>)}
            </tbody></table>}
        </div>
      </div>
    </section>
  );
}
