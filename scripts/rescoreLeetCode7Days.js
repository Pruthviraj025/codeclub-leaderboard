// Rescores LeetCode ScoredSubmission docs solved in trailing 7 days only
// (matches leaderboard's active window in routes/leaderboard.js).
// Codeforces docs untouched. Docs older than 7 days untouched — dead
// weight for leaderboard, no need to touch.
//
// Run with: node scripts/rescoreLeetCode7Days.js

require('dotenv').config();
const mongoose = require('mongoose');
const ScoredSubmission = require('../models/ScoredSubmission');
const { resolveLeetCodePoints } = require('../utils/leetcodePoints');

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const windowStart = new Date(Date.now() - WINDOW_MS);

  const submissions = await ScoredSubmission.find({
    platform: 'leetcode',
    solvedAt: { $gte: windowStart }
  });

  console.log(`Found ${submissions.length} leetcode submission(s) in trailing 7 days.`);

  let changed = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const sub of submissions) {
    const newPoints = resolveLeetCodePoints({
      difficulty: sub.difficulty,
      acceptanceRate: sub.acceptanceRate,
      totalSubmissions: sub.totalSubmissions
    });

    if (newPoints === null) {
      // missing difficulty/acceptanceRate/totalSubmissions on doc — leave as-is
      skipped++;
      continue;
    }

    if (newPoints !== sub.points) {
      console.log(
        `${sub.userId} ${sub.problemId}: ${sub.points} -> ${newPoints}`
      );
      sub.points = newPoints;
      await sub.save();
      changed++;
    } else {
      unchanged++;
    }
  }

  console.log(`\nRescore complete.`);
  console.log(`- Updated: ${changed}`);
  console.log(`- Unchanged: ${unchanged}`);
  console.log(`- Skipped (missing data, left as-is): ${skipped}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Rescore failed:', err);
  process.exit(1);
});