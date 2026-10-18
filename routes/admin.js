const express = require('express');
const mongoose = require('mongoose');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const AdminAction = require('../models/AdminAction');
const ScoredSubmission = require('../models/ScoredSubmission');
const Suggestion = require('../models/Suggestion');
const { hardDeleteUser } = require('../services/deletionRecomputeService');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — list all users for the admin panel
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name usn email role isActive cfHandle cfConnected lcUsername lcConnected createdAt')
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

// GET /api/admin/suggestions — list all user suggestions (admin only)
router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = await Suggestion.find()
      .populate('userId', 'name usn email')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/suggestions/:suggestionId/review — set status + reply
router.patch('/suggestions/:suggestionId/review', async (req, res) => {
  try {
    const { status, reply } = req.body;
    if (!mongoose.isValidObjectId(req.params.suggestionId)) {
      return res.status(400).json({ error: 'Invalid suggestion id' });
    }
    if (status !== undefined && !['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be pending, accepted or rejected' });
    }
    const replyText = typeof reply === 'string' ? reply.trim() : undefined;
    if (replyText !== undefined && replyText.length > 2000) {
      return res.status(400).json({ error: 'Reply must be under 2000 characters' });
    }

    const suggestion = await Suggestion.findById(req.params.suggestionId);
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });

    if (status !== undefined) suggestion.status = status;
    if (replyText !== undefined && replyText !== suggestion.adminReply) {
      const hadReply = !!suggestion.adminReply;
      suggestion.adminReply = replyText;
      if (!replyText) {
        suggestion.repliedAt = null;
        suggestion.replyUpdatedAt = null;
      } else if (hadReply) {
        suggestion.replyUpdatedAt = new Date(); // edited existing reply
      } else {
        suggestion.repliedAt = new Date();      // first reply
        suggestion.replyUpdatedAt = null;
      }
    }
    suggestion.reviewedBy = req.user._id;
    await suggestion.save();

    await suggestion.populate('userId', 'name usn email');
    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/suggestions/:suggestionId — dismiss/delete a suggestion
router.delete('/suggestions/:suggestionId', async (req, res) => {
  try {
    await Suggestion.findByIdAndDelete(req.params.suggestionId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;