const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  usn: { type: String, required: true, unique: true, trim: true, uppercase: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },

  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true }, // soft-remove flag (admin action)

  // --- Codeforces connection ---
  cfHandle: { type: String, default: null },
  cfConnected: { type: Boolean, default: false },
  cfConnectedAt: { type: Date, default: null }, // scoring only counts submissions after this
  cfVerification: {
    method: { type: String, default: 'compile_error' },
    verificationCode: { type: String, default: null }, // unused under fixed-problem method, kept for compatibility
    verifiedAt: { type: Date, default: null }
  },
  cfVerificationRequestedAt: { type: Date, default: null }, // start of the time window for verification submission
  lastCheckedSubmissionId: { type: Number, default: null }, // cursor for incremental CF pulls

  // --- Refresh cooldown ---
  lastRefreshAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
