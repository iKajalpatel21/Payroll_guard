import { useState } from 'react';
import api from '../api/axios';

export default function HashVerifier({ changeId, eventHash, chainHash: initialChainHash }) {
  const [state, setState] = useState('idle'); // idle | computing | done | error
  const [result, setResult] = useState(null);

  async function verify() {
    setState('computing');
    await new Promise(r => setTimeout(r, 900)); // dramatic pause
    try {
      const { data } = await api.post(`/audit/verify/${changeId}`);
      setResult(data);
      setState(data.intact ? 'done' : 'error');
    } catch {
      setResult({ intact: false, message: 'Verification request failed.' });
      setState('error');
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div>
          <span style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Event Hash</span>
          <span className="pg-hash">{eventHash || '—'}</span>
        </div>
        <div>
          <span style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Chain Hash</span>
          <span className="pg-hash">{result?.computedHash || initialChainHash || '—'}</span>
        </div>
        <div>
          <span style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:4 }}>Previous</span>
          <span className="pg-hash">GENESIS</span>
        </div>
      </div>

      <button className="pg-btn pg-btn-ghost pg-btn-full" onClick={verify} disabled={state === 'computing'}>
        {state === 'computing' && <><span className="pg-spinner" /> Recomputing chain hash…</>}
        {state === 'idle'      && '✅  Verify Chain Integrity'}
        {state === 'done'      && '✅  Chain Integrity Verified'}
        {state === 'error'     && '⚠️  Integrity Violation Detected'}
      </button>

      {state === 'done' && (
        <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, padding:12, fontSize:13 }}>
          <strong style={{ color:'var(--safe)' }}>✅ Verified intact</strong>
          <span style={{ color:'var(--muted)', marginLeft:8 }}>
            {result.eventsVerified} event{result.eventsVerified !== 1 ? 's' : ''} verified — no tampering detected
          </span>
        </div>
      )}
      {state === 'error' && (
        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, padding:12, fontSize:13 }}>
          <strong style={{ color:'var(--danger)' }}>⚠️ Chain integrity violation</strong>
          <span style={{ color:'var(--muted)', marginLeft:8 }}>{result?.message}</span>
        </div>
      )}
    </div>
  );
}
