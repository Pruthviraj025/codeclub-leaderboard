
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
      skipped++;
      continue;
    }

    if (newPoints === null) {
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
