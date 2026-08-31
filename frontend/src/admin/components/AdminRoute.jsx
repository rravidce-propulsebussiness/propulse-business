import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AdminRoute() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
