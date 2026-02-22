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
    // Proposed new bank details
    newBankDetails: {
      accountNumber: { type: String, required: true },
      routingNumber: { type: String, required: true },
      bankName: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['PENDING_OTP', 'PENDING_MANAGER', 'APPROVED', 'DENIED', 'EXPIRED'],
      default: 'PENDING_OTP',
      index: true,
    },
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
