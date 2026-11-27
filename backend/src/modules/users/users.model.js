const mongoose = require('mongoose');

/*
  Admin view of the mobile app's users (P04, P05).

  The fields match the User model in Ride_share_Backend, so this model can later read the
  real "users" collection by changing only MONGO_URL.

  PRIVACY: passwordHash, the OTP fields, googleId and profilePhotoPublicId are deliberately
  NOT defined here. The admin panel never needs them, and USER_PUBLIC_FIELDS below is the
  only list of fields any admin query may load.

  ADMIN-ONLY FIELDS (marked below) do not exist in the mobile backend yet. They must be added
  there too, so a suspended user is actually blocked from signing in to the app.
*/
const userSchema = new mongoose.Schema(
  {
    // Same as Ride_share_Backend
    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ['driver', 'passenger'], default: 'passenger', required: true },
    gender: { type: String, enum: ['male', 'female', 'prefer_not_to_say'] },
    dateOfBirth: { type: Date },
    profilePhotoUrl: { type: String, trim: true },
    emailVerified: { type: Boolean, default: false },

    // ADMIN-ONLY: account status used by suspend / reactivate (P04, P05)
    status: { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
    suspendedUntil: { type: Date, default: null }, // null while suspended = permanent
    suspensionReason: { type: String, default: null },

    // ADMIN-ONLY: increases on every admin change. The frontend sends it back when saving;
    // a mismatch means someone else changed the user first (409 CONFLICT).
    version: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'users' }
);

// The ONLY fields an admin query may load. Never add password, OTP or token fields here.
const USER_PUBLIC_FIELDS =
  'name mobile email authProvider role gender dateOfBirth profilePhotoUrl emailVerified ' +
  'status suspendedUntil suspensionReason version createdAt updatedAt';

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = { User, USER_PUBLIC_FIELDS };