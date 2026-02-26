import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DepositProvider } from './context/DepositContext';
import PrivateRoute from './components/PrivateRoute';
import Login              from './pages/Login';
import EmployeeDashboard  from './pages/EmployeeDashboard';
import DepositChange      from './pages/DepositChange';
import ChallengeOTP       from './pages/ChallengeOTP';
import BlockedScreen      from './pages/BlockedScreen';
import ConfirmationScreen from './pages/ConfirmationScreen';
import AuditReceipt       from './pages/AuditReceipt';
import AdminDashboard     from './pages/AdminDashboard';
import PayrollDashboard   from './pages/PayrollDashboard';
import Onboarding         from './pages/Onboarding';

const ALL_ROLES = ['employee', 'admin'];

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <DepositProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route path="/onboarding" element={
              <PrivateRoute roles={ALL_ROLES} allowOnboarding={true}>
                <Onboarding />
              </PrivateRoute>
            } />

            {/* Employee dashboard */}
            <Route path="/dashboard" element={
              <PrivateRoute roles={ALL_ROLES}>
                <EmployeeDashboard />
              </PrivateRoute>
            } />

            {/* Deposit flow */}
            <Route path="/deposit/change" element={
              <PrivateRoute roles={ALL_ROLES}>
                <DepositChange />
              </PrivateRoute>
            } />
            <Route path="/deposit/challenge" element={
              <PrivateRoute roles={ALL_ROLES}>
                <ChallengeOTP />
              </PrivateRoute>
            } />
            <Route path="/deposit/blocked" element={
              <PrivateRoute roles={ALL_ROLES}>
                <BlockedScreen />
              </PrivateRoute>
            } />
            <Route path="/deposit/confirmed" element={
              <PrivateRoute roles={ALL_ROLES}>
                <ConfirmationScreen />
              </PrivateRoute>
            } />

            {/* Audit receipt */}
            <Route path="/receipt/:changeId" element={
              <PrivateRoute roles={ALL_ROLES}>
                <AuditReceipt />
              </PrivateRoute>
            } />

            {/* Admin — all ops (approvals, risk monitoring, audit, freeze) */}
            <Route path="/admin" element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />

            {/* Payroll */}
            <Route path="/payroll" element={
              <PrivateRoute roles={ALL_ROLES}>
                <PayrollDashboard />
              </PrivateRoute>
            } />

            {/* Legacy redirects — old manager/staff routes → admin */}
            <Route path="/manager" element={<Navigate to="/admin" replace />} />
            <Route path="/staff"   element={<Navigate to="/admin" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DepositProvider>
    </AuthProvider>
  );
}

export default App;
