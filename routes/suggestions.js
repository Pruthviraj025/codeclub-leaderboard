const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Suggestion = require('../models/Suggestion');

const router = express.Router();

// POST /api/suggestions — submit a new suggestion
router.post('/', requireAuth, async (req, res) => {
  try {
    const text = (req.body.text || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Suggestion text is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Keep it under 2000 characters' });
    }

    const suggestion = await Suggestion.create({
      userId: req.user._id,
      text
    });

    res.status(201).json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suggestions/mine — the current user's own suggestions, newest first
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const suggestions = await Suggestion.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
