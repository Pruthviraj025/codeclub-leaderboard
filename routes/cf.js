const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');
const { generateVerificationCode, checkVerification } = require('../services/cfVerificationService');

const router = express.Router();

router.post('/start-verification', requireAuth, async (req, res) => {
  try {
    const { cfHandle } = req.body;
    if (!cfHandle) return res.status(400).json({ error: 'cfHandle is required' });

    const result = await generateVerificationCode(req.user._id, cfHandle);
    res.json({
      ...result,
      problemUrl: `https://codeforces.com/problemset/problem/${result.contestId}/${result.problemIndex}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/verify', requireAuth, async (req, res) => {
  try {
    const result = await checkVerification(req.user._id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.cfConnected = false;
    user.cfHandle = null;
    user.cfConnectedAt = null;
    user.lastCheckedSubmissionId = null;
    user.cfVerification = {
      method: 'compile_error',
      verificationCode: null,
      verifiedAt: null
    };
    user.cfVerificationRequestedAt = null;

    await user.save();

    await ScoredSubmission.deleteMany({ userId: user._id, platform: 'codeforces' });

    res.json({
      success: true,
      message: 'Codeforces account disconnected.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

