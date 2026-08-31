import { useState } from 'react';
import './AdminUsers.css';

const demoUsers = [
  { id: 1, name: 'Admin', email: 'admin@propulsebusiness.com', role: 'Admin', membership: 'Platform Admin', status: 'Active', joined: 'Today' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState(demoUsers);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Business', membership: 'Free' });

  const filtered = users.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()));

  function createUser(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setUsers((current) => [...current, { id: Date.now(), ...form, status: 'Active', joined: 'Just now' }]);
    setForm({ name: '', email: '', role: 'Business', membership: 'Free' });
    setShowCreate(false);
  }

  function toggleStatus(id) {
    setUsers((current) => current.map((u) => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
  }

  function removeUser(id) {
    if (window.confirm('Remove this user?')) setUsers((current) => current.filter((u) => u.id !== id));
  }

  return (
    <section className="admin-users-page">
      <div className="users-heading">
        <div><span className="eyebrow">ACCOUNT MANAGEMENT</span><h1>Users</h1><p>Manage platform accounts, roles and memberships.</p></div>
        <button className="primary-btn" onClick={() => setShowCreate(true)}>+ Create user</button>
      </div>

      <div className="users-stats">
        <div><span>Total users</span><strong>{users.length}</strong></div>
        <div><span>Active</span><strong>{users.filter((u) => u.status === 'Active').length}</strong></div>
        <div><span>Business</span><strong>{users.filter((u) => u.role === 'Business').length}</strong></div>
        <div><span>Admins</span><strong>{users.filter((u) => u.role === 'Admin').length}</strong></div>
      </div>

      <div className="users-panel">
        <div className="users-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." /><select defaultValue="all"><option value="all">All roles</option><option>Business</option><option>Admin</option></select><select defaultValue="all"><option value="all">All status</option><option>Active</option><option>Inactive</option></select></div>
        <div className="users-table-wrap"><table><thead><tr><th>USER</th><th>ROLE</th><th>MEMBERSHIP</th><th>STATUS</th><th>JOINED</th><th></th></tr></thead><tbody>{filtered.map((u) => <tr key={u.id}><td><div className="user-cell"><span>{u.name.charAt(0).toUpperCase()}</span><div><b>{u.name}</b><small>{u.email}</small></div></div></td><td><em className={`role ${u.role.toLowerCase()}`}>{u.role}</em></td><td>{u.membership}</td><td><em className={`status ${u.status.toLowerCase()}`}>{u.status}</em></td><td>{u.joined}</td><td><div className="actions"><button onClick={() => toggleStatus(u.id)}>{u.status === 'Active' ? 'Deactivate' : 'Activate'}</button><button className="danger" onClick={() => removeUser(u.id)}>Delete</button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-users">No users found.</div>}</div>
      </div>

      {showCreate && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowCreate(false)}><form className="user-modal" onSubmit={createUser}><div className="modal-head"><div><span className="eyebrow">NEW ACCOUNT</span><h2>Create user</h2></div><button type="button" onClick={() => setShowCreate(false)}>×</button></div><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><div className="form-grid"><label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option>Business</option><option>Admin</option></select></label><label>Membership<select value={form.membership} onChange={(e) => setForm({ ...form, membership: e.target.value })}><option>Free</option><option>Starter</option><option>Pro</option><option>Enterprise</option></select></label></div><button className="primary-btn full" type="submit">Create account</button></form></div>}
    </section>
  );
}
