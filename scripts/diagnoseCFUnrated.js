// READ-ONLY diagnostic — makes no writes to the DB. Run this to figure out
// why scripts/backfillUnratedCF.js found 0 candidates.
//
// For each CF-connected user it prints:
//  - total OK submissions returned by the CF API
//  - how many have problem.rating === undefined (true "unrated")
//  - how many of those pass the sub.creationTimeSeconds >= cfConnectedAt filter
//  - how many of those are already recorded in ScoredSubmission
//  - a sample of a few raw "unrated-looking" submissions so we can see the
//    actual shape of the data (rating field, verdict, problem fields)
//
// Run with: node scripts/diagnoseCFUnrated.js [cfHandle]
// Pass a specific cfHandle to only check that one user; omit to check all.

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');
const { fetchCFSubmissions } = require('../services/scoringService');

async function diagnoseUser(user) {
  console.log(`\n=== ${user.cfHandle} ===`);
  console.log(`  cfConnected: ${user.cfConnected}`);
  console.log(`  cfConnectedAt: ${user.cfConnectedAt}`);
  console.log(`  lastCheckedSubmissionId: ${user.lastCheckedSubmissionId}`);

  if (!user.cfConnected || !user.cfHandle) {
    console.log('  Skipping — not CF connected.');
    return;
  }

  let submissions;
  try {
    submissions = await fetchCFSubmissions(user.cfHandle);
  } catch (err) {
    console.log(`  Failed to fetch: ${err.message}`);
    return;
  }

  console.log(`  Total submissions returned by CF API: ${submissions.length}`);

  const okSubs = submissions.filter(s => s.verdict === 'OK');
  console.log(`  OK (accepted) submissions: ${okSubs.length}`);

  // Distinct verdict values seen, in case "OK" isn't the only accepted-looking one
  const verdictCounts = {};
  for (const s of submissions) {
    verdictCounts[s.verdict] = (verdictCounts[s.verdict] || 0) + 1;
  }
  console.log(`  Verdict breakdown: ${JSON.stringify(verdictCounts)}`);

  const noRating = okSubs.filter(s => s.problem.rating === undefined);
  console.log(`  OK submissions with problem.rating undefined: ${noRating.length}`);

  const nullRating = okSubs.filter(s => s.problem.rating === null);
  console.log(`  OK submissions with problem.rating === null: ${nullRating.length}`);

  if (user.cfConnectedAt) {
    const connectedAt = Math.floor(user.cfConnectedAt.getTime() / 1000);
    const afterConnect = noRating.filter(s => s.creationTimeSeconds >= connectedAt);
    console.log(`  ...of the undefined-rating ones, solved after cfConnectedAt: ${afterConnect.length}`);

    if (afterConnect.length > 0) {
      const existing = await ScoredSubmission.find({
        userId: user._id,
        platform: 'codeforces',
        problemId: { $in: afterConnect.map(s => `${s.problem.contestId}${s.problem.index}`) }
      });
      console.log(`  ...of those, already in ScoredSubmission: ${existing.length}`);

      console.log('  Sample (up to 3):');
      for (const s of afterConnect.slice(0, 3)) {
        console.log(`    - id=${s.id} problem=${s.problem.contestId}${s.problem.index} ` +
          `name="${s.problem.name}" rating=${s.problem.rating} ` +
          `tags=${JSON.stringify(s.problem.tags)} ` +
          `solvedAt=${new Date(s.creationTimeSeconds * 1000).toISOString()}`);
      }
    }
  } else {
    console.log('  cfConnectedAt is null — cannot check date filter.');
  }

  // Also show a couple of arbitrary OK submissions so we can see the real
  // shape of problem.rating (number vs string vs missing) for problems that
  // clearly DO have a rating, as a sanity check.
  const rated = okSubs.filter(s => typeof s.problem.rating === 'number');
  if (rated.length > 0) {
    const s = rated[0];
    console.log(`  Sanity check — a rated OK submission: rating=${s.problem.rating} (type: ${typeof s.problem.rating})`);
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const targetHandle = process.argv[2];

  // CF handles are case-insensitive and verification stores them raw, so match
  // ignoring case and surrounding whitespace.
  const escaped = targetHandle
    ? targetHandle.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : null;

  const query = targetHandle
    ? { cfHandle: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }
    : { cfConnected: true, isActive: true };

  const dbName = mongoose.connection.name;
  const totalUsers = await User.countDocuments({});
  console.log(`DB: "${dbName}" — ${totalUsers} total user doc(s).`);

  const users = await User.find(query);
  console.log(`Checking ${users.length} user(s).`);

  if (targetHandle && users.length === 0) {
    const similar = await User.find(
      { cfHandle: new RegExp(escaped.slice(0, 5), 'i') },
      'name usn cfHandle cfConnected isActive'
    ).limit(10);
    console.log(`No exact match. Handles starting like "${escaped.slice(0, 5)}":`);
    for (const u of similar) {
      console.log(`  - name="${u.name}" cfHandle=${JSON.stringify(u.cfHandle)} cfConnected=${u.cfConnected} isActive=${u.isActive}`);
    }
    if (similar.length === 0) console.log('  (none)');
  }

  for (const user of users) {
    await diagnoseUser(user);
  }

  console.log('\nDone. No changes were made.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});