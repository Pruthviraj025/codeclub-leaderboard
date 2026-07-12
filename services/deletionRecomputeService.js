const User = require('../models/User');
const Week = require('../models/Week');
const ScoredSubmission = require('../models/ScoredSubmission');
const RecomputeJob = require('../models/RecomputeJob');
const AdminAction = require('../models/AdminAction');
const { allocateOutcomes } = require('./weeklyFinalizeService');

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

/**
 * Step 1 (synchronous, called from admin API route):
 * Snapshot the user, find which finalized weeks in the last 4 calendar weeks they
 * participated in, create a RecomputeJob, log the admin action, then hard-delete the user.
 * Actual recompute happens async via processRecomputeJob (call from a worker/cron).
 */
async function hardDeleteUser(userId, adminId, reason) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const cutoff = new Date(Date.now() - FOUR_WEEKS_MS);

  // Weeks this user appears in (via their green/red stars, which map 1:1 to weeks they solved something in)
  // that are also within the last 4 calendar weeks AND already finalized.
  const touchedWeekIds = [...new Set(user.stars.map(s => s.weekId.toString()))];
  const weeksToRecompute = await Week.find({
    _id: { $in: touchedWeekIds },
    status: 'finalized',
    finalizedAt: { $gte: cutoff }
  });

  const job = await RecomputeJob.create({
    deletedUserSnapshot: { name: user.name, usn: user.usn, email: user.email, cfHandle: user.cfHandle },
    weekIdsToRecompute: weeksToRecompute.map(w => w._id),
    status: 'pending'
  });

  await AdminAction.create({
    adminId,
    action: 'hard_delete',
    targetUserId: null, // will no longer exist
    targetUserSnapshot: { name: user.name, usn: user.usn, email: user.email, cfHandle: user.cfHandle },
    reason: reason || ''
  });

  // Cascade delete: user's scored submissions + the user doc itself.
  // (Weeks/results snapshots are NOT deleted — they get recomputed by the job instead.)
  await ScoredSubmission.deleteMany({ userId: user._id });
  await User.deleteOne({ _id: user._id });

  return job;
}

/**
 * Step 2 (async worker): processes a pending RecomputeJob.
 * For each affected week: re-aggregate remaining solvers' points (deleted user's
 * submissions are already gone), re-run allocateOutcomes, diff against the old
 * snapshot, update ranks/green stars only (red stars untouched per locked rule),
 * and queue a combined summary email per affected participant.
 */
async function processRecomputeJob(jobId) {
  const job = await RecomputeJob.findById(jobId);
  if (!job || job.status === 'completed') return;

  job.status = 'in_progress';
  job.attempts += 1;
  await job.save();

  try {
    const changesByUser = new Map(); // userId -> [{weekNumber, oldRank, newRank, oldOutcome, newOutcome}]

    for (const weekId of job.weekIdsToRecompute) {
      const week = await Week.findById(weekId);
      if (!week) continue;

      const oldResults = new Map(week.results.map(r => [r.userId.toString(), r]));

      const totals = await ScoredSubmission.aggregate([
        { $match: { weekId: week._id } },
        { $group: { _id: '$userId', points: { $sum: '$points' } } },
        { $sort: { points: -1 } }
      ]);
      const sortedSolvers = totals.map(t => ({ userId: t._id, points: t.points }));
      const newResults = allocateOutcomes(sortedSolvers);

      // Diff and apply green-star-only changes (leave red stars exactly as they were)
      for (const nr of newResults) {
        const old = oldResults.get(nr.userId.toString());
        const rankChanged = !old || old.rank !== nr.rank;
        const outcomeChanged = !old || old.outcome !== nr.outcome;

        if (rankChanged || outcomeChanged) {
          const user = await User.findById(nr.userId);
          if (user) {
            if (old && old.outcome === 'green') {
              // remove the stale green star for this week before re-adding correct one
              user.stars = user.stars.filter(s => !(s.type === 'green' && s.weekId.toString() === week._id.toString()));
            }
            if (nr.outcome === 'green') {
              user.stars.push({ type: 'green', weekId: week._id, rank: nr.rank });
            }
            // red stars: intentionally untouched, per locked rule
            await user.save();

            const uid = nr.userId.toString();
            if (!changesByUser.has(uid)) changesByUser.set(uid, { email: user.email, changes: [] });
            changesByUser.get(uid).changes.push({
              weekNumber: week.weekNumber,
              oldRank: old ? old.rank : null,
              newRank: nr.rank,
              oldOutcome: old ? old.outcome : null,
              newOutcome: nr.outcome
            });
          }
        }
      }

      week.results = newResults;
      week.recomputedAt = new Date();
      await week.save();
    }

    job.emailQueue = Array.from(changesByUser.entries()).map(([userId, data]) => ({
      userId, email: data.email, changes: data.changes, sent: false
    }));
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();

    return job;
  } catch (err) {
    job.status = 'failed';
    job.lastError = err.message;
    await job.save();
    throw err;
  }
}

module.exports = { hardDeleteUser, processRecomputeJob };
