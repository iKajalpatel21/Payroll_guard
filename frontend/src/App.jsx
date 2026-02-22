import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

const ALL_ROLES = ['employee','manager','admin','staff'];

function App() {
  return (
    <AuthProvider>
      <DepositProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

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
              <PrivateRoute roles={['staff','admin']}>
                <StaffDashboard />
              </PrivateRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </DepositProvider>
    </AuthProvider>
  );
}

export default App;
