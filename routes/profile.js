const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

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
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || !user.isActive) return res.status(404).json({ error: 'Profile not found' });

    const isOwner = user._id.toString() === req.user._id.toString();

    const publicProfile = {
      id: user._id,
      name: user.name,
      cfHandle: user.cfHandle,
      cfConnected: user.cfConnected
    };

    // Private fields only visible to the profile owner
    if (isOwner) {
      publicProfile.usn = user.usn;
      publicProfile.email = user.email;
    }

    res.json(publicProfile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
