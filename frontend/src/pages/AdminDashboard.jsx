import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import SurgeSimulator from '../components/SurgeSimulator';
import ShieldLoader from '../components/ShieldLoader';
import api from '../api/axios';

const DECISION_COLOR = { ALLOW: 'var(--safe)', CHALLENGE: 'var(--caution)', BLOCK: 'var(--danger)', SIMULATED_ATTACK: 'var(--danger)' };
const RISK_ICON = s => s < 30 ? '🟢' : s < 70 ? '🟡' : '🔴';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalEvents: 0, highRiskEvents: 0, pendingRequests: 0, approvedToday: 0 });
  const [topRisk, setTopRisk] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [surgeActive, setSurgeActive] = useState(false);
  const [audit, setAudit] = useState(null);
  const [auditId, setAuditId] = useState('');
  const [auditing, setAuditing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const [certResult, setCertResult] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/audit/stats');
      setStats(data.stats);
      setTopRisk(data.topRisk || []);
    } catch { }
    setLoading(false);
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      // Use topRisk employees to pull recent events
      const { data } = await api.get('/audit/stats');
      setStats(data.stats);
      setTopRisk(data.topRisk || []);
    } catch { }
  }, []);

  useEffect(() => { fetchStats(); }, []);
  // Poll while surge is active
  useEffect(() => {
    if (!surgeActive) return;
    const t = setInterval(fetchRecent, 1200);
    return () => clearInterval(t);
  }, [surgeActive, fetchRecent]);

  function handleSurgeComplete(result) {
    setSurgeActive(false);
    fetchStats();
  }

  const statCards = [
    { num: stats.totalEvents, label: 'Total Events', color: 'var(--brand)' },
    { num: stats.highRiskEvents, label: 'High Risk', color: 'var(--danger)' },
    { num: stats.pendingRequests, label: 'Pending Review', color: 'var(--caution)' },
    { num: stats.approvedToday, label: 'Approved Today', color: 'var(--safe)' },
  ];

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
    <div className="pg-page">
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
            <div className="pg-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
              <div className="pg-fade-in">
                <div style={{ marginBottom: 28 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Security Dashboard</h1>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>Live risk feed · PayrollGuard command center</p>
                </div>

                {/* Top Risk Employees */}
                {
                  stats?.topRisk?.length > 0 && (
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
                  )
                }

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
                          {/* Stat cards */}
                          <div className="pg-grid-4" style={{ marginBottom: 28 }}>
                            {statCards.map(s => (
                              <div key={s.label} className="pg-stat-card">
                                <div className="pg-stat-num" style={{ color: s.color }}>
                                  {loading ? '—' : s.num}
                                </div>
                                <div className="pg-stat-label">{s.label}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                            {/* Top risk employees */}
                            <div className="pg-card">
                              <div className="pg-card-title">Top Risk Employees</div>
                              {loading ? (
                                <div style={{ textAlign: 'center', padding: 24 }}><span className="pg-spinner" /></div>
                              ) : topRisk.length === 0 ? (
                                <div style={{ color: 'var(--muted)', fontSize: 14 }}>No data yet</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  {topRisk.map((e, i) => {
                                    const avg = Math.round(e.avgScore);
                                    const color = avg < 30 ? 'var(--safe)' : avg < 70 ? 'var(--caution)' : 'var(--danger)';
                                    return (
                                      <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                        <div>
                                          <div style={{ fontWeight: 600 }}>{e.employee?.name || 'Unknown'}</div>
                                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>{e.eventCount} events</div>
                                        </div>
                                        <span style={{ fontWeight: 800, color, fontSize: 16 }}>{avg}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Risk distribution */}
                            <div className="pg-card">
                              <div className="pg-card-title">Risk Distribution</div>
                              {loading ? (
                                <div style={{ textAlign: 'center', padding: 24 }}><span className="pg-spinner" /></div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                  {[
                                    { label: 'Low (0–29)', color: 'var(--safe)', count: Math.max(0, stats.totalEvents - stats.highRiskEvents - Math.round(stats.totalEvents * 0.15)) },
                                    { label: 'Medium (30–69)', color: 'var(--caution)', count: Math.round(stats.totalEvents * 0.15) },
                                    { label: 'High (70–100)', color: 'var(--danger)', count: stats.highRiskEvents },
                                  ].map(row => {
                                    const pct = stats.totalEvents > 0 ? Math.round((row.count / stats.totalEvents) * 100) : 0;
                                    return (
                                      <div key={row.label}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                                          <span>{row.label}</span><span>{row.count} events</span>
                                        </div>
                                        <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                                          <div style={{ height: '100%', width: `${pct}%`, background: row.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Attack Simulation */}
                          <div className="pg-card" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                              <div>
                                <div className="pg-card-title" style={{ color: 'var(--caution)', marginBottom: 4 }}>⚡ Attack Simulation</div>
                                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                                  Simulate a coordinated attack wave to test detection. Stats update automatically.
                                </p>
                              </div>
                              {surgeActive && <span className="pg-badge badge-danger">● Live</span>}
                            </div>
                            <SurgeSimulator onSurgeComplete={handleSurgeComplete} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
