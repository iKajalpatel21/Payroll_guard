const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    // The bank account details that were USED for this payroll run
    paidToBankAccount: {
      accountNumber: String,
      routingNumber:  String,
      bankName:       String,
    },
    // Gross pay amount (HR sets this; for demo, we auto-assign)
    amount: { type: Number, required: true, min: 0 },
    // Pay period
    payPeriodStart: { type: Date, required: true },
    payPeriodEnd:   { type: Date, required: true },
    payDate:        { type: Date, required: true },
    // Processing status
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'HELD', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    // Why it was held (security reason)
    holdReason: { type: String, default: '' },
    // Risk snapshot at time of payroll run
    riskScoreAtProcessing: { type: Number, default: 0 },
    // Reference to the flagged ChangeRequest, if any
    flaggedChangeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChangeRequest',
    },
    // Who released a HELD payroll (admin/manager)
    releasedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    releasedAt:  { type: Date },
    releaseNote: { type: String, default: '' },
    // Cycle identifier (e.g. "2025-06-01") for grouping
    cycleId: { type: String, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payroll', payrollSchema);
