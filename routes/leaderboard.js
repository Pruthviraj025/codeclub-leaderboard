const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { refreshUserScore } = require('../services/scoringService');
const ScoredSubmission = require('../models/ScoredSubmission');
const User = require('../models/User');

const router = express.Router();

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // rolling 7 days

// POST /api/leaderboard/refresh — the refresh button
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const result = await refreshUserScore(req.user._id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/leaderboard/current — live standings: solves accepted in the trailing 7 days
router.get('/current', requireAuth, async (req, res) => {
  try {
    const windowStart = new Date(Date.now() - WINDOW_MS);

    const totals = await ScoredSubmission.aggregate([
      { $match: { solvedAt: { $gte: windowStart } } },
      { $group: { _id: '$userId', points: { $sum: '$points' } } },
      { $sort: { points: -1 } }
    ]);

    const userIds = totals.map(t => t._id);
    // Only active users — admin soft-remove must actually hide them from the live board
    const users = await User.find({ _id: { $in: userIds }, isActive: true }, 'name cfHandle lastRefreshAt');
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const leaderboard = totals
      .filter(t => userMap.has(t._id.toString()))
      .map(t => ({ ...t, user: userMap.get(t._id.toString()) }))
      // Same points → whoever refreshed (and so locked in that total) earliest ranks higher.
      // No refresh timestamp sorts last among ties.
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aTime = a.user.lastRefreshAt ? a.user.lastRefreshAt.getTime() : Infinity;
        const bTime = b.user.lastRefreshAt ? b.user.lastRefreshAt.getTime() : Infinity;
        return aTime - bTime;
      })
      .map((t, i) => ({
        rank: i + 1,
        userId: t._id,
        name: t.user.name,
        cfHandle: t.user.cfHandle || null,
        points: t.points
      }));

    res.json({ windowStart, leaderboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
