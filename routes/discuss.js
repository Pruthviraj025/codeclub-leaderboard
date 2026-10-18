const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const Message = require('../models/Message');

const router = express.Router();

const MAX_LEN = 2000;
const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function serialize(m) {
  const author = m.userId && m.userId._id ? m.userId : null;
  return {
    id: m._id,
    userId: author ? author._id : null,
    userName: author ? author.name : 'Deleted user',
    userRole: author ? author.role : 'user',
    text: m.text,
    createdAt: m.createdAt,
    editedAt: m.editedAt || null
  };
}

function validateText(raw) {
  const text = (raw || '').trim();
  if (!text) return { error: 'Message cannot be empty' };
  if (text.length > MAX_LEN) return { error: `Keep it under ${MAX_LEN} characters` };
  return { text };
}

// GET /api/discuss?before=<ISO date>&limit=50
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const filter = {};

    if (req.query.before) {
      const before = new Date(req.query.before);
      if (isNaN(before.getTime())) {
        return res.status(400).json({ error: 'Invalid "before" date' });
      }
      filter.createdAt = { $lt: before };
    }

    const docs = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('userId', 'name role')
      .lean();

    const hasMore = docs.length > limit;
    const messages = docs.slice(0, limit).map(serialize);

    res.json({ messages, hasMore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/discuss
router.post('/', requireAuth, async (req, res) => {
  try {
    const { text, error } = validateText(req.body.text);
    if (error) return res.status(400).json({ error });

    const recent = await Message.countDocuments({
      userId: req.user._id,
      createdAt: { $gt: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) }
    });
    if (recent >= RATE_LIMIT_COUNT) {
      return res.status(429).json({ error: 'You are posting too fast. Wait a moment and try again.' });
    }

    const created = await Message.create({ userId: req.user._id, text });
    const doc = await Message.findById(created._id).populate('userId', 'name role').lean();

    res.status(201).json({ message: serialize(doc) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/discuss/:id — owner only
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid message id' });
    }

    const { text, error } = validateText(req.body.text);
    if (error) return res.status(400).json({ error });

    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    if (String(msg.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    if (msg.text !== text) {
      msg.text = text;
      msg.editedAt = new Date();
      await msg.save();
    }

    const doc = await Message.findById(msg._id).populate('userId', 'name role').lean();
    res.json({ message: serialize(doc) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/discuss/:id — owner or admin
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid message id' });
    }

    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const isOwner = String(msg.userId) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await msg.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;