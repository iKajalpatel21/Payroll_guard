const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'HIGH_RISK_BURST',
        'ACCOUNT_TAKEOVER',
        'CREDENTIAL_STUFFING',
        'PAYROLL_HELD',
        'ACCOUNT_FROZEN',
        'NEW_FRAUD_CASE',
        'MANUAL',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'WARNING',
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      index: true,
    },
    message: { type: String, required: true },
    details:  { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead:   { type: Boolean, default: false, index: true },
    linkedCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FraudCase',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
