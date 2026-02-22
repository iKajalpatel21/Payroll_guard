import { useState, useEffect, useRef } from 'react';
import ShieldLoader from './ShieldLoader';
import api from '../api/axios';

export default function SurgeSimulator({ onSurgeComplete }) {
  const [intensity, setIntensity] = useState(50);
  const [state, setState] = useState('idle'); // idle | running | done
  const [counter, setCounter] = useState(0);
  const [result, setResult] = useState(null);
  const intervalRef = useRef(null);

  async function runSurge() {
    setState('running');
    setCounter(0);
    setResult(null);

    // Animate counter
    let c = 0;
    intervalRef.current = setInterval(() => {
      c += Math.ceil(intensity / 25);
      if (c >= intensity) { c = intensity; clearInterval(intervalRef.current); }
      setCounter(c);
    }, 80);

    try {
      const { data } = await api.post('/audit/simulate-surge', { intensity });
      clearInterval(intervalRef.current);
      setCounter(data.generated);
      setResult(data);
      setState('done');
      onSurgeComplete?.(data);
    } catch {
      clearInterval(intervalRef.current);
      setState('idle');
    }
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const levels = [
    { val: 25, label: '●●○○○ Light (25)' },
    { val: 50, label: '●●●○○ Medium (50)' },
    { val: 100, label: '●●●●○ Heavy (100)' },
    { val: 200, label: '●●●●● Massive (200)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <label className="pg-label">Intensity</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {levels.map(l => (
            <button key={l.val}
              className={`pg-btn pg-btn-sm ${intensity === l.val ? 'pg-btn-primary' : 'pg-btn-ghost'}`}
              onClick={() => setIntensity(l.val)} disabled={state === 'running'}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button className="pg-btn pg-btn-caution pg-btn-full"
        onClick={runSurge} disabled={state === 'running'}
        style={{ fontSize:15, padding:'14px 22px' }}>
        {state === 'running'
          ? <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}><div style={{transform: 'scale(0.35)', margin: '-20px'}}><ShieldLoader /></div> Running… {counter} / {intensity} attempts</div>
          : '⚡ Run Attack Simulation'}
      </button>

      {state === 'done' && result && (
        <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:16, animation:'fadeIn 0.3s ease' }}>
          <div style={{ color:'var(--danger)', fontWeight:700, marginBottom:8 }}>
            ⚡ Surge Detected — {result.generated} attack attempts processed
          </div>
          <div style={{ display:'flex', gap:20, fontSize:13 }}>
            <span style={{ color:'var(--danger)' }}>🔴 {result.blocked} blocked</span>
            <span style={{ color:'var(--caution)' }}>🟡 {result.challenged} challenged</span>
            <span style={{ color:'var(--safe)' }}>🟢 {result.allowed} allowed</span>
          </div>
        </div>
      )}
    </div>
  );
}
