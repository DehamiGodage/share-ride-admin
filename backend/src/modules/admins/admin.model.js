const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['super_admin', 'operations', 'safety', 'analyst'], required: true },
    status: { type: String, enum: ['active', 'deactivated'], default: 'active' },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
      backupCodes: { type: [{ hash: String, usedAt: Date }], select: false, default: [] },
    },
    trustedDevices: { type: [{ hash: String, expiresAt: Date, userAgent: String }], select: false, default: [] },
    challengeHash: { type: String, select: false },
    lastTotpStep: Number,
    failedAttempts: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
    passwordChangedAt: Date,
    resetHash: { type: String, select: false },
    resetExpires: { type: Date, select: false },
  },
  { collection: 'admin_users', timestamps: true }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
