import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SignalBadge from '../components/SignalBadge';
import { useDeposit } from '../context/DepositContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ChallengeOTP() {
  const { depositState, setResult } = useDeposit();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits] = useState(['','','','','','']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 min in seconds
  const refs = useRef([]);

  // Redirect if no active deposit flow
  useEffect(() => {
    if (!depositState.changeRequestId) navigate('/deposit/change');
  }, []);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(s => s <= 1 ? 0 : s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  function handleDigit(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) refs.current[i+1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i-1]?.focus();
  }

  async function handleVerify(e) {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length < 6) return;
    setError(''); setLoading(true);
    try {
      await api.post('/risk-check/verify-otp', {
        changeRequestId: depositState.changeRequestId,
        otp,
      });
      navigate('/deposit/confirmed');
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 2) {
        setError('Too many failed attempts. Request escalated to your manager.');
        setTimeout(() => navigate('/deposit/blocked'), 2500);
      } else {
        setError(err?.response?.data?.message || 'Invalid or expired OTP. Please try again.');
        setDigits(['','','','','','']);
        refs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c)
    : 'your email';

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:60, paddingBottom:40 }}>
        <div className="pg-fade-in" style={{ maxWidth:480, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
            <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>One More Step</h1>
            <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.6 }}>
              To protect your paycheck, we need to verify it's really you making this change.
            </p>
          </div>

          {/* Why we're asking */}
          {depositState.riskCodes?.length > 0 && (
            <div className="pg-card" style={{ marginBottom:24 }}>
              <div className="pg-card-title">Why we're asking</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:0 }}>
                {depositState.riskCodes.map(c => <SignalBadge key={c} code={c} />)}
              </div>
            </div>
          )}

          {/* OTP form */}
          <div className="pg-card">
            <p style={{ fontSize:14, color:'var(--muted)', marginBottom:24, textAlign:'center' }}>
              We sent a 6-digit code to <strong style={{ color:'var(--text)' }}>{maskedEmail}</strong>
            </p>

            <form onSubmit={handleVerify}>
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:24 }}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => refs.current[i] = el}
                    value={d} onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    type="text" inputMode="numeric" maxLength={1}
                    style={{
                      width:48, height:56, textAlign:'center', fontSize:24, fontWeight:700,
                      background:'var(--surface2)', border:'2px solid ' + (d ? 'var(--brand)' : 'var(--border)'),
                      borderRadius:10, color:'var(--text)', outline:'none', fontFamily:'inherit',
                    }} />
                ))}
              </div>

              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)', marginBottom:16 }}>
                  {error}
                </div>
              )}

              <button className="pg-btn pg-btn-primary pg-btn-full" type="submit"
                disabled={loading || digits.join('').length < 6 || timeLeft === 0}
                style={{ padding:'13px', fontSize:15 }}>
                {loading ? <><span className="pg-spinner" /> Verifying…</> : 'Verify and Submit Change'}
              </button>
            </form>

            <div style={{ textAlign:'center', marginTop:16, display:'flex', flexDirection:'column', gap:10 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>
                ⏱️ Code expires in <strong style={{ color: timeLeft < 60 ? 'var(--danger)' : 'var(--text)' }}>{formatTime(timeLeft)}</strong>
              </span>
              <div style={{ fontSize:13, color:'var(--muted)' }}>
                Didn't receive it?{' '}
                <Link to="/deposit/blocked" style={{ color:'var(--brand)' }}>Need another way?</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
