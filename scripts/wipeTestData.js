// One-time pre-launch wipe script.
// Clears all test data accumulated during development, WITHOUT forcing
// real users to redo CF verification (cfHandle/cfConnected/cfConnectedAt
// are preserved on User docs — only scoring/audit history is wiped).
//
// Run with: node scripts/wipeTestData.js
// This is DESTRUCTIVE and irreversible. Only run this once, right before
// real CodeClub members start using the platform for real.

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');

const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');
const AdminAction = require('../models/AdminAction');

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

  console.log('\nCurrent data:');
  console.log(`  Users: ${userCount} (will be KEPT — only scores reset)`);
  console.log(`  Scored submissions: ${submissionCount} (will be DELETED)`);
  console.log(`  Admin actions: will be DELETED\n`);

  const answer = await confirm('Type "wipe" to confirm, anything else to cancel: ');
  if (answer !== 'wipe') {
    console.log('Cancelled — nothing was changed.');
    process.exit(0);
  }

  // Wipe scoring/history collections entirely
  await ScoredSubmission.deleteMany({});
  await AdminAction.deleteMany({});

  // Reset per-user scoring state, but KEEP account + CF connection
  await User.updateMany({}, {
    $set: { lastCheckedSubmissionId: null, lastRefreshAt: null }
  });

  console.log('\nWipe complete.');
  console.log(`- Cleared all scored submissions and admin actions.`);
  console.log(`- Reset refresh state on ${userCount} user account(s) — CF connections preserved.`);
  console.log(`- Leaderboard is live/rolling — nothing else to reset.`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
