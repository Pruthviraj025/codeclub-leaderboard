
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');

const { fetchCFSubmissions, cfProblemId } = require('../services/scoringService');
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

  const WINDOW_SECONDS = 7 * 24 * 60 * 60;
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;
  const connectedAt = Math.floor(user.cfConnectedAt.getTime() / 1000);
  const eligibleTime = Math.min(connectedAt, sevenDaysAgo);

  const unratedCandidates = submissions.filter(sub =>
    sub.verdict === 'OK' &&
    sub.creationTimeSeconds >= eligibleTime &&
    (sub.problem.rating == null || sub.problem.rating === 0)
  );

  let checked = 0;
  let inserted = 0;
  let errors = 0;

  for (const submission of unratedCandidates) {
    checked++;

    const points = resolvePoints(submission.problem.rating);

    const problemId = cfProblemId(submission.problem);

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