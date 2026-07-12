const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { refreshUserScore } = require('../services/scoringService');
const Week = require('../models/Week');
const ScoredSubmission = require('../models/ScoredSubmission');
const User = require('../models/User');

const router = express.Router();

// POST /api/leaderboard/refresh — the refresh button
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const result = await refreshUserScore(req.user._id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/leaderboard/current — live standings for the open week
router.get('/current', requireAuth, async (req, res) => {
  try {
    const week = await Week.findOne({ status: 'open' });
    if (!week) return res.status(404).json({ error: 'No open week' });

    const totals = await ScoredSubmission.aggregate([
      { $match: { weekId: week._id } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $sort: { points: -1 } }
    ]);

    const userIds = totals.map(t => t._id);
    const users = await User.find({ _id: { $in: userIds } }, 'name usn');
    const nameMap = new Map(users.map(u => [u._id.toString(), u.name]));

    const leaderboard = totals.map((t, i) => ({
      rank: i + 1,
      userId: t._id,
      name: nameMap.get(t._id.toString()),
      points: t.points
    }));

    res.json({ weekNumber: week.weekNumber, leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard/history — finalized past weeks
router.get('/history', requireAuth, async (req, res) => {
  try {
    const weeks = await Week.find({ status: 'finalized' }).sort({ weekNumber: -1 }).limit(10);
    res.json(weeks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
