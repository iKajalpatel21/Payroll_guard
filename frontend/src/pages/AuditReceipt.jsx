import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SignalBadge from '../components/SignalBadge';
import HashVerifier from '../components/HashVerifier';
import api from '../api/axios';

const STATUS_COLORS = {
  APPROVED: 'var(--safe)',
  DENIED: 'var(--danger)',
  PENDING_MANAGER: 'var(--caution)',
  PENDING_OTP: 'var(--caution)',
};

export default function AuditReceipt() {
  const { changeId } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/audit/receipt/${changeId}`);
        setReceipt(data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load receipt.');
      } finally {
        setLoading(false);
      }
    })();
  }, [changeId]);

  if (loading) return (
    <div className="pg-page">
      <Navbar />
      <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}>
        <span className="pg-spinner" style={{ width:32, height:32, borderWidth:3 }} />
      </div>
    </div>
  );

  if (error) return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:60 }}>
        <div className="pg-card" style={{ maxWidth:480, margin:'0 auto', textAlign:'center', color:'var(--danger)' }}>
          {error}
        </div>
      </div>
    </div>
  );

  const scoreLabel = receipt.riskScore < 30 ? 'Low' : receipt.riskScore < 70 ? 'Medium' : 'High';
  const scoreColor = receipt.riskScore < 30 ? 'var(--safe)' : receipt.riskScore < 70 ? 'var(--caution)' : 'var(--danger)';

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:40, paddingBottom:60 }}>
        <div className="pg-fade-in" style={{ maxWidth:640, margin:'0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
              <div>
                <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>🛡️ Audit Receipt</h1>
                <code style={{ fontSize:12, color:'var(--muted)' }}>{receipt.receiptId}</code>
              </div>
              <span className="pg-badge badge-safe" style={{ fontSize:13 }}>✅ VERIFIED INTACT</span>
            </div>
            <div style={{ marginTop:12, fontSize:13, color:'var(--muted)' }}>
              Generated: {new Date(receipt.submittedAt).toLocaleString()}
            </div>
          </div>

          {/* Request details */}
          <div className="pg-card" style={{ marginBottom:20 }}>
            <div className="pg-card-title">Request Details</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:14 }}>
              {[
                ['Employee', `${receipt.employee?.name} (${receipt.employee?.email})`],
                ['Action', receipt.action],
                ['Outcome', <span style={{ color: STATUS_COLORS[receipt.outcome] || 'var(--text)', fontWeight:700 }}>{receipt.outcome}</span>],
                ['New Bank', receipt.newBankDetails?.bankName || 'N/A'],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                  <span style={{ color:'var(--muted)' }}>{k}</span>
                  <span style={{ fontWeight:500, textAlign:'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk assessment */}
          <div className="pg-card" style={{ marginBottom:20 }}>
            <div className="pg-card-title">Risk Assessment</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ color:'var(--muted)', fontSize:14 }}>Score</span>
              <span style={{ fontWeight:800, fontSize:20, color:scoreColor }}>{receipt.riskScore} — {scoreLabel}</span>
            </div>
            {receipt.signalsFired?.length > 0 && (
              <div>
                <span style={{ fontSize:12, color:'var(--muted)', marginBottom:8, display:'block' }}>Signals</span>
                <div style={{ display:'flex', flexWrap:'wrap' }}>
                  {receipt.signalsFired.map(c => <SignalBadge key={c} code={c} />)}
                </div>
              </div>
            )}
            {receipt.aiExplanation && (
              <p style={{ marginTop:14, fontSize:13, color:'var(--muted)', lineHeight:1.6, borderTop:'1px solid var(--border)', paddingTop:14 }}>
                {receipt.aiExplanation}
              </p>
            )}
          </div>

          {/* Verification chain */}
          <div className="pg-card" style={{ marginBottom:20 }}>
            <div className="pg-card-title">Verification Chain</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:13, color:'var(--muted)', marginBottom:16 }}>
              <div>Step 1: Deposit change request submitted</div>
              {receipt.outcome === 'APPROVED' && <div>Step 2: ✅ Identity verified</div>}
              {receipt.outcome === 'APPROVED' && <div>Step 3: Change committed to database</div>}
              {receipt.reviewedBy && <div>Step {receipt.outcome === 'APPROVED' ? 4 : 2}: Manager reviewed by {receipt.reviewedBy?.name}</div>}
            </div>
          </div>

          {/* Tamper evidence — THE DEMO MOMENT */}
          <div className="pg-card" style={{ marginBottom:24, border:'1px solid var(--brand)', borderRadius:12 }}>
            <div className="pg-card-title" style={{ color:'var(--brand)' }}>🔗 Tamper Evidence</div>
            <HashVerifier
              changeId={changeId}
              eventHash={receipt.eventHash}
              chainHash={receipt.chainHash}
            />
          </div>

          <Link to="/dashboard" className="pg-btn pg-btn-ghost">← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
