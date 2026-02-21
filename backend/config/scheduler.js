const cron  = require('node-cron');
const { runPayrollCycle } = require('../services/payrollService');

/**
 * Payroll Schedule Configuration
 *
 * Default: Runs at 6:00 AM on the 1st and 15th of every month.
 * Cron syntax: '0 6 1,15 * *'
 *    ┌── minute (0)
 *    │  ┌── hour (6 AM)
 *    │  │  ┌── day of month (1st and 15th)
 *    │  │  │      ┌── month (every)
 *    │  │  │      │  ┌── day of week (every)
 *    │  │  │      │  │
 *    0  6  1,15   *  *
 *
 * Override in .env via PAYROLL_CRON_SCHEDULE.
 */
const PAYROLL_SCHEDULE = process.env.PAYROLL_CRON_SCHEDULE || '0 6 1,15 * *';

const startScheduler = () => {
  if (!cron.validate(PAYROLL_SCHEDULE)) {
    console.error(`❌ Invalid PAYROLL_CRON_SCHEDULE: "${PAYROLL_SCHEDULE}"`);
    return;
  }

  cron.schedule(PAYROLL_SCHEDULE, async () => {
    console.log('\n🕐 Cron triggered: Starting automatic payroll run...');
    try {
      const results = await runPayrollCycle();
      console.log(`✅ Scheduled payroll complete. Cycle: ${results.cycleId} | Paid: ${results.paid} | Held: ${results.held}`);
    } catch (err) {
      console.error('❌ Scheduled payroll failed:', err.message);
    }
  }, {
    timezone: 'America/New_York',   // adjust to your timezone
  });

  console.log(`📅 Payroll scheduler active — schedule: "${PAYROLL_SCHEDULE}" (America/New_York)`);
};

module.exports = { startScheduler };
