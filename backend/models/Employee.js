const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,  // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['employee', 'manager', 'admin', 'staff'],
      default: 'employee',
    },
    // Current payroll bank details
    bankAccount: {
      accountNumber: { type: String, default: '' },
      routingNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
    },
    // Trust-list: known devices and IPs for this employee
    knownDeviceIds: { type: [String], default: [] },
    knownIPs: { type: [String], default: [] },
    lastPasswordReset: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    // Account freeze (set by security staff)
    isFrozen: { type: Boolean, default: false },
    frozenReason: { type: String, default: '' },
    frozenAt: { type: Date },
    frozenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

// Hash password before saving
employeeSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare plain password to hash
employeeSchema.methods.matchPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

module.exports = mongoose.model('Employee', employeeSchema);
