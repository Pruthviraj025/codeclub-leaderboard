const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

let cache = { data: null, fetchedAt: 0 };
const CACHE_MS = 5 * 60 * 1000; // 5 minute cache

const DIVISION_ORDER = ['Div. 1', 'Div. 2', 'Div. 3', 'Div. 4', 'Div. 1 + 2', 'Educational', 'Global', 'Other'];
const LEETCODE_CATEGORIES = ['Upcoming & Live', 'Weekly Contest', 'Biweekly Contest', 'Past Contests'];

function detectCFDivision(name) {
  const n = name.toLowerCase();
  if (/div\.?\s*1\s*\+?\s*2|div\.?\s*1\.5/.test(n)) return 'Div. 1 + 2';
  if (/div\.?\s*1\b/.test(n)) return 'Div. 1';
  if (/div\.?\s*2\b/.test(n)) return 'Div. 2';
  if (/div\.?\s*3\b/.test(n)) return 'Div. 3';
  if (/div\.?\s*4\b/.test(n)) return 'Div. 4';
  if (/educational/.test(n)) return 'Educational';
  if (/global/.test(n)) return 'Global';
  return 'Other';
}

function detectLCGroup(name, phase) {
  if (phase === 'BEFORE' || phase === 'CODING') return 'Upcoming & Live';
  if (/biweekly/i.test(name)) return 'Biweekly Contest';
  if (/weekly/i.test(name)) return 'Weekly Contest';
  return 'Past Contests';
}

async function fetchCodeforcesContests() {
  try {
    const response = await axios.get('https://codeforces.com/api/contest.list', { timeout: 8000 });
    if (response.data?.status !== 'OK') throw new Error('CF API returned non-OK status');

    const contests = (response.data.result || [])
      .filter(c => c.phase === 'BEFORE' || c.phase === 'CODING' || c.phase === 'FINISHED')
      .slice(0, 50)
      .map(c => ({
        id: `cf-${c.id}`,
        rawId: c.id,
        name: c.name,
        platform: 'codeforces',
        phase: c.phase,
        startTimeSeconds: c.startTimeSeconds,
        durationSeconds: c.durationSeconds,
        division: detectCFDivision(c.name),
        url: c.phase === 'BEFORE'
          ? `https://codeforces.com/contestRegistration/${c.id}`
          : `https://codeforces.com/contest/${c.id}`
      }));

    const grouped = {};
    for (const c of contests) {
      if (!grouped[c.division]) grouped[c.division] = [];
      grouped[c.division].push(c);
    }

    return { contests, grouped };
  } catch (err) {
    console.error('Error fetching CF contests:', err.message);
    return { contests: [], grouped: {} };
  }
}

async function fetchLeetCodeContests() {
  try {
    const query = `
      query {
        allContests {
          title
          titleSlug
          startTime
          duration
          isVirtual
        }
      }
    `;

    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    const raw = response.data?.data?.allContests || [];
    const nowSec = Math.floor(Date.now() / 1000);

    const contests = raw
      .filter(c => c && c.title && c.titleSlug && !c.isVirtual)
      .slice(0, 50) // Recent & upcoming slice
      .map(c => {
        const start = Number(c.startTime) || 0;
        const duration = Number(c.duration) || 5400; // default 1.5h
        let phase = 'FINISHED';

        if (nowSec < start) {
          phase = 'BEFORE';
        } else if (nowSec >= start && nowSec <= start + duration) {
          phase = 'CODING';
        }

        const category = detectLCGroup(c.title, phase);

        return {
          id: `lc-${c.titleSlug}`,
          name: c.title,
          titleSlug: c.titleSlug,
          platform: 'leetcode',
          phase,
          startTimeSeconds: start,
          durationSeconds: duration,
          division: category,
          url: `https://leetcode.com/contest/${c.titleSlug}`
        };
      });

    const grouped = {};
    for (const c of contests) {
      if (!grouped[c.division]) grouped[c.division] = [];
      grouped[c.division].push(c);
    }

    return { contests, grouped };
  } catch (err) {
    console.error('Error fetching LeetCode contests:', err.message);
    return { contests: [], grouped: {} };
  }
}

// GET /api/contests — Codeforces & LeetCode contests
router.get('/', requireAuth, async (req, res) => {
  try {
    if (cache.data && Date.now() - cache.fetchedAt < CACHE_MS) {
      return res.json(cache.data);
    }

    const [cfRes, lcRes] = await Promise.allSettled([
      fetchCodeforcesContests(),
      fetchLeetCodeContests()
    ]);

    const cfData = cfRes.status === 'fulfilled' ? cfRes.value : { contests: [], grouped: {} };
    const lcData = lcRes.status === 'fulfilled' ? lcRes.value : { contests: [], grouped: {} };

    const allContests = [...cfData.contests, ...lcData.contests];

    const stats = {
      totalCount: allContests.length,
      cfCount: cfData.contests.length,
      lcCount: lcData.contests.length,
      upcomingCount: allContests.filter(c => c.phase === 'BEFORE').length,
      liveCount: allContests.filter(c => c.phase === 'CODING').length
    };

    const payload = {
      codeforces: cfData,
      leetcode: lcData,
      allContests,
      stats
    };

    cache = { data: payload, fetchedAt: Date.now() };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch contests: ' + err.message });
  }
});

module.exports = router;
