import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin');
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'employee' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      let user;
      if (tab === 'signin') {
        user = await login(form.email, form.password);
      } else {
        user = await register(form.name, form.email, form.password, form.role);
      }
      const role = user?.role;
      navigate(role === 'admin' ? '/admin' : role === 'manager' ? '/manager' : role === 'staff' ? '/staff' : '/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)', display:'flex',
      alignItems:'center', justifyContent:'center', padding:24,
    }}>
      <div style={{ width:'100%', maxWidth:420 }} className="pg-fade-in">
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🛡️</div>
          <h1 style={{ fontSize:24, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px' }}>PayrollGuard</h1>
          <p style={{ color:'var(--muted)', fontSize:14, marginTop:4 }}>Secure Payroll Access</p>
        </div>

        {/* Card */}
        <div className="pg-card">
          {/* Tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--surface2)', borderRadius:8, padding:4 }}>
            {['signin','register'].map(t => (
              <button key={t}
                onClick={() => { setTab(t); setError(''); }}
                style={{
                  flex:1, padding:'8px 12px', borderRadius:6, border:'none', cursor:'pointer',
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--muted)',
                  fontWeight: tab === t ? 600 : 400, fontSize:13, transition:'all 0.15s',
                  fontFamily:'inherit',
                }}>
                {t === 'signin' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {tab === 'register' && (
              <div>
                <label className="pg-label">Full Name</label>
                <input className="pg-input" placeholder="Dio Brando" value={form.name}
                  onChange={e => set('name', e.target.value)} required />
              </div>
            )}
            <div>
              <label className="pg-label">Email</label>
              <input className="pg-input" type="email" placeholder="you@company.com"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="pg-label">Password</label>
              <input className="pg-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>
            {tab === 'register' && (
              <div>
                <label className="pg-label">Role</label>
                <select className="pg-input" value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Security Staff</option>
                </select>
              </div>
            )}

            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)' }}>
                {error}
              </div>
            )}

            <button className="pg-btn pg-btn-primary pg-btn-full" type="submit" disabled={loading}
              style={{ marginTop:4, padding:'13px 22px', fontSize:15 }}>
              {loading ? <><span className="pg-spinner" /> Authenticating…</> : tab === 'signin' ? 'Sign In Securely' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', color:'var(--muted)', fontSize:12, marginTop:16 }}>
          🔒 Session monitoring begins at login
        </p>
      </div>
    </div>
  );
}
