const axios = require('axios');
const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');
const Week = require('../models/Week');
const { resolvePoints } = require('../utils/ratingMap');

const REFRESH_COOLDOWN_MS = 15 * 1000; // 15s between refreshes per user
const MAX_RETRIES = 3;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Fetches a CF handle's submissions with retry+backoff.
 * Respects CF's soft rate limit by never being called in tight loops (caller is per-click, not batch).
 */
async function fetchCFSubmissions(handle) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get('https://codeforces.com/api/user.status', {
        params: { handle, from: 1, count: 10000 },
        timeout: 10000
      });
      if (res.data.status !== 'OK') throw new Error('CF API returned non-OK status');
      return res.data.result;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) await sleep(2000 * Math.pow(2, attempt - 1)); // 2s, 4s, 8s
    }
  }
  throw lastErr;
}

/**
 * Main entrypoint for the "Refresh" button. Call this from the API route handler.
 * Returns { newlyScored: [...], pointsAdded: number } or throws on cooldown/CF failure.
 */
async function refreshUserScore(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (!user.cfConnected || !user.cfHandle) throw new Error('CF account not connected');

  // Cooldown check
  if (user.lastRefreshAt && (Date.now() - user.lastRefreshAt.getTime()) < REFRESH_COOLDOWN_MS) {
    const waitMs = REFRESH_COOLDOWN_MS - (Date.now() - user.lastRefreshAt.getTime());
    throw new Error(`Refresh on cooldown. Try again in ${Math.ceil(waitMs / 1000)}s.`);
  }

  // Find current open week (assumes exactly one 'open' week exists at a time)
  const currentWeek = await Week.findOne({ status: 'open' });
  if (!currentWeek) throw new Error('No open week found — leaderboard may be mid-reset.');

  const submissions = await fetchCFSubmissions(user.cfHandle);

  // Filter: accepted only, after CF-connection timestamp, newer than cursor if present
  const cfConnectedAtSec = Math.floor(user.cfConnectedAt.getTime() / 1000);
  const candidates = submissions.filter(s =>
    s.verdict === 'OK' &&
    s.creationTimeSeconds >= cfConnectedAtSec &&
    (!user.lastCheckedSubmissionId || s.id > user.lastCheckedSubmissionId)
  );

  const newlyScored = [];
  let pointsAdded = 0;
  let highestSubmissionId = user.lastCheckedSubmissionId || 0;

  for (const sub of candidates) {
    highestSubmissionId = Math.max(highestSubmissionId, sub.id);

    const rating = sub.problem.rating; // undefined if unrated
    const points = resolvePoints(rating);
    if (points === null) continue; // unrated problem — skip entirely, not logged

    const problemId = `${sub.problem.contestId}${sub.problem.index}`;

    try {
      const scored = await ScoredSubmission.create({
        userId: user._id,
        problemId,
        problemRating: rating,
        points,
        cfSubmissionId: sub.id,
        solvedAt: new Date(sub.creationTimeSeconds * 1000),
        weekId: currentWeek._id
      });
      newlyScored.push(scored);
      pointsAdded += points;
    } catch (err) {
      // Duplicate key error = already scored (safety net working as intended) — skip silently
      if (err.code !== 11000) throw err;
    }
  }

  user.lastCheckedSubmissionId = highestSubmissionId;
  user.lastRefreshAt = new Date();
  await user.save();

  return { newlyScored, pointsAdded };
}

module.exports = { refreshUserScore, fetchCFSubmissions };
