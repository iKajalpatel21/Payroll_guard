const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * analyzeChangePattern — full AI pattern analysis for a change event.
 * Returns a structured verdict with confidence, summary for staff, and
 * a plain-English message for the employee.
 */
const analyzeChangePattern = async (employee, event, recentHistory = []) => {
  const fallback = {
    verdict: 'UNCERTAIN',
    confidence: 50,
    patternSummary: 'Unable to analyze pattern at this time.',
    employeeMessage: 'We detected unusual activity on your account. Please verify this was you.',
    recommendedAction: event.riskScore > 70 ? 'MANAGER' : event.riskScore > 30 ? 'OTP' : 'AUTO_APPROVE',
  };

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return fallback;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const historyText = recentHistory.slice(0, 15).map(e =>
      `  • ${new Date(e.createdAt).toISOString()} | Score:${e.riskScore} | Codes:[${(e.riskCodes||[]).join(',')}] | IP:${e.ip}`
    ).join('\n') || '  No history.';

    const prompt = `
You are a bank fraud analyst AI. Analyze this payroll account change attempt and return ONLY a valid JSON object.

EMPLOYEE PROFILE:
- Name: ${employee.name}
- Account age: ${Math.floor((Date.now() - new Date(employee.createdAt)) / 86400000)} days
- Known IPs: ${employee.knownIPs?.length || 0}
- Known devices: ${employee.knownDeviceIds?.length || 0}
- Saved Address: ${employee.address?.city || 'Unknown'}, ${employee.address?.state || ''}, ${employee.address?.country || 'US'}

CURRENT EVENT:
- Risk Score: ${event.riskScore}/100
- Risk Codes: ${(event.riskCodes || []).join(', ')}
- IP: ${event.ip}
- IP Geolocation: ${event.geo ? (event.geo.city + ', ' + event.geo.region + ', ' + event.geo.countryCode + ' (' + event.geo.isp + ')') : 'Unknown'}
- Device: ${event.deviceId}
- Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}
- Change type: ${event.changeType || 'BANK_ACCOUNT'}
- Target Details: ${event.newAddress ? ('New Address: ' + event.newAddress.city + ', ' + event.newAddress.state + ', ' + event.newAddress.country) : 'Bank routing change'}

RECENT HISTORY (last 15 events):
${historyText}

Return ONLY this JSON (no markdown, no explanation):
{
  "verdict": "LIKELY_FRAUD" | "LIKELY_GENUINE" | "UNCERTAIN",
  "confidence": <number 0-100>,
  "patternSummary": "<2-3 sentences for security staff explaining the pattern>",
  "employeeMessage": "<1-2 sentences for the employee in plain English, e.g. 'A change was made from a new location. If this was you, no action needed. If not, contact HR immediately.'>",
  "recommendedAction": "AUTO_APPROVE" | "OTP" | "MANAGER" | "BLOCK"
}`.trim();

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Strip markdown code blocks if present
    text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    const parsed = JSON.parse(text);

    // Validate fields
    return {
      verdict:            ['LIKELY_FRAUD', 'LIKELY_GENUINE', 'UNCERTAIN'].includes(parsed.verdict) ? parsed.verdict : 'UNCERTAIN',
      confidence:         typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 50,
      patternSummary:     parsed.patternSummary  || fallback.patternSummary,
      employeeMessage:    parsed.employeeMessage || fallback.employeeMessage,
      recommendedAction:  ['AUTO_APPROVE', 'OTP', 'MANAGER', 'BLOCK'].includes(parsed.recommendedAction) ? parsed.recommendedAction : fallback.recommendedAction,
    };
  } catch (err) {
    console.error('Gemini pattern analysis error:', err.message);
    return fallback;
  }
};

/**
 * Legacy: simple risk explanation (used for OTP and low-risk paths).
 */
const explainRisk = async (riskCodes, score) => {
  if (!riskCodes?.length) return 'This transaction appears low-risk.';

  const descriptions = {
    UNKNOWN_IP:              'request from an unrecognized IP address',
    UNKNOWN_DEVICE:          'request from an unrecognized device',
    BURST_ACTIVITY:          'multiple rapid change attempts detected',
    ELEVATED_FREQUENCY:      'higher than normal activity frequency',
    UNUSUAL_HOUR:            'request made during unusual hours',
    ACCOUNT_TOO_NEW:         'account was recently created',
    POST_LOGIN_RUSH:         'change attempted very soon after logging in',
    MULTI_FAIL_THEN_SUCCESS: 'multiple failed attempts before this request',
    NEW_ACCOUNT_SAME_ROUTING:'bank routing number shared with other accounts',
    HIGH_HISTORICAL_RISK:    'history of elevated risk activity',
  };

  const parts = riskCodes.map(c => descriptions[c] || c).join('; ');
  return `Risk score ${score}/100 — detected: ${parts}.`;
};

module.exports = { analyzeChangePattern, explainRisk };
