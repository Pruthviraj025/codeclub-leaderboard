const mongoose = require('mongoose');

const StarSchema = new mongoose.Schema({
  type: { type: String, enum: ['green', 'red'], required: true },
  weekId: { type: mongoose.Schema.Types.ObjectId, ref: 'Week', required: true },
  rank: { type: Number }, // only meaningful for green stars (1, 2, 3, or position for %-split weeks)
  awardedAt: { type: Date, default: Date.now },
  clearedAt: { type: Date, default: null }, // for red stars only — when it was cleared
  clearedByWeekId: { type: mongoose.Schema.Types.ObjectId, ref: 'Week', default: null }
}, { _id: true });

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

  // --- Stars (append-only, see StarSchema) ---
  stars: { type: [StarSchema], default: [] },

  createdAt: { type: Date, default: Date.now }
});

// Virtuals for convenience
UserSchema.virtual('greenStarCount').get(function () {
  return (this.stars || []).filter(s => s.type === 'green').length;
});
UserSchema.virtual('activeRedStarCount').get(function () {
  return (this.stars || []).filter(s => s.type === 'red' && !s.clearedAt).length;
});

UserSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);