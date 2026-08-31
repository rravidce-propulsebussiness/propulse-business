import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getUser } from '../../utils/auth';
import './AdminLayout.css';

const links = [
  { to: '/admin', label: 'Overview', icon: '⌂', end: true },
  { to: '/admin/industries', label: 'Industries & Services', icon: '▦' },
  { to: '/admin/locations', label: 'Locations', icon: '⌖' },
  { to: '/admin/businesses', label: 'Businesses', icon: '♙' },
  { to: '/admin/users', label: 'Users', icon: '◎' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const initials = (user?.name || 'Admin')
    .split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

  function logout() {
    clearSession();
    localStorage.removeItem('propulse_session_mode');
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-mark">P</span>
          <span><b>PRO<span>PULSE</span></b><small>ADMIN CONSOLE</small></span>
        </div>

        <div className="admin-nav-label">WORKSPACE</div>
        <nav className="admin-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => isActive ? 'active' : ''}>
              <i>{link.icon}</i><span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-user">
            <span>{initials || 'A'}</span>
            <div><b>{user?.name || 'Admin'}</b><small>{user?.email || 'Administrator'}</small></div>
          </div>
          <button onClick={logout}>↪ <span>Log out</span></button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" aria-label="Open navigation" onClick={() => document.body.classList.toggle('admin-nav-open')}>☰</button>
          <div className="admin-breadcrumb">
            <span>Admin</span><b>/</b><strong>{location.pathname === '/admin' ? 'Overview' : location.pathname.includes('industries') ? 'Industries & Services' : location.pathname.includes('locations') ? 'Locations' : location.pathname.includes('businesses') ? 'Businesses' : 'Users'}</strong>
          </div>
          <div className="admin-top-status"><i /> System healthy</div>
        </header>
        <div className="admin-content"><Outlet /></div>
      </div>
    </div>
  );
}
