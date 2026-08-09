require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({ lcConnected: true }, 'name lcUsername lcLastSubmissionTimestamp');

  for (const u of users) {
    const count = await ScoredSubmission.countDocuments({ userId: u._id, platform: 'leetcode' });
    console.log(u.name, '| lcUsername:', u.lcUsername, '| lastTs:', u.lcLastSubmissionTimestamp, '| scored LC docs:', count);
  }

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });