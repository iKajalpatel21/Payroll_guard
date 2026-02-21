import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let user;
      if (isRegister) {
        user = await register(form.name, form.email, form.password, form.role);
      } else {
        user = await login(form.email, form.password);
      }
      // Route by role
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'manager') navigate('/manager');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span>🛡️</span>
          <h1>PayrollGuard</h1>
          <p>Secure • Intelligent • Transparent</p>
        </div>

        <div className="auth-tabs">
          <button className={!isRegister ? 'active' : ''} onClick={() => { setIsRegister(false); setError(''); }}>
            Sign In
          </button>
          <button className={isRegister ? 'active' : ''} onClick={() => { setIsRegister(true); setError(''); }}>
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input id="name" name="name" type="text" placeholder="Alice Johnson" value={form.name} onChange={handleChange} required />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="alice@company.com" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
          </div>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={form.role} onChange={handleChange}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}
          {error && <div className="auth-error">⚠️ {error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
