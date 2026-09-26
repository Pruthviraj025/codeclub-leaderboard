// One-time backfill: recovers unrated Codeforces submissions that were
// silently dropped by a bug in refreshCodeforcesScore().
//
// Root cause: that function advances user.lastCheckedSubmissionId for every
// candidate submission it looks at, even ones it decides not to score. Before
// utils/ratingMap.js was fixed to award UNRATED_POINTS for unrated problems,
// resolvePoints() returned null for them, so they were skipped (never
// inserted into ScoredSubmission) — but lastCheckedSubmissionId had already
// moved past their submission id. Since incremental refreshes only fetch
// submissions with id > lastCheckedSubmissionId, those old unrated solves
// can never be picked up again by the normal refresh path.
//
// This script re-fetches each connected user's FULL Codeforces submission
// history (ignoring the watermark), finds unrated OK submissions solved
// after cfConnectedAt that aren't already recorded, and inserts them at
// UNRATED_POINTS. It does NOT touch lastCheckedSubmissionId — that watermark
// is left exactly as-is so normal incremental refreshes keep working off it.
//
// Safe to re-run: existing submissions are skipped via the unique
// (userId, platform, problemId) index, so nothing gets double-counted.
//
// Run with: node scripts/backfillUnratedCF.js

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');

const { fetchCFSubmissions } = require('../services/scoringService');
const { resolvePoints, UNRATED_POINTS } = require('../utils/ratingMap');

async function backfillForUser(user) {
  if (!user.cfConnected || !user.cfHandle || !user.cfConnectedAt) {
    return { checked: 0, inserted: 0, errors: 0 };
  }

  let submissions;

  try {
    submissions = await fetchCFSubmissions(user.cfHandle);
  } catch (err) {
    console.error(`  [${user.cfHandle}] Failed to fetch submissions: ${err.message}`);
    return { checked: 0, inserted: 0, errors: 1 };
  }

  const connectedAt = Math.floor(user.cfConnectedAt.getTime() / 1000);

  // Only unrated, accepted submissions after the user connected CF.
  const unratedCandidates = submissions.filter(sub =>
    sub.verdict === 'OK' &&
    sub.creationTimeSeconds >= connectedAt &&
    sub.problem.rating == null
  );

  let checked = 0;
  let inserted = 0;
  let errors = 0;

  for (const submission of unratedCandidates) {
    checked++;

    const points = resolvePoints(submission.problem.rating); // always UNRATED_POINTS here

    const problemId = `${submission.problem.contestId}${submission.problem.index}`;

    try {
      await ScoredSubmission.create({
        userId: user._id,
        platform: 'codeforces',
        problemId,
        problemName: submission.problem.name,
        problemRating: null,
        points,
        cfSubmissionId: submission.id,
        solvedAt: new Date(submission.creationTimeSeconds * 1000)
      });

      inserted++;

    } catch (err) {
      if (err.code === 11000) {
        // Already recorded (from a prior run of this script, or a normal
        // refresh that happened to still catch it) — not an error.
        continue;
      }
      console.error(`  [${user.cfHandle}] Failed to insert ${problemId}: ${err.message}`);
      errors++;
    }
  }

  return { checked, inserted, errors };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');
  console.log(`Unrated CF problems are worth ${UNRATED_POINTS} points.\n`);

  const users = await User.find({ cfConnected: true, isActive: true });
  console.log(`Found ${users.length} CF-connected user(s).\n`);

  let totalChecked = 0;
  let totalInserted = 0;
  let totalErrors = 0;

  for (const user of users) {
    const { checked, inserted, errors } = await backfillForUser(user);

    totalChecked += checked;
    totalInserted += inserted;
    totalErrors += errors;

    if (checked > 0 || errors > 0) {
      console.log(
        `${user.cfHandle}: ${checked} unrated candidate(s) found, ` +
        `${inserted} newly inserted, ${errors} error(s)`
      );
    }
  }

  console.log(`\nBackfill complete.`);
  console.log(`- Unrated candidates checked: ${totalChecked}`);
  console.log(`- Newly inserted: ${totalInserted}`);
  console.log(`- Errors: ${totalErrors}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
}); 