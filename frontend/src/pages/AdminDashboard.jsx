import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import SurgeSimulator from '../components/SurgeSimulator';
import api from '../api/axios';

const DECISION_COLOR = { ALLOW:'var(--safe)', CHALLENGE:'var(--caution)', BLOCK:'var(--danger)', SIMULATED_ATTACK:'var(--danger)' };
const RISK_ICON = s => s < 30 ? '🟢' : s < 70 ? '🟡' : '🔴';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalEvents:0, highRiskEvents:0, pendingRequests:0, approvedToday:0 });
  const [topRisk, setTopRisk] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [surgeActive, setSurgeActive] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/audit/stats');
      setStats(data.stats);
      setTopRisk(data.topRisk || []);
    } catch {}
    setLoading(false);
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      // Use topRisk employees to pull recent events
      const { data } = await api.get('/audit/stats');
      setStats(data.stats);
      setTopRisk(data.topRisk || []);
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, []);
  // Poll while surge is active
  useEffect(() => {
    if (!surgeActive) return;
    const t = setInterval(fetchRecent, 1200);
    return () => clearInterval(t);
  }, [surgeActive, fetchRecent]);

  function handleSurgeComplete(result) {
    setSurgeActive(false);
    fetchStats();
  }

  const statCards = [
    { num: stats.totalEvents,     label:'Total Events',       color:'var(--brand)'   },
    { num: stats.highRiskEvents,  label:'High Risk',          color:'var(--danger)'  },
    { num: stats.pendingRequests, label:'Pending Review',     color:'var(--caution)' },
    { num: stats.approvedToday,   label:'Approved Today',     color:'var(--safe)'    },
  ];

  return (
    <div className="pg-page">
      <Navbar />
      <div className="pg-container" style={{ paddingTop:40, paddingBottom:60 }}>
        <div className="pg-fade-in">
          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Security Dashboard</h1>
            <p style={{ color:'var(--muted)', fontSize:14 }}>Live risk feed · PayrollGuard command center</p>
          </div>

          {/* Stat cards */}
          <div className="pg-grid-4" style={{ marginBottom:28 }}>
            {statCards.map(s => (
              <div key={s.label} className="pg-stat-card">
                <div className="pg-stat-num" style={{ color:s.color }}>
                  {loading ? '—' : s.num}
                </div>
                <div className="pg-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:28 }}>
            {/* Top risk employees */}
            <div className="pg-card">
              <div className="pg-card-title">Top Risk Employees</div>
              {loading ? (
                <div style={{ textAlign:'center', padding:24 }}><span className="pg-spinner" /></div>
              ) : topRisk.length === 0 ? (
                <div style={{ color:'var(--muted)', fontSize:14 }}>No data yet</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {topRisk.map((e, i) => {
                    const avg = Math.round(e.avgScore);
                    const color = avg < 30 ? 'var(--safe)' : avg < 70 ? 'var(--caution)' : 'var(--danger)';
                    return (
                      <div key={e._id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                        <div>
                          <div style={{ fontWeight:600 }}>{e.employee?.name || 'Unknown'}</div>
                          <div style={{ color:'var(--muted)', fontSize:12 }}>{e.eventCount} events</div>
                        </div>
                        <span style={{ fontWeight:800, color, fontSize:16 }}>{avg}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Risk distribution */}
            <div className="pg-card">
              <div className="pg-card-title">Risk Distribution</div>
              {loading ? (
                <div style={{ textAlign:'center', padding:24 }}><span className="pg-spinner" /></div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {[
                    { label:'Low (0–29)', color:'var(--safe)',    count: Math.max(0, stats.totalEvents - stats.highRiskEvents - Math.round(stats.totalEvents*0.15)) },
                    { label:'Medium (30–69)', color:'var(--caution)', count: Math.round(stats.totalEvents*0.15) },
                    { label:'High (70–100)', color:'var(--danger)',  count: stats.highRiskEvents },
                  ].map(row => {
                    const pct = stats.totalEvents > 0 ? Math.round((row.count / stats.totalEvents) * 100) : 0;
                    return (
                      <div key={row.label}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--muted)', marginBottom:4 }}>
                          <span>{row.label}</span><span>{row.count} events</span>
                        </div>
                        <div style={{ height:8, background:'var(--surface2)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:row.color, borderRadius:4, transition:'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Attack Simulation */}
          <div className="pg-card" style={{ border:'1px solid rgba(245,158,11,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div>
                <div className="pg-card-title" style={{ color:'var(--caution)', marginBottom:4 }}>⚡ Attack Simulation</div>
                <p style={{ fontSize:13, color:'var(--muted)' }}>
                  Simulate a coordinated attack wave to test detection. Stats update automatically.
                </p>
              </div>
              {surgeActive && <span className="pg-badge badge-danger">● Live</span>}
            </div>
            <SurgeSimulator onSurgeComplete={handleSurgeComplete} />
          </div>
        </div>
      </div>
    </div>
  );
}
