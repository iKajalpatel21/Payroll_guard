import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function mask(num) {
  if (!num) return 'xxxxxx';
  const s = String(num);
  return 'xxxxxx' + s.slice(-3);
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const bank = user?.bankAccount;

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:40, paddingBottom:40 }}>
        <div className="pg-fade-in">
          {/* Welcome */}
          <div style={{ marginBottom:32 }}>
            <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>
              👋 Welcome back, {user?.name}
            </h1>
            <p style={{ color:'var(--muted)', fontSize:14 }}>
              Last login: Today · 🛡️ Session monitored
            </p>
          </div>

          {/* Cards row */}
          <div className="pg-grid-2" style={{ marginBottom:24 }}>
            {/* Direct deposit card */}
            <div className="pg-card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="pg-card-title">💰 Direct Deposit</div>
              {bank?.accountNumber ? (
                <>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700 }}>{bank.bankName || 'Bank'}</div>
                    <div style={{ color:'var(--muted)', fontSize:14, marginTop:2 }}>
                      Account {mask(bank.accountNumber)}
                    </div>
                  </div>
                  <div style={{ color:'var(--muted)', fontSize:13 }}>
                    Routing: xxxxxx{String(bank.routingNumber || '').slice(-4)}
                  </div>
                </>
              ) : (
                <div style={{ color:'var(--muted)', fontSize:14 }}>No bank account on file</div>
              )}
              <Link to="/deposit/change" className="pg-btn pg-btn-primary pg-btn-sm" style={{ alignSelf:'flex-start' }}>
                Update
              </Link>
            </div>

            {/* Security status */}
            <div className="pg-card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="pg-card-title">🛡️ Security Status</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14 }}>
                  <span style={{ color:'var(--muted)' }}>Session</span>
                  <span className="pg-badge badge-safe">Active</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14 }}>
                  <span style={{ color:'var(--muted)' }}>Device Trust</span>
                  <span className="pg-badge badge-info">Monitored</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14 }}>
                  <span style={{ color:'var(--muted)' }}>Risk Level</span>
                  <span className="pg-badge badge-safe">Low</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="pg-card">
            <div className="pg-card-title">Quick Actions</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <Link to="/deposit/change" className="pg-btn pg-btn-primary">
                Update Direct Deposit
              </Link>
              <Link to="/payroll" className="pg-btn pg-btn-ghost">
                View Payslips
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
