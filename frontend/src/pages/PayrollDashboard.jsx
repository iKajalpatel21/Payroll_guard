import { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';
import './Payroll.css';

const STATUS_META = {
  PAID:    { label: 'PAID',    color: '#22c55e', icon: '✅' },
  HELD:    { label: 'HELD',    color: '#ef4444', icon: '🔴' },
  PENDING: { label: 'PENDING', color: '#f59e0b', icon: '⏳' },
  CANCELLED: { label: 'CANCELLED', color: '#64748b', icon: '🚫' },
};

const PayrollDashboard = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats]       = useState(null);
  const [cycles, setCycles]     = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [running, setRunning]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [error, setError]       = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isManager) {
        const params = {};
        if (selectedCycle) params.cycleId = selectedCycle;
        if (statusFilter)  params.status  = statusFilter;
        const [payRes, statRes, cycleRes] = await Promise.all([
          api.get('/payroll', { params }),
          api.get('/payroll/stats'),
          api.get('/payroll/cycles'),
        ]);
        setPayrolls(payRes.data.payrolls);
        setStats(statRes.data);
        setCycles(cycleRes.data.cycles);
      } else {
        const { data } = await api.get('/payroll/my');
        setPayrolls(data.payrolls);
      }
    } catch {
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedCycle, statusFilter]);

  const handleRunPayroll = async () => {
    setRunning(true);
    setError('');
    setMsg('');
    try {
      const { data } = await api.post('/payroll/run', { defaultAmount: 3500 });
      setMsg(`✅ Payroll cycle ${data.results.cycleId} complete — ${data.results.paid} paid, ${data.results.held} held.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Payroll run failed.');
    } finally {
      setRunning(false);
      setTimeout(() => { setMsg(''); setError(''); }, 5000);
    }
  };

  const handleRelease = async (id) => {
    try {
      await api.put(`/payroll/${id}/release`, { note: 'Manually released via dashboard.' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Release failed.');
    }
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h2>💰 {isManager ? 'Payroll Control Center' : 'My Payroll History'}</h2>
            <p>{isManager
              ? 'Automated payroll runs on the 1st & 15th. Review and release held payments.'
              : 'Your payroll history — held payments require attention from your manager.'}
            </p>
          </div>
          {isManager && (
            <button className="btn-run-payroll" onClick={handleRunPayroll} disabled={running}>
              {running ? '⏳ Running…' : '▶ Run Payroll Now'}
            </button>
          )}
        </div>

        {msg   && <div className="alert-success">{msg}</div>}
        {error && <div className="alert-error">⚠️ {error}</div>}

        {/* Stats */}
        {isManager && stats && (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card blue">
              <span className="stat-num">{stats.stats.total}</span>
              <span className="stat-lbl">Total Records</span>
            </div>
            <div className="stat-card green">
              <span className="stat-num">{stats.stats.paid}</span>
              <span className="stat-lbl">Paid</span>
            </div>
            <div className="stat-card red">
              <span className="stat-num">{stats.stats.held}</span>
              <span className="stat-lbl">Held (Blocked)</span>
            </div>
            <div className="stat-card amber">
              <span className="stat-num">{stats.stats.pending}</span>
              <span className="stat-lbl">Pending</span>
            </div>
          </div>
        )}

        {/* Filters (manager only) */}
        {isManager && (
          <div className="payroll-filters">
            <select value={selectedCycle} onChange={(e) => setSelectedCycle(e.target.value)}>
              <option value="">All Cycles</option>
              {cycles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="HELD">HELD</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>
        )}

        {/* Payroll Table */}
        {loading ? (
          <div className="loading-text">Loading payroll records…</div>
        ) : payrolls.length === 0 ? (
          <div className="card empty-state">
            <p>📭 No payroll records found. Run a cycle or adjust filters.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="payroll-table">
              <thead>
                <tr>
                  {isManager && <th>Employee</th>}
                  <th>Cycle</th>
                  <th>Pay Date</th>
                  <th>Amount</th>
                  <th>Bank Account</th>
                  <th>Status</th>
                  <th>Details</th>
                  {isManager && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => {
                  const meta = STATUS_META[p.status] || STATUS_META.PENDING;
                  return (
                    <tr key={p._id} className={p.status === 'HELD' ? 'row-held' : ''}>
                      {isManager && (
                        <td>
                          <strong>{p.employeeId?.name}</strong>
                          <br /><small>{p.employeeId?.email}</small>
                        </td>
                      )}
                      <td><code>{p.cycleId}</code></td>
                      <td>{new Date(p.payDate).toLocaleDateString()}</td>
                      <td className="amount">${p.amount?.toLocaleString()}</td>
                      <td><code>{p.paidToBankAccount?.accountNumber || '—'}</code></td>
                      <td>
                        <span className="status-chip" style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}55` }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="hold-reason">
                        {p.holdReason
                          ? <span title={p.holdReason}>🚨 {p.holdReason.substring(0, 45)}…</span>
                          : <span style={{ color: '#475569' }}>—</span>}
                        {p.riskScoreAtProcessing > 0 && (
                          <div><small style={{ color: '#ef4444' }}>Risk: {p.riskScoreAtProcessing}</small></div>
                        )}
                      </td>
                      {isManager && (
                        <td>
                          {p.status === 'HELD' && (
                            <button className="btn-approve" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleRelease(p._id)}>
                              Release
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Cycles Summary */}
        {isManager && stats?.recentCycles?.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <h3>📊 Recent Cycle Summary</h3>
            <table className="risk-table">
              <thead><tr><th>Cycle</th><th>Total</th><th>Paid</th><th>Held</th><th>Hold Rate</th></tr></thead>
              <tbody>
                {stats.recentCycles.map((c) => (
                  <tr key={c._id}>
                    <td><code>{c._id}</code></td>
                    <td>{c.total}</td>
                    <td style={{ color: '#22c55e' }}>{c.paid}</td>
                    <td style={{ color: '#ef4444' }}>{c.held}</td>
                    <td>
                      <span className="risk-chip" style={{ background: c.held > 0 ? '#ef444422' : '#22c55e22', color: c.held > 0 ? '#ef4444' : '#22c55e', borderColor: c.held > 0 ? '#ef444444' : '#22c55e44' }}>
                        {c.total > 0 ? Math.round((c.held / c.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default PayrollDashboard;
