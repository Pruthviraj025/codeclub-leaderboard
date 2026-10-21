const express = require('express');
const { requireAuth } = require('../middleware/auth');
const ScoredSubmission = require('../models/ScoredSubmission');

const router = express.Router();
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(date) {
  return date.toISOString().slice(0, 10); 
}

function trailingDays() {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    days.push({
      date: dayKey(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    });
  }
  return days;
}

router.get('/days', requireAuth, (req, res) => {
  res.json({ days: trailingDays() });
});

router.get('/day/:date', requireAuth, async (req, res) => {
  try {
    const { date } = req.params; 
    const start = new Date(`${date}T00:00:00.000Z`);
    if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid date' });
    const end = new Date(start.getTime() + DAY_MS);

    const rows = await ScoredSubmission.aggregate([
      { $match: { userId: req.user._id, solvedAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$problemRating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      date,
      breakdown: rows.map(r => ({ rating: r._id ?? 'Unrated', count: r.count }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/range', requireAuth, async (req, res) => {
  try {
    const windowStart = new Date(Date.now() - WINDOW_MS);

    const rows = await ScoredSubmission.aggregate([
      { $match: { userId: req.user._id, solvedAt: { $gte: windowStart } } },
      { $group: { _id: '$problemRating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      windowStart,
      breakdown: rows.map(r => ({ rating: r._id ?? 'Unrated', count: r.count }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/deductions', requireAuth, async (req, res) => {
  try {
    const windowStart = new Date(Date.now() - WINDOW_MS);

    const rows = await ScoredSubmission.aggregate([
      { $match: { userId: req.user._id, solvedAt: { $gte: windowStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$solvedAt' } },
          points: { $sum: '$points' }
        }
      }
    ]);
    const byDate = new Map(rows.map(r => [r._id, r.points]));

    const forecast = trailingDays().map(d => ({
      date: d.date,
      label: d.label,
      pointsExpiring: byDate.get(d.date) || 0,
      expiresOn: dayKey(new Date(new Date(`${d.date}T00:00:00.000Z`).getTime() + WINDOW_MS))
    }));

    res.json({ forecast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
