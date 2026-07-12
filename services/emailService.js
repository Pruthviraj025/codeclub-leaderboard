const { sendMail } = require('../utils/mailer');
const RecomputeJob = require('../models/RecomputeJob');

/**
 * Builds the combined-summary email body for one user's changes across
 * however many weeks were affected by a hard-delete recompute.
 */
function buildRecomputeEmailBody(deletedUserSnapshot, changes) {
  const lines = changes.map(c => {
    const rankPart = c.oldRank !== c.newRank
      ? `rank changed from #${c.oldRank ?? '—'} to #${c.newRank}`
      : `rank stayed at #${c.newRank}`;
    const outcomePart = c.oldOutcome !== c.newOutcome
      ? `star status changed from "${c.oldOutcome ?? '—'}" to "${c.newOutcome}"`
      : `star status stayed "${c.newOutcome}"`;
    return `- Week ${c.weekNumber}: ${rankPart}, ${outcomePart}`;
  });

  const text =
`Hi,

An account (${deletedUserSnapshot.name || 'a user'}) was removed from CodeClub Leaderboard, ` +
`which affected the standings for some recent weeks you participated in. Here's what changed:

${lines.join('\n')}

Note: only rankings and green-star (top-finish) allocations were recalculated. ` +
`Any red stars you have are unaffected by this change.

— CodeClub Leaderboard`;

  return { text };
}

/**
 * Sends every queued email for a completed RecomputeJob, marking each as sent
 * so a retry of this function doesn't double-send. Safe to call multiple times.
 */
async function sendRecomputeEmails(jobId) {
  const job = await RecomputeJob.findById(jobId);
  if (!job) throw new Error('Recompute job not found');
  if (job.status !== 'completed') throw new Error('Job must be completed before sending emails');

  let sentCount = 0;
  for (const entry of job.emailQueue) {
    if (entry.sent) continue; // already sent, skip (idempotent)

    try {
      const { text } = buildRecomputeEmailBody(job.deletedUserSnapshot, entry.changes);
      await sendMail({
        to: entry.email,
        subject: 'CodeClub Leaderboard — your recent standings were updated',
        text
      });
      entry.sent = true;
      sentCount++;
    } catch (err) {
      console.error(`Failed to send recompute email to ${entry.email}:`, err.message);
      // leave entry.sent = false so a later retry can pick it up
    }
  }

  await job.save();
  return { sentCount, total: job.emailQueue.length };
}

module.exports = { sendRecomputeEmails, buildRecomputeEmailBody };
