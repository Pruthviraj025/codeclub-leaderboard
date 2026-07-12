const cron = require('node-cron');
const Week = require('../models/Week');
const { finalizeWeek } = require('../services/weeklyFinalizeService');

/**
 * Ensures exactly one 'open' Week document exists. Call once at server startup.
 * If no week exists at all (first-ever run), creates Week #1 starting now.
 */
async function ensureOpenWeekExists() {
  const existingOpen = await Week.findOne({ status: 'open' });
  if (existingOpen) return existingOpen;

  const latestWeek = await Week.findOne().sort({ weekNumber: -1 });
  const nextWeekNumber = latestWeek ? latestWeek.weekNumber + 1 : 1;
  const now = new Date();

  const week = await Week.create({
    weekNumber: nextWeekNumber,
    startsAt: now,
    endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    status: 'open'
  });

  console.log(`Created new open week: #${week.weekNumber}`);
  return week;
}

/**
 * Schedules automatic weekly finalization.
 * Runs every Monday at 00:00 server time — change the cron expression if you
 * want a different reset day/time. finalizeWeek() itself creates the next
 * open week, so this job only needs to find and close the current one.
 */
function startWeeklyCron() {
  // Cron format: minute hour day-of-month month day-of-week
  // '0 0 * * 1' = 00:00 every Monday
  cron.schedule('0 0 * * 1', async () => {
    try {
      const openWeek = await Week.findOne({ status: 'open' });
      if (!openWeek) {
        console.warn('Weekly cron fired but no open week found — creating one.');
        await ensureOpenWeekExists();
        return;
      }

      console.log(`Finalizing week #${openWeek.weekNumber}...`);
      const { week, nextWeek } = await finalizeWeek(openWeek._id);
      console.log(`Week #${week.weekNumber} finalized. Week #${nextWeek.weekNumber} is now open.`);
    } catch (err) {
      console.error('Weekly cron job failed:', err.message);
      // NOTE: in production, alert an admin here (email/Slack) — a failed
      // finalization means the leaderboard silently doesn't reset on time.
    }
  });

  console.log('Weekly finalize cron scheduled (every Monday 00:00).');
}

module.exports = { startWeeklyCron, ensureOpenWeekExists };
