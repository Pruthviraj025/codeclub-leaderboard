const mongoose = require('mongoose');

const AdditionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  editedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const SuggestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  editedAt: { type: Date, default: null },
  additions: { type: [AdditionSchema], default: [] },

  // Admin review. Old docs have no status -> treated as 'pending' via default.
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  adminReply: { type: String, trim: true, maxlength: 2000, default: '' },
  repliedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  createdAt: { type: Date, default: Date.now }
});

SuggestionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Suggestion', SuggestionSchema);