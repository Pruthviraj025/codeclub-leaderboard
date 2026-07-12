// One-time pre-launch wipe script.
// Clears all test data accumulated during development, WITHOUT forcing
// real users to redo CF verification (cfHandle/cfConnected/cfConnectedAt
// are preserved on User docs — only scoring/star/week/audit history is wiped).
//
// Run with: node scripts/wipeTestData.js
// This is DESTRUCTIVE and irreversible. Only run this once, right before
// real CodeClub members start using the platform for real.

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');

const User = require('../models/User');
const Week = require('../models/Week');
const ScoredSubmission = require('../models/ScoredSubmission');
const AdminAction = require('../models/AdminAction');
const RecomputeJob = require('../models/RecomputeJob');

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const userCount = await User.countDocuments();
  const submissionCount = await ScoredSubmission.countDocuments();
  const weekCount = await Week.countDocuments();

  console.log('\nCurrent data:');
  console.log(`  Users: ${userCount} (will be KEPT — only scores/stars reset)`);
  console.log(`  Scored submissions: ${submissionCount} (will be DELETED)`);
  console.log(`  Weeks: ${weekCount} (will be DELETED, fresh Week #1 created)`);
  console.log(`  Admin actions + recompute jobs: will be DELETED\n`);

  const answer = await confirm('Type "wipe" to confirm, anything else to cancel: ');
  if (answer !== 'wipe') {
    console.log('Cancelled — nothing was changed.');
    process.exit(0);
  }

  // Wipe scoring/history collections entirely
  await ScoredSubmission.deleteMany({});
  await Week.deleteMany({});
  await AdminAction.deleteMany({});
  await RecomputeJob.deleteMany({});

  // Reset per-user scoring state, but KEEP account + CF connection
  await User.updateMany({}, {
    $set: { stars: [], lastCheckedSubmissionId: null, lastRefreshAt: null }
  });

  // Fresh Week #1
  const now = new Date();
  const week = await Week.create({
    weekNumber: 1,
    startsAt: now,
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: 'open'
  });

  console.log('\nWipe complete.');
  console.log(`- Cleared all scored submissions, weeks, admin actions, recompute jobs.`);
  console.log(`- Reset stars/refresh state on ${userCount} user account(s) — CF connections preserved.`);
  console.log(`- Created fresh Week #${week.weekNumber}.`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
