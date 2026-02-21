const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
const getClient = () => {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Takes an array of technical risk codes and returns a friendly,
 * human-readable explanation for the employee dashboard.
 *
 * @param {string[]} riskCodes  – e.g. ['UNKNOWN_IP', 'UNKNOWN_DEVICE']
 * @param {number}   riskScore  – numeric score 0-100
 * @returns {Promise<string>}   – employee-facing sentence
 */
const explainRisk = async (riskCodes, riskScore) => {
  if (!riskCodes || riskCodes.length === 0) {
    return 'Your request was processed normally with no unusual activity detected.';
  }

  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a security notification assistant for PayrollGuard, a payroll security system.
A technical risk analysis produced the following results:
- Risk Score: ${riskScore}/100
- Risk Codes: ${riskCodes.join(', ')}

Risk code meanings:
- UNKNOWN_IP: The request came from an IP address not previously used by this employee.
- UNKNOWN_DEVICE: The request came from an unrecognized device.
- BURST_ACTIVITY: Multiple change attempts were made in a very short time (possible credential stuffing or account takeover).
- ELEVATED_FREQUENCY: More change attempts than usual in the last 10 minutes.
- HIGH_HISTORICAL_RISK: This account has a history of high-risk activity.

Write a clear, friendly, non-technical 1-2 sentence explanation that:
1. Informs the employee what triggered the security check (translate the codes to plain English)
2. Reassures them this is a standard security measure
3. Does NOT use technical jargon or code names
4. Is concise (max 50 words)

Return only the explanation text, no preamble.
`.trim();

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('Gemini API error:', err.message);
    // Fallback explanation
    return "We've detected some unusual activity on your account. This is a precautionary security check to ensure your payroll information is safe.";
  }
};

module.exports = { explainRisk };
