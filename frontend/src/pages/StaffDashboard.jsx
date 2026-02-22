import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';
import './StaffDashboard.css';

const SEVERITY_META = {
  CRITICAL: { color: '#ef4444', bg: '#ef444418', icon: '🚨' },
  WARNING:  { color: '#f59e0b', bg: '#f59e0b18', icon: '⚠️' },
  INFO:     { color: '#38bdf8', bg: '#38bdf818', icon: 'ℹ️' },
};
const STATUS_COLOR = { OPEN: '#ef4444', INVESTIGATING: '#f59e0b', RESOLVED: '#22c55e', CLOSED: '#64748b' };

const StaffDashboard = () => {
  const [tab, setTab] = useState('alerts');
  // Alerts
  const [alerts, setAlerts]           = useState([]);
  const [unread, setUnread]           = useState(0);
  // Cases
  const [cases, setCases]             = useState([]);
  const [caseStats, setCaseStats]     = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [aiAnalysis, setAiAnalysis]   = useState('');
  const [analyzing, setAnalyzing]     = useState(false);
  // Multi-party Approvals
  const [multiApprovals, setMultiApprovals] = useState([]);
  // New case form
  const [newCase, setNewCase] = useState({ employeeId: '', type: 'OTHER', severity: 'MEDIUM', title: '', description: '' });
  const [showCaseForm, setShowCaseForm] = useState(false);
  // Account actions
  const [searchQ, setSearchQ]         = useState('');
  const [employees, setEmployees]     = useState([]);
  const [actionMsg, setActionMsg]     = useState('');
  const [actionError, setActionError] = useState('');
  // Reset bank form
  const [resetForm, setResetForm]     = useState({ employeeId: '', accountNumber: '', routingNumber: '', bankName: '' });
  const [showResetForm, setShowResetForm] = useState(false);

  const flash = (msg, isError = false) => {
    isError ? setActionError(msg) : setActionMsg(msg);
    setTimeout(() => { setActionMsg(''); setActionError(''); }, 4000);
  };

  const fetchAlerts = useCallback(async () => {
    const { data } = await api.get('/alerts');
    setAlerts(data.alerts);
    setUnread(data.alerts.filter(a => !a.isRead).length);
  }, []);

  const fetchCases = useCallback(async () => {
    const [casesRes, statsRes] = await Promise.all([
      api.get('/cases'),
      api.get('/cases/stats'),
    ]);
    setCases(casesRes.data.cases);
    setCaseStats(statsRes.data.stats);
  }, []);

  const fetchApprovals = useCallback(async () => {
    try {
      const { data } = await api.get('/approvals');
      setMultiApprovals(data.requests || []);
    } catch { setMultiApprovals([]); }
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchCases();
    fetchApprovals();
    // Poll alerts every 30 seconds
    const interval = setInterval(() => { fetchAlerts(); fetchApprovals(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchCases, fetchApprovals]);

  // ── Alert actions ────────────────────────────────────────────────────────────
  const markRead = async (id) => {
    await api.put(`/alerts/${id}/read`);
    fetchAlerts();
  };
  const markAllRead = async () => {
    await api.put('/alerts/read-all');
    fetchAlerts();
  };

  // ── Case actions ──────────────────────────────────────────────────────────────
  const openCase = async (e) => {
    e.preventDefault();
    await api.post('/cases', newCase);
    setShowCaseForm(false);
    setNewCase({ employeeId: '', type: 'OTHER', severity: 'MEDIUM', title: '', description: '' });
    fetchCases();
  };
  const updateCase = async (id, update) => {
    await api.put(`/cases/${id}`, update);
    fetchCases();
    if (selectedCase?._id === id) setSelectedCase(prev => ({ ...prev, ...update }));
  };
  const runAnalysis = async (id) => {
    setAnalyzing(true);
    setAiAnalysis('');
    try {
      const { data } = await api.get(`/cases/${id}/analyze`);
      setAiAnalysis(data.analysis);
    } catch { setAiAnalysis('Analysis failed. Check your Gemini API key.'); }
    finally { setAnalyzing(false); }
  };

  // ── Recovery actions ──────────────────────────────────────────────────────────
  const searchEmployees = async () => {
    const { data } = await api.get('/recovery/employees', { params: { q: searchQ } });
    setEmployees(data.employees);
  };
  const freeze = async (id, name) => {
    await api.post(`/recovery/freeze/${id}`, { reason: 'Frozen by security staff via dashboard.' });
    flash(`🔒 ${name}'s account frozen.`);
    searchEmployees();
  };
  const unfreeze = async (id, name) => {
    await api.post(`/recovery/unfreeze/${id}`);
    flash(`🔓 ${name}'s account unfrozen.`);
    searchEmployees();
  };
  const resetBank = async (e) => {
    e.preventDefault();
    await api.post(`/recovery/reset-bank/${resetForm.employeeId}`, resetForm);
    flash('🏦 Bank details reset and trust lists cleared.');
    setShowResetForm(false);
    setResetForm({ employeeId: '', accountNumber: '', routingNumber: '', bankName: '' });
  };
  const actionMulti = async (id, type) => {
    try {
      await api.post(`/approvals/${id}/${type}`);
      flash(`Location-based request ${type}d.`);
      fetchApprovals();
    } catch (err) {
      flash(err.response?.data?.message || `Failed to ${type}`, true);
    }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h2>🚨 Security Staff Command Center</h2>
            <p>Live alerts · Fraud case management · Account recovery</p>
          </div>
          {caseStats && (
            <div className="staff-mini-stats">
              <span className="mini-stat red">{caseStats.open} Open</span>
              <span className="mini-stat amber">{caseStats.investigating} Investigating</span>
              <span className="mini-stat green">{caseStats.resolved} Resolved</span>
              <span className="mini-stat red-critical">{caseStats.critical} Critical</span>
            </div>
          )}
        </div>

        {/* Tab Nav */}
        <div className="staff-tabs">
          <button className={tab === 'alerts' ? 'active' : ''} onClick={() => setTab('alerts')}>
            🔔 Live Alerts {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          <button className={tab === 'cases' ? 'active' : ''} onClick={() => setTab('cases')}>
            📂 Fraud Cases
          </button>
          <button className={tab === 'recovery' ? 'active' : ''} onClick={() => setTab('recovery')}>
            🛠️ Account Recovery
          </button>
        </div>

        {/* ── ALERTS TAB ───────────────────────────────────────────────────────── */}
        {tab === 'alerts' && (
          <div className="tab-panel">
            <div className="tab-header">
              <h3>Live Alert Feed <span className="refresh-hint">(auto-refreshes every 30s)</span></h3>
              {unread > 0 && <button className="btn-secondary" onClick={markAllRead}>✓ Mark all read</button>}
            </div>
            {alerts.length === 0
              ? <div className="card empty-state"><p>✅ No alerts. System is clean.</p></div>
              : alerts.map(alert => {
                  const meta = SEVERITY_META[alert.severity] || SEVERITY_META.INFO;
                  return (
                    <div key={alert._id} className={`alert-card ${!alert.isRead ? 'unread' : ''}`}
                         style={{ '--sev-color': meta.color, '--sev-bg': meta.bg }}>
                      <div className="alert-left">
                        <span className="alert-icon">{meta.icon}</span>
                        <div>
                          <div className="alert-type">{alert.type.replace(/_/g, ' ')}</div>
                          <div className="alert-msg">{alert.message}</div>
                          {alert.employeeId && (
                            <div className="alert-emp">👤 {alert.employeeId.name} · {alert.employeeId.email}</div>
                          )}
                          <div className="alert-time">{new Date(alert.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      {!alert.isRead && (
                        <button className="btn-ack" onClick={() => markRead(alert._id)}>Ack</button>
                      )}
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* ── FRAUD CASES TAB ──────────────────────────────────────────────────── */}
        {tab === 'cases' && (
          <div className="tab-panel">
            <div className="tab-header">
              <h3>Fraud Case Manager</h3>
              <button className="btn-primary" style={{ padding: '10px 18px' }} onClick={() => setShowCaseForm(!showCaseForm)}>
                {showCaseForm ? '✕ Cancel' : '+ Open New Case'}
              </button>
            </div>

            {showCaseForm && (
              <form className="card case-form" onSubmit={openCase}>
                <h4>New Fraud Case</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input placeholder="MongoDB ObjectId" value={newCase.employeeId}
                      onChange={e => setNewCase({...newCase, employeeId: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Case Type</label>
                    <select value={newCase.type} onChange={e => setNewCase({...newCase, type: e.target.value})}>
                      {['ACCOUNT_TAKEOVER','CREDENTIAL_STUFFING','INSIDER_THREAT','PHISHING','PAYROLL_FRAUD','OTHER'].map(t =>
                        <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Severity</label>
                    <select value={newCase.severity} onChange={e => setNewCase({...newCase, severity: e.target.value})}>
                      {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input placeholder="Brief case title" value={newCase.title}
                    onChange={e => setNewCase({...newCase, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea rows={3} placeholder="Describe the suspicious activity…" value={newCase.description}
                    onChange={e => setNewCase({...newCase, description: e.target.value})} />
                </div>
                <button type="submit" className="btn-primary">Open Case</button>
              </form>
            )}

            <div className="case-list">
              {cases.length === 0
                ? <div className="card empty-state"><p>📭 No fraud cases. All clear!</p></div>
                : cases.map(c => (
                  <div key={c._id} className="case-card" onClick={() => setSelectedCase(selectedCase?._id === c._id ? null : c)}>
                    <div className="case-header">
                      <div>
                        <span className="severity-dot" style={{ background: STATUS_COLOR[c.status] || '#64748b' }} />
                        <strong>{c.title}</strong>
                        <span className="case-type">{c.type.replace(/_/g,' ')}</span>
                      </div>
                      <div className="case-meta-right">
                        <span className="risk-chip" style={{ background: `${STATUS_COLOR[c.status]}22`, color: STATUS_COLOR[c.status], borderColor: `${STATUS_COLOR[c.status]}55` }}>
                          {c.status}
                        </span>
                        <span className="sev-badge" style={{ color: c.severity === 'CRITICAL' ? '#ef4444' : c.severity === 'HIGH' ? '#f59e0b' : '#94a3b8' }}>
                          {c.severity}
                        </span>
                      </div>
                    </div>
                    <div className="case-employee">👤 {c.employeeId?.name} · {c.employeeId?.email}</div>
                    <div className="case-time">{new Date(c.createdAt).toLocaleString()} · Assigned: {c.assignedTo?.name || 'Unassigned'}</div>

                    {selectedCase?._id === c._id && (
                      <div className="case-detail" onClick={e => e.stopPropagation()}>
                        <p className="case-desc">{c.description || 'No description.'}</p>

                        <div className="case-actions-row">
                          <select defaultValue={c.status} onChange={e => updateCase(c._id, { status: e.target.value, note: `Status changed to ${e.target.value}` })}>
                            {['OPEN','INVESTIGATING','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button className="btn-ai-analyze" onClick={() => runAnalysis(c._id)} disabled={analyzing}>
                            {analyzing ? '⏳ Analyzing…' : '🤖 AI Analyze'}
                          </button>
                        </div>

                        {aiAnalysis && (
                          <div className="ai-explanation" style={{ marginTop: 16 }}>
                            <span className="ai-icon">🤖 Gemini Fraud Analysis</span>
                            <pre className="ai-pre">{aiAnalysis}</pre>
                          </div>
                        )}

                        {c.timeline?.length > 0 && (
                          <div className="mini-timeline">
                            <h5>Timeline</h5>
                            {c.timeline.slice().reverse().map((t, i) => (
                              <div key={i} className="mini-tl-item">
                                <span className="mini-tl-action">{t.action}</span>
                                <span className="mini-tl-note">{t.note}</span>
                                <span className="mini-tl-time">{new Date(t.timestamp).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── ACCOUNT RECOVERY TAB ─────────────────────────────────────────────── */}
        {tab === 'recovery' && (
          <div className="tab-panel">
            {actionMsg   && <div className="alert-success">{actionMsg}</div>}
            {actionError && <div className="alert-error">⚠️ {actionError}</div>}

            {multiApprovals.length > 0 && (
              <div className="approval-section" style={{marginBottom: 32}}>
                <h3 style={{color: '#f59e0b', marginBottom: 16}}>🌍 Unrecognized Location Approvals ({multiApprovals.length})</h3>
                <div className="request-grid">
                  {multiApprovals.map(req => {
                    const geo = req.riskEventId?.geo;
                    const geoStr = geo ? `${geo.city}, ${geo.region}, ${geo.countryCode} (${geo.isp})` : 'Unknown Location';
                    return (
                      <div className="request-card" key={req._id} style={{borderColor: '#f59e0b44'}}>
                        <div className="request-header">
                          <div>
                            <strong>{req.employeeId?.name}</strong>
                            <span className="emp-email">{req.changeType === 'ADDRESS' ? '📍 Address Change' : '🏦 Bank Change'}</span>
                          </div>
                          <span className="risk-chip" style={{ background: '#f59e0b22', color: '#f59e0b', borderColor: '#f59e0b55' }}>
                            {req.riskScore}/100
                          </span>
                        </div>
                        
                        <div className="request-detail">
                          {req.changeType === 'ADDRESS' ? (
                            <>
                              <div className="detail-row"><span>New Address</span><span>{req.newAddress?.street}, {req.newAddress?.city}, {req.newAddress?.state}</span></div>
                            </>
                          ) : (
                            <>
                              <div className="detail-row"><span>New Account</span><code>{req.newBankDetails?.accountNumber}</code></div>
                              <div className="detail-row"><span>Routing</span><code>{req.newBankDetails?.routingNumber}</code></div>
                            </>
                          )}
                          <div className="detail-row" style={{color: '#ef4444'}}><span>Location</span><span>{geoStr}</span></div>
                        </div>

                        {req.riskEventId?.aiExplanation && (
                          <div className="ai-explanation sm">
                            <span className="ai-icon">{req.riskEventId?.geminiVerdict === 'LIKELY_GENUINE' ? '✅' : '⚠️'}</span>
                            <p>{req.riskEventId.aiExplanation}</p>
                          </div>
                        )}

                        <div className="request-actions">
                          <button className="btn-approve" onClick={() => actionMulti(req._id, 'approve')}>✓ Approve</button>
                          <button className="btn-deny" onClick={() => actionMulti(req._id, 'deny')}>✗ Deny</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="tab-header">
              <h3>Account Search & Actions</h3>
              <button className="btn-secondary" onClick={() => setShowResetForm(!showResetForm)}>
                {showResetForm ? '✕ Cancel' : '🏦 Reset Bank Details'}
              </button>
            </div>

            {/* Reset bank form */}
            {showResetForm && (
              <form className="card case-form" onSubmit={resetBank}>
                <h4>Reset Employee Bank Details</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input placeholder="MongoDB ObjectId" value={resetForm.employeeId}
                      onChange={e => setResetForm({...resetForm, employeeId: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>New Account Number</label>
                    <input placeholder="Verified safe account" value={resetForm.accountNumber}
                      onChange={e => setResetForm({...resetForm, accountNumber: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Routing Number</label>
                    <input placeholder="021000021" value={resetForm.routingNumber}
                      onChange={e => setResetForm({...resetForm, routingNumber: e.target.value})} required />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Reset & Clear Trust Lists</button>
              </form>
            )}

            {/* Employee search */}
            <div className="search-row">
              <input className="audit-input" placeholder="Search by name or email…" value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchEmployees()} />
              <button className="btn-primary" onClick={searchEmployees} style={{ padding: '11px 20px' }}>Search</button>
            </div>

            <div className="emp-grid">
              {employees.map(emp => (
                <div key={emp._id} className={`emp-card ${emp.isFrozen ? 'frozen' : ''}`}>
                  <div className="emp-header">
                    <div>
                      <strong>{emp.name}</strong>
                      <span className="emp-email">{emp.email}</span>
                      <span className="emp-role">{emp.role}</span>
                    </div>
                    {emp.isFrozen
                      ? <span className="frozen-badge">🔒 FROZEN</span>
                      : <span className="active-badge">✅ Active</span>}
                  </div>

                  {emp.isFrozen && (
                    <div className="freeze-reason">Reason: {emp.frozenReason}</div>
                  )}

                  <div className="risk-summary">
                    <div className="rs-item"><span>{emp.riskSummary?.eventCount || 0}</span><small>Risk Events</small></div>
                    <div className="rs-item high"><span>{emp.riskSummary?.highRiskCount || 0}</span><small>High Risk</small></div>
                    <div className="rs-item held"><span>{emp.riskSummary?.heldPayroll || 0}</span><small>Held Payrolls</small></div>
                  </div>

                  <div className="bank-info">
                    <small>Bank: {emp.bankAccount?.accountNumber ? `****${emp.bankAccount.accountNumber.slice(-4)}` : 'Not set'}</small>
                  </div>

                  <div className="emp-actions">
                    {emp.isFrozen
                      ? <button className="btn-approve" onClick={() => unfreeze(emp._id, emp.name)}>🔓 Unfreeze</button>
                      : <button className="btn-deny"    onClick={() => freeze(emp._id, emp.name)}>🔒 Freeze</button>}
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}
                      onClick={() => { setResetForm({...resetForm, employeeId: emp._id}); setShowResetForm(true); }}>
                      Reset Bank
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StaffDashboard;
