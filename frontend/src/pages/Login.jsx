import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ShieldLoader from '../components/ShieldLoader';

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
          <div style={{
            display: 'flex', gap: 6, marginBottom: 28,
            background: 'rgba(9, 9, 11, 0.6)', backdropFilter: 'blur(8px)',
            borderRadius: 12, padding: 6, border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.2)'
          }}>
            {['signin', 'register'].map(t => {
              const isActive = tab === t;
              return (
                <button key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  style={{
                    flex: 1, padding: '12px', border: isActive ? '1px solid rgba(56, 189, 248, 0.15)' : '1px solid transparent',
                    background: isActive ? 'linear-gradient(180deg, rgba(39, 39, 42, 0.8), rgba(24, 24, 27, 0.8))' : 'transparent',
                    color: isActive ? '#38bdf8' : '#64748b',
                    borderRadius: 8, cursor: 'pointer',
                    fontWeight: isActive ? 600 : 500, fontSize: 13,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'none',
                    textShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none',
                    transform: isActive ? 'scale(1.01)' : 'none',
                    fontFamily: 'inherit', position: 'relative', overflow: 'hidden'
                  }}>
                  {t === 'signin' ? 'Sign In Securely' : 'Create Account'}
                </button>
              );
            })}
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

            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)' }}>
                {error}
              </div>
            )}

            <button className="pg-btn pg-btn-primary pg-btn-full" type="submit" disabled={loading}
              style={{ marginTop:4, padding:'0 22px', fontSize:15, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ transform: 'scale(0.35)', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldLoader />
                  </div>
                  Authenticating…
                </div>
              ) : tab === 'signin' ? 'Sign In Securely' : 'Create Account'}
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
