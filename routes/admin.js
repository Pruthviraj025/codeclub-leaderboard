const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const AdminAction = require('../models/AdminAction');
const ScoredSubmission = require('../models/ScoredSubmission');
const { hardDeleteUser, processRecomputeJob } = require('../services/deletionRecomputeService');
const { sendRecomputeEmails } = require('../services/emailService');

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

// DELETE /api/admin/users/:userId — hard delete + kick off recompute job
router.delete('/users/:userId', async (req, res) => {
  try {
    const job = await hardDeleteUser(req.params.userId, req.user._id, req.body.reason);
    // Fire-and-forget: in production this should be picked up by a worker/cron,
    // not run inline. Kept inline here for simplicity.
    processRecomputeJob(job._id)
      .then(() => sendRecomputeEmails(job._id))
      .catch(err => console.error('Recompute job or email send failed:', err));
    res.json({ success: true, jobId: job._id });
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

const RecomputeJob = require('../models/RecomputeJob');

// GET /api/admin/recompute-jobs/:jobId — check status, useful after a hard-delete
router.get('/recompute-jobs/:jobId', async (req, res) => {
  try {
    const job = await RecomputeJob.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/recompute-jobs/:jobId/resend-emails — retry any unsent emails
router.post('/recompute-jobs/:jobId/resend-emails', async (req, res) => {
  try {
    const result = await sendRecomputeEmails(req.params.jobId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
