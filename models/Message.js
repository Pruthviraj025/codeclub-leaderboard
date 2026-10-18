const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  editedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);