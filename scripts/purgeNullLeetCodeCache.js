// Deletes LeetCodeQuestion cache rows with null acceptanceRate — these
// were written by the broken scraper (see leetcodeScraper.js fetchStats()
// comment: alfa-leetcode-api's /select never actually returned acRate/
// totalSubmission). Run this once after deploying the scraper fix, then
// re-run scripts/rescoreLeetCode7Days.js — but note that won't recompute
// points until the cache is repopulated by a normal refresh cycle
// (leaderboard refresh / cron), since rescore reads points from the
// ScoredSubmission doc's own acceptanceRate/totalSubmissions snapshot,
// not the live cache. To force those to repopulate, run
// scripts/reScrapeLeetCodeSubmissions.js after this (see below).
//
// Run with: node scripts/purgeNullLeetCodeCache.js

require('dotenv').config();
const mongoose = require('mongoose');
const LeetCodeQuestion = require('../models/LeetCodeQuestion');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const result = await LeetCodeQuestion.deleteMany({ acceptanceRate: null });

  console.log(`Deleted ${result.deletedCount} stale (null-stat) cache row(s).`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Purge failed:', err);
  process.exit(1);
});