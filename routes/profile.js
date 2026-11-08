const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');

const router = express.Router();

function safeTimezone(tz) {
  if (!tz || typeof tz !== 'string') return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

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
    let codechefPoints = 0;

    for (const row of stats) {

      if (row._id === "codeforces") {
        codeforcesPoints = row.points;
      }

      if (row._id === "leetcode") {
        leetcodePoints = row.points;
      }

      if (row._id === "codechef") {
        codechefPoints = row.points;
      }

    }

    const totalPoints =
      codeforcesPoints +
      leetcodePoints +
      codechefPoints;

    const submissions = await ScoredSubmission.find({
      userId: user._id
    })
      .sort({ solvedAt: -1 })
      .limit(5)
      .lean();

    const solvedSubmissions = submissions.map(s => {
      let contestId = s.contestId || null;
      let problemIndex = s.problemIndex || null;
      const isCf = s.platform === 'codeforces' || !s.platform;
      const isCc = s.platform === 'codechef';

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
      } else if (isCc) {
        if (s.problemId) {
          problemUrl = `https://www.codechef.com/problems/${s.problemId}`;
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

    const tz = safeTimezone(req.query.tz);

    const heatmapAgg = await ScoredSubmission.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(user._id)
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$solvedAt", timezone: tz } },
            platform: "$platform"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const activityMap = {};
    for (const row of heatmapAgg) {
      const d = row._id.date;
      const plat = row._id.platform || 'codeforces';
      if (!activityMap[d]) {
        activityMap[d] = {
          total: 0,
          codeforces: 0,
          leetcode: 0,
          codechef: 0,
          platforms: []
        };
      }
      activityMap[d][plat] = (activityMap[d][plat] || 0) + row.count;
      activityMap[d].total += row.count;
      if (!activityMap[d].platforms.includes(plat)) {
        activityMap[d].platforms.push(plat);
      }
    }

    const profile = {

      id: user._id,

      name: user.name,
      createdAt: user.createdAt,

      cfHandle: user.cfHandle,
      cfConnected: user.cfConnected,

      lcUsername: user.lcUsername,
      lcConnected: user.lcConnected,

      ccHandle: user.ccHandle,
      ccConnected: user.ccConnected,

      codeforcesPoints,
      leetcodePoints,
      codechefPoints,
      totalPoints,
      solvedSubmissions,
      activityMap

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
