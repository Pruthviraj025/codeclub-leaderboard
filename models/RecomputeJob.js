const mongoose = require('mongoose');

// Created when an admin hard-deletes a user. Worker picks this up async
// and recomputes rank/green-stars for weeks-touched ∩ last-4-calendar-weeks.
const RecomputeJobSchema = new mongoose.Schema({
  deletedUserSnapshot: {
    name: String,
    usn: String,
    email: String,
    cfHandle: String
  },
  weekIdsToRecompute: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Week' }],

  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: null },

  // Filled in as the job progresses — used to build the combined summary email
  emailQueue: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    changes: [{ weekNumber: Number, oldRank: Number, newRank: Number, oldOutcome: String, newOutcome: String }],
    sent: { type: Boolean, default: false }
  }],

  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

module.exports = mongoose.model('RecomputeJob', RecomputeJobSchema);
