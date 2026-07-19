const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const AdminAction = require('../models/AdminAction');
const ScoredSubmission = require('../models/ScoredSubmission');
const { hardDeleteUser } = require('../services/deletionRecomputeService');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — list all users for the admin panel
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name usn email role isActive cfHandle cfConnected createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/submissions?status=unreviewed — list scored submissions for plagiarism review
router.get('/submissions', async (req, res) => {
  try {
    const status = req.query.status || 'unreviewed';
    const submissions = await ScoredSubmission.find({ reviewStatus: status })
      .populate('userId', 'name usn cfHandle')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:userId/soft-remove
router.post('/users/:userId/soft-remove', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isActive = false;
    await user.save();

    await AdminAction.create({
      adminId: req.user._id,
      action: 'soft_remove',
      targetUserId: user._id,
      targetUserSnapshot: { name: user.name, usn: user.usn, email: user.email, cfHandle: user.cfHandle },
      reason: req.body.reason || ''
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:userId/reactivate
router.post('/users/:userId/reactivate', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isActive = true;
    await user.save();

    await AdminAction.create({
      adminId: req.user._id,
      action: 'reactivate',
      targetUserId: user._id,
      targetUserSnapshot: { name: user.name, usn: user.usn, email: user.email, cfHandle: user.cfHandle },
      reason: req.body.reason || ''
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:userId — hard delete (live leaderboard corrects itself, no recompute job needed)
router.delete('/users/:userId', async (req, res) => {
  try {
    await hardDeleteUser(req.params.userId, req.user._id, req.body.reason);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/admin/submissions/:submissionId/review { status: 'cleared' | 'flagged' }
router.patch('/submissions/:submissionId/review', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['cleared', 'flagged'].includes(status)) {
      return res.status(400).json({ error: 'status must be cleared or flagged' });
    }

    const submission = await ScoredSubmission.findByIdAndUpdate(
      req.params.submissionId,
      { reviewStatus: status },
      { new: true }
    );
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    await AdminAction.create({
      adminId: req.user._id,
      action: status === 'flagged' ? 'flag_submission' : 'clear_flag',
      targetUserId: submission.userId,
      reason: req.body.reason || ''
    });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-log — recent admin actions
router.get('/audit-log', async (req, res) => {
  try {
    const actions = await AdminAction.find().sort({ createdAt: -1 }).limit(100);
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
