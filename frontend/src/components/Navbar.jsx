import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const ROLE_LINKS = {
  employee: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/deposit/change', label: 'Direct Deposit' },
    { to: '/payroll', label: 'Payslips' },
  ],
  manager: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/manager', label: 'Reviews' },
    { to: '/payroll', label: 'Payroll' },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/admin', label: 'Security' },
    { to: '/manager', label: 'Reviews' },
    { to: '/payroll', label: 'Payroll' },
    { to: '/staff', label: 'Fraud' },
  ],
  staff: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/staff', label: 'Security Ops' },
    { to: '/payroll', label: 'Payroll' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const links = ROLE_LINKS[user.role] || ROLE_LINKS.employee;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="pg-navbar">
      <div className="pg-navbar-inner">
        <Link to="/dashboard" className="pg-navbar-brand">
          <span className="pg-navbar-shield">🛡️</span>
          <span>PayrollGuard</span>
        </Link>
        <div className="pg-navbar-links">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`pg-navbar-link ${location.pathname === l.to ? 'active' : ''}`}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="pg-navbar-right">
          <span className="pg-navbar-user">{user.name}</span>
          <span className={`pg-badge ${
            user.role === 'admin' ? 'badge-danger' :
            user.role === 'manager' ? 'badge-caution' :
            user.role === 'staff' ? 'badge-info' : 'badge-safe'
          }`}>{user.role}</span>
          <button className="pg-btn pg-btn-ghost pg-btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}
