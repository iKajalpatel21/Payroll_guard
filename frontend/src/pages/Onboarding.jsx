import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Auth.css'; // Reuse login styles for the clean centered card look

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '', country: 'US' });
  const [bank, setBank] = useState({ accountNumber: '', routingNumber: '', bankName: '' });

  // On mount, check if they actually need onboarding
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await api.get('/me/profile');
        const emp = data.employee;
        if (emp.bankAccount?.accountNumber) {
          // They already have a baseline, redirect to dashboard
          navigate(emp.role === 'MANAGER' ? '/manager' : emp.role === 'SECURITY_STAFF' ? '/staff' : '/dashboard');
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Profile fetch failed:', err);
        setError('Failed to load profile. Please refresh.');
        setLoading(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    // Simulate fingerprinting the device ID
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }

    try {
      await api.post('/me/baseline', {
        newAddress: address,
        newBankDetails: bank,
        deviceId
      });
      // Redirect to correct dashboard based on role
      navigate(user?.role === 'MANAGER' ? '/manager' : user?.role === 'SECURITY_STAFF' ? '/staff' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save details. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="auth-container"><div className="auth-card">Loading…</div></div>;

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <h2>Welcome to PayrollGuard! 🎉</h2>
          <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Before you can access your dashboard, we need your baseline details. This information is required for payroll processing and will secure your account from unauthorized changes.
          </p>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: 8 }}>🏦 Bank Details (Direct Deposit)</h3>
          
          <div className="form-group">
            <label>Account Number</label>
            <input 
              type="text" required placeholder="Account number"
              value={bank.accountNumber} onChange={e => setBank({...bank, accountNumber: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Routing Number</label>
            <input 
              type="text" required placeholder="9-digit routing number"
              value={bank.routingNumber} onChange={e => setBank({...bank, routingNumber: e.target.value})} 
            />
          </div>
          <div className="form-group" style={{ marginBottom: 32 }}>
            <label>Bank Name (Optional)</label>
            <input 
              type="text" placeholder="e.g. Chase"
              value={bank.bankName} onChange={e => setBank({...bank, bankName: e.target.value})} 
            />
          </div>

          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16, color: '#f1f5f9', borderBottom: '1px solid #334155', paddingBottom: 8 }}>📍 Mailing Address</h3>

          <div className="form-group">
            <label>Street Address</label>
            <input 
              type="text" required placeholder="123 Main St"
              value={address.street} onChange={e => setAddress({...address, street: e.target.value})} 
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>City</label>
              <input 
                type="text" required placeholder="City"
                value={address.city} onChange={e => setAddress({...address, city: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>State</label>
              <input 
                type="text" required placeholder="State (e.g. NY)" maxLength={2}
                value={address.state} onChange={e => setAddress({...address, state: e.target.value})} 
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>ZIP Code</label>
              <input 
                type="text" required placeholder="ZIP"
                value={address.zip} onChange={e => setAddress({...address, zip: e.target.value})} 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label>Country</label>
              <input 
                type="text" required placeholder="US"
                value={address.country} onChange={e => setAddress({...address, country: e.target.value})} 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '⏳ Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
