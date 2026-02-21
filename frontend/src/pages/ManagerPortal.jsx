import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const ManagerPortal = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/manager/requests');
      setRequests(data.requests);
    } catch {
      setRequests([]);
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
        ) : requests.length === 0 ? (
          <div className="card empty-state">
            <p>🎉 No pending requests. All clear!</p>
          </div>
        ) : (
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

                  <div className="request-meta">
                    <small>IP: {req.riskEventId?.ip} | Device: {req.riskEventId?.deviceId}</small>
                    <small>{new Date(req.createdAt).toLocaleString()}</small>
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
        )}
      </div>
    </>
  );
};

export default ManagerPortal;
