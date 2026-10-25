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

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name usn email role isActive cfHandle cfConnected lcUsername lcConnected createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/submissions', async (req, res) => {
  try {
    const status = req.query.status || 'unreviewed';
    const submissions = await ScoredSubmission.find({ reviewStatus: status })
      .populate('userId', 'name usn cfHandle lcUsername')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const enriched = submissions.map(s => {
      let contestId = s.contestId || null;
      let problemIndex = s.problemIndex || null;
      const submissionId = s.submissionId || s.cfSubmissionId || s.lcSubmissionId || null;
      const isCf = s.platform === 'codeforces' || !s.platform;

      if (isCf && s.problemId) {
        const m = String(s.problemId).match(/^(\d+)([a-zA-Z0-9]+)$/);
        if (m) {
          contestId = contestId || m[1];
          problemIndex = problemIndex || m[2].toUpperCase();
        } else if (!problemIndex) {
          problemIndex = s.problemId;
        }
      } else if (!problemIndex && s.problemId) {
        problemIndex = s.problemId;
      }

      let problemUrl = null;
      let submissionUrl = null;

      if (isCf) {
        if (contestId && problemIndex) {
          problemUrl = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
        } else if (s.problemId) {
          problemUrl = `https://codeforces.com/problemset/problem/${s.problemId}`;
        }
        if (contestId && s.cfSubmissionId) {
          submissionUrl = `https://codeforces.com/contest/${contestId}/submission/${s.cfSubmissionId}`;
        } else if (s.cfSubmissionId) {
          submissionUrl = `https://codeforces.com/submission/${s.cfSubmissionId}`;
        }
      } else {
        if (s.problemId) {
          problemUrl = `https://leetcode.com/problems/${s.problemId}/`;
        }
        if (s.lcSubmissionId) {
          submissionUrl = `https://leetcode.com/submissions/detail/${s.lcSubmissionId}/`;
        }
      }

      return {
        ...s,
        contestId,
        problemIndex,
        submissionId,
        problemUrl,
        submissionUrl
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.delete('/users/:userId', async (req, res) => {
  try {
    await hardDeleteUser(req.params.userId, req.user._id, req.body.reason);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

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

router.get('/audit-log', async (req, res) => {
  try {
    const actions = await AdminAction.find().sort({ createdAt: -1 }).limit(100);
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    if (reply !== undefined && !replyText) {
      return res.status(400).json({ error: 'Reply cannot be empty' });
    }
    if (replyText !== undefined && replyText.length > 2000) {
      return res.status(400).json({ error: 'Reply must be under 2000 characters' });
    }

    const suggestion = await Suggestion.findById(req.params.suggestionId);
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });

    if ((status === 'accepted' || status === 'rejected') && !suggestion.adminReply && !replyText) {
      return res.status(400).json({ error: 'Send a reply before accepting or rejecting' });
    }

    if (replyText !== undefined && replyText !== suggestion.adminReply) {
      const hadReply = !!suggestion.adminReply;
      if (hadReply && suggestion.repliedAt &&
          Date.now() - new Date(suggestion.repliedAt).getTime() > 5 * 60 * 1000) {
        return res.status(403).json({ error: 'Edit window closed. Replies can only be changed within 5 minutes of sending.' });
      }
      suggestion.adminReply = replyText;
      if (hadReply) {
        suggestion.replyUpdatedAt = new Date(); 
      } else {
        suggestion.repliedAt = new Date();      
        suggestion.replyUpdatedAt = null;
      }
    }
    if (status !== undefined) suggestion.status = status;
    suggestion.reviewedBy = req.user._id;
    await suggestion.save();

    await suggestion.populate('userId', 'name usn email');
    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/suggestions/:suggestionId', async (req, res) => {
  try {
    await Suggestion.findByIdAndDelete(req.params.suggestionId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;