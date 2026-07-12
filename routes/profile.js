const express = require('express');
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

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
      cfConnected: user.cfConnected,
      greenStarCount: user.greenStarCount,
      activeRedStarCount: user.activeRedStarCount,
      stars: user.stars
        .filter(s => s.type === 'green' || !s.clearedAt) // show green always, red only while active
        .map(s => ({ type: s.type, rank: s.rank, weekId: s.weekId, awardedAt: s.awardedAt }))
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
