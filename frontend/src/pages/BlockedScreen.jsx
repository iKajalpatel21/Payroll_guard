import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SignalBadge from '../components/SignalBadge';
import { useDeposit } from '../context/DepositContext';
import { useAuth } from '../context/AuthContext';

export default function BlockedScreen() {
  const { depositState } = useDeposit();
  const { user } = useAuth();

  const receiptId = depositState.changeRequestId
    ? `PG-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${depositState.changeRequestId.slice(-4).toUpperCase()}`
    : 'PG-PENDING';

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:60, paddingBottom:40 }}>
        <div className="pg-fade-in" style={{ maxWidth:560, margin:'0 auto' }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🚨</div>
            <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>This Request Has Been Paused</h1>
            <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.6 }}>
              For your protection, this direct deposit change has been flagged for security review.
            </p>
          </div>

          {/* Reassurance */}
          <div style={{
            background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)',
            borderRadius:12, padding:16, marginBottom:24, textAlign:'center',
          }}>
            <strong style={{ color:'var(--safe)', fontSize:15 }}>
              ✅ Your current deposit account has NOT been changed.
            </strong>
          </div>

          {/* Why triggered */}
          {depositState.riskCodes?.length > 0 && (
            <div className="pg-card" style={{ marginBottom:24 }}>
              <div className="pg-card-title">What triggered this</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:0 }}>
                {depositState.riskCodes.map(c => <SignalBadge key={c} code={c} />)}
              </div>
              {depositState.aiExplanation && (
                <p style={{ marginTop:14, fontSize:13, color:'var(--muted)', lineHeight:1.6, borderTop:'1px solid var(--border)', paddingTop:14 }}>
                  {depositState.aiExplanation}
                </p>
              )}
            </div>
          )}

          {/* What happens next */}
          <div className="pg-card" style={{ marginBottom:24 }}>
            <div className="pg-card-title">What happens next</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:14 }}>
              {['Your manager has been notified','A security alert has been sent to HR','An audit record has been created'].map(s => (
                <div key={s} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                  <span style={{ color:'var(--safe)', marginTop:1 }}>✓</span>
                  <span style={{ color:'var(--muted)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recovery options */}
          <div className="pg-card" style={{ marginBottom:24 }}>
            <div className="pg-card-title">If this was you</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Link to="/manager" className="pg-btn pg-btn-ghost pg-btn-full">
                Request Manager Review
              </Link>
              <Link to="/dashboard" className="pg-btn pg-btn-ghost pg-btn-full">
                Return to Dashboard
              </Link>
              {depositState.changeRequestId && (
                <Link to={`/receipt/${depositState.changeRequestId}`} className="pg-btn pg-btn-ghost pg-btn-full">
                  View Audit Receipt
                </Link>
              )}
            </div>
          </div>

          <div style={{ textAlign:'center', fontSize:12, color:'var(--muted)' }}>
            Receipt ID: <code>{receiptId}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
