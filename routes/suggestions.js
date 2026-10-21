const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const Suggestion = require('../models/Suggestion');

const router = express.Router();

const MAX_LEN = 2000;
const MAX_ADDITIONS = 20;
const EDIT_WINDOW_MS = 5 * 60 * 1000; 

function editExpired(createdAt) {
  return Date.now() - new Date(createdAt).getTime() > EDIT_WINDOW_MS;
}
const EXPIRED_MSG = 'Edit window closed. You can only edit within 5 minutes of sending.';

function validateText(raw) {
  const text = (raw || '').trim();
  if (!text) return { error: 'Suggestion text is required' };
  if (text.length > MAX_LEN) return { error: `Keep it under ${MAX_LEN} characters` };
  return { text };
}

async function findOwned(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ error: 'Invalid suggestion id' });
    return null;
  }
  const suggestion = await Suggestion.findOne({ _id: req.params.id, userId: req.user._id });
  if (!suggestion) {
    res.status(404).json({ error: 'Suggestion not found' });
    return null;
  }
  return suggestion;
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const { text, error } = validateText(req.body.text);
    if (error) return res.status(400).json({ error });

    const suggestion = await Suggestion.create({
      userId: req.user._id,
      text
    });

    res.status(201).json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { text, error } = validateText(req.body.text);
    if (error) return res.status(400).json({ error });

    const suggestion = await findOwned(req, res);
    if (!suggestion) return;

    if (suggestion.text !== text) {
      if (editExpired(suggestion.createdAt)) return res.status(403).json({ error: EXPIRED_MSG });
      suggestion.text = text;
      suggestion.editedAt = new Date();
      await suggestion.save();
    }

    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/additions', requireAuth, async (req, res) => {
  try {
    const { text, error } = validateText(req.body.text);
    if (error) return res.status(400).json({ error });

    const suggestion = await findOwned(req, res);
    if (!suggestion) return;

    if (suggestion.additions.length >= MAX_ADDITIONS) {
      return res.status(400).json({ error: `You can add up to ${MAX_ADDITIONS} follow-ups per suggestion` });
    }

    suggestion.additions.push({ text });
    await suggestion.save();

    res.status(201).json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/additions/:additionId', requireAuth, async (req, res) => {
  try {
    const { text, error } = validateText(req.body.text);
    if (error) return res.status(400).json({ error });

    if (!mongoose.isValidObjectId(req.params.additionId)) {
      return res.status(400).json({ error: 'Invalid follow-up id' });
    }

    const suggestion = await findOwned(req, res);
    if (!suggestion) return;

    const addition = suggestion.additions.id(req.params.additionId);
    if (!addition) return res.status(404).json({ error: 'Follow-up not found' });

    if (addition.text !== text) {
      if (editExpired(addition.createdAt)) return res.status(403).json({ error: EXPIRED_MSG });
      addition.text = text;
      addition.editedAt = new Date();
      await suggestion.save();
    }

    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;