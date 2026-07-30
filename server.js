const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
console.log("Node DNS:", dns.getServers());
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const cfRoutes = require('./routes/cf');
const lcRoutes = require('./routes/lc');
const leaderboardRoutes = require('./routes/leaderboard');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const contestsRoutes = require('./routes/contests');
const { startLeaderboardSync } = require('./jobs/leaderboardSync');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/cf', cfRoutes);
app.use('/api/lc', lcRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contests', contestsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      startLeaderboardSync();
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });