
require('dotenv').config();
const mongoose = require('mongoose');
const ScoredSubmission = require('../models/ScoredSubmission');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const result = await ScoredSubmission.updateMany(
    { platform: { $exists: false } },
    { $set: { platform: 'codeforces' } }
  );

  console.log(`Backfilled platform on ${result.modifiedCount} legacy submission(s).`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
