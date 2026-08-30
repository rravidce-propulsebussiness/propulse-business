import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../utils/auth'

function ProtectedRoute({ children }) {
  const location = useLocation()
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export default ProtectedRoute
