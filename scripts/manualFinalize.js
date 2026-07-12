// One-off test script — manually finalizes the currently open week.
// Run with: node scripts/manualFinalize.js
// Do NOT leave this lying around as a route/endpoint — it's a dev-only tool.

require('dotenv').config();
const mongoose = require('mongoose');
const Week = require('../models/Week');
const { finalizeWeek } = require('../services/weeklyFinalizeService');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const openWeek = await Week.findOne({ status: 'open' });
  if (!openWeek) {
    console.log('No open week found — nothing to finalize.');
    process.exit(0);
  }

  console.log(`Finalizing week #${openWeek.weekNumber}...`);
  const { week, nextWeek } = await finalizeWeek(openWeek._id);
  console.log(`Week #${week.weekNumber} finalized. Results:`, JSON.stringify(week.results, null, 2));
  console.log(`Week #${nextWeek.weekNumber} is now open.`);

  process.exit(0);
}

run().catch(err => {
  console.error('Failed to finalize week:', err);
  process.exit(1);
});