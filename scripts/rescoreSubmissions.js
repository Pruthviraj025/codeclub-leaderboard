// One-time rescore: updates `points` on every existing ScoredSubmission to match
// the current utils/ratingMap.js table (run this after changing the point values).
//
// Run with: node scripts/rescoreSubmissions.js
//
// Note: this only touches submissions that were already scored and stored.
// Problems that were unrated and previously SKIPPED entirely (before unrated
// started counting) were never recorded, so there's nothing here to backfill
// for those — the user would need to hit "Refresh" again, but their
// lastCheckedSubmissionId cursor has already moved past those CF submissions,
// so a plain refresh won't re-pull them either. Backfilling those requires a
// separate reset of lastCheckedSubmissionId, which this script does NOT do.

require('dotenv').config();
const mongoose = require('mongoose');
const ScoredSubmission = require('../models/ScoredSubmission');
const { resolvePoints } = require('../utils/ratingMap');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const submissions = await ScoredSubmission.find({});
  console.log(`Found ${submissions.length} scored submission(s).`);

  let changed = 0;
  let skipped = 0;

  for (const sub of submissions) {
    const newPoints = resolvePoints(sub.problemRating);
    if (newPoints === null) {
      // out-of-range/non-standard rating — leave as-is, nothing to resolve it to
      skipped++;
      continue;
    }
    if (newPoints !== sub.points) {
      sub.points = newPoints;
      await sub.save();
      changed++;
    }
  }

  console.log(`\nRescore complete.`);
  console.log(`- Updated: ${changed}`);
  console.log(`- Unchanged: ${submissions.length - changed - skipped}`);
  console.log(`- Skipped (out-of-range rating, left as-is): ${skipped}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Rescore failed:', err);
  process.exit(1);
});
