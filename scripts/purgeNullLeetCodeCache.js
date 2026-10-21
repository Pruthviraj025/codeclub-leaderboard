
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