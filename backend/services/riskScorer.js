const RiskEvent = require('../models/RiskEvent');

/**
 * Calculates a risk score (0–100) for a deposit change attempt.
 * Factors:
 *  - New IP not in employee's known IPs
 *  - New device not in employee's known devices
 *  - Burst activity: ≥5 change attempts in the last 10 minutes (credential stuffing)
 *  - Velocity: multiple events in the last 1 hour
 *
 * Returns: { score, riskCodes }
 */
const calculateRiskScore = async (employee, ip, deviceId) => {
  const riskCodes = [];
  let score = 0;

  // --- Factor 1: Unknown IP ---
  const knownIP = employee.knownIPs.includes(ip);
  if (!knownIP) {
    riskCodes.push('ERR_LOC_NEW');
    score += 30;
  }

  // --- Factor 2: Unknown Device ---
  const knownDevice = employee.knownDeviceIds.includes(deviceId);
  if (!knownDevice) {
    riskCodes.push('ERR_DEV_NOVEL');
    score += 30;
  }

  // --- Factor 3: Burst Activity (credential stuffing detector) ---
  // Count change attempts in the last 10 minutes from ANY IP/device
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentBurst = await RiskEvent.countDocuments({
    employeeId: employee._id,
    action: 'DEPOSIT_CHANGE_ATTEMPT',
    createdAt: { $gte: tenMinutesAgo },
  });
  if (recentBurst >= 5) {
    riskCodes.push('ERR_VELOCITY_HIGH');
    score += 40;
  } else if (recentBurst >= 3) {
    riskCodes.push('ERR_VELOCITY_MED');
    score += 15;
  }

  // --- Factor 4: Recent Password Reset ---
  if (employee.lastPasswordReset) {
    const hoursSinceReset = (Date.now() - new Date(employee.lastPasswordReset).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset < 24) {
      riskCodes.push('ERR_PW_RESET_RECENT');
      score += 40;
    }
  }

  // --- Factor 4: Aggregation Pipeline – Risk Timeline ---
  // Look at last 10 risk events; if average score is high, add penalty
  const timeline = await RiskEvent.aggregate([
    {
      $match: {
        employeeId: employee._id,
        action: 'DEPOSIT_CHANGE_ATTEMPT',
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 10 },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$riskScore' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (timeline.length > 0 && timeline[0].avgScore > 60) {
    riskCodes.push('ERR_HIST_RISK');
    score += 10;
  }

  // Cap at 100
  score = Math.min(score, 100);

  return { score, riskCodes };
};

/**
 * Determines the decision based on score.
 * Returns: 'Allow' | 'Challenge' | 'Block'
 */
const getVerificationPath = (score) => {
  if (score < 30) return 'Allow';
  if (score <= 70) return 'Challenge';
  return 'Block';
};

module.exports = { calculateRiskScore, getVerificationPath };
