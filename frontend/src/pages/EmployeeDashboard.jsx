import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const RISK_COLOR = (score) => {
  if (score < 30) return '#22c55e';
  if (score <= 70) return '#f59e0b';
  return '#ef4444';
};

const RISK_LABEL = (score) => {
  if (score < 30) return 'LOW';
  if (score <= 70) return 'MEDIUM';
  return 'HIGH';
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ accountNumber: '', routingNumber: '', bankName: '' });
  const [deviceId] = useState(() => `device-${Math.random().toString(36).substring(2, 10)}`);
  const [step, setStep] = useState('form'); // form | otp | result
  const [result, setResult] = useState(null);
  const [otp, setOtp] = useState('');
  const [changeRequestId, setChangeRequestId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/risk-check', {
        deviceId,
        newBankDetails: form,
      }, { headers: { 'x-device-id': deviceId } });
      setResult(data);
      if (data.path === 'OTP_REQUIRED') {
        setChangeRequestId(data.changeRequestId);
        setStep('otp');
      } else {
        setStep('result');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/risk-check/verify-otp', { changeRequestId, otp });
      setMsg(data.message);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('form');
    setResult(null);
    setOtp('');
    setMsg('');
    setError('');
    setForm({ accountNumber: '', routingNumber: '', bankName: '' });
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>👋 Welcome, {user?.name}</h2>
          <p>Change your payroll direct deposit details below. We'll verify your identity for security.</p>
        </div>

        {/* ── Form Step ── */}
        {step === 'form' && (
          <div className="card">
            <h3>Update Direct Deposit</h3>
            <form onSubmit={handleSubmit} className="dash-form">
              <div className="form-group">
                <label>Account Number</label>
                <input name="accountNumber" value={form.accountNumber} onChange={handleChange} placeholder="123456789" required />
              </div>
              <div className="form-group">
                <label>Routing Number</label>
                <input name="routingNumber" value={form.routingNumber} onChange={handleChange} placeholder="021000021" required />
              </div>
              <div className="form-group">
                <label>Bank Name (optional)</label>
                <input name="bankName" value={form.bankName} onChange={handleChange} placeholder="Chase, Wells Fargo…" />
              </div>
              {error && <div className="alert-error">⚠️ {error}</div>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Analyzing…' : 'Submit Change Request'}
              </button>
            </form>
          </div>
        )}

        {/* ── OTP Step ── */}
        {step === 'otp' && result && (
          <div className="card">
            <div className="risk-badge" style={{ '--risk-color': RISK_COLOR(result.riskScore) }}>
              <span className="badge-label">Risk Score</span>
              <span className="badge-score">{result.riskScore}</span>
              <span className="badge-level">{RISK_LABEL(result.riskScore)} RISK</span>
            </div>
            <div className="ai-explanation">
              <span className="ai-icon">🤖 AI Security Notice</span>
              <p>{result.aiExplanation}</p>
            </div>
            <h3>Enter Verification Code</h3>
            <p className="otp-hint">We've sent a 6-digit code to your email. Please enter it below.</p>
            <form onSubmit={handleOtpVerify} className="dash-form">
              <div className="form-group">
                <label>One-Time Password</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="_ _ _ _ _ _" maxLength={6} required className="otp-input" />
              </div>
              {error && <div className="alert-error">⚠️ {error}</div>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify & Confirm'}
              </button>
            </form>
          </div>
        )}

        {/* ── Result Step ── */}
        {step === 'result' && (
          <div className="card result-card">
            {result?.path === 'MANAGER_REQUIRED' ? (
              <div className="result-pending">
                <div className="result-icon">⏳</div>
                <h3>Pending Manager Review</h3>
                <div className="ai-explanation">
                  <span className="ai-icon">🤖 AI Security Notice</span>
                  <p>{result.aiExplanation}</p>
                </div>
                <div className="risk-badge" style={{ '--risk-color': RISK_COLOR(result.riskScore) }}>
                  <span className="badge-label">Risk Score</span>
                  <span className="badge-score">{result.riskScore}</span>
                  <span className="badge-level">HIGH RISK</span>
                </div>
                <p>Your manager has been notified. You'll receive a decision soon.</p>
              </div>
            ) : (
              <div className="result-success">
                <div className="result-icon">✅</div>
                <h3>Details Updated Successfully</h3>
                <p>{msg || result?.message}</p>
              </div>
            )}
            <button className="btn-secondary" onClick={reset}>← Back</button>
          </div>
        )}
      </div>
    </>
  );
};

export default EmployeeDashboard;
