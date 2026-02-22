const SIGNAL_MAP = {
  UNKNOWN_IP:               { label: 'Unfamiliar IP address',            severity: 'caution' },
  UNKNOWN_DEVICE:           { label: 'New device detected',              severity: 'caution' },
  BURST_ACTIVITY:           { label: 'Burst activity detected',          severity: 'danger'  },
  ELEVATED_FREQUENCY:       { label: 'Elevated request frequency',       severity: 'caution' },
  HIGH_HISTORICAL_RISK:     { label: 'High historical risk pattern',     severity: 'danger'  },
  CLIPBOARD_PASTE_DETECTED: { label: 'Account number was pasted',        severity: 'caution' },
  DIRECT_NAVIGATION:        { label: 'No browsing before deposit page',  severity: 'caution' },
  SHORT_SESSION:            { label: 'Very short session duration',      severity: 'caution' },
  UNUSUAL_HOUR:             { label: 'Request at unusual hour',          severity: 'caution' },
  ACCOUNT_TOO_NEW:          { label: 'Account recently created',         severity: 'caution' },
  POST_LOGIN_RUSH:          { label: 'Change immediately after login',   severity: 'danger'  },
  MULTI_FAIL_THEN_SUCCESS:  { label: 'Multiple failed attempts prior',   severity: 'danger'  },
  NEW_ACCOUNT_SAME_ROUTING: { label: 'Routing number shared (money mule)',severity: 'danger'  },
  VPN_DETECTED:             { label: 'VPN or proxy detected',            severity: 'danger'  },
  GEOGRAPHIC_MISMATCH:      { label: 'IP country ≠ saved address',       severity: 'danger'  },
  REGION_MISMATCH:          { label: 'IP region ≠ saved state',          severity: 'caution' },
  GEO_MATCH_TRUST:          { label: 'IP matches home region',           severity: 'safe'    },
};

export default function SignalBadge({ code }) {
  const info = SIGNAL_MAP[code] || { label: code, severity: 'caution' };
  const cls  = info.severity === 'danger' ? 'badge-danger' : info.severity === 'safe' ? 'badge-safe' : 'badge-caution';
  const icon = info.severity === 'danger' ? '🔴' : info.severity === 'safe' ? '🟢' : '🟡';
  return (
    <span className={`pg-badge ${cls}`} style={{ marginRight:6, marginBottom:6 }}>
      {icon} {info.label}
    </span>
  );
}

export { SIGNAL_MAP };
