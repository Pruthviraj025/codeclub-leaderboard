const mongoose = require('mongoose');

const WeekSchema = new mongoose.Schema({
  weekNumber: { type: Number, required: true, unique: true }, // sequential, e.g. 1, 2, 3...
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },

  status: { type: String, enum: ['open', 'finalized'], default: 'open' },
  finalizedAt: { type: Date, default: null },

  // Snapshot of results once finalized — avoids re-deriving from raw submissions every time
  // and is what the recompute job (last-4-weeks rule) mutates.
  results: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true },
    rank: { type: Number, required: true }, // position among that week's solvers
    outcome: { type: String, enum: ['green', 'none', 'red'], required: true }
  }],

  recomputedAt: { type: Date, default: null } // set whenever a deletion-triggered recompute touches this week
});

module.exports = mongoose.model('Week', WeekSchema);
