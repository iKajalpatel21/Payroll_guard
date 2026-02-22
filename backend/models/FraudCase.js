const mongoose = require('mongoose');

const fraudCaseSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',    // staff member
    },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    type: {
      type: String,
      enum: ['ACCOUNT_TAKEOVER', 'CREDENTIAL_STUFFING', 'INSIDER_THREAT', 'PHISHING', 'PAYROLL_FRAUD', 'OTHER'],
      default: 'OTHER',
    },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    // Linked evidence
    linkedRiskEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RiskEvent' }],
    linkedPayrollIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' }],
    linkedChangeRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChangeRequest' }],
    // AI-generated scam analysis from Gemini
    aiSummary: { type: String, default: '' },
    aiRecommendations: { type: String, default: '' },
    // Case resolution
    resolution: { type: String, default: '' },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    // Embedded timeline of staff actions
    timeline: [
      {
        action:    { type: String },
        note:      { type: String },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('FraudCase', fraudCaseSchema);
