import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

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
import InvestmentWithGeneratedFunds from './pages/InvestmentWithGeneratedFunds';
import InvestorInvestmentSection from './pages/InvestorInvestmentSection';
import InvestorPayoutsWithGeneratedFunds from './pages/InvestorPayoutsWithGeneratedFunds';
import InvestorHeader from './components/InvestorHeader';

import AdminDashboard from './admin/pages/AdminDashboard';
import AdminUsers from './admin/pages/AdminUsers';
import AdminPayments from './admin/pages/AdminPayments';
import AdminPaymentDetails from './admin/components/AdminPaymentDetails';
import AdminCoupons from './admin/pages/AdminCoupons';
import AdminLeads from './admin/pages/AdminLeads';
import AdminLeadPricing from './admin/pages/AdminLeadPricing';
import AdminMembershipPlansConfig from './admin/pages/AdminMembershipPlansConfig';
import AdminInvestments from './admin/pages/AdminInvestments';
import AdminInvestorPayoutRequests from './admin/pages/AdminInvestorPayoutRequests';
import AdminRoute from './admin/components/AdminRoute';
import AdminLayout from './admin/components/AdminLayout';
import { getToken, getUser } from './utils/auth';

function LoggedInHomeRoute() {
  const token = getToken();
  const user = getUser();

  if (token && user && user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (token && user) {
    return <Navigate to="/leads" replace />;
  }

  return <Home />;
}

function LoggedOutRoute() {
  const token = getToken();
  const user = getUser();

  if (token && user) {
    return (
      <Navigate
        to={user.role === 'admin' ? '/admin' : '/leads'}
        replace
      />
    );
  }

  return <Outlet />;
}

function CustomerRoute() {
  const location = useLocation();
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

function InvestorWithHeader() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') !== '1') {
      return undefined;
    }

    const timer = setTimeout(() => {
      document.querySelector('.investment-primary-action')?.click();
      window.history.replaceState({}, '', window.location.pathname);
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <InvestorHeader />
      <InvestmentWithGeneratedFunds />
    </>
  );
}

function InvestorSectionWithHeader({ type }) {
  return (
    <>
      <InvestorHeader />
      {type === 'payouts' ? (
        <InvestorPayoutsWithGeneratedFunds />
      ) : (
        <InvestorInvestmentSection type={type} />
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoggedInHomeRoute />} />
        <Route path="/home" element={<Navigate to="/" replace />} />

        <Route element={<LoggedOutRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        <Route path="/leads" element={<Leads />} />
        <Route path="/industries" element={<Industries />} />

        <Route element={<CustomerRoute />}>
          <Route path="/dashboard" element={<Navigate to="/leads" replace />} />
          <Route path="/purchased-leads" element={<PurchasedLeads />} />
          <Route path="/my-leads" element={<PurchasedLeads />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/investment" element={<InvestorWithHeader />} />
          <Route
            path="/investment/leads"
            element={<InvestorSectionWithHeader type="leads" />}
          />
          <Route
            path="/investment/sold-leads"
            element={<InvestorSectionWithHeader type="sold" />}
          />
          <Route
            path="/investment/history"
            element={<InvestorSectionWithHeader type="history" />}
          />
          <Route
            path="/investment/payouts"
            element={<InvestorSectionWithHeader type="payouts" />}
          />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/industries" element={<Industries />} />
            <Route
              path="/admin/businesses"
              element={<Navigate to="/admin/users" replace />}
            />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route
              path="/admin/payment-receiving"
              element={<AdminPaymentDetails />}
            />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route
              path="/admin/wallet-topups"
              element={<Navigate to="/admin/payments" replace />}
            />
            <Route path="/admin/leads" element={<AdminLeads />} />
            <Route
              path="/admin/lead-pricing"
              element={<AdminLeadPricing />}
            />
            <Route
              path="/admin/membership-plans"
              element={<AdminMembershipPlansConfig />}
            />
            <Route
              path="/admin/memberships"
              element={<AdminMembershipPlansConfig />}
            />
            <Route path="/admin/investments" element={<AdminInvestments />} />
            <Route
              path="/admin/investor-transfer-requests"
              element={<AdminInvestorPayoutRequests />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
