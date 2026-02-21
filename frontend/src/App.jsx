import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerPortal from './pages/ManagerPortal';
import AdminDashboard from './pages/AdminDashboard';
import PayrollDashboard from './pages/PayrollDashboard';
import StaffDashboard from './pages/StaffDashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
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
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
