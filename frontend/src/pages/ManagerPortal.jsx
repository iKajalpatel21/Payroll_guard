import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const ManagerPortal = () => {
  const [requests, setRequests] = useState([]);
  const [multiApprovals, setMultiApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [{ data: reqData }, { data: appData }] = await Promise.all([
        api.get('/manager/requests'),
        api.get('/approvals')
      ]);
      setRequests(reqData.requests || []);
      setMultiApprovals(appData.requests || []);
    } catch {
      setRequests([]);
      setMultiApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const action = async (id, type, note) => {
    const endpoint = `/manager/requests/${id}/${type}`;
    await api.put(endpoint, { note });
    setActionMsg(`Request ${type}d successfully.`);
    fetchRequests();
    setTimeout(() => setActionMsg(''), 3000);
  };

  const actionMulti = async (id, type) => {
    await api.post(`/approvals/${id}/${type}`);
    setActionMsg(`Location-based request ${type}d.`);
    fetchRequests();
    setTimeout(() => setActionMsg(''), 3000);
  };

  const RISK_LABEL = (score) => {
    if (score < 30) return { label: 'LOW', color: '#22c55e' };
    if (score <= 70) return { label: 'MEDIUM', color: '#f59e0b' };
    return { label: 'HIGH', color: '#ef4444' };
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>🏛️ Manager Review Portal</h2>
          <p>Review high-risk payroll change requests flagged by the system.</p>
        </div>

        {actionMsg && <div className="alert-success">✅ {actionMsg}</div>}

        {loading ? (
          <div className="loading-text">Loading requests…</div>
        ) : requests.length === 0 && multiApprovals.length === 0 ? (
          <div className="card empty-state">
            <p>🎉 No pending requests. All clear!</p>
          </div>
        ) : (
          <div className="manager-sections">
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

            {requests.length > 0 && (
              <div className="approval-section">
                <h3 style={{color: '#f1f5f9', marginBottom: 16}}>⚠️ High-Risk Standard Approvals ({requests.length})</h3>
                <div className="request-grid">
                  {requests.map((req) => {
                    const risk = RISK_LABEL(req.riskScore);
                    return (
                      <div className="request-card" key={req._id}>
                        <div className="request-header">
                          <div>
                            <strong>{req.employeeId?.name}</strong>
                            <span className="emp-email">{req.employeeId?.email}</span>
                          </div>
                          <span className="risk-chip" style={{ background: `${risk.color}22`, color: risk.color, borderColor: `${risk.color}55` }}>
                            {risk.label} · {req.riskScore}
                          </span>
                        </div>

                        <div className="request-detail">
                          <div className="detail-row"><span>New Account</span><code>{req.newBankDetails?.accountNumber}</code></div>
                          <div className="detail-row"><span>Routing</span><code>{req.newBankDetails?.routingNumber}</code></div>
                          {req.newBankDetails?.bankName && (
                            <div className="detail-row"><span>Bank</span><span>{req.newBankDetails.bankName}</span></div>
                          )}
                        </div>

                        {req.riskEventId?.aiExplanation && (
                          <div className="ai-explanation sm">
                            <span className="ai-icon">🤖</span>
                            <p>{req.riskEventId.aiExplanation}</p>
                          </div>
                        )}

                        <div className="risk-codes">
                          {req.riskEventId?.riskCodes?.map((code) => (
                            <span key={code} className="code-chip">{code}</span>
                          ))}
                        </div>

                        <div className="request-actions">
                          <button className="btn-approve" onClick={() => action(req._id, 'approve', 'Manager approved.')}>
                            ✓ Approve
                          </button>
                          <button className="btn-deny" onClick={() => action(req._id, 'deny', 'Manager denied.')}>
                            ✗ Deny
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ManagerPortal;
