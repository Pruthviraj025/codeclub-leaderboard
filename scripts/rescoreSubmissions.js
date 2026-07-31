// One-time rescore: updates `points` on every existing ScoredSubmission to
// match the current scoring tables (utils/ratingMap.js for Codeforces,
// utils/leetcodePoints.js for LeetCode). Run this after changing either
// point table, and always AFTER scripts/backfillPlatform.js.
//
// Run with: node scripts/rescoreSubmissions.js
//
// Note: this only touches submissions that were already scored and stored.
// Problems that were skipped entirely at scoring time (e.g. out-of-range CF
// rating, or unresolvable LC difficulty) were never recorded, so there's
// nothing here to backfill for those.

require('dotenv').config();
const mongoose = require('mongoose');
const ScoredSubmission = require('../models/ScoredSubmission');
const { resolvePoints } = require('../utils/ratingMap');
const { resolveLeetCodePoints } = require('../utils/leetcodePoints');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const submissions = await ScoredSubmission.find({});
  console.log(`Found ${submissions.length} scored submission(s).`);

  let changed = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const sub of submissions) {
    let newPoints;

    if (sub.platform === 'codeforces') {
      newPoints = resolvePoints(sub.problemRating);
    } else if (sub.platform === 'leetcode') {
      newPoints = resolveLeetCodePoints({
        difficulty: sub.difficulty,
        acceptanceRate: sub.acceptanceRate,
        totalSubmissions: sub.totalSubmissions
      });
    } else {
      // shouldn't happen after backfillPlatform.js, but don't touch unknowns
      skipped++;
      continue;
    }

    if (newPoints === null) {
      // out-of-range rating / unresolvable difficulty — leave as-is
      skipped++;
      continue;
    }

    if (newPoints !== sub.points) {
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
  console.log(`- Skipped (unresolvable, left as-is): ${skipped}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Rescore failed:', err);
  process.exit(1);
});
