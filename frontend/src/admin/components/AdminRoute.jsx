import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getToken, getUser } from '../../utils/auth';

export default function AdminRoute() {
  const location = useLocation();
  const token = getToken();
  const user = getUser();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
