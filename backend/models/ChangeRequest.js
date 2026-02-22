const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const changeRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    // changeType to support address changes
    changeType: {
      type: String,
      enum: ['BANK_ACCOUNT', 'ADDRESS'],
      default: 'BANK_ACCOUNT',
    },
    // Proposed new bank details
    newBankDetails: {
      accountNumber: { type: String, default: '' },
      routingNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    // Proposed new address
    newAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zip: { type: String, default: '' },
      country: { type: String, default: 'US' },
    },
    status: {
      type: String,
      enum: ['PENDING_OTP', 'PENDING_MANAGER', 'PENDING_MULTI_APPROVAL', 'APPROVED', 'DENIED', 'EXPIRED'],
      default: 'PENDING_OTP',
      index: true,
    },

    // Approval link token for multi-party email approvals
    approvalToken: { type: String, index: true },
    riskScore: { type: Number, required: true },
    reasonCodes: { type: [String], default: [] },
    decision: { type: String, enum: ['Allow', 'Challenge', 'Block'], required: true },
    verificationMethod: { type: String, enum: ['OTP', 'Manual', 'None'], default: 'None' },
    managerApprovalRequired: { type: Boolean, default: false },
    riskEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RiskEvent',
    },
    // OTP fields (only used when status === PENDING_OTP)
    otpHash: { type: String, select: false },
    otpExpiry: { type: Date },
    // Manager who actioned this request (if applicable)
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    reviewNote: { type: String, default: '' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// Hash OTP before storing
changeRequestSchema.methods.setOtp = async function (plainOtp) {
  const salt = await bcrypt.genSalt(10);
  this.otpHash = await bcrypt.hash(plainOtp, salt);
  this.otpExpiry = new Date(
    Date.now() + (parseInt(process.env.OTP_EXPIRE_MINUTES, 10) || 10) * 60 * 1000
  );
};

changeRequestSchema.methods.verifyOtp = async function (plainOtp) {
  if (Date.now() > this.otpExpiry) return false;   // expired
  return bcrypt.compare(plainOtp, this.otpHash);
};

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
