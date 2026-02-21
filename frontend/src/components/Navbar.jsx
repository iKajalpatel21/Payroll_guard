import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="shield-icon">🛡️</span>
        <span className="brand-name">PayrollGuard</span>
      </div>
      {user && (
        <div className="navbar-links">
          {user.role === 'employee' && <Link to="/dashboard">My Dashboard</Link>}
          {(user.role === 'manager' || user.role === 'admin') && <Link to="/manager">Manager Portal</Link>}
          {user.role === 'admin' && <Link to="/admin">Admin Dashboard</Link>}
          {(user.role === 'staff' || user.role === 'admin') && <Link to="/staff" style={{ color: '#f87171' }}>🚨 Staff Center</Link>}
          <Link to="/payroll" style={{ color: '#a78bfa' }}>💰 Payroll</Link>
          <span className="nav-user">{user.name} · <em>{user.role}</em></span>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
