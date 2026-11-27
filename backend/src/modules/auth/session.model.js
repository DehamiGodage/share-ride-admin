//Store and manage admin login sessions.ex:session 1 -chrome,session 2-firefox

const mongoose = require('mongoose');

// One row per signed-in browser. The refresh token is stored only as a hash.
const sessionSchema = new mongoose.Schema(
  {
    adminId: { type: String, required: true, index: true },
    refreshHash: { type: String, required: true, unique: true },
    userAgent: String,
    ip: String,
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // refresh must happen before this (30 minutes of inactivity)
    revokedAt: Date,
    absoluteExpiresAt: { type: Date, required: true },
  },
  { collection: 'admin_sessions', timestamps: true }
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // MongoDB deletes old rows a day later

module.exports = mongoose.models.AdminSession || mongoose.model('AdminSession', sessionSchema);
