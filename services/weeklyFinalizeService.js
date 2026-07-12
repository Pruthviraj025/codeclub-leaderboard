const Week = require('../models/Week');
const User = require('../models/User');
const ScoredSubmission = require('../models/ScoredSubmission');

/**
 * Determines outcome ('green' | 'none' | 'red') per solver for a week,
 * per the locked rules:
 *  - <=6 solvers: top 50% = green, bottom 50% = red, exact middle (odd count) = none
 *  - >=7 solvers: flat top-3 = green, bottom-3 = red, everyone else = none
 * Input: sorted array of { userId, points } descending by points.
 * Returns: array of { userId, points, rank, outcome }
 */
function allocateOutcomes(sortedSolvers) {
  const n = sortedSolvers.length;
  const results = sortedSolvers.map((s, i) => ({ ...s, rank: i + 1, outcome: 'none' }));

  if (n === 0) return results;

  if (n <= 6) {
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) results[i].outcome = 'green';
    for (let i = n - half; i < n; i++) results[i].outcome = 'red';
    // if n is odd, the exact middle index stays 'none' automatically
  } else {
    for (let i = 0; i < 3; i++) results[i].outcome = 'green';
    for (let i = n - 3; i < n; i++) results[i].outcome = 'red';
  }

  return results;
}

/**
 * Finalizes the given week: computes totals per solver, allocates outcomes,
 * writes stars onto User docs, snapshots results onto the Week doc, opens the next week.
 */
async function finalizeWeek(weekId) {
  const week = await Week.findById(weekId);
  if (!week) throw new Error('Week not found');
  if (week.status === 'finalized') throw new Error('Week already finalized');

  // Aggregate points per user for this week (only users who solved >=1 problem appear)
  const totals = await ScoredSubmission.aggregate([
    { $match: { weekId: week._id } },
    { $group: { _id: '$userId', points: { $sum: '$points' } } },
    { $sort: { points: -1 } }
  ]);

  const sortedSolvers = totals.map(t => ({ userId: t._id, points: t.points }));
  const results = allocateOutcomes(sortedSolvers);

  // Write stars / clear red stars per user
  for (const r of results) {
    const user = await User.findById(r.userId);
    if (!user) continue;

    if (r.outcome === 'green') {
      user.stars.push({ type: 'green', weekId: week._id, rank: r.rank });
      clearOneRedStar(user, week._id);
    } else if (r.outcome === 'none') {
      clearOneRedStar(user, week._id);
    } else if (r.outcome === 'red') {
      user.stars.push({ type: 'red', weekId: week._id });
      // no clearing — landing in red does not clear anything
    }
    await user.save();
  }

  week.results = results;
  week.status = 'finalized';
  week.finalizedAt = new Date();
  await week.save();

  // Open next week
  const nextWeekNumber = week.weekNumber + 1;
  const nextWeek = await Week.create({
    weekNumber: nextWeekNumber,
    startsAt: week.endsAt,
    endsAt: new Date(week.endsAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: 'open'
  });

  return { week, nextWeek };
}

/** Clears the oldest un-cleared red star, if any. */
function clearOneRedStar(user, clearingWeekId) {
  const oldestUnclearedRed = user.stars.find(s => s.type === 'red' && !s.clearedAt);
  if (oldestUnclearedRed) {
    oldestUnclearedRed.clearedAt = new Date();
    oldestUnclearedRed.clearedByWeekId = clearingWeekId;
  }
}

module.exports = { finalizeWeek, allocateOutcomes };
