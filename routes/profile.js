const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');

const router = express.Router();

// PATCH /api/profile/me/email — update your own email
router.patch('/me/email', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const normalized = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalized, _id: { $ne: req.user._id } });
    if (existing) return res.status(409).json({ error: 'That email is already in use' });

    req.user.email = normalized;
    await req.user.save();

    res.json({ email: req.user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/:userId — view own or someone else's profile (public fields only)
// GET /api/profile/:userId
router.get('/:userId', requireAuth, async (req, res) => {
  try {

    const user = await User.findById(req.params.userId);

    if (!user || !user.isActive) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    const isOwner =
      user._id.toString() === req.user._id.toString();

    // ------------------------------------
    // Aggregate leaderboard points
    // ------------------------------------

    const stats = await ScoredSubmission.aggregate([
      {
        $match: {
          userId: user._id
        }
      },
      {
        $group: {
          _id: "$platform",
          points: {
            $sum: "$pointsAwarded"
          }
        }
      }
    ]);

    let codeforcesPoints = 0;
    let leetcodePoints = 0;

    for (const row of stats) {

      if (row._id === "codeforces") {
        codeforcesPoints = row.points;
      }

      if (row._id === "leetcode") {
        leetcodePoints = row.points;
      }

    }

    const totalPoints =
      codeforcesPoints +
      leetcodePoints;

    const profile = {

      id: user._id,

      name: user.name,

      cfHandle: user.cfHandle,
      cfConnected: user.cfConnected,

      lcUsername: user.lcUsername,
      lcConnected: user.lcConnected,

      codeforcesPoints,
      leetcodePoints,
      totalPoints

    };

    if (isOwner) {

      profile.usn = user.usn;
      profile.email = user.email;

    }

    res.json(profile);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});

module.exports = router;
