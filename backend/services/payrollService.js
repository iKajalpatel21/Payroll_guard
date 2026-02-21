const Employee      = require('../models/Employee');
const ChangeRequest = require('../models/ChangeRequest');
const RiskEvent     = require('../models/RiskEvent');
const Payroll       = require('../models/Payroll');

/**
 * Core automatic payroll processing function.
 *
 * For each active employee:
 *  1. Check for any PENDING_MANAGER change requests  → HOLD
 *  2. Check for recently approved high-risk changes  → HOLD (cooling period: 24h)
 *  3. Otherwise                                      → PAID
 *
 * Returns a summary object with counts.
 */
const runPayrollCycle = async (options = {}) => {
  const {
    payDate        = new Date(),
    payPeriodStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    payPeriodEnd   = new Date(),
    defaultAmount  = 3500,   // ← replace with real HR payroll amount logic
  } = options;

  // Unique cycle ID e.g. "2025-06-15"
  const cycleId = payDate.toISOString().split('T')[0];

  // Skip if this cycle already ran
  const alreadyRan = await Payroll.exists({ cycleId });
  if (alreadyRan) {
    console.log(`⚠️  Payroll cycle ${cycleId} already processed. Skipping.`);
    return { skipped: true, cycleId };
  }

  console.log(`\n💰 Starting payroll cycle: ${cycleId}`);
  console.log(`   Period: ${payPeriodStart.toDateString()} → ${payPeriodEnd.toDateString()}`);

  const employees = await Employee.find({ isActive: true });
  const results   = { cycleId, paid: 0, held: 0, total: employees.length, records: [] };

  for (const employee of employees) {
    let status     = 'PAID';
    let holdReason = '';
    let riskScore  = 0;
    let flaggedId  = null;

    // ── Check 1: Any PENDING_MANAGER change request? ─────────────────────────
    const pendingReq = await ChangeRequest.findOne({
      employeeId: employee._id,
      status: 'PENDING_MANAGER',
    });

    if (pendingReq) {
      status     = 'HELD';
      holdReason = 'Payroll held: a high-risk bank account change is awaiting manager approval.';
      riskScore  = pendingReq.riskScore;
      flaggedId  = pendingReq._id;
    }

    // ── Check 2: Recent high-risk APPROVED change (cooling-off: last 24h) ────
    if (status === 'PAID') {
      const coolOffWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentHighRisk = await ChangeRequest.findOne({
        employeeId: employee._id,
        status: 'APPROVED',
        riskScore: { $gt: 60 },
        updatedAt: { $gte: coolOffWindow },
      });

      if (recentHighRisk) {
        status     = 'HELD';
        holdReason = `Payroll held: bank details were recently changed with a high risk score (${recentHighRisk.riskScore}). 24-hour cooling-off applied.`;
        riskScore  = recentHighRisk.riskScore;
        flaggedId  = recentHighRisk._id;
      }
    }

    // ── Check 3: Burst activity in last hour? ─────────────────────────────────
    if (status === 'PAID') {
      const oneHourAgo  = new Date(Date.now() - 60 * 60 * 1000);
      const burstEvents = await RiskEvent.countDocuments({
        employeeId: employee._id,
        action: 'DEPOSIT_CHANGE_ATTEMPT',
        riskScore: { $gt: 70 },
        createdAt: { $gte: oneHourAgo },
      });

      if (burstEvents >= 3) {
        status     = 'HELD';
        holdReason = `Payroll held: ${burstEvents} high-risk deposit change attempts detected in the last hour.`;
      }
    }

    // ── Create Payroll record ─────────────────────────────────────────────────
    const record = await Payroll.create({
      employeeId:             employee._id,
      paidToBankAccount:      employee.bankAccount,
      amount:                 defaultAmount,
      payPeriodStart,
      payPeriodEnd,
      payDate,
      status,
      holdReason,
      riskScoreAtProcessing: riskScore,
      flaggedChangeRequestId: flaggedId,
      cycleId,
    });

    results.records.push({ employee: employee.name, status, holdReason });
    status === 'PAID' ? results.paid++ : results.held++;

    console.log(`   ${status === 'PAID' ? '✅' : '🔴'} ${employee.name} → ${status}`);
    if (holdReason) console.log(`      └─ ${holdReason}`);
  }

  console.log(`\n✅ Payroll cycle ${cycleId} complete: ${results.paid} paid, ${results.held} held.\n`);
  return results;
};

module.exports = { runPayrollCycle };
