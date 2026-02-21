const Alert = require('../models/Alert');

/**
 * Creates an Alert document for security staff.
 * Called automatically from riskController when thresholds are crossed.
 */
const createAlert = async ({ type, severity = 'WARNING', employeeId, message, details = {}, linkedCaseId }) => {
  try {
    const alert = await Alert.create({ type, severity, employeeId, message, details, linkedCaseId });
    console.log(`🚨 Alert created [${severity}]: ${message}`);
    return alert;
  } catch (err) {
    console.error('Failed to create alert:', err.message);
  }
};

/**
 * Decides whether to auto-alert based on risk codes or score.
 * Called after every risk check.
 */
const autoAlert = async (employeeId, employeeName, riskScore, riskCodes) => {
  if (riskScore >= 80 || riskCodes.includes('BURST_ACTIVITY')) {
    await createAlert({
      type: 'ACCOUNT_TAKEOVER',
      severity: 'CRITICAL',
      employeeId,
      message: `🚨 Critical risk detected on ${employeeName}'s account. Score: ${riskScore}. Codes: ${riskCodes.join(', ')}.`,
      details: { riskScore, riskCodes },
    });
  } else if (riskScore >= 60 || riskCodes.includes('BURST_ACTIVITY')) {
    await createAlert({
      type: 'HIGH_RISK_BURST',
      severity: 'WARNING',
      employeeId,
      message: `⚠️ High-risk deposit change attempt by ${employeeName}. Score: ${riskScore}.`,
      details: { riskScore, riskCodes },
    });
  }
};

module.exports = { createAlert, autoAlert };
