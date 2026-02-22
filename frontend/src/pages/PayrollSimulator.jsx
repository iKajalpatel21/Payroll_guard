import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import './Dashboard.css';
import './PayrollSimulator.css';

// ── Simulation Engine ─────────────────────────────────────────────────────────
const EMPLOYEES = [
  { id: 1, name: 'Alice Johnson',  role: 'Engineer',        baseSalary: 4800, riskProfile: 'low' },
  { id: 2, name: 'Bob Martinez',   role: 'Accountant',      baseSalary: 3900, riskProfile: 'medium' },
  { id: 3, name: 'Carol White',    role: 'HR Specialist',   baseSalary: 3400, riskProfile: 'low' },
  { id: 4, name: 'David Park',     role: 'Dev Manager',     baseSalary: 6200, riskProfile: 'high' },
  { id: 5, name: 'Emma Thompson',  role: 'Data Analyst',    baseSalary: 4200, riskProfile: 'low' },
];

const TAX_RATES  = { federal: 0.22, state: 0.05, ss: 0.062, medicare: 0.0145 };
const DEDUCTIONS = { health: 280, retirement401k: 0.05 };

const randBetween = (min, max) => Math.round(min + Math.random() * (max - min));
const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/*
  CYCLE SCENARIO MATRIX:
  Cycle 1  → All clean. Carol updates address (legitimate, low-risk, approved).
  Cycle 2  → Alice gets OTP for bank change (new device, medium risk) – approved after OTP.
  Cycle 3  → All clean. Bob bonus month.
  Cycle 4  → David: attacker login from new IP, tries bank change → OTP sent. Passes OTP. PAID.
  Cycle 5  → David: attacker tries again, burst activity (5 attempts) + unknown device → MANAGER REVIEW → HELD.
  Cycle 6  → David: 2am attempt, credential-stuffing signals → AI BLOCKS → HELD, fraud case auto-opened.
  Cycle 7  → David: account frozen by staff. Login attempt rejected.
  Cycle 8  → David: unfrozen after review, manager clears. PAID. Bob: new IP address change → OTP.
  Cycle 9  → Emma: legitimate address change (known device, normal hours). Approved instantly.
  Cycle 10 → All clean. YTD summary.
*/

const CYCLE_SCENARIO = {
  // { empId, eventType, outcome, detail, holdReason, riskScore, riskCodes, verdict, action }
  1: [
    {
      empId: 3, eventType: 'ADDRESS_CHANGE',
      outcome: 'APPROVED', detail: 'Updated mailing address: 45 Oak Ave, Austin TX 78701',
      riskScore: 12, riskCodes: ['KNOWN_IP', 'KNOWN_DEVICE'],
      verdict: 'LIKELY_GENUINE', action: 'AUTO_APPROVED',
      holdReason: null,
      explanation: 'Carol submitted an address change from her usual device and IP at 9am. All signals match her established pattern. Auto-approved with no friction.'
    },
  ],
  2: [
    {
      empId: 1, eventType: 'BANK_CHANGE',
      outcome: 'OTP_VERIFIED', detail: 'New routing: Chase Bank ••••8821 → Wells Fargo ••••3347',
      riskScore: 48, riskCodes: ['UNKNOWN_DEVICE'],
      verdict: 'UNCERTAIN', action: 'OTP_SENT → VERIFIED',
      holdReason: null,
      explanation: 'Alice submitted a bank change from a new laptop. Risk score 48 triggered OTP verification. She entered the correct code — change was approved. Payroll disbursed normally.'
    },
  ],
  4: [
    {
      empId: 4, eventType: 'BANK_CHANGE',
      outcome: 'OTP_VERIFIED', detail: 'Attacker attempt: redirect to ••••9931 (unknown bank)',
      riskScore: 61, riskCodes: ['UNKNOWN_IP', 'UNKNOWN_DEVICE'],
      verdict: 'UNCERTAIN', action: 'OTP_SENT → VERIFIED (attacker had email access)',
      holdReason: null,
      explanation: 'An attacker who compromised David\'s email also passed the OTP check. Risk score 61 — suspicious but not definitive. Payroll paid to attacker account. ⚠️ This shows why OTP alone is insufficient when email is also compromised.'
    },
  ],
  5: [
    {
      empId: 4, eventType: 'BANK_CHANGE',
      outcome: 'HELD', detail: 'Attacker retry: 5 attempts in 8 min from new device',
      riskScore: 87, riskCodes: ['BURST_ACTIVITY', 'UNKNOWN_IP', 'UNKNOWN_DEVICE', 'MULTI_FAIL_THEN_SUCCESS'],
      verdict: 'LIKELY_FRAUD', action: 'MANAGER_REVIEW → HELD',
      holdReason: 'Burst activity (5 attempts in 8 min) + new device detected. Sent to manager review. Payroll withheld pending approval.',
      explanation: 'After the successful OTP bypass in Cycle 4, the attacker tried a different bank. This time burst activity (5 rapid attempts) + completely new device triggered Manager Review. David\'s payroll was HELD to prevent further diversion.'
    },
  ],
  6: [
    {
      empId: 4, eventType: 'BANK_CHANGE',
      outcome: 'BLOCKED', detail: 'Overnight attempt at 2:17am — credential stuffing pattern',
      riskScore: 96, riskCodes: ['UNUSUAL_HOUR', 'MULTI_FAIL_THEN_SUCCESS', 'BURST_ACTIVITY', 'UNKNOWN_IP'],
      verdict: 'LIKELY_FRAUD', action: 'AI BLOCKED → Fraud Case FC-0042 opened',
      holdReason: 'Critical AI block: overnight attempt with credential-stuffing pattern. Risk 96/100. Fraud case FC-0042 auto-opened. Staff alerted.',
      explanation: 'At 2:17am the attacker made 6 rapid change attempts. AI verdict: LIKELY_FRAUD at 94% confidence. System auto-blocked the request, opened Fraud Case FC-0042, alerted security staff, and sent David an emergency notification. Payroll HELD.'
    },
  ],
  7: [
    {
      empId: 4, eventType: 'ACCOUNT_FROZEN',
      outcome: 'FROZEN', detail: 'Security staff froze account after reviewing FC-0042',
      riskScore: 0, riskCodes: [],
      verdict: null, action: 'ACCOUNT_FROZEN by Staff',
      holdReason: 'Account frozen: active fraud investigation. David notified via registered email to contact HR.',
      explanation: 'Security staff reviewed FC-0042 and froze David\'s account. Any login attempt returns: "Account frozen — contact security team." Payroll HELD during investigation.'
    },
  ],
  8: [
    {
      empId: 4, eventType: 'ACCOUNT_UNFROZEN',
      outcome: 'UNFROZEN', detail: 'Manager cleared case FC-0042 after identity verification',
      riskScore: 0, riskCodes: [],
      verdict: null, action: 'UNFROZEN + Bank reset to verified account',
      holdReason: null,
      explanation: 'David verified his identity with HR in person. Staff unfroze the account, reset bank details to his verified home bank, and cleared trust lists. Back pay for held cycles will be reviewed separately.'
    },
    {
      empId: 2, eventType: 'ADDRESS_CHANGE',
      outcome: 'OTP_VERIFIED', detail: 'Bob updated address from a new IP (working remote)',
      riskScore: 42, riskCodes: ['UNKNOWN_IP'],
      verdict: 'UNCERTAIN', action: 'OTP_SENT → VERIFIED',
      holdReason: null,
      explanation: 'Bob submitted an address update while working remotely (new IP). Risk score 42 triggered OTP. He verified successfully. No payroll impact.'
    },
  ],
  9: [
    {
      empId: 5, eventType: 'ADDRESS_CHANGE',
      outcome: 'APPROVED', detail: 'Emma updated address: 88 Maple Dr, Seattle WA 98101',
      riskScore: 8, riskCodes: [],
      verdict: 'LIKELY_GENUINE', action: 'AUTO_APPROVED',
      holdReason: null,
      explanation: 'Emma submitted an address change from her known device at 10am. Risk score 8. Auto-approved with zero friction. Email confirmation sent to her registered address.'
    },
  ],
};

const EVENT_META = {
  BANK_CHANGE:      { icon: '🏦', label: 'Bank Account Change', color: '#38bdf8' },
  ADDRESS_CHANGE:   { icon: '📍', label: 'Address Change',      color: '#a78bfa' },
  ACCOUNT_FROZEN:   { icon: '🔒', label: 'Account Frozen',      color: '#ef4444' },
  ACCOUNT_UNFROZEN: { icon: '🔓', label: 'Account Unfrozen',    color: '#22c55e' },
};

const VERDICT_COLOR = { LIKELY_FRAUD: '#ef4444', LIKELY_GENUINE: '#22c55e', UNCERTAIN: '#f59e0b' };
const STATUS_COLOR  = { PAID: '#22c55e', HELD: '#ef4444', PENDING: '#f59e0b' };
const OUTCOME_COLOR = {
  APPROVED:     '#22c55e', OTP_VERIFIED: '#38bdf8', HELD:      '#ef4444',
  BLOCKED:      '#ef4444', FROZEN:       '#ef4444',  UNFROZEN: '#22c55e',
};

function generateCycle(cycleIdx, employees) {
  const date = new Date(2025, 0, 1);
  date.setDate(date.getDate() + cycleIdx * 14);
  const cycleId = date.toISOString().split('T')[0];
  const payDate = new Date(date);
  payDate.setDate(payDate.getDate() + 3);

  const cycleEvents = CYCLE_SCENARIO[cycleIdx + 1] || [];

  return employees.map(emp => {
    const overtime = emp.riskProfile !== 'high' ? randBetween(0, 400) : 0;
    const bonus    = cycleIdx % 6 === 2 && emp.id === 2 ? randBetween(500, 900) : cycleIdx % 6 === 5 ? randBetween(200, 600) : 0;
    const grossPay = emp.baseSalary + overtime + bonus;

    const fedTax        = Math.round(grossPay * TAX_RATES.federal);
    const stateTax      = Math.round(grossPay * TAX_RATES.state);
    const ss            = Math.round(grossPay * TAX_RATES.ss);
    const medicare      = Math.round(grossPay * TAX_RATES.medicare);
    const ret401k       = Math.round(grossPay * DEDUCTIONS.retirement401k);
    const totalDeductions = fedTax + stateTax + ss + medicare + DEDUCTIONS.health + ret401k;
    const netPay        = grossPay - totalDeductions;

    const empEvents = cycleEvents.filter(e => e.empId === emp.id);
    const heldEvent = empEvents.find(e => e.outcome === 'HELD' || e.outcome === 'BLOCKED' || e.outcome === 'FROZEN');
    const status    = heldEvent ? 'HELD' : 'PAID';
    const riskScore = empEvents.length ? Math.max(...empEvents.map(e => e.riskScore)) : randBetween(0, 18);
    const holdReason = heldEvent?.holdReason || '';

    return {
      empId: emp.id, name: emp.name, role: emp.role,
      cycleId, payDate: payDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      grossPay, overtime, bonus, basePay: emp.baseSalary,
      fedTax, stateTax, ss, medicare, health: DEDUCTIONS.health, ret401k,
      totalDeductions, netPay,
      riskScore, status, holdReason,
      events: empEvents,
    };
  });
}

function generateSimulation() {
  return Array.from({ length: 10 }, (_, i) => ({
    cycle: i + 1,
    payrolls: generateCycle(i, EMPLOYEES),
    cycleEvents: CYCLE_SCENARIO[i + 1] || [],
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PayrollSimulator() {
  const [cycles]        = useState(() => generateSimulation());
  const [visibleCount,  setVisibleCount]  = useState(0);
  const [running,       setRunning]       = useState(false);
  const [done,          setDone]          = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [speed,         setSpeed]         = useState(900);
  const intervalRef = useRef(null);

  const start = () => { if (running) return; setVisibleCount(0); setDone(false); setSelected(null); setRunning(true); };
  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setDone(false); setVisibleCount(0); setSelected(null); };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setVisibleCount(prev => {
        if (prev >= cycles.length) { clearInterval(intervalRef.current); setRunning(false); setDone(true); return prev; }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [running, speed, cycles.length]);

  const visibleCycles = cycles.slice(0, visibleCount);
  const totalPaid   = visibleCycles.reduce((s, c) => s + c.payrolls.filter(p => p.status === 'PAID').reduce((a, p) => a + p.netPay, 0), 0);
  const totalHeld   = visibleCycles.reduce((s, c) => s + c.payrolls.filter(p => p.status === 'HELD').reduce((a, p) => a + p.netPay, 0), 0);
  const holdCount   = visibleCycles.reduce((s, c) => s + c.payrolls.filter(p => p.status === 'HELD').length, 0);
  const riskEvents  = visibleCycles.reduce((s, c) => s + c.cycleEvents.length, 0);

  const selPayroll  = selected ? cycles[selected.ci].payrolls[selected.pi] : null;
  const maxGross    = Math.max(...cycles.flatMap(c => c.payrolls.map(p => p.grossPay)));

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h2>🎬 Payroll Simulation</h2>
            <p>10-cycle animated walkthrough — real payroll math, security events, and AI-driven fraud detection</p>
          </div>
          <div className="sim-controls">
            <label className="speed-label">
              Speed:
              <select value={speed} onChange={e => setSpeed(Number(e.target.value))} disabled={running}>
                <option value={1800}>Slow</option>
                <option value={900}>Normal</option>
                <option value={400}>Fast</option>
              </select>
            </label>
            {!running && !done && <button className="btn-run-payroll" onClick={start}>▶ Run Simulation</button>}
            {running  && <button className="btn-run-payroll" style={{ background: '#475569' }} onClick={reset}>⏹ Stop</button>}
            {done     && <button className="btn-run-payroll" style={{ background: '#7c3aed' }} onClick={reset}>↺ Replay</button>}
          </div>
        </div>

        {/* Live stats */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card blue">  <span className="stat-num">{visibleCount}/10</span><span className="stat-lbl">Cycles Run</span></div>
          <div className="stat-card green"> <span className="stat-num">${Math.round(totalPaid / 1000)}k</span><span className="stat-lbl">Total Paid Out</span></div>
          <div className="stat-card red">   <span className="stat-num">{holdCount}</span><span className="stat-lbl">Payments Held</span></div>
          <div className="stat-card amber"> <span className="stat-num">{riskEvents}</span><span className="stat-lbl">Security Events</span></div>
        </div>

        <div className="sim-layout">
          {/* ── Left: cycle timeline ────────────────────────────────────────── */}
          <div className="sim-left">
            <h4 className="sim-section-title">📅 Payroll Cycles</h4>
            {visibleCount === 0 && !running && (
              <div className="sim-placeholder"><p>🎬 Press <strong>Run Simulation</strong> to begin</p></div>
            )}

            {visibleCycles.map((c, ci) => {
              const hasEvents = c.cycleEvents.length > 0;
              const hasCritical = c.cycleEvents.some(e => e.outcome === 'HELD' || e.outcome === 'BLOCKED' || e.outcome === 'FROZEN');
              return (
                <div key={ci} className={`cycle-block ${ci === visibleCount - 1 && running ? 'cycle-active' : ''} ${hasCritical ? 'cycle-critical' : ''}`}>
                  <div className="cycle-header">
                    <span className="cycle-label">Cycle {c.cycle}</span>
                    <span className="cycle-date">{c.payrolls[0].cycleId}</span>
                    {hasEvents && (
                      <span className={`cycle-event-tag ${hasCritical ? 'critical' : 'info'}`}>
                        {hasCritical ? '🚨' : '📋'} {c.cycleEvents.length} event{c.cycleEvents.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Security events strip for this cycle */}
                  {c.cycleEvents.length > 0 && (
                    <div className="cycle-events-strip">
                      {c.cycleEvents.map((ev, ei) => {
                        const meta = EVENT_META[ev.eventType] || EVENT_META.BANK_CHANGE;
                        const emp  = EMPLOYEES.find(e => e.id === ev.empId);
                        return (
                          <div key={ei} className="cycle-event-pill"
                            style={{ borderColor: OUTCOME_COLOR[ev.outcome] + '66', background: OUTCOME_COLOR[ev.outcome] + '0f' }}>
                            <span>{meta.icon}</span>
                            <span className="pill-emp">{emp?.name.split(' ')[0]}</span>
                            <span className="pill-type" style={{ color: meta.color }}>{meta.label}</span>
                            <span className="pill-outcome" style={{ color: OUTCOME_COLOR[ev.outcome] }}>→ {ev.outcome.replace(/_/g, ' ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Employee bars */}
                  <div className="emp-bars">
                    {c.payrolls.map((p, pi) => {
                      const barPct = Math.round((p.grossPay / maxGross) * 100);
                      const isHeld = p.status === 'HELD';
                      const hasEv  = p.events.length > 0;
                      const isSel  = selected?.ci === ci && selected?.pi === pi;
                      return (
                        <div key={pi} className={`emp-row ${isSel ? 'emp-selected' : ''}`}
                          onClick={() => setSelected(isSel ? null : { ci, pi })}>
                          <div className="emp-name-col">
                            <span className="emp-dot" style={{ background: isHeld ? '#ef4444' : hasEv ? '#f59e0b' : '#22c55e' }} />
                            <span className="emp-name-sim">{p.name.split(' ')[0]}</span>
                          </div>
                          <div className="bar-track">
                            <div className="bar-gross" style={{ width: `${barPct}%`, background: isHeld ? '#ef444440' : '#38bdf820' }}>
                              <div className="bar-net" style={{ width: `${Math.round((p.netPay / p.grossPay) * 100)}%`, background: isHeld ? '#ef4444' : '#38bdf8' }} />
                            </div>
                          </div>
                          <div className="bar-amount" style={{ color: isHeld ? '#ef4444' : '#f1f5f9' }}>
                            ${p.netPay >= 1000 ? (p.netPay / 1000).toFixed(1) + 'k' : Math.round(p.netPay)}
                            {isHeld && <span className="held-tag">HELD</span>}
                            {hasEv && !isHeld && p.events.some(e => e.outcome === 'OTP_VERIFIED') && <span className="otp-tag">OTP</span>}
                            {hasEv && !isHeld && p.events.some(e => e.outcome === 'APPROVED') && <span className="approved-tag">✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: detail panel ─────────────────────────────────────────── */}
          <div className="sim-right">
            {!selPayroll ? (
              <div className="sim-detail-placeholder">
                <p>👆 Click any employee row to see their pay stub and security events</p>
              </div>
            ) : (
              <div className="pay-stub">
                {/* Header */}
                <div className="stub-header">
                  <div>
                    <div className="stub-name">{selPayroll.name}</div>
                    <div className="stub-role">{selPayroll.role}</div>
                  </div>
                  <span className="status-chip"
                    style={{ background: `${STATUS_COLOR[selPayroll.status]}20`, color: STATUS_COLOR[selPayroll.status], borderColor: `${STATUS_COLOR[selPayroll.status]}44` }}>
                    {selPayroll.status}
                  </span>
                </div>
                <div className="stub-cycle">Pay Period · {selPayroll.cycleId} · Pay Date: {selPayroll.payDate}</div>

                {/* ── Security Events for this employee THIS cycle ─────────── */}
                {selPayroll.events.length > 0 && (
                  <div className="incident-section">
                    <div className="incident-title">🔐 Security Events This Cycle</div>
                    {selPayroll.events.map((ev, i) => {
                      const meta = EVENT_META[ev.eventType] || EVENT_META.BANK_CHANGE;
                      return (
                        <div key={i} className="incident-card"
                          style={{ borderColor: OUTCOME_COLOR[ev.outcome] + '55', background: OUTCOME_COLOR[ev.outcome] + '08' }}>
                          {/* Event type + outcome */}
                          <div className="incident-header">
                            <span className="incident-icon">{meta.icon}</span>
                            <div>
                              <div className="incident-type" style={{ color: meta.color }}>{meta.label}</div>
                              <div className="incident-outcome" style={{ color: OUTCOME_COLOR[ev.outcome] }}>
                                Outcome: <strong>{ev.outcome.replace(/_/g, ' ')}</strong>
                              </div>
                            </div>
                            {ev.riskScore > 0 && (
                              <div className="incident-risk" style={{
                                color: ev.riskScore > 70 ? '#ef4444' : ev.riskScore > 30 ? '#f59e0b' : '#22c55e',
                                background: ev.riskScore > 70 ? '#ef444420' : ev.riskScore > 30 ? '#f59e0b20' : '#22c55e20',
                              }}>
                                Risk<br /><strong>{ev.riskScore}/100</strong>
                              </div>
                            )}
                          </div>

                          {/* What changed */}
                          <div className="incident-detail">{ev.detail}</div>

                          {/* Risk signals */}
                          {ev.riskCodes.length > 0 && (
                            <div className="incident-signals">
                              {ev.riskCodes.map(code => (
                                <span key={code} className="signal-tag">{code.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          )}

                          {/* AI action */}
                          <div className="incident-action">
                            {ev.verdict && (
                              <span className="verdict-chip" style={{
                                background: VERDICT_COLOR[ev.verdict] + '18',
                                color: VERDICT_COLOR[ev.verdict],
                                border: `1px solid ${VERDICT_COLOR[ev.verdict]}44`,
                              }}>
                                🤖 {ev.verdict.replace(/_/g, ' ')}
                              </span>
                            )}
                            <span className="action-text">⚡ {ev.action}</span>
                          </div>

                          {/* Why held */}
                          {ev.holdReason && (
                            <div className="hold-reason-box">
                              <div className="hold-reason-label">⏸ Why Payment Was Withheld:</div>
                              <div className="hold-reason-text">{ev.holdReason}</div>
                            </div>
                          )}

                          {/* Plain-English explanation */}
                          <div className="incident-explanation">
                            <div className="explanation-label">📖 What happened:</div>
                            <div className="explanation-text">{ev.explanation}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Earnings */}
                <div className="stub-section">
                  <div className="stub-section-title">💼 Earnings</div>
                  <div className="stub-row"><span>Base Pay</span><span>${fmt(selPayroll.basePay)}</span></div>
                  {selPayroll.overtime > 0 && <div className="stub-row"><span>Overtime</span><span>${fmt(selPayroll.overtime)}</span></div>}
                  {selPayroll.bonus > 0    && <div className="stub-row"><span>Bonus</span><span style={{ color: '#a78bfa' }}>+${fmt(selPayroll.bonus)}</span></div>}
                  <div className="stub-row total"><span>Gross Pay</span><span>${fmt(selPayroll.grossPay)}</span></div>
                </div>

                {/* Deductions */}
                <div className="stub-section">
                  <div className="stub-section-title">📉 Deductions & Taxes</div>
                  <div className="stub-row deduction"><span>Federal Income Tax (22%)</span><span>-${fmt(selPayroll.fedTax)}</span></div>
                  <div className="stub-row deduction"><span>State Tax (5%)</span>          <span>-${fmt(selPayroll.stateTax)}</span></div>
                  <div className="stub-row deduction"><span>Social Security (6.2%)</span>  <span>-${fmt(selPayroll.ss)}</span></div>
                  <div className="stub-row deduction"><span>Medicare (1.45%)</span>         <span>-${fmt(selPayroll.medicare)}</span></div>
                  <div className="stub-row deduction"><span>Health Insurance</span>         <span>-${fmt(selPayroll.health)}</span></div>
                  <div className="stub-row deduction"><span>401(k) (5%)</span>              <span>-${fmt(selPayroll.ret401k)}</span></div>
                  <div className="stub-row total deduction"><span>Total Deductions</span><span>-${fmt(selPayroll.totalDeductions)}</span></div>
                </div>

                {/* Net pay */}
                <div className="stub-net">
                  <span>Net Pay</span>
                  <span style={{ color: selPayroll.status === 'HELD' ? '#ef4444' : '#22c55e' }}>${fmt(selPayroll.netPay)}</span>
                </div>

                {/* Breakdown bars */}
                <div className="stub-breakdown">
                  {[
                    { label: 'Federal', val: selPayroll.fedTax,  color: '#818cf8' },
                    { label: 'State',   val: selPayroll.stateTax, color: '#38bdf8' },
                    { label: 'SS+Med',  val: selPayroll.ss + selPayroll.medicare, color: '#34d399' },
                    { label: 'Health',  val: selPayroll.health,   color: '#f472b6' },
                    { label: '401(k)', val: selPayroll.ret401k,  color: '#a78bfa' },
                    { label: 'Net',     val: selPayroll.netPay,   color: selPayroll.status === 'HELD' ? '#ef4444' : '#22c55e' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="breakdown-item">
                      <div className="breakdown-bar-wrap">
                        <div className="breakdown-bar" style={{ height: `${Math.round((val / selPayroll.grossPay) * 80)}px`, background: color }} />
                      </div>
                      <div className="breakdown-label" style={{ color }}>{label}</div>
                      <div className="breakdown-val">${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : Math.round(val)}</div>
                    </div>
                  ))}
                </div>

                {selPayroll.status === 'HELD' && (
                  <div className="stub-held-notice">
                    🔴 <strong>Payment HELD</strong> — funds not disbursed. See security event above for details.
                  </div>
                )}
              </div>
            )}

            {/* YTD summary after done */}
            {done && (
              <div className="ytd-summary card" style={{ marginTop: 16 }}>
                <h4>📊 Simulation Summary</h4>
                <div className="stub-row"><span>Total Net Disbursed</span><span style={{ color: '#22c55e' }}>${fmt(totalPaid)}</span></div>
                <div className="stub-row"><span>Total Payments Held</span><span style={{ color: '#ef4444' }}>${fmt(totalHeld)}</span></div>
                <div className="stub-row"><span>Security Events</span><span>{riskEvents}</span></div>
                <div className="stub-row"><span>Payments Blocked/Held</span><span>{holdCount}</span></div>
                <div className="stub-row total"><span>Est. Fraud Prevented</span><span style={{ color: '#a78bfa' }}>${fmt(totalHeld)}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
