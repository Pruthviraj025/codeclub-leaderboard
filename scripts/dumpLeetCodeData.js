// Prints stored LeetCodeQuestion cache + matching ScoredSubmission points
// side by side, trailing 7 days only. For manual sanity check against
// real leetcode.com/problems/<slug> acceptance rate.
//
// Run with: node scripts/dumpLeetCodeData.js

require('dotenv').config();
const mongoose = require('mongoose');
const ScoredSubmission = require('../models/ScoredSubmission');
const LeetCodeQuestion = require('../models/LeetCodeQuestion');

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const windowStart = new Date(Date.now() - WINDOW_MS);

  const subs = await ScoredSubmission.find({
    platform: 'leetcode',
    solvedAt: { $gte: windowStart }
  }).sort({ problemId: 1 });

  const slugs = [...new Set(subs.map(s => s.problemId))];
  const questions = await LeetCodeQuestion.find({ titleSlug: { $in: slugs } });
  const qMap = new Map(questions.map(q => [q.titleSlug, q]));

  for (const s of subs) {
    const q = qMap.get(s.problemId);
    console.log(
      `${s.problemId} | diff=${s.difficulty} | acRate(sub)=${s.acceptanceRate} acRate(cache)=${q ? q.acceptanceRate : 'N/A'} | totalSub(sub)=${s.totalSubmissions} totalSub(cache)=${q ? q.totalSubmissions : 'N/A'} | points=${s.points} | cacheFetchedAt=${q ? q.lastFetchedAt.toISOString() : 'N/A'}`
    );
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Dump failed:', err);
  process.exit(1);
});