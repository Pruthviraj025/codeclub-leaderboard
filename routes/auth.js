const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');

const router = express.Router();

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, usn, email, password } = req.body;
    if (!name || !usn || !email || !password) {
      return res.status(400).json({ error: 'name, usn, email, and password are all required' });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { usn: usn.toUpperCase() }] });
    if (existing) return res.status(409).json({ error: 'Email or USN already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, usn, email, passwordHash });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, cfConnected: user.cfConnected, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond generic - don't leak whether email is registered
    if (!user || !user.isActive) {
      return res.json({ message: 'If that email is registered, an OTP has been sent.' });
    }

    const otp = generateOtp();
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    user.resetOtpAttempts = 0;
    await user.save();

    await sendOtpEmail(user.email, otp);

    res.json({ message: 'If that email is registered, an OTP has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetOtpHash || !user.resetOtpExpiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP expired' });
    }

    if (user.resetOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });
    }

    const match = await bcrypt.compare(otp, user.resetOtpHash);
    if (!match) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ resetToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'resetToken and newPassword are required' });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const user = await User.findById(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = null;
    user.resetOtpExpiry = null;
    user.resetOtpAttempts = 0;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
