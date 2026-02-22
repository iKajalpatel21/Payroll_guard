import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';
import './AccountSettings.css';

const VERDICT_META = {
  LIKELY_FRAUD:   { color: '#ef4444', bg: '#ef444415', label: 'Likely Fraud',   icon: '🚨' },
  LIKELY_GENUINE: { color: '#22c55e', bg: '#22c55e15', label: 'Likely Genuine', icon: '✅' },
  UNCERTAIN:      { color: '#f59e0b', bg: '#f59e0b15', label: 'Uncertain',      icon: '⚠️' },
};

const AccountSettings = () => {
  const [tab, setTab] = useState('bank');
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Bank change form state
  const [bank, setBank] = useState({ accountNumber: '', routingNumber: '', bankName: '' });
  const [bankStep, setBankStep] = useState('form'); // form | otp | result
  const [changeRequestId, setChangeRequestId] = useState('');
  const [otp, setOtp] = useState('');
  const [bankResult, setBankResult] = useState(null);
  const [bankLoading, setBankLoading] = useState(false);

  // Address form state
  const [addr, setAddr] = useState({ street: '', city: '', state: '', zip: '', country: 'US' });
  const [addrMsg, setAddrMsg] = useState('');
  const [addrError, setAddrError] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);

  useEffect(() => {
    api.get('/me/profile').then(({ data }) => {
      setProfile(data.employee);
      if (data.employee.bankAccount) setBank(prev => ({ ...prev, ...data.employee.bankAccount }));
      if (data.employee.address)     setAddr(prev => ({ ...prev, ...data.employee.address }));
    });
  }, []);

  const loadActivity = async () => {
    setLoadingActivity(true);
    const { data } = await api.get('/me/activity');
    setActivity(data.timeline);
    setLoadingActivity(false);
  };

  useEffect(() => { if (tab === 'activity') loadActivity(); }, [tab]);

  // ── Bank change flow ─────────────────────────────────────────────────────────
  const submitBankChange = async (e) => {
    e.preventDefault();
    setBankLoading(true);
    setBankResult(null);
    try {
      const { data } = await api.post('/risk-check', { newBankDetails: bank });
      if (data.path === 'OTP_REQUIRED') {
        setChangeRequestId(data.changeRequestId);
        setBankStep('otp');
      } else if (data.path === 'PENDING_MULTI_APPROVAL') {
        setBankResult({ type: 'pending_approval', ...data });
        setBankStep('result');
      } else if (data.blocked || data.path === 'BLOCK') {
        setBankResult({ type: 'blocked', ...data });
        setBankStep('result');
      } else {
        setBankResult({ type: 'approved', ...data });
        setBankStep('result');
      }
    } catch (err) {
      const d = err.response?.data;
      setBankResult({ type: d?.blocked ? 'blocked' : 'error', message: d?.message || 'Something went wrong.', ...d });
      setBankStep('result');
    } finally {
      setBankLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setBankLoading(true);
    try {
      await api.post('/risk-check/verify-otp', { changeRequestId, otp });
      setBankResult({ type: 'approved', message: 'OTP verified. Bank details updated.' });
      setBankStep('result');
    } catch (err) {
      setBankResult({ type: 'error', message: err.response?.data?.message || 'Invalid OTP.' });
      setBankStep('result');
    } finally {
      setBankLoading(false);
    }
  };

  // ── Address change ────────────────────────────────────────────────────────────
  const submitAddress = async (e) => {
    e.preventDefault();
    setAddrLoading(true);
    setAddrMsg(''); setAddrError('');
    try {
      // Send through risk engine instead of direct PUT
      const { data } = await api.post('/risk-check', { changeType: 'ADDRESS', newAddress: addr });
      if (data.path === 'OTP_REQUIRED') {
         // Show error for now, or we could build OTP for address. Just generic message:
         setAddrMsg('OTP sent to your email. Please verify using the link or portal.');
      } else if (data.path === 'PENDING_MULTI_APPROVAL') {
         setAddrError('Address change locked pending manager review (unrecognized location).');
      } else if (data.blocked || data.path === 'BLOCK') {
         setAddrError('Address change blocked due to high security risk.');
      } else {
         setAddrMsg('✅ Address updated successfully. Confirmation email sent.');
      }
    } catch (err) {
      setAddrError(err.response?.data?.message || 'Failed to update address.');
    } finally {
      setAddrLoading(false);
      setTimeout(() => { setAddrMsg(''); setAddrError(''); }, 8000);
    }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h2>⚙️ My Account Settings</h2>
            <p>Update your bank details, address, and view your security activity</p>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="staff-tabs">
          <button className={tab === 'bank'     ? 'active' : ''} onClick={() => { setTab('bank'); setBankStep('form'); setBankResult(null); }}>🏦 Bank Account</button>
          <button className={tab === 'address'  ? 'active' : ''} onClick={() => setTab('address')}>📍 Address</button>
          <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>🔔 My Activity</button>
        </div>

        {/* ── BANK ACCOUNT TAB ─────────────────────────────────────────────────── */}
        {tab === 'bank' && (
          <div className="tab-panel">
            {profile?.bankAccount?.accountNumber && bankStep === 'form' && (
              <div className="card info-bar">
                <span>Current bank on file:</span>
                <code>****{profile.bankAccount.accountNumber.slice(-4)}</code>
                <span className="info-bank-name">{profile.bankAccount.bankName || ''}</span>
              </div>
            )}

            {bankStep === 'form' && (
              <form className="card settings-form" onSubmit={submitBankChange}>
                <h3>Change Direct Deposit Account</h3>
                <p className="form-hint">This will be risk-scored and may require OTP or manager approval. You'll receive a notification at your registered email.</p>
                <div className="form-group">
                  <label>Account Number</label>
                  <input type="text" placeholder="Account number" value={bank.accountNumber}
                    onChange={e => setBank({...bank, accountNumber: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Routing Number</label>
                  <input type="text" placeholder="9-digit routing number" value={bank.routingNumber}
                    onChange={e => setBank({...bank, routingNumber: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Bank Name <span style={{color:'#64748b'}}>(optional)</span></label>
                  <input type="text" placeholder="e.g. Chase, Bank of America" value={bank.bankName}
                    onChange={e => setBank({...bank, bankName: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary" disabled={bankLoading}>
                  {bankLoading ? '⏳ Analyzing…' : 'Submit Change Request'}
                </button>
              </form>
            )}

            {bankStep === 'otp' && (
              <form className="card settings-form" onSubmit={submitOtp}>
                <h3>🔐 Verification Required</h3>
                <p className="form-hint">A 6-digit code has been sent to your registered email. Enter it below to confirm your bank change.</p>
                <div className="form-group">
                  <label>Verification Code</label>
                  <input type="text" placeholder="Enter 6-digit OTP" value={otp}
                    onChange={e => setOtp(e.target.value)} maxLength={6} required />
                </div>
                <button type="submit" className="btn-primary" disabled={bankLoading}>
                  {bankLoading ? '⏳ Verifying…' : 'Verify & Update'}
                </button>
                <button type="button" className="btn-secondary" style={{marginTop:8}} onClick={() => { setBankStep('form'); setOtp(''); }}>← Back</button>
              </form>
            )}

            {bankStep === 'result' && bankResult && (
              <div className="card settings-form">
                {bankResult.type === 'approved' && (
                  <div className="result-box success">
                    <div className="result-icon">✅</div>
                    <h3>Change Approved</h3>
                    <p>{bankResult.message}</p>
                  </div>
                )}
                {bankResult.type === 'blocked' && (
                  <div className="result-box blocked">
                    <div className="result-icon">🚨</div>
                    <h3>Request Blocked</h3>
                    <p>{bankResult.aiMessage || bankResult.message}</p>
                    <p><small>Risk score: {bankResult.riskScore}/100 · AI verdict: {bankResult.verdict} ({bankResult.confidence}% confidence)</small></p>
                    <p style={{color:'#fca5a5',fontSize:13}}>The security team has been alerted. Check your registered email for details.</p>
                  </div>
                )}
                {bankResult.type === 'error' && (
                  <div className="result-box error">
                    <div className="result-icon">⚠️</div>
                    <h3>Update Failed</h3>
                    <p>{bankResult.aiMessage || bankResult.message}</p>
                    {bankResult.riskScore && <p><small>Risk score: {bankResult.riskScore}/100</small></p>}
                  </div>
                )}
                {bankResult.type === 'pending_approval' && (
                  <div className="result-box info" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155' }}>
                    <div className="result-icon">⏳</div>
                    <h3 style={{color: '#0f172a'}}>Awaiting Manager Approval</h3>
                    <p>{bankResult.message}</p>
                    <p><small style={{color:'#64748b'}}>Risk score: {bankResult.riskScore}/100</small></p>
                    <p style={{color:'#0f172a',fontSize:13,marginTop:8}}>We've notified your manager. The change will take effect once they approve it.</p>
                  </div>
                )}
                <button className="btn-secondary" style={{marginTop:16}} onClick={() => { setBankStep('form'); setBankResult(null); }}>Start New Request</button>
              </div>
            )}
          </div>
        )}

        {/* ── ADDRESS TAB ──────────────────────────────────────────────────────── */}
        {tab === 'address' && (
          <div className="tab-panel">
            {addrMsg   && <div className="alert-success">{addrMsg}</div>}
            {addrError && <div className="alert-error">⚠️ {addrError}</div>}
            <form className="card settings-form" onSubmit={submitAddress}>
              <h3>Update Mailing Address</h3>
              <p className="form-hint">A confirmation email will be sent to your registered email when this is saved.</p>
              <div className="form-group">
                <label>Street Address</label>
                <input placeholder="123 Main St" value={addr.street}
                  onChange={e => setAddr({...addr, street: e.target.value})} required />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>City</label>
                  <input placeholder="New York" value={addr.city}
                    onChange={e => setAddr({...addr, city: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input placeholder="NY" value={addr.state} maxLength={2}
                    onChange={e => setAddr({...addr, state: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>ZIP Code</label>
                  <input placeholder="10001" value={addr.zip}
                    onChange={e => setAddr({...addr, zip: e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Country</label>
                <input placeholder="US" value={addr.country}
                  onChange={e => setAddr({...addr, country: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary" disabled={addrLoading}>
                {addrLoading ? '⏳ Saving…' : 'Save Address'}
              </button>
            </form>
          </div>
        )}

        {/* ── ACTIVITY TAB ─────────────────────────────────────────────────────── */}
        {tab === 'activity' && (
          <div className="tab-panel">
            <div className="tab-header">
              <h3>🔔 My Security Activity</h3>
              <button className="btn-secondary" onClick={loadActivity}>↻ Refresh</button>
            </div>
            {loadingActivity
              ? <div className="loading-text">Loading your activity…</div>
              : activity.length === 0
              ? <div className="card empty-state"><p>✅ No account activity yet.</p></div>
              : (
                <div className="activity-feed">
                  {activity.map((item, i) => {
                    const vm = item.verdict ? VERDICT_META[item.verdict] : null;
                    return (
                      <div key={i} className="activity-item">
                        <div className="activity-icon">{item.icon}</div>
                        <div className="activity-body">
                          <div className="activity-title">{item.title}</div>
                          <div className="activity-detail">{item.detail}</div>
                          <div className="activity-meta">
                            {item.ip && <span>🌐 {item.ip}</span>}
                            {item.riskScore !== undefined && (
                              <span style={{ color: item.riskScore > 70 ? '#ef4444' : item.riskScore > 30 ? '#f59e0b' : '#22c55e' }}>
                                Risk: {item.riskScore}/100
                              </span>
                            )}
                            {vm && (
                              <span className="verdict-chip" style={{ background: vm.bg, color: vm.color, border: `1px solid ${vm.color}44` }}>
                                {vm.icon} {vm.label} {item.confidence ? `· ${item.confidence}%` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="activity-time">{new Date(item.ts).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}
      </div>
    </>
  );
};

export default AccountSettings;
