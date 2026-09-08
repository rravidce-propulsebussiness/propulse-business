import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import './investmentPremiumEnhancer.js';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PurchasedLeads from './pages/PurchasedLeads';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Membership from './pages/Membership';
import Industries from './pages/Industries';
import Leads from './pages/LeadsV2';
import Investment from './pages/Investment';
import InvestorHeader from './components/InvestorHeader';
import InvestorPayoutTransfers from './components/InvestorPayoutTransfers';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminUsers from './admin/pages/AdminUsers';
import AdminPayments from './admin/pages/AdminPayments';
import AdminCoupons from './admin/pages/AdminCoupons';
import AdminLeads from './admin/pages/AdminLeads';
import AdminLeadPricing from './admin/pages/AdminLeadPricing';
import AdminMembershipPlansConfig from './admin/pages/AdminMembershipPlansConfig';
import AdminInvestments from './admin/pages/AdminInvestments';
import AdminRoute from './admin/components/AdminRoute';
import AdminLayout from './admin/components/AdminLayout';
import { getToken, getUser } from './utils/auth';

function LoggedInHomeRoute(){const token=getToken(),user=getUser();if(token&&user&&user.role==='admin')return <Navigate to="/admin" replace/>;return <Home/>}
function LoggedOutRoute(){const token=getToken(),user=getUser();if(token&&user)return <Navigate to={user.role==='admin'?'/admin':'/'} replace/>;return <Outlet/>}
function CustomerRoute(){const location=useLocation(),token=getToken(),user=getUser();if(!token||!user)return <Navigate to="/login" state={{from:location}} replace/>;if(user.role==='admin')return <Navigate to="/admin" replace/>;return <Outlet/>}
function InvestmentWithHeader(){return <><InvestorHeader/><Investment/><InvestorPayoutTransfers/></>}
function App(){return <BrowserRouter><Routes><Route path="/" element={<LoggedInHomeRoute/>}/><Route path="/home" element={<LoggedInHomeRoute/>}/><Route element={<LoggedOutRoute/>}><Route path="/login" element={<Login/>}/><Route path="/signup" element={<Signup/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/reset-password" element={<ResetPassword/>}/></Route><Route path="/leads" element={<Leads/>}/><Route path="/industries" element={<Industries/>}/><Route element={<CustomerRoute/>}><Route path="/dashboard" element={<Navigate to="/" replace/>}/><Route path="/purchased-leads" element={<PurchasedLeads/>}/><Route path="/my-leads" element={<PurchasedLeads/>}/><Route path="/wallet" element={<Wallet/>}/><Route path="/membership" element={<Membership/>}/><Route path="/investment" element={<InvestmentWithHeader/>}/><Route path="/profile" element={<Profile/>}/></Route><Route element={<AdminRoute/>}><Route element={<AdminLayout/>}><Route path="/admin" element={<AdminDashboard/>}/><Route path="/admin/industries" element={<Industries/>}/><Route path="/admin/businesses" element={<Navigate to="/admin/users" replace/>}/><Route path="/admin/users" element={<AdminUsers/>}/><Route path="/admin/payments" element={<AdminPayments/>}/><Route path="/admin/coupons" element={<AdminCoupons/>}/><Route path="/admin/wallet-topups" element={<Navigate to="/admin/payments" replace/>}/><Route path="/admin/leads" element={<AdminLeads/>}/><Route path="/admin/lead-pricing" element={<AdminLeadPricing/>}/><Route path="/admin/membership-plans" element={<AdminMembershipPlansConfig/>}/><Route path="/admin/memberships" element={<AdminMembershipPlansConfig/>}/><Route path="/admin/investments" element={<AdminInvestments/>}/></Route></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
export default App;
