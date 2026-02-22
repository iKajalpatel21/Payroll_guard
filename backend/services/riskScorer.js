const RiskEvent = require('../models/RiskEvent');
const ChangeRequest = require('../models/ChangeRequest');
const Employee = require('../models/Employee');

/**
 * Calculate a risk score (0–100) for a deposit/address change attempt.
 * Returns { score, riskCodes }
 */
const calculateRiskScore = async (employee, ip, deviceId, extraContext = {}) => {
  let score = 0;
  const riskCodes = [];
  const now = new Date();

  // ── Signal 1: Unknown IP ──────────────────────────────────────────────────
  if (!employee.knownIPs.includes(ip)) {
    score += 30;
    riskCodes.push('UNKNOWN_IP');
  }

  // ── Signal 2: Unknown Device ──────────────────────────────────────────────
  if (!employee.knownDeviceIds.includes(deviceId) && deviceId !== 'UNKNOWN') {
    score += 30;
    riskCodes.push('UNKNOWN_DEVICE');
  }

  // ── Signal 3: Burst Activity (≥5 attempts in 10 min) ─────────────────────
  const tenMinAgo = new Date(now - 10 * 60 * 1000);
  const recentCount = await RiskEvent.countDocuments({
    employeeId: employee._id,
    createdAt: { $gte: tenMinAgo },
  });

  if (recentCount >= 5) {
    score += 40;
    riskCodes.push('BURST_ACTIVITY');
  } else if (recentCount >= 3) {
    score += 15;
    riskCodes.push('ELEVATED_FREQUENCY');
  }

  // ── Signal 4: Unusual Hour (midnight–6am) ─────────────────────────────────
  const hour = now.getHours();
  if (hour < 6 || hour >= 23) {
    score += 20;
    riskCodes.push('UNUSUAL_HOUR');
  }

  // ── Signal 5: Account Too New (< 30 days old) ────────────────────────────
  const ageMs = now - employee.createdAt;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 30) {
    score += 15;
    riskCodes.push('ACCOUNT_TOO_NEW');
  }

  // ── Signal 6: Post-Login Rush (change < 5 min after very first login) ─────
  if (extraContext.minutesSinceLogin !== undefined && extraContext.minutesSinceLogin < 5) {
    score += 30;
    riskCodes.push('POST_LOGIN_RUSH');
  }

  // ── Signal 7: Multi-Fail Then Success (≥3 failed high-risk attempts in 1h) ─
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const failedHighRisk = await RiskEvent.countDocuments({
    employeeId: employee._id,
    riskScore: { $gt: 70 },
    createdAt: { $gte: oneHourAgo },
  });
  if (failedHighRisk >= 3) {
    score += 40;
    riskCodes.push('MULTI_FAIL_THEN_SUCCESS');
  }

  // ── Signal 8: Same Routing Number Used by Multiple Employees (Money Mule) ──
  if (extraContext.newRoutingNumber) {
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const routingMatches = await Employee.countDocuments({
      _id: { $ne: employee._id },
      'bankAccount.routingNumber': extraContext.newRoutingNumber,
      updatedAt: { $gte: sevenDaysAgo },
    });
    if (routingMatches >= 2) {
      score += 35;
      riskCodes.push('NEW_ACCOUNT_SAME_ROUTING');
    }
  }

  // ── Signal 9: IP Geo-Correlation ──────────────────────────────────────────
  if (extraContext.geo) {
    const { geo, newBankDetails, newAddress } = extraContext;
    
    // VPN / Proxy / Datacenter detection
    if (geo.proxy || geo.hosting) {
      score += 35;
      riskCodes.push('VPN_DETECTED');
    }

    // Checking against Address (either the new address being updated, or current saved address)
    const targetAddress = newAddress || employee.address;
    
    // Only check if we have both sides
    if (geo.countryCode && targetAddress && targetAddress.country) {
      if (geo.countryCode.toLowerCase() !== targetAddress.country.toLowerCase() && targetAddress.country !== '') {
        score += 40;
        riskCodes.push('GEOGRAPHIC_MISMATCH');
      } else if (geo.region && targetAddress.state && geo.region.toLowerCase() !== targetAddress.state.toLowerCase()) {
        score += 20;
        riskCodes.push('REGION_MISMATCH');
      } else if (geo.countryCode === 'US' && !geo.proxy && !geo.hosting) {
        // Same country, same state, residential ISP -> Trust boost
        score -= 10;
        riskCodes.push('GEO_MATCH_TRUST');
      }
    }
  }

  // ── Signal 10: Baseline Bank Deviation ────────────────────────────────────
  // Compare against the very first trusted benchmark account entered at onboarding
  if (extraContext.newBankDetails && employee.baselineBankAccount && employee.baselineBankAccount.accountNumber) {
    const baseline = employee.baselineBankAccount;
    const incoming = extraContext.newBankDetails;

    // Highest Risk: Changing routing numbers entirely indicates a move to a new financial institution
    if (incoming.routingNumber !== baseline.routingNumber) {
      score += 40;
      riskCodes.push('BASELINE_DEVIATION_ROUTING');
    } 
    // Moderate Risk: Changing account numbers within the same institution
    else if (incoming.accountNumber !== baseline.accountNumber) {
      score += 20;
      riskCodes.push('BASELINE_DEVIATION_ACCOUNT');
    }
  }

  // ── Signal 11: High Historical Risk ───────────────────────────────────────
  const histPipeline = [
    { $match: { employeeId: employee._id, createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } } },
    { $group: { _id: null, avgScore: { $avg: '$riskScore' } } },
  ];
  const [hist] = await RiskEvent.aggregate(histPipeline);
  if (hist?.avgScore > 60) {
    score += 10;
    riskCodes.push('HIGH_HISTORICAL_RISK');
  }

  return { score: Math.min(score, 100), riskCodes };
};

/**
 * Convert a score to a verification path.
 * Also accounts for Gemini override (BLOCK).
 */
const getVerificationPath = (score, geminiRecommendation = null) => {
  if (geminiRecommendation === 'BLOCK') return 'BLOCK';
  if (score < 30)  return 'AUTO_APPROVE';
  if (score <= 70) return 'OTP_REQUIRED';
  return 'MANAGER_REQUIRED';
};

module.exports = { calculateRiskScore, getVerificationPath };
