import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Industries from './pages/Industries';
import Leads from './pages/LeadsV2';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminBusinesses from './admin/pages/AdminBusinesses';
import AdminUsers from './admin/pages/AdminUsers';
import AdminPayments from './admin/pages/AdminPayments';
import AdminLeads from './admin/pages/AdminLeads';
import AdminLeadPricing from './admin/pages/AdminLeadPricing';
import AdminMembershipPlansConfig from './admin/pages/AdminMembershipPlansConfig';
import AdminRoute from './admin/components/AdminRoute';
import AdminLayout from './admin/components/AdminLayout';
import { getToken, getUser } from './utils/auth';

function LoggedOutRoute() {
  const token = getToken();
  const user = getUser();
  if (token && user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return <Outlet />;
}

function CustomerRoute() {
  const location = useLocation();
  const token = getToken();
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

function App(){
  return <BrowserRouter><Routes>
    {/* Public website: visitors always land on the marketing homepage. */}
    <Route path="/" element={<Home/>}/>
    <Route path="/home" element={<Home/>}/>

    {/* Login and signup are only for visitors who are not already signed in. */}
    <Route element={<LoggedOutRoute/>}>
      <Route path="/login" element={<Login/>}/>
      <Route path="/signup" element={<Signup/>}/>
    </Route>

    {/* Customer/business portal. */}
    <Route element={<CustomerRoute/>}>
      <Route path="/dashboard" element={<Dashboard/>}/>
      <Route path="/profile" element={<Profile/>}/>
      <Route path="/leads" element={<Leads/>}/>
    </Route>

    {/* Public catalogue page remains accessible without signing in. */}
    <Route path="/industries" element={<Industries/>}/>

    {/* Admin portal. */}
    <Route element={<AdminRoute/>}>
      <Route element={<AdminLayout/>}>
        <Route path="/admin" element={<AdminDashboard/>}/>
        <Route path="/admin/industries" element={<Industries/>}/>
        <Route path="/admin/businesses" element={<AdminBusinesses/>}/>
        <Route path="/admin/users" element={<AdminUsers/>}/>
        <Route path="/admin/payments" element={<AdminPayments/>}/>
        <Route path="/admin/leads" element={<AdminLeads/>}/>
        <Route path="/admin/lead-pricing" element={<AdminLeadPricing/>}/>
        <Route path="/admin/membership-plans" element={<AdminMembershipPlansConfig/>}/>
        <Route path="/admin/memberships" element={<AdminMembershipPlansConfig/>}/>
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></BrowserRouter>
}

export default App;
