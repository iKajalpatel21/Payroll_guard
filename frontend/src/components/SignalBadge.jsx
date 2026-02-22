const SIGNAL_MAP = {
  UNKNOWN_IP:               { label: 'Unfamiliar IP address',            severity: 'caution' },
  UNKNOWN_DEVICE:           { label: 'New device detected',              severity: 'caution' },
  BURST_ACTIVITY:           { label: 'Burst activity detected',          severity: 'danger'  },
  ELEVATED_FREQUENCY:       { label: 'Elevated request frequency',       severity: 'caution' },
  HIGH_HISTORICAL_RISK:     { label: 'High historical risk pattern',     severity: 'danger'  },
  CLIPBOARD_PASTE_DETECTED: { label: 'Account number was pasted',        severity: 'caution' },
  DIRECT_NAVIGATION:        { label: 'No browsing before deposit page',  severity: 'caution' },
  SHORT_SESSION:            { label: 'Very short session duration',      severity: 'caution' },
};

export default function SignalBadge({ code }) {
  const info = SIGNAL_MAP[code] || { label: code, severity: 'caution' };
  const cls  = info.severity === 'danger' ? 'badge-danger' : 'badge-caution';
  const icon = info.severity === 'danger' ? '🔴' : '🟡';
  return (
    <span className={`pg-badge ${cls}`} style={{ marginRight:6, marginBottom:6 }}>
      {icon} {info.label}
    </span>
  );
}

export { SIGNAL_MAP };
