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
    // Only active users — admin soft-remove must actually hide them from the live board
    const users = await User.find({ _id: { $in: userIds }, isActive: true }, 'name cfHandle');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const leaderboard = totals
      .filter(t => userMap.has(t._id.toString()))
      .map((t, i) => {
        const u = userMap.get(t._id.toString());
        return {
          rank: i + 1,
          userId: t._id,
          name: u.name,
          cfHandle: u.cfHandle || null,
          points: t.points
        };
      });

    res.json({ weekNumber: week.weekNumber, leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leaderboard/history — finalized past weeks, with user names/handles populated
router.get('/history', requireAuth, async (req, res) => {
  try {
    const weeks = await Week.find({ status: 'finalized' })
      .sort({ weekNumber: -1 })
      .limit(20)
      .lean();

    const allUserIds = [...new Set(weeks.flatMap(w => w.results.map(r => r.userId.toString())))];
    const users = await User.find({ _id: { $in: allUserIds } }, 'name cfHandle');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const populated = weeks.map(w => ({
      _id: w._id,
      weekNumber: w.weekNumber,
      startsAt: w.startsAt,
      endsAt: w.endsAt,
      finalizedAt: w.finalizedAt,
      results: w.results
        .sort((a, b) => a.rank - b.rank)
        .map(r => {
          const u = userMap.get(r.userId.toString());
          return {
            userId: r.userId,
            name: u?.name || 'unknown',
            cfHandle: u?.cfHandle || null,
            points: r.points,
            rank: r.rank,
            outcome: r.outcome
          };
        })
    }));

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
