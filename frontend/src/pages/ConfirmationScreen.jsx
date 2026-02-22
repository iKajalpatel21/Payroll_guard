import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useDeposit } from '../context/DepositContext';

function mask(num) {
  if (!num) return '****';
  return '****' + String(num).slice(-4);
}

export default function ConfirmationScreen() {
  const { depositState } = useDeposit();
  const bank = depositState.newBankDetails;
  const score = depositState.riskScore;

  const verif = depositState.path === 'OTP_REQUIRED' ? 'Email OTP' : 'None required';
  const scoreLabel = score < 30 ? 'Low' : score < 70 ? 'Medium' : 'High';
  const scoreColor = score < 30 ? 'var(--safe)' : score < 70 ? 'var(--caution)' : 'var(--danger)';

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:60, paddingBottom:40 }}>
        <div className="pg-fade-in" style={{ maxWidth:520, margin:'0 auto' }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
            <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Direct Deposit Updated</h1>
            <p style={{ color:'var(--muted)', fontSize:14 }}>
              Your paycheck will be deposited to the new account on the next payroll cycle.
            </p>
          </div>

          {/* Bank details */}
          {bank && (
            <div className="pg-card" style={{ marginBottom:24, textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:700 }}>{bank.bankName || 'Bank'}</div>
              <div style={{ color:'var(--muted)', fontSize:14, marginTop:4 }}>
                Account {mask(bank.accountNumber)} · Routing ****{String(bank.routingNumber||'').slice(-4)}
              </div>
            </div>
          )}

          {/* Security summary */}
          <div className="pg-card" style={{ marginBottom:24 }}>
            <div className="pg-card-title">🛡️ Security Summary</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, fontSize:14 }}>
              {[
                ['Risk level assessed', <span style={{ color:scoreColor, fontWeight:700 }}>{scoreLabel}</span>],
                ['Verification method', verif],
                ['Session trust', 'Verified'],
                ['Manager approval', depositState.path === 'MANAGER_REQUIRED' ? 'Approved' : 'Not required'],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ color:'var(--muted)' }}>{k}</span>
                  <span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize:13, color:'var(--muted)', textAlign:'center', marginBottom:24, lineHeight:1.6 }}>
            A confirmation has been sent to your email.<br />
            If you did not make this change, contact HR immediately.
          </p>

          <div style={{ display:'flex', gap:12 }}>
            {depositState.changeRequestId && (
              <Link to={`/receipt/${depositState.changeRequestId}`}
                className="pg-btn pg-btn-ghost" style={{ flex:1, justifyContent:'center' }}>
                View Audit Receipt
              </Link>
            )}
            <Link to="/dashboard" className="pg-btn pg-btn-primary" style={{ flex:1, justifyContent:'center' }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
