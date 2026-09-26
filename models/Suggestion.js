const mongoose = require('mongoose');

const SuggestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now }
});

SuggestionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Suggestion', SuggestionSchema);