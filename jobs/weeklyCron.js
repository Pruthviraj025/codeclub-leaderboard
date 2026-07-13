const cron = require('node-cron');
const Week = require('../models/Week');
const { finalizeWeek } = require('../services/weeklyFinalizeService');

const TIMEZONE = 'Asia/Kolkata'; // Monday 00:00 IST

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
 * Free-tier hosts (Render, etc.) sleep after inactivity, so an in-process
 * cron job can silently miss its exact firing time — nobody's online at
 * midnight to keep the process alive. This self-heals: on every server
 * boot (which happens on cold-start wake-up), it finalizes any week(s)
 * whose endsAt has already passed, looping in case multiple weeks were
 * missed (e.g. the server was asleep across more than one Monday).
 */
async function catchUpMissedResets() {
  let guard = 0;
  while (guard++ < 52) { // safety cap: never loop more than a year's worth
    const openWeek = await Week.findOne({ status: 'open' });
    if (!openWeek) {
      await ensureOpenWeekExists();
      return;
    }
    if (openWeek.endsAt > new Date()) return; // current week isn't overdue, nothing to do

    console.log(`Week #${openWeek.weekNumber} was overdue (missed while asleep) — finalizing now.`);
    const { week, nextWeek } = await finalizeWeek(openWeek._id);
    console.log(`Week #${week.weekNumber} finalized. Week #${nextWeek.weekNumber} is now open.`);
  }
}

/**
 * Schedules automatic weekly finalization for whenever the server happens
 * to be awake at the right moment (best-effort — catchUpMissedResets is
 * what guarantees correctness on a host that sleeps).
 */
function startWeeklyCron() {
  // Cron format: minute hour day-of-month month day-of-week
  // '0 0 * * 1' = 00:00 every Monday, in the timezone below
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
  }, { timezone: TIMEZONE });

  console.log(`Weekly finalize cron scheduled (every Monday 00:00 ${TIMEZONE}).`);
}

module.exports = { startWeeklyCron, ensureOpenWeekExists, catchUpMissedResets };
