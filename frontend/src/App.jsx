import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerPortal from './pages/ManagerPortal';
import AdminDashboard from './pages/AdminDashboard';
import PayrollDashboard from './pages/PayrollDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AccountSettings from './pages/AccountSettings';
import PayrollSimulator from './pages/PayrollSimulator';
import Onboarding from './pages/Onboarding';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={
            <PrivateRoute roles={['employee', 'manager', 'admin', 'staff']} allowOnboarding>
              <Onboarding />
            </PrivateRoute>
          } />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/" element={
            <PrivateRoute roles={['employee', 'manager', 'admin']}>
              <EmployeeDashboard />
            </PrivateRoute>
          } />
          <Route path="/manager" element={
            <PrivateRoute roles={['manager', 'admin']}>
              <ManagerPortal />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute roles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          <Route path="/payroll" element={
            <PrivateRoute roles={['employee', 'manager', 'admin', 'staff']}>
              <PayrollDashboard />
            </PrivateRoute>
          } />
          <Route path="/staff" element={
            <PrivateRoute roles={['staff', 'admin']}>
              <StaffDashboard />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute roles={['employee', 'manager', 'admin', 'staff']}>
              <AccountSettings />
            </PrivateRoute>
          } />
          <Route path="/simulate" element={
            <PrivateRoute roles={['employee', 'manager', 'admin', 'staff']}>
              <PayrollSimulator />
            </PrivateRoute>
          } />
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
