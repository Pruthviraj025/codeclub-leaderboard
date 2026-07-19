const mongoose = require('mongoose');

// One row per (user, problem) that has ever been scored — this is the dedup safety net.
// A unique index enforces "first solve only" at the DB level, independent of app logic.
const ScoredSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Codeforces problem identity: contestId + index (e.g. "1234A") uniquely identifies a problem
  problemId: { type: String, required: true }, // e.g. "1234A"
  problemRating: { type: Number, required: true }, // 800-3500, used to resolve points via the mapping table
  points: { type: Number, required: true }, // resolved value at time of scoring (table is fixed, but store it — never recompute silently)

  cfSubmissionId: { type: Number, required: true }, // raw CF submission id, for audit/debug
  solvedAt: { type: Date, required: true }, // CF submission creationTimeSeconds — rolling 7-day window is computed live off this

  reviewStatus: { type: String, enum: ['unreviewed', 'cleared', 'flagged'], default: 'unreviewed' },

  createdAt: { type: Date, default: Date.now }
});

// The actual anti-double-count guarantee: one scored row per user+problem, ever.
ScoredSubmissionSchema.index({ userId: 1, problemId: 1 }, { unique: true });

module.exports = mongoose.model('ScoredSubmission', ScoredSubmissionSchema);
