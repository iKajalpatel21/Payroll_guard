// Props: score (0-100)
export default function RiskMeter({ score = 0, label }) {
  const pct = Math.round(Math.min(100, Math.max(0, score)));
  const color = pct < 30 ? 'var(--safe)' : pct < 70 ? 'var(--caution)' : 'var(--danger)';
  const levelLabel = pct < 30 ? 'Low Risk' : pct < 70 ? 'Medium Risk' : 'High Risk';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {label && <span style={{ fontSize:13, color:'var(--muted)' }}>{label}</span>}
      <div style={{ position:'relative', height:8, background:'var(--surface2)', borderRadius:4, overflow:'hidden' }}>
        <div style={{
          position:'absolute', left:0, top:0, height:'100%',
          width: `${pct}%`, background: color,
          borderRadius:4, transition:'width 0.6s ease, background 0.4s ease',
        }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, color, fontWeight:700 }}>{levelLabel}</span>
        <span style={{ fontSize:12, color:'var(--muted)' }}>{pct}/100</span>
      </div>
    </div>
  );
}
