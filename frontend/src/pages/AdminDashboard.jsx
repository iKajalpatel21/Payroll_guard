import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import SurgeSimulator from '../components/SurgeSimulator';
import ShieldLoader from '../components/ShieldLoader';
import api from '../api/axios';

const DECISION_COLOR = { ALLOW: 'var(--safe)', CHALLENGE: 'var(--caution)', BLOCK: 'var(--danger)', SIMULATED_ATTACK: 'var(--danger)' };

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalEvents: 0, highRiskEvents: 0, pendingRequests: 0, approvedToday: 0 });
  const [topRisk, setTopRisk] = useState([]);
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

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Poll while surge is active
  useEffect(() => {
    if (!surgeActive) return;
    const t = setInterval(fetchStats, 1200);
    return () => clearInterval(t);
  }, [surgeActive, fetchStats]);

  function handleSurgeComplete() {
    setSurgeActive(false);
    fetchStats();
  }

  const statCards = [
    { num: stats.totalEvents, label: 'Total Events', color: 'var(--brand)' },
    { num: stats.highRiskEvents, label: 'High Risk', color: 'var(--danger)' },
    { num: stats.pendingRequests, label: 'Pending Review', color: 'var(--caution)' },
    { num: stats.approvedToday, label: 'Approved Today', color: 'var(--safe)' },
  ];

  const fetchAudit = async (e) => {
    e.preventDefault();
    if (!auditId) return;
    setError('');
    setAuditing(true);
    setAudit(null);
    setCertResult(null);
    try {
      const { data } = await api.get(`/audit/${auditId}`);
      if (data.success) {
        setAudit(data);
      } else {
        setError(data.message || 'Failed to fetch audit trail.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error fetching audit trail.');
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
    setSurgeActive(true);
    try {
      const { data } = await api.post('/audit/simulate-surge', { intensity: 50 });
      setSuccessMsg(data.message);
      fetchStats(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Simulation failed.');
      setSurgeActive(false);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div className="pg-fade-in">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>⚡ Admin Command Center</h1>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>Live risk feed &bull; PayrollGuard Security Status</p>
            </div>
            <button onClick={handleSurge} disabled={simulating || surgeActive} className="pg-btn pg-btn-primary" style={{ background: 'var(--danger)', color: 'white', border: 'none' }}>
              {simulating ? 'Simulating...' : '☢️ Simulate Attack Surge'}
            </button>
          </div>

          {successMsg && <div className="alert-success" style={{marginBottom: 24}}>✅ {successMsg}</div>}
          {error && <div className="alert-error" style={{marginBottom: 24}}>⚠️ {error}</div>}

          {/* Stat cards */}
          <div className="pg-grid-4" style={{ marginBottom: 28 }}>
            {statCards.map(s => (
              <div key={s.label} className="pg-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ color: s.color, fontSize: 32, fontWeight: 800 }}>
                  {loading ? <div style={{transform: 'scale(0.5)', background: 'transparent'}}><ShieldLoader /></div> : s.num}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, marginBottom: 28 }}>
            
            {/* Risk Explanation & distribution */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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

              {/* Top risk employees */}
              <div className="pg-card">
                <div className="pg-card-title">Top Risk Employees</div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 24 }}><span className="pg-spinner" /></div>
                ) : topRisk.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 14 }}>No data yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {topRisk.map((e) => {
                      const avg = Math.round(e.avgScore);
                      const color = avg < 30 ? 'var(--safe)' : avg < 70 ? 'var(--caution)' : 'var(--danger)';
                      return (
                        <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{e.employee?.name || 'Unknown'}</div>
                            <div style={{ color: 'var(--muted)', fontSize: 12 }}>{e.employee?.email} &bull; {e.eventCount} events</div>
                          </div>
                          <span style={{ fontWeight: 800, color, fontSize: 16 }}>{avg}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Understanding the Risk Engine & Simulator */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="pg-card">
                <div className="pg-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>ℹ️</span> Understanding the Risk Engine
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)', fontSize: 14 }}>Risk Score Tiers (0-100)</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div><strong style={{ color: 'var(--safe)' }}>Low Risk (0-30):</strong> Standard, safe behavior. Auto-approved.</div>
                      <div><strong style={{ color: 'var(--caution)' }}>Medium Risk (31-70):</strong> Unusual activity. Triggers OTP verify.</div>
                      <div><strong style={{ color: 'var(--danger)' }}>High Risk (71-100):</strong> Extreme anomalies. Instantly blocked.</div>
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scoring Parameters</div>
                    <ul style={{ fontSize: 13, color: 'var(--muted)', margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <li><strong>Unknown IP:</strong> +30 pts <span style={{ opacity: 0.6 }}>(ERR_LOC_NEW)</span></li>
                      <li><strong>Unknown Device:</strong> +30 pts <span style={{ opacity: 0.6 }}>(ERR_DEV_NOVEL)</span></li>
                      <li><strong>High Velocity:</strong> +40 pts <span style={{ opacity: 0.6 }}>(≥5 attempts/10m)</span></li>
                      <li><strong>Recent Password Reset:</strong> +40 pts <span style={{ opacity: 0.6 }}>(within 24h)</span></li>
                      <li><strong>Historical Risk:</strong> +10 pts <span style={{ opacity: 0.6 }}>(Recent &gt; 60 score)</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Attack Simulation Details */}
              <div className="pg-card" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <div className="pg-card-title" style={{ color: 'var(--caution)', marginBottom: 4 }}>⚡ Active Simulation Module</div>
                    <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Simulate a coordinated attack wave to test detection capabilities.
                    </p>
                  </div>
                  {surgeActive && <span className="pg-badge" style={{ background: 'var(--danger)', color: 'white' }}>● Live</span>}
                </div>
                <SurgeSimulator onSurgeComplete={handleSurgeComplete} isActive={surgeActive} />
              </div>
            </div>
            
          </div>

          {/* Audit Trail Lookup */}
          <div className="pg-card">
            <h3 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>🔍 Audit Trail Lookup</h3>
            <form onSubmit={fetchAudit} style={{ display: 'flex', gap: 12 }}>
              <input
                className="pg-input"
                style={{ flex: 1 }}
                placeholder="Enter Employee ID (MongoDB ObjectId)"
                value={auditId}
                onChange={(e) => setAuditId(e.target.value)}
                required
              />
              <button type="submit" className="pg-btn pg-btn-primary" disabled={auditing} style={{ minWidth: 120 }}>
                {auditing ? 'Loading…' : 'Fetch Audit'}
              </button>
            </form>

            {audit && (
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ margin: 0, fontSize: 16 }}>Timeline for Employee &mdash; {audit.count} events</h4>
                  <button onClick={verifyAuditChain} disabled={certifying} className="pg-btn" style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    {certifying ? 'Verifying...' : '🛡️ Verify Hash Chain'}
                  </button>
                </div>

                {certResult && (
                  <div style={{
                    background: certResult.isIntact ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${certResult.isIntact ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    padding: 16, borderRadius: 8, marginBottom: 20, color: certResult.isIntact ? '#86efac' : '#fca5a5'
                  }}>
                    <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>
                      {certResult.isIntact ? '✅ Chain Integrity Verified' : '❌ Tampering Detected'}
                    </div>
                    <div style={{ fontSize: 14 }}>{certResult.message}</div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {audit.timeline.map((event, i) => (
                    <div key={i} style={{ 
                      background: 'var(--surface)', padding: 16, borderRadius: 8, border: '1px solid var(--border)',
                      borderLeft: `4px solid ${event._type === 'RISK_EVENT' ? '#0ea5e9' : '#8b5cf6'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, color: event._type === 'RISK_EVENT' ? '#38bdf8' : '#a78bfa' }}>
                          {event._type === 'RISK_EVENT' ? '⚠️ Risk Event' : '📋 Change Request'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {new Date(event.createdAt).toLocaleString()}
                        </div>
                      </div>
                      
                      <div style={{ fontSize: 14, color: 'var(--text)' }}>
                        {event._type === 'RISK_EVENT' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div>Score: <strong style={{ color: event.riskScore > 70 ? 'var(--danger)' : event.riskScore > 30 ? 'var(--caution)' : 'var(--safe)' }}>{event.riskScore}</strong></div>
                            <div style={{ color: 'var(--muted)' }}>Action: <span style={{color: 'var(--text)'}}>{event.action}</span> | IP: {event.ip} | Device: {event.deviceId}</div>
                            {event.riskCodes && event.riskCodes.length > 0 && <div>Codes: {event.riskCodes.join(', ')}</div>}
                            {event.aiExplanation && (
                              <div style={{ background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8, marginTop: 8, display: 'flex', gap: 8, fontSize: 13 }}>
                                <span>🤖</span>
                                <span style={{ color: 'var(--text)' }}>{event.aiExplanation}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {event._type === 'CHANGE_REQUEST' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div>Status: <strong>{event.status}</strong></div>
                            <div>New Account: {event.newBankDetails?.accountNumber}</div>
                            {event.reviewedBy && <div>Reviewed by: {event.reviewedBy?.name} &mdash; "{event.reviewNote}"</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
