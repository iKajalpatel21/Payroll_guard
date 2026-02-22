const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true, // e.g., 'DEPOSIT_CHANGE_SUBMITTED'
        },
        decision: {
            type: String,
            enum: ['Allow', 'Challenge', 'Block'],
            required: true,
        },
        reasonCodes: { type: [String], default: [] },
        deviceFingerprint: { type: String, default: '' },
        ipAddress: { type: String, default: '' },
        // Hash chaining for tamper-evident logs
        previousHash: { type: String, default: 'GENESIS' },
        currentHash: { type: String, required: true },
    },
    { timestamps: true }
);

// Hash generation logic before saving
auditEventSchema.pre('validate', function (next) {
    if (this.isModified('currentHash')) return next();

    const crypto = require('crypto');
    const dataString = `${this.employeeId}-${this.action}-${this.decision}-${this.reasonCodes.join(',')}-${this.deviceFingerprint}-${this.ipAddress}-${this.previousHash}-${this.createdAt || Date.now()}`;
    this.currentHash = crypto.createHash('sha256').update(dataString).digest('hex');
    next();
});

module.exports = mongoose.model('AuditEvent', auditEventSchema);
