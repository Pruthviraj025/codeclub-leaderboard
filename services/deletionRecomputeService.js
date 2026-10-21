const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');
const AdminAction = require('../models/AdminAction');

async function hardDeleteUser(userId, adminId, reason) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  await AdminAction.create({
    adminId,
    action: 'hard_delete',
    targetUserId: null, 
    targetUserSnapshot: { name: user.name, usn: user.usn, email: user.email, cfHandle: user.cfHandle },
    reason: reason || ''
  });

  await ScoredSubmission.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
}

module.exports = { hardDeleteUser };
