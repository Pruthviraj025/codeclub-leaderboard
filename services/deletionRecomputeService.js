const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');
const AdminAction = require('../models/AdminAction');

/**
 * Hard-deletes a user and their scored submissions.
 * No recompute job is needed: the leaderboard is a live rolling-7-day
 * aggregation, so removing the submissions immediately corrects everyone
 * else's standing on the next read — there's no stale snapshot to fix up.
 */
async function hardDeleteUser(userId, adminId, reason) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  await AdminAction.create({
    adminId,
    action: 'hard_delete',
    targetUserId: null, // will no longer exist
    targetUserSnapshot: { name: user.name, usn: user.usn, email: user.email, cfHandle: user.cfHandle },
    reason: reason || ''
  });

  await ScoredSubmission.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });
}

module.exports = { hardDeleteUser };
