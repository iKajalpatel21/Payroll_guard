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
import ManagerPortal      from './pages/ManagerPortal';
import AdminDashboard     from './pages/AdminDashboard';
import PayrollDashboard   from './pages/PayrollDashboard';
import StaffDashboard     from './pages/StaffDashboard';
import Onboarding         from './pages/Onboarding';

const ALL_ROLES = ['employee','manager','admin','staff'];

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const role = user.role;
  return <Navigate to={role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : role === 'staff' ? '/staff' : '/dashboard'} replace />;
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
              <PrivateRoute roles={['employee','manager','admin']}>
                <EmployeeDashboard />
              </PrivateRoute>
            } />

            {/* Deposit flow — all steps share DepositContext */}
            <Route path="/deposit/change" element={
              <PrivateRoute roles={['employee','manager','admin']}>
                <DepositChange />
              </PrivateRoute>
            } />
            <Route path="/deposit/challenge" element={
              <PrivateRoute roles={['employee','manager','admin']}>
                <ChallengeOTP />
              </PrivateRoute>
            } />
            <Route path="/deposit/blocked" element={
              <PrivateRoute roles={['employee','manager','admin']}>
                <BlockedScreen />
              </PrivateRoute>
            } />
            <Route path="/deposit/confirmed" element={
              <PrivateRoute roles={['employee','manager','admin']}>
                <ConfirmationScreen />
              </PrivateRoute>
            } />

            {/* Audit receipt */}
            <Route path="/receipt/:changeId" element={
              <PrivateRoute roles={ALL_ROLES}>
                <AuditReceipt />
              </PrivateRoute>
            } />

            {/* Manager */}
            <Route path="/manager" element={
              <PrivateRoute roles={['manager','admin']}>
                <ManagerPortal />
              </PrivateRoute>
            } />

            {/* Admin */}
            <Route path="/admin" element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />

            {/* Payroll (all) */}
            <Route path="/payroll" element={
              <PrivateRoute roles={ALL_ROLES}>
                <PayrollDashboard />
              </PrivateRoute>
            } />

            {/* Staff security ops */}
            <Route path="/staff" element={
              <PrivateRoute roles={['staff','admin','manager']}>
                <StaffDashboard />
              </PrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DepositProvider>
    </AuthProvider>
  );
}

export default App;
