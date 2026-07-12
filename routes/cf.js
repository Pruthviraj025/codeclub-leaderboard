const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { generateVerificationCode, checkVerification } = require('../services/cfVerificationService');

const router = express.Router();

// POST /api/cf/start-verification { cfHandle }
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

// POST /api/cf/verify
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const result = await checkVerification(req.user._id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
