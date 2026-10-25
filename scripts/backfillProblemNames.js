require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const ScoredSubmission = require('../models/ScoredSubmission');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codeclub');
  console.log('Connected to MongoDB');

  console.log('Fetching Codeforces problemset...');
  const res = await axios.get('https://codeforces.com/api/problemset.problems', { timeout: 20000 });
  if (res.data.status !== 'OK') {
    throw new Error('Codeforces API status not OK');
  }

  const problemMap = new Map();
  for (const p of res.data.result.problems) {
    if (p.contestId && p.index) {
      problemMap.set(`${p.contestId}${p.index}`.toUpperCase(), p.name);
    }
  }
  console.log(`Mapped ${problemMap.size} Codeforces problems.`);

  const missing = await ScoredSubmission.find({
    platform: 'codeforces',
    $or: [{ problemName: null }, { problemName: { $exists: false } }]
  });

  console.log(`Found ${missing.length} submissions missing problemName.`);
  let updated = 0;

  for (const sub of missing) {
    const key = String(sub.problemId).toUpperCase();
    const name = problemMap.get(key);
    if (name) {
      sub.problemName = name;
      await sub.save();
      updated++;
    }
  }

  console.log(`Successfully updated ${updated} of ${missing.length} submissions with problemName.`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
