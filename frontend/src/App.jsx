import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PurchasedLeads from './pages/PurchasedLeads';
import CustomerHistory from './pages/CustomerHistory';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Membership from './pages/Membership';
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

function LoggedOutRoute(){const token=getToken(),user=getUser();if(token&&user)return <Navigate to={user.role==='admin'?'/admin':'/dashboard'} replace/>;return <Outlet/>}
function CustomerRoute(){const location=useLocation(),token=getToken(),user=getUser();if(!token||!user)return <Navigate to="/login" state={{from:location}} replace/>;if(user.role==='admin')return <Navigate to="/admin" replace/>;return <Outlet/>}
function App(){return <BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/home" element={<Home/>}/><Route element={<LoggedOutRoute/>}><Route path="/login" element={<Login/>}/><Route path="/signup" element={<Signup/>}/></Route><Route path="/leads" element={<Leads/>}/><Route path="/industries" element={<Industries/>}/><Route element={<CustomerRoute/>}><Route path="/dashboard" element={<Dashboard/>}/><Route path="/purchased-leads" element={<PurchasedLeads/>}/><Route path="/my-leads" element={<PurchasedLeads/>}/><Route path="/history" element={<CustomerHistory/>}/><Route path="/wallet" element={<Wallet/>}/><Route path="/membership" element={<Membership/>}/><Route path="/profile" element={<Profile/>}/></Route><Route element={<AdminRoute/>}><Route element={<AdminLayout/>}><Route path="/admin" element={<AdminDashboard/>}/><Route path="/admin/industries" element={<Industries/>}/><Route path="/admin/businesses" element={<AdminBusinesses/>}/><Route path="/admin/users" element={<AdminUsers/>}/><Route path="/admin/payments" element={<AdminPayments/>}/><Route path="/admin/leads" element={<AdminLeads/>}/><Route path="/admin/lead-pricing" element={<AdminLeadPricing/>}/><Route path="/admin/membership-plans" element={<AdminMembershipPlansConfig/>}/><Route path="/admin/memberships" element={<AdminMembershipPlansConfig/>}/></Route></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
export default App;
