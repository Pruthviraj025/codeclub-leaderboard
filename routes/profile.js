const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');

const router = express.Router();

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
            $sum: "$points"
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

    const submissions = await ScoredSubmission.find({
      userId: user._id
    })
      .sort({ solvedAt: -1 })
      .limit(100)
      .lean();

    const solvedSubmissions = submissions.map(s => {
      let contestId = s.contestId || null;
      let problemIndex = s.problemIndex || null;
      const isCf = s.platform === 'codeforces' || !s.platform;

      if (isCf && s.problemId) {
        const m = String(s.problemId).match(/^(\d+)([a-zA-Z0-9]+)$/);
        if (m) {
          contestId = m[1];
          problemIndex = m[2].toUpperCase();
        } else {
          problemIndex = s.problemId;
        }
      } else {
        problemIndex = s.problemId;
      }

      let problemUrl = null;
      if (isCf) {
        if (contestId && problemIndex) {
          problemUrl = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
        } else if (s.problemId) {
          problemUrl = `https://codeforces.com/problemset/problem/${s.problemId}`;
        }
      } else {
        if (s.problemId) {
          problemUrl = `https://leetcode.com/problems/${s.problemId}/`;
        }
      }

      return {
        _id: s._id,
        platform: s.platform || 'codeforces',
        problemId: s.problemId,
        problemName: s.problemName || (isCf && contestId && problemIndex ? `Contest ${contestId}${problemIndex}` : s.problemId),
        contestId,
        problemIndex,
        problemRating: s.problemRating,
        difficulty: s.difficulty,
        points: s.points,
        solvedAt: s.solvedAt,
        problemUrl
      };
    });

    const profile = {

      id: user._id,

      name: user.name,

      cfHandle: user.cfHandle,
      cfConnected: user.cfConnected,

      lcUsername: user.lcUsername,
      lcConnected: user.lcConnected,

      codeforcesPoints,
      leetcodePoints,
      totalPoints,
      solvedSubmissions

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