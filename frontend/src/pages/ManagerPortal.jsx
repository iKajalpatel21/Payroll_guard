import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import SignalBadge from '../components/SignalBadge';
import ShieldLoader from '../components/ShieldLoader';
import api from '../api/axios';

function ScoreBadge({ score }) {
  const color = score < 30 ? 'var(--safe)' : score < 70 ? 'var(--caution)' : 'var(--danger)';
  const bg    = score < 30 ? 'rgba(16,185,129,0.12)' : score < 70 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  return (
    <span style={{ background:bg, color, border:`1px solid ${color}33`, borderRadius:6, padding:'3px 10px', fontSize:13, fontWeight:700 }}>
      {score}
    </span>
  );
}

export default function ManagerPortal() {
  const [requests, setRequests] = useState([]);
  const [multiApprovals, setMultiApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState({});

  async function fetchRequests() {
    setLoading(true);
    try {
      const { data } = await api.get('/manager/requests');
      setRequests(data.requests || data.data || []);
    } catch { setRequests([]); }
    setLoading(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  async function act(id, action) {
    setActionLoading(p => ({ ...p, [id]: action }));
    try {
      await api.put(`/manager/requests/${id}/${action}`);
      setFeedback(p => ({ ...p, [id]: action }));
      setTimeout(() => fetchRequests(), 1000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Action failed.');
    }
    setActionLoading(p => ({ ...p, [id]: null }));
  }

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:40, paddingBottom:40 }}>
        <div className="pg-fade-in">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Manager Portal</h1>
              <p style={{ color:'var(--muted)', fontSize:14 }}>Review flagged deposit change requests</p>
            </div>
            <span className="pg-badge badge-caution">{requests.length} pending</span>
          </div>

          {loading ? (
            <ShieldLoader />
          ) : requests.length === 0 ? (
            <div className="pg-card" style={{ textAlign:'center', padding:60, color:'var(--muted)' }}>
              ✅ No pending reviews — all caught up!
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {requests.map(r => {
                const done = feedback[r._id];
                return (
                  <div key={r._id} className="pg-card"
                    style={{ border: `1px solid ${r.riskScore > 70 ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}` }}>
                    {/* Header row */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                          <span style={{ fontSize:15, fontWeight:700 }}>{r.employee?.name || 'Employee'}</span>
                          <ScoreBadge score={r.riskScore} />
                          {r.riskScore > 70 && <span className="pg-badge badge-danger">⚠️ HIGH RISK</span>}
                        </div>
                        <div style={{ fontSize:12, color:'var(--muted)' }}>
                          {r.employee?.email} · {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Bank change */}
                    <div style={{ fontSize:13, color:'var(--muted)', marginBottom:14 }}>
                      Changing to:{' '}
                      <strong style={{ color:'var(--text)' }}>
                        {r.newBankDetails?.bankName || 'Bank'} ****{String(r.newBankDetails?.accountNumber||'').slice(-4)}
                      </strong>
                    </div>

                    {/* Risk codes */}
                    {r.riskEvent?.riskCodes?.length > 0 && (
                      <div style={{ marginBottom:14 }}>
                        {r.riskEvent.riskCodes.map(c => <SignalBadge key={c} code={c} />)}
                      </div>
                    )}

                    {/* AI explanation */}
                    {r.riskEvent?.aiExplanation && (
                      <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:14 }}>
                        {r.riskEvent.aiExplanation}
                      </div>
                    )}

                    {/* Actions */}
                    {done ? (
                      <div style={{ padding:'10px 14px', borderRadius:8, fontSize:14, fontWeight:600,
                        background: done === 'approve' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: done === 'approve' ? 'var(--safe)' : 'var(--danger)',
                        border: `1px solid ${done === 'approve' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {done === 'approve' ? '✅ Approved' : '🚩 Denied'} — refreshing…
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:10 }}>
                        <button className="pg-btn pg-btn-success" style={{ flex:1 }}
                          onClick={() => act(r._id, 'approve')}
                          disabled={!!actionLoading[r._id]}>
                          {actionLoading[r._id] === 'approve' ? <><span className="pg-spinner" /> Approving…</> : '✅ Looks Fine — Approve'}
                        </button>
                        <button className="pg-btn pg-btn-danger" style={{ flex:1 }}
                          onClick={() => act(r._id, 'deny')}
                          disabled={!!actionLoading[r._id]}>
                          {actionLoading[r._id] === 'deny' ? <><span className="pg-spinner" /> Denying…</> : '🚩 Something\'s Off — Deny'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
