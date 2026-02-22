import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RiskMeter from '../components/RiskMeter';
import { useDeposit } from '../context/DepositContext';
import { useAuth } from '../context/AuthContext';
import { useBehaviorCollector } from '../hooks/useBehaviorCollector';
import api from '../api/axios';

function generateDeviceId() {
  const key = 'pg_device_id';
  let id = localStorage.getItem(key);
  if (!id) { id = 'DEV_' + Math.random().toString(36).slice(2, 10).toUpperCase(); localStorage.setItem(key, id); }
  return id;
}

function mask(num) {
  if (!num) return null;
  return '****' + String(num).slice(-4);
}

export default function DepositChange() {
  const { user } = useAuth();
  const { setResult } = useDeposit();
  const navigate = useNavigate();
  const { getBehaviorPayload, registerField, registerPaste } = useBehaviorCollector();

  const [form, setForm] = useState({ accountNumber:'', routingNumber:'', bankName:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routingInfo, setRoutingInfo] = useState(null); // { bankName, isPrepaid }
  const [routingLoading, setRoutingLoading] = useState(false);

  // Live risk preview — starts at 0, updates based on behavior
  const [liveScore, setLiveScore] = useState(0);

  const accountRef = useRef(null);
  const routingRef = useRef(null);

  useEffect(() => { registerPaste(accountRef); }, []);
  useEffect(() => { registerField('accountNumber', accountRef); registerField('routingNumber', routingRef); }, []);

  // Slowly drift risk meter up as signals accumulate (visual feedback)
  useEffect(() => {
    const t = setTimeout(() => setLiveScore(s => Math.min(s + 5, 15)), 2000);
    return () => clearTimeout(t);
  }, []);

  async function handleRoutingBlur() {
    const n = form.routingNumber.trim();
    if (n.length !== 9) return;
    setRoutingLoading(true);
    try {
      const { data } = await api.get(`/risk-check/validate-routing?number=${n}`);
      setRoutingInfo(data);
      if (data.isPrepaid) setLiveScore(s => Math.min(s + 30, 85));
    } catch { setRoutingInfo(null); }
    setRoutingLoading(false);
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);

    const behavior = getBehaviorPayload();
    const deviceId = generateDeviceId();

    try {
      const { data } = await api.post('/risk-check', {
        deviceId,
        newBankDetails: {
          accountNumber: form.accountNumber,
          routingNumber:  form.routingNumber,
          bankName:       form.bankName || routingInfo?.bankName || 'Unknown Bank',
        },
        behavior,
      });

      setResult({
        path:            data.path,
        riskScore:       data.riskScore,
        riskCodes:       data.riskCodes || [],
        aiExplanation:   data.aiExplanation,
        changeRequestId: data.changeRequestId,
        newBankDetails: {
          accountNumber: form.accountNumber,
          routingNumber:  form.routingNumber,
          bankName:       form.bankName || routingInfo?.bankName,
        },
        maskedAccount: mask(form.accountNumber),
      });

      if (data.path === 'AUTO_APPROVE')      navigate('/deposit/confirmed');
      else if (data.path === 'OTP_REQUIRED') navigate('/deposit/challenge');
      else                                   navigate('/deposit/blocked');
    } catch (err) {
      setError(err?.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const bank = user?.bankAccount;
  const score = liveScore;

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:40, paddingBottom:40 }}>
        <div className="pg-fade-in" style={{ maxWidth:560, margin:'0 auto' }}>
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Change Direct Deposit</h1>
            <p style={{ color:'var(--muted)', fontSize:14 }}>
              Update your payroll deposit account below. We'll verify your identity for security.
            </p>
          </div>

          {/* Live risk meter */}
          <div className="pg-card" style={{ marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600 }}>🛡️ PayrollGuard Active</span>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Session monitored</span>
            </div>
            <RiskMeter score={score} />
          </div>

          {/* Current deposit info */}
          {bank?.accountNumber && (
            <div className="pg-card" style={{ marginBottom:24, fontSize:13, color:'var(--muted)' }}>
              <span style={{ fontWeight:600, color:'var(--text)' }}>Current deposit: </span>
              {bank.bankName || 'Bank'} · {mask(bank.accountNumber)}
            </div>
          )}

          {/* Form */}
          <div className="pg-card">
            <div className="pg-card-title">Update Direct Deposit</div>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div>
                <label className="pg-label">Account Number</label>
                <input ref={accountRef} className="pg-input" type="text"
                  placeholder="Enter account number"
                  value={form.accountNumber}
                  onChange={e => set('accountNumber', e.target.value)} required />
              </div>
              <div>
                <label className="pg-label">Routing Number</label>
                <input ref={routingRef} className="pg-input" type="text"
                  placeholder="9-digit routing number"
                  value={form.routingNumber}
                  onChange={e => set('routingNumber', e.target.value)}
                  onBlur={handleRoutingBlur}
                  maxLength={9} required />
                {routingLoading && <span style={{ fontSize:12, color:'var(--muted)', marginTop:4, display:'block' }}>Verifying routing number…</span>}
                {routingInfo && !routingLoading && (
                  <span style={{ fontSize:12, marginTop:4, display:'block',
                    color: routingInfo.isPrepaid ? 'var(--danger)' : 'var(--safe)' }}>
                    {routingInfo.isPrepaid
                      ? '⚠️ Prepaid card routing number detected'
                      : `✅ ${routingInfo.bankName || 'Bank verified'}`}
                  </span>
                )}
              </div>
              <div>
                <label className="pg-label">Bank Name (optional)</label>
                <input className="pg-input" placeholder={routingInfo?.bankName || 'Chase, Wells Fargo…'}
                  value={form.bankName} onChange={e => set('bankName', e.target.value)} />
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)' }}>
                  {error}
                </div>
              )}

              <button className="pg-btn pg-btn-primary pg-btn-full" type="submit" disabled={loading}
                style={{ padding:'13px 22px', fontSize:15 }}>
                {loading ? <><span className="pg-spinner" /> Evaluating risk…</> : 'Submit Change Request'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
