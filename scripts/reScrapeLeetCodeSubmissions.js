// Trailing-7-day LeetCode ScoredSubmission docs currently hold null
// acceptanceRate/totalSubmissions (broken scraper — see
// leetcodeScraper.js fetchStats() comment). Re-fetches real stats per
// unique problem from LeetCode's GraphQL, updates the docs, recomputes
// points, and refreshes the LeetCodeQuestion cache too.
//
// Run AFTER deploying the scraper fix.
// Run with: node scripts/reScrapeLeetCodeSubmissions.js

require('dotenv').config();
const mongoose = require('mongoose');
const ScoredSubmission = require('../models/ScoredSubmission');
const LeetCodeQuestion = require('../models/LeetCodeQuestion');
const { fetchStats } = require('../services/leetcodeScraper');
const { resolveLeetCodePoints } = require('../utils/leetcodePoints');

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const windowStart = new Date(Date.now() - WINDOW_MS);

  const subs = await ScoredSubmission.find({
    platform: 'leetcode',
    solvedAt: { $gte: windowStart }
  });

  console.log(`Found ${subs.length} leetcode submission(s) in trailing 7 days.`);

  const uniqueSlugs = [...new Set(subs.map(s => s.problemId))];
  const statsCache = new Map();

  for (const slug of uniqueSlugs) {
    try {
      const stats = await fetchStats(slug);
      statsCache.set(slug, stats);
      console.log(`${slug}: acRate=${stats.acceptanceRate} totalSub=${stats.totalSubmissions}`);
    } catch (err) {
      console.error(`Failed to fetch stats for ${slug}: ${err.message}`);
    }
    // be polite to leetcode.com — avoid tripping rate limits
    await sleep(500);
  }

  let changed = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const sub of subs) {
    const stats = statsCache.get(sub.problemId);

    if (!stats || stats.acceptanceRate === null) {
      skipped++;
      continue;
    }

    sub.acceptanceRate = stats.acceptanceRate;
    sub.acceptedCount = stats.acceptedCount;
    sub.totalSubmissions = stats.totalSubmissions;

    const newPoints = resolveLeetCodePoints({
      difficulty: sub.difficulty,
      acceptanceRate: sub.acceptanceRate,
      totalSubmissions: sub.totalSubmissions
    });

    if (newPoints !== null && newPoints !== sub.points) {
      console.log(`${sub.userId} ${sub.problemId}: ${sub.points} -> ${newPoints}`);
      sub.points = newPoints;
      changed++;
    } else {
      unchanged++;
    }

    await sub.save();

    // refresh the shared question cache too, so future refreshes
    // don't need to hit leetcode.com again within QUESTION_CACHE_DAYS
    await LeetCodeQuestion.updateOne(
      { titleSlug: sub.problemId },
      {
        $set: {
          acceptanceRate: stats.acceptanceRate,
          acceptedCount: stats.acceptedCount,
          totalSubmissions: stats.totalSubmissions,
          lastFetchedAt: new Date()
        }
      }
    );
  }

  console.log(`\nDone.`);
  console.log(`- Updated: ${changed}`);
  console.log(`- Unchanged: ${unchanged}`);
  console.log(`- Skipped (stats fetch failed): ${skipped}`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Re-scrape failed:', err);
  process.exit(1);
});