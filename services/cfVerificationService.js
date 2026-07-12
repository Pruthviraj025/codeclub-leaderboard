const axios = require('axios');
const User = require('../models/User');

// Fixed verification target: every user submits a deliberately broken solution
// to this exact problem, within a short time window after requesting.
// CF 4A ("Watermelon") used as an example — pick something rarely touched
// by accident if you want fewer false positives from unrelated activity.
const VERIFICATION_CONTEST_ID = 4;
const VERIFICATION_PROBLEM_INDEX = 'A';
const VERIFICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes to submit after requesting

/**
 * Step 1: user enters their CF handle. We record the request time and tell them
 * exactly which problem to submit deliberately-broken code to, within 5 minutes.
 * The proof of ownership is "you, the account owner, acted on this specific
 * problem within this specific short window right after asking" — no source-code
 * inspection needed, since CF's public API doesn't expose submission source.
 */
async function generateVerificationCode(userId, cfHandle) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.cfConnected) throw new Error('CF account already connected — contact admin to change it');

  user.cfHandle = cfHandle;
  user.cfVerification = { method: 'compile_error', verificationCode: null, verifiedAt: null };
  user.cfVerificationRequestedAt = new Date();
  await user.save();

  return {
    contestId: VERIFICATION_CONTEST_ID,
    problemIndex: VERIFICATION_PROBLEM_INDEX,
    windowMinutes: VERIFICATION_WINDOW_MS / 60000,
    instructions: `Within ${VERIFICATION_WINDOW_MS / 60000} minutes, submit any deliberately broken (won't compile) code to problem ${VERIFICATION_CONTEST_ID}${VERIFICATION_PROBLEM_INDEX}, then click Verify.`
  };
}

/**
 * Step 2: check for a COMPILATION_ERROR submission on the exact assigned problem,
 * timestamped within the window that started when verification was requested.
 */
async function checkVerification(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (!user.cfHandle || !user.cfVerificationRequestedAt) {
    throw new Error('No pending verification for this user — call start-verification first');
  }
  if (user.cfConnected) return { verified: true, alreadyConnected: true };

  const requestedAtSec = Math.floor(user.cfVerificationRequestedAt.getTime() / 1000);
  const deadlineSec = requestedAtSec + VERIFICATION_WINDOW_MS / 1000;

  if (Date.now() / 1000 > deadlineSec) {
    return { verified: false, expired: true, message: 'Verification window expired — request a new code' };
  }

  const res = await axios.get('https://codeforces.com/api/user.status', {
    params: { handle: user.cfHandle, from: 1, count: 20 },
    timeout: 10000
  });
  if (res.data.status !== 'OK') throw new Error('Could not fetch CF submissions — check the handle is correct');

  const submissions = res.data.result;
  const match = submissions.find(s =>
    s.verdict === 'COMPILATION_ERROR' &&
    s.problem.contestId === VERIFICATION_CONTEST_ID &&
    s.problem.index === VERIFICATION_PROBLEM_INDEX &&
    s.creationTimeSeconds >= requestedAtSec &&
    s.creationTimeSeconds <= deadlineSec
  );

  if (!match) return { verified: false };

  user.cfConnected = true;
  user.cfConnectedAt = new Date();
  user.cfVerification.verifiedAt = new Date();
  await user.save();

  return { verified: true };
}

module.exports = { generateVerificationCode, checkVerification };
