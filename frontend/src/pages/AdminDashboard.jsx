import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditId, setAuditId] = useState('');
  const [auditing, setAuditing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [certResult, setCertResult] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchStats = () => {
    api.get('/audit/stats').then(({ data }) => setStats(data));
  };
  useEffect(() => fetchStats(), []);

  const fetchAudit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setCertResult(null);
    setAuditing(true);
    try {
      const { data } = await api.get(`/audit/${auditId}`);
      setAudit(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audit trail.');
    } finally {
      setAuditing(false);
    }
  };

  const verifyAuditChain = async () => {
    if (!auditId) return;
    setError('');
    setSuccessMsg('');
    setCertifying(true);
    try {
      const { data } = await api.post('/audit/verify', { employeeId: auditId });
      setCertResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setCertifying(false);
    }
  };

  const handleSurge = async () => {
    if (!window.confirm("This will inject simulated attack data into the system. Continue?")) return;
    setError('');
    setSuccessMsg('');
    setSimulating(true);
    try {
      const { data } = await api.post('/alerts/simulate-surge', { count: 50 });
      setSuccessMsg(data.message);
      fetchStats(); // Refresh dashboard
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>⚡ Admin Command Center</h2>
          <p>Live security metrics and full audit trail for any employee.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, color: '#f1f5f9' }}>System Overview</h3>
          <button onClick={handleSurge} disabled={simulating} style={{
            background: simulating ? '#475569' : '#ef4444',
            color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: simulating ? 'not-allowed' : 'pointer', fontWeight: 'bold'
          }}>
            {simulating ? 'Simulating...' : '☢️ Simulate Attack Surge'}
          </button>
        </div>

        {/* Risk Event Explanation */}
        <div className="card" style={{ marginBottom: '24px', background: 'rgba(56, 189, 248, 0.05)', borderLeft: '4px solid #38bdf8' }}>
          <h4 style={{ marginTop: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span> Understanding the Risk Engine
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h5 style={{ marginTop: 0, marginBottom: '8px', color: '#cbd5e1' }}>Risk Score Tiers (0-100)</h5>
              <ul style={{ fontSize: '14px', color: '#94a3b8', margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#22c55e' }}>Low Risk (0-30):</strong> Standard, safe behavior. Auto-approved.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#f59e0b' }}>Medium Risk (31-70):</strong> Unusual activity. Triggers OTP verification.</li>
                <li><strong style={{ color: '#ef4444' }}>High Risk (71-100):</strong> Extreme anomalies. <b>Instantly blocked</b> & escalated for review.</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(51, 65, 85, 0.5)' }}>
              <h5 style={{ marginTop: 0, marginBottom: '8px', color: '#cbd5e1', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scoring Parameters</h5>
              <ul style={{ fontSize: '13px', color: '#94a3b8', margin: 0, paddingLeft: '16px', listStyleType: 'square' }}>
                <li style={{ marginBottom: '4px' }}><strong>Unknown IP:</strong> +30 pts <span style={{ opacity: 0.6 }}>(ERR_LOC_NEW)</span></li>
                <li style={{ marginBottom: '4px' }}><strong>Unknown Device:</strong> +30 pts <span style={{ opacity: 0.6 }}>(ERR_DEV_NOVEL)</span></li>
                <li style={{ marginBottom: '4px' }}><strong>High Velocity:</strong> +40 pts <span style={{ opacity: 0.6 }}>(≥5 attempts/10m)</span></li>
                <li style={{ marginBottom: '4px' }}><strong>Recent Password Reset:</strong> +40 pts <span style={{ opacity: 0.6 }}>(within 24h)</span></li>
                <li><strong>Historical Risk:</strong> +10 pts <span style={{ opacity: 0.6 }}>(Recent history &gt; 60 score)</span></li>
              </ul>
            </div>
          </div>
        </div>

        {successMsg && <div className="alert-success">✅ {successMsg}</div>}
        {error && <div className="alert-error" style={{ marginBottom: '20px' }}>⚠️ {error}</div>}

        {stats && (
          <div className="stats-grid">
            <div className="stat-card blue">
              <span className="stat-num">{stats.stats.totalEvents}</span>
              <span className="stat-lbl">Total Risk Events</span>
            </div>
            <div className="stat-card red">
              <span className="stat-num">{stats.stats.highRiskEvents}</span>
              <span className="stat-lbl">High-Risk Events</span>
            </div>
            <div className="stat-card amber">
              <span className="stat-num">{stats.stats.pendingRequests}</span>
              <span className="stat-lbl">Pending Manager Review</span>
            </div>
            <div className="stat-card green">
              <span className="stat-num">{stats.stats.approvedToday}</span>
              <span className="stat-lbl">Approved Today</span>
            </div>
          </div>
        )}

        {/* Top Risk Employees */}
        {stats?.topRisk?.length > 0 && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h3>🔥 Top Risk Employees</h3>
            <table className="risk-table">
              <thead>
                <tr><th>Employee</th><th>Email</th><th>Avg Score</th><th>Events</th></tr>
              </thead>
              <tbody>
                {stats.topRisk.map((r) => (
                  <tr key={r._id}>
                    <td>{r.employee?.name}</td>
                    <td>{r.employee?.email}</td>
                    <td>
                      <span className="risk-chip" style={{ background: '#ef444422', color: '#ef4444', borderColor: '#ef444444' }}>
                        {r.avgScore?.toFixed(1)}
                      </span>
                    </td>
                    <td>{r.eventCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit Trail Lookup */}
        <div className="card" style={{ marginTop: '24px' }}>
          <h3>🔍 Audit Trail Lookup</h3>
          <form onSubmit={fetchAudit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              className="audit-input"
              placeholder="Enter Employee ID (MongoDB ObjectId)"
              value={auditId}
              onChange={(e) => setAuditId(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={auditing} style={{ minWidth: '120px' }}>
              {auditing ? 'Loading…' : 'Fetch Audit'}
            </button>
          </form>
          {error && <div className="alert-error" style={{ marginTop: '12px' }}>⚠️ {error}</div>}

          {audit && (
            <div className="timeline" style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0 }}>Timeline for Employee — {audit.count} events</h4>
                <button onClick={verifyAuditChain} disabled={certifying} className="btn-secondary" style={{ marginTop: 0 }}>
                  {certifying ? 'Verifying...' : '🛡️ Verify Hash Chain'}
                </button>
              </div>

              {certResult && (
                <div style={{
                  background: certResult.isIntact ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${certResult.isIntact ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  padding: '16px', borderRadius: '8px', marginBottom: '20px', color: certResult.isIntact ? '#86efac' : '#fca5a5'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>
                    {certResult.isIntact ? '✅ Chain Integrity Verified' : '❌ Tampering Detected'}
                  </div>
                  <div style={{ fontSize: '14px' }}>{certResult.message}</div>
                </div>
              )}

              {audit.timeline.map((event, i) => (
                <div className="timeline-item" key={i}>
                  <div className="timeline-dot" style={{ background: event._type === 'RISK_EVENT' ? '#38bdf8' : '#a78bfa' }} />
                  <div className="timeline-content">
                    <div className="timeline-type">{event._type === 'RISK_EVENT' ? '⚠️ Risk Event' : '📋 Change Request'}</div>
                    {event._type === 'RISK_EVENT' && (
                      <>
                        <div>Score: <strong style={{ color: event.riskScore > 70 ? '#ef4444' : event.riskScore > 30 ? '#f59e0b' : '#22c55e' }}>{event.riskScore}</strong></div>
                        <div>Action: {event.action} | IP: {event.ip} | Device: {event.deviceId}</div>
                        <div>Codes: {event.riskCodes?.join(', ')}</div>
                        {event.aiExplanation && <div className="ai-explanation sm"><span className="ai-icon">🤖</span><p>{event.aiExplanation}</p></div>}
                      </>
                    )}
                    {event._type === 'CHANGE_REQUEST' && (
                      <>
                        <div>Status: <strong>{event.status}</strong></div>
                        <div>New Account: {event.newBankDetails?.accountNumber}</div>
                        {event.reviewedBy && <div>Reviewed by: {event.reviewedBy?.name} — "{event.reviewNote}"</div>}
                      </>
                    )}
                    <div className="timeline-time">{new Date(event.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
