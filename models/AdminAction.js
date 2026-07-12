const mongoose = require('mongoose');

const AdminActionSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['soft_remove', 'reactivate', 'hard_delete', 'flag_submission', 'clear_flag'], required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // may be null after hard delete completes
  targetUserSnapshot: { // preserved so the log is still meaningful after a hard delete removes the User row
    name: String,
    usn: String,
    email: String,
    cfHandle: String
  },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminAction', AdminActionSchema);
