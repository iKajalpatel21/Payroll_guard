import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [audit, setAudit] = useState(null);
  const [auditId, setAuditId] = useState('');
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/audit/stats').then(({ data }) => setStats(data));
  }, []);

  const fetchAudit = async (e) => {
    e.preventDefault();
    setError('');
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

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>⚡ Admin Command Center</h2>
          <p>Live security metrics and full audit trail for any employee.</p>
        </div>

        {/* Stats */}
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
              <h4>Timeline for Employee — {audit.count} events</h4>
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
